import { BN, Program, AnchorProvider, AnchorError } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, SendTransactionError } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TokenLp } from "../../target/types/token_lp";
import IDL from "../../target/idl/token_lp.json";
import { PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID } from "./constants";
import { getBondingCurvePda, getFeeVaultPda, getGlobalPda, getMetadataPda, getReferralPda } from "./pda";
import { BondingCurve, Global, ProgramStatus, Referral } from "./types";

export class TokenLaunchpadClient
{
    private program: Program<TokenLp>;

    constructor(provider: AnchorProvider)
    {
        this.program = new Program<TokenLp>(IDL as TokenLp, provider);
    }

    /**
     * Parse les erreurs Anchor depuis les logs de transaction.
     * Contourne le bug Anchor 0.32 où les erreurs deviennent "Unknown action"
     * quand le provider n'est pas le provider global.
     */
    private parseError(err: unknown): Error
    {
        // Déjà une AnchorError propre — on la renvoie telle quelle
        if (err instanceof AnchorError) return err;

        // SendTransactionError contient les logs — on essaie d'en extraire l'erreur Anchor
        if (err instanceof SendTransactionError)
        {
            const logs = err.logs ?? [];
            for (const log of logs)
            {
                // Format Anchor: "Program log: AnchorError ... Error Code: XxxYyy"
                const match = log.match(/Error Code: (\w+)/);
                if (match)
                {
                    const parsed = AnchorError.parse(logs);
                    if (parsed) return parsed;
                }
                // Format: "Program log: Error Message: ..."
                const msgMatch = log.match(/Error Message: (.+)/);
                if (msgMatch)
                {
                    return new Error(msgMatch[1]);
                }
            }
        }

        // Fallback — on renvoie l'erreur originale
        if (err instanceof Error) return err;
        return new Error(String(err));
    }

    /**
     * Wrapper pour .rpc() qui parse correctement les erreurs.
     */
    private async sendTx(builder: any): Promise<string>
    {
        try
        {
            return await builder.rpc();
        }
        catch (err)
        {
            throw this.parseError(err);
        }
    }

    // Admin
    async initialize()
    {
        await this.sendTx(
            this.program.methods
            .initialize()
            .accounts({
                authority: this.program.provider.publicKey,
            } as any)
        );
    }

    async updateConfig(params: {
        newFeeReceiver?: PublicKey,
        newInitialVirtualSolReserves?: BN,
        newInitialVirtualTokenReserves?: BN,
        newInitialRealTokenReserves?: BN,
        newTokenTotalSupply?: BN,
        newTradeFeeBps?: number,
        newCreatorShareBps?: number,
        newReferralShareBps?: number,
        newGraduationThreshold?: BN,
        newStatus?: ProgramStatus,
    })
    {
        await this.sendTx(
            this.program.methods
            .updateConfig(params.newFeeReceiver ?? null,
                        params.newInitialVirtualSolReserves ?? null,
                        params.newInitialVirtualTokenReserves ?? null,
                        params.newInitialRealTokenReserves ?? null,
                        params.newTokenTotalSupply ?? null,
                        params.newTradeFeeBps ?? null,
                        params.newCreatorShareBps ?? null,
                        params.newReferralShareBps ?? null,
                        params.newGraduationThreshold ?? null,
                        params.newStatus ?? null,
            )
            .accounts({
                authority: this.program.provider.publicKey,
            } as any)
        );
    }

    async withdrawFees()
    {
        await this.sendTx(
            this.program.methods
            .withdrawFees()
            .accounts({
                authority: this.program.provider.publicKey,
                recipient: (await this.getGlobal()).feeReceiver,
            } as any)
        );
    }


    // Launch

    async createToken(name: string, symbol: string, uri: string)
    {
        const mint = Keypair.generate();

        await this.sendTx(
            this.program.methods
            .createToken(name, symbol, uri)
            .accounts({
                creator: this.program.provider.publicKey,
                mint: mint.publicKey,
                metadata: getMetadataPda(mint.publicKey),
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            } as any)
            .signers([mint])
        );

        return mint.publicKey;
    }


    async createAndBuyToken(name: string, symbol: string, uri: string, solAmount: BN, minTokensOut: BN, referral?: PublicKey)
    {
        const mint = Keypair.generate();

        await this.sendTx(
            this.program.methods
            .createAndBuyToken(name, symbol, uri, solAmount, minTokensOut)
            .accounts({
                creator: this.program.provider.publicKey,
                mint: mint.publicKey,
                referral: referral ? getReferralPda(referral) : null,
                metadata: getMetadataPda(mint.publicKey),
                tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            } as any)
            .signers([mint])
        );

        return mint.publicKey;
    }


    // Trade
    async buyToken(mint: PublicKey, solAmount: BN, minTokensOut: BN, referral?: PublicKey, creator?: PublicKey)
    {
        const creatorAccount = creator ?? (await this.getBondingCurve(mint)).creator;

        await this.sendTx(
            this.program.methods
            .buyToken(solAmount, minTokensOut)
            .accounts({
                buyer: this.program.provider.publicKey,
                mint: mint,
                creatorAccount: creatorAccount,
                referral: referral ? getReferralPda(referral) : null,
            } as any)
        );
    }

    async sellToken(mint: PublicKey, tokenAmount: BN, minSolOut: BN, referral?: PublicKey, creator?: PublicKey)
    {
        const creatorAccount = creator ?? (await this.getBondingCurve(mint)).creator;

        await this.sendTx(
            this.program.methods
            .sellToken(tokenAmount, minSolOut)
            .accounts({
                seller: this.program.provider.publicKey,
                mint: mint,
                creatorAccount: creatorAccount,
                referral: referral ? getReferralPda(referral) : null,
            } as any)
        );
    }

    // Referral
    async registerReferral()
    {
        await this.sendTx(
            this.program.methods
            .registerReferral()
            .accounts({
                user: this.program.provider.publicKey,
            } as any)
        );
    }
    async claimReferralFees()
    {
        await this.sendTx(
            this.program.methods
            .claimReferralFees()
            .accounts({
                user: this.program.provider.publicKey,
            } as any)
        );
    }

    // Fetch (lire les accounts)
    async getGlobal(): Promise<Global>
    {
        const pda = getGlobalPda();
        return this.program.account.global.fetch(pda);
    }

    async getBondingCurve(mint: PublicKey): Promise<BondingCurve>
    {
        const pda = getBondingCurvePda(mint);
        return this.program.account.bondingCurve.fetch(pda);
    }

    async getReferral(user: PublicKey): Promise<Referral>
    {
        const pda = getReferralPda(user);
        return this.program.account.referral.fetch(pda);
    }

}
