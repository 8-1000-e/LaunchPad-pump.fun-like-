import { PublicKey } from "@solana/web3.js";
import { TOKEN_METADATA_PROGRAM_ID, BONDING_CURVE_SEED, FEE_VAULT_SEED, GLOBAL_SEED, PROGRAM_ID, REFERRAL_SEED } from "./constants";


export function getGlobalPda(): PublicKey
{
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(GLOBAL_SEED)],
        PROGRAM_ID
    );
    return pda;
}

export function getBondingCurvePda(mint: PublicKey): PublicKey 
{       
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export function getFeeVaultPda(): PublicKey
{
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(FEE_VAULT_SEED)],
        PROGRAM_ID
    );
    return pda;
}

export function getReferralPda(user: PublicKey) : PublicKey
{
    const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from(REFERRAL_SEED), user.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export function getMetadataPda(mint: PublicKey) : PublicKey
{
    const [pda] = PublicKey.findProgramAddressSync(
    [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
    );
    return pda;
}