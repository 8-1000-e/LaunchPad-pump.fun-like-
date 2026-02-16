"use client";

import { Buffer } from "buffer";
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { ToastProvider } from "./toast";

export function WalletProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <ToastProvider>{children}</ToastProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
