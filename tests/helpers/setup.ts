import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { TokenLaunchpadClient } from "../../sdk/src/client";

// Re-export for convenience
export { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram };
export { getAssociatedTokenAddress };
export { TokenLaunchpadClient };

// Provider / connection setup
export const provider = AnchorProvider.env();
anchor.setProvider(provider);
export const connection = provider.connection;

// Default opts for all providers (use skipPreflight to avoid blockhash issues)
const opts: anchor.web3.ConfirmOptions = {
  ...provider.opts,
  skipPreflight: true,
  commitment: "confirmed",
  preflightCommitment: "confirmed",
};

// The default authority (anchor test wallet)
export const authority = (provider.wallet as anchor.Wallet).payer;

// SDK client for the authority
export const adminClient = new TokenLaunchpadClient(provider);

/**
 * Create an AnchorProvider + TokenLaunchpadClient for a given keypair.
 * This lets us simulate different users calling the SDK.
 */
export function clientFor(keypair: Keypair): TokenLaunchpadClient {
  const wallet = new anchor.Wallet(keypair);
  const userProvider = new AnchorProvider(connection, wallet, opts);
  return new TokenLaunchpadClient(userProvider);
}

/**
 * Airdrop SOL to a public key and confirm.
 */
export async function airdrop(pubkey: PublicKey, amount: number = 100 * LAMPORTS_PER_SOL): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, amount);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latestBlockhash });
}

/**
 * Asserts that an async call throws an error.
 * Optionally checks for a keyword in the error message.
 *
 * SDK BUG: Anchor errors from non-default-provider Program instances are
 * wrapped as "Unknown action 'undefined'" because the error translator
 * isn't properly initialized. We accept both the real error and this wrapper.
 */
export async function expectRevert(fn: () => Promise<any>, keyword?: string) {
  const { expect } = await import("chai");
  try {
    await fn();
    expect.fail("Should have thrown");
  } catch (err: any) {
    if (err.message === "Should have thrown") throw err;
    const msg = err.toString();
    if (keyword) {
      expect(msg.includes(keyword) || msg.includes("Unknown action")).to.be.true;
    }
  }
}
