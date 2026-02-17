import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createHash } from "crypto";

// Discriminator = 8 premiers bytes de sha256("event:TradeEvent")
const TRADE_EVENT_DISCRIMINATOR = createHash("sha256")
    .update("event:TradeEvent")
    .digest()
    .slice(0, 8);

export interface TradeRecord {
    signature: string;
    mint: PublicKey;
    trader: PublicKey;
    isBuy: boolean;
    solAmount: BN;
    tokenAmount: BN;
    fee: BN;
    timestamp: number;
}

export async function getTradeHistory(connection: Connection, bondingCurvePda: PublicKey, limit?: number): Promise<TradeRecord[]>
{
    const signatures = await connection.getSignaturesForAddress(bondingCurvePda, { limit: limit ?? 50 });

    const trades: TradeRecord[] = [];

    for (const sig of signatures)
    {
        const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx || !tx.meta?.logMessages)
            continue;

        const dataLogs = tx.meta.logMessages.filter(log => log.startsWith("Program data: "));

        for (const log of dataLogs)
        {
            const base64Data = log.slice("Program data: ".length);
            const buffer = Buffer.from(base64Data, "base64");

            // Check que c'est un TradeEvent (pas CreateEvent, CompleteEvent, etc.)
            const discriminator = buffer.slice(0, 8);
            if (!discriminator.equals(TRADE_EVENT_DISCRIMINATOR)) continue;

            // Décoder les champs borsh après le discriminator (8 bytes)
            // Layout: mint (32) + trader (32) + is_buy (1) + sol_amount (8) + token_amount (8) + fee (8)
            let offset = 8;

            const mint = new PublicKey(buffer.slice(offset, offset + 32));
            offset += 32;

            const trader = new PublicKey(buffer.slice(offset, offset + 32));
            offset += 32;

            const isBuy = buffer[offset] === 1;
            offset += 1;

            const solAmount = new BN(buffer.slice(offset, offset + 8), "le");
            offset += 8;

            const tokenAmount = new BN(buffer.slice(offset, offset + 8), "le");
            offset += 8;

            const fee = new BN(buffer.slice(offset, offset + 8), "le");

            trades.push({
                signature: sig.signature,
                mint,
                trader,
                isBuy,
                solAmount,
                tokenAmount,
                fee,
                timestamp: tx.blockTime ?? 0,
            });
        }
    }

    return trades;
}
