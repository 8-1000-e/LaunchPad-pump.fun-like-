"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getBondingCurvePda } from "@sdk/pda";

/* ─── Trade Event parsing (browser-safe, no Node crypto) ─── */

// Precomputed: sha256("event:TradeEvent").slice(0, 8)
const TRADE_DISCRIMINATOR = new Uint8Array([189, 219, 127, 211, 78, 230, 97, 238]);

const TOKEN_DECIMALS = 1_000_000; // 10^6

// Pagination settings
const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety cap: 2000 tx max

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "all";

/** Candle bucket size in seconds per timeframe */
export const TF_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "all": 86400, // 1-day candles for "all"
};

export interface TradeData {
  signature: string;
  type: "buy" | "sell";
  amountSol: number;
  amountTokens: number;
  price: number; // SOL per token
  timestamp: number; // unix seconds
  wallet: string; // shortened
  isNew?: boolean;
}

function bufferEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function readBNLE(buf: Uint8Array, offset: number): number {
  const bn = new BN(Array.from(buf.slice(offset, offset + 8)), "le");
  return bn.toNumber();
}

function shortenAddr(addr: string): string {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function parseTradeFromLog(logLine: string, signature: string, blockTime: number): TradeData | null {
  const base64Data = logLine.slice("Program data: ".length);
  const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  if (buffer.length < 89) return null;
  if (!bufferEqual(buffer.slice(0, 8), TRADE_DISCRIMINATOR)) return null;

  let offset = 8;
  offset += 32; // skip mint

  const traderBytes = buffer.slice(offset, offset + 32);
  const trader = new PublicKey(traderBytes).toBase58();
  offset += 32;

  const isBuy = buffer[offset] === 1;
  offset += 1;

  const solAmount = readBNLE(buffer, offset);
  offset += 8;

  const tokenAmount = readBNLE(buffer, offset);

  const solNum = solAmount / LAMPORTS_PER_SOL;
  const tokenNum = tokenAmount / TOKEN_DECIMALS;
  const price = tokenNum > 0 ? solNum / tokenNum : 0;

  return {
    signature,
    type: isBuy ? "buy" : "sell",
    amountSol: solNum,
    amountTokens: tokenNum,
    price,
    timestamp: blockTime,
    wallet: shortenAddr(trader),
  };
}

/**
 * Fetches ALL available trade history for a bonding curve by paginating
 * until exhaustion or MAX_PAGES. Timeframe is NOT a fetch parameter —
 * it only controls candle bucket size in the chart.
 * Live updates via WebSocket (onLogs).
 */
export function useTradeData(mint: string) {
  const { connection } = useConnection();
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subIdRef = useRef<number | null>(null);
  const abortRef = useRef(false);

  const fetchTrades = useCallback(async () => {
    abortRef.current = false;
    setLoading(true);

    try {
      const mintPk = new PublicKey(mint);
      const pda = getBondingCurvePda(mintPk);

      const allParsed: TradeData[] = [];
      let beforeSig: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        if (abortRef.current) return;

        const opts: { limit: number; before?: string } = { limit: PAGE_SIZE };
        if (beforeSig) opts.before = beforeSig;

        const signatures = await connection.getSignaturesForAddress(pda, opts);
        if (signatures.length === 0) break;

        for (const sig of signatures) {
          if (abortRef.current) return;

          try {
            const tx = await connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });
            if (!tx?.meta?.logMessages) continue;

            const dataLogs = tx.meta.logMessages.filter((l) => l.startsWith("Program data: "));
            for (const log of dataLogs) {
              const trade = parseTradeFromLog(log, sig.signature, tx.blockTime ?? 0);
              if (trade) allParsed.push(trade);
            }
          } catch {
            // Skip individual tx errors
          }
        }

        beforeSig = signatures[signatures.length - 1].signature;

        // No more pages
        if (signatures.length < PAGE_SIZE) break;
      }

      if (!abortRef.current) {
        setTrades(allParsed);
        setError(null);
      }
    } catch (err) {
      if (!abortRef.current) {
        console.error("Failed to fetch trade history:", err);
        setError("Failed to load trades");
      }
    } finally {
      if (!abortRef.current) {
        setLoading(false);
      }
    }
  }, [connection, mint]);

  // Fetch once on mount (or when mint changes)
  useEffect(() => {
    abortRef.current = true;
    fetchTrades();
    return () => { abortRef.current = true; };
  }, [fetchTrades]);

  // Live subscription
  useEffect(() => {
    const mintPk = new PublicKey(mint);
    const pda = getBondingCurvePda(mintPk);

    subIdRef.current = connection.onLogs(pda, (logInfo) => {
      if (logInfo.err) return;
      const dataLogs = logInfo.logs.filter((l) => l.startsWith("Program data: "));
      for (const log of dataLogs) {
        const trade = parseTradeFromLog(log, logInfo.signature, Math.floor(Date.now() / 1000));
        if (trade) {
          setTrades((prev) => {
            if (prev.some((t) => t.signature === trade.signature)) return prev;
            return [{ ...trade, isNew: true }, ...prev];
          });
        }
      }
    }, "confirmed");

    return () => {
      if (subIdRef.current !== null) {
        connection.removeOnLogsListener(subIdRef.current);
      }
    };
  }, [connection, mint]);

  // Clear "isNew" flash
  useEffect(() => {
    if (trades.length > 0 && trades[0]?.isNew) {
      const timer = setTimeout(() => {
        setTrades((prev) => prev.map((t) => (t.isNew ? { ...t, isNew: false } : t)));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [trades[0]?.signature]);

  return { trades, loading, error, refetch: fetchTrades };
}
