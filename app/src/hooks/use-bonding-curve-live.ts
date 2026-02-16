"use client";

import { useEffect, useRef, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getBondingCurvePda } from "@sdk/pda";
import type { BondingCurve } from "@sdk/types";

/**
 * Subscribe to real-time updates of a bonding curve account.
 * Returns the latest bonding curve data, updated via WebSocket.
 */
export function useBondingCurveLive(
  mint: string | null,
  initial: BondingCurve | null,
) {
  const { connection } = useConnection();
  const [data, setData] = useState<BondingCurve | null>(initial);
  const subRef = useRef<number | null>(null);

  // Sync initial data when it changes
  useEffect(() => {
    if (initial) setData(initial);
  }, [initial]);

  useEffect(() => {
    if (!mint) return;

    const mintPk = new PublicKey(mint);
    const pda = getBondingCurvePda(mintPk);

    // Subscribe to account changes
    subRef.current = connection.onAccountChange(
      pda,
      async (accountInfo) => {
        try {
          // Lazy import to avoid circular deps
          const { AnchorProvider, Program } = await import("@coral-xyz/anchor");
          const IDL = (await import("../../../target/idl/token_lp.json")).default;

          // We need to deserialize the account data using Anchor's coder
          const dummyProvider = new AnchorProvider(
            connection,
            {
              publicKey: PublicKey.default,
              signTransaction: async (tx: any) => tx,
              signAllTransactions: async (txs: any) => txs,
            } as any,
            { commitment: "confirmed" },
          );
          const program = new Program(IDL as any, dummyProvider);
          const decoded = program.coder.accounts.decode(
            "bondingCurve",
            accountInfo.data,
          );
          setData(decoded as BondingCurve);
        } catch (err) {
          console.warn("Failed to decode bonding curve update:", err);
        }
      },
      "confirmed",
    );

    return () => {
      if (subRef.current !== null) {
        connection.removeAccountChangeListener(subRef.current);
        subRef.current = null;
      }
    };
  }, [mint, connection]);

  return data;
}
