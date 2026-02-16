"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { TokenLaunchpadClient } from "@sdk/client";

export function useTokenLaunchpad() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected } = useWallet();

  const client = useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new TokenLaunchpadClient(provider);
  }, [connection, wallet]);

  return { client, connected, connection };
}
