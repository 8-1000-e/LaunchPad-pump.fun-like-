"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";

export interface TokenExtensions {
  color?: string;
  banner?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  image: string | null;
  description?: string;
  extensions?: TokenExtensions;
}

const metadataCache = new Map<string, TokenMetadata>();

/* ─── Metaplex Token Metadata PDA derivation ─── */

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  );
  return pda;
}

/** Parse on-chain metadata account bytes (borsh) → name, symbol, uri */
function parseMetadataAccount(
  data: Buffer,
): { name: string; symbol: string; uri: string } | null {
  try {
    let offset = 1; // key (u8)
    offset += 32; // update_authority
    offset += 32; // mint

    // borsh String: u32 LE length + utf8 bytes
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data
      .slice(offset, offset + nameLen)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLen;

    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data
      .slice(offset, offset + symbolLen)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += symbolLen;

    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    const uri = data
      .slice(offset, offset + uriLen)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

    return { name, symbol, uri };
  } catch {
    return null;
  }
}

/* ─── JSON metadata fetch (HTTP, not RPC) ─── */

async function fetchJsonMetadata(
  uri: string,
): Promise<Record<string, any> | null> {
  if (!uri) return null;
  try {
    const res = await globalThis.fetch(uri);
    return await res.json();
  } catch {
    return null;
  }
}

function buildMetadata(
  name: string,
  symbol: string,
  uri: string,
  json: Record<string, any> | null,
): TokenMetadata {
  const image = json?.image || null;
  const description = json?.description || "";
  const ext = json?.extensions as TokenExtensions | undefined;

  return {
    name,
    symbol,
    uri,
    image,
    description,
    extensions: ext
      ? {
          color: ext.color || undefined,
          banner: ext.banner || undefined,
          twitter: ext.twitter || undefined,
          telegram: ext.telegram || undefined,
          website: ext.website || undefined,
        }
      : undefined,
  };
}

/* ─── Single-token hook (used on detail page) ─── */

export function useTokenMetadata(mint: string | null) {
  const { connection } = useConnection();
  const [metadata, setMetadata] = useState<TokenMetadata | null>(
    mint ? metadataCache.get(mint) ?? null : null,
  );
  const [loading, setLoading] = useState(!metadata && !!mint);

  useEffect(() => {
    if (!mint) return;

    const cached = metadataCache.get(mint);
    if (cached) {
      setMetadata(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function doFetch() {
      setLoading(true);
      try {
        const mintPk = new PublicKey(mint!);
        const pda = getMetadataPda(mintPk);
        const info = await connection.getAccountInfo(pda);

        if (!info?.data) throw new Error("no metadata account");

        const parsed = parseMetadataAccount(info.data as Buffer);
        if (!parsed) throw new Error("parse failed");

        const json = await fetchJsonMetadata(parsed.uri);
        const result = buildMetadata(parsed.name, parsed.symbol, parsed.uri, json);

        metadataCache.set(mint!, result);
        if (!cancelled) setMetadata(result);
      } catch {
        // Fallback to Metaplex as safety net
        try {
          const metaplex = new Metaplex(connection);
          const nft = await metaplex
            .nfts()
            .findByMint({ mintAddress: new PublicKey(mint!) });
          const json = nft.json ?? (await fetchJsonMetadata(nft.uri));
          const result = buildMetadata(nft.name, nft.symbol, nft.uri, json);
          metadataCache.set(mint!, result);
          if (!cancelled) setMetadata(result);
        } catch {
          const fallback: TokenMetadata = {
            name: `Token ${mint!.slice(0, 6)}`,
            symbol: mint!.slice(0, 4).toUpperCase(),
            uri: "",
            image: null,
          };
          metadataCache.set(mint!, fallback);
          if (!cancelled) setMetadata(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [mint, connection]);

  return { metadata, loading };
}

/* ─── Batch fetch: 1 RPC call for ALL mints ─── */

/**
 * Fetches metadata for all mints using a single getMultipleAccountsInfo call,
 * then fetches JSON URIs in parallel (HTTP only, no RPC).
 */
export async function fetchBatchMetadata(
  connection: Connection,
  mints: string[],
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();

  // Check cache first, collect uncached mints
  const uncached: { mint: string; pda: PublicKey }[] = [];
  for (const mint of mints) {
    const cached = metadataCache.get(mint);
    if (cached) {
      results.set(mint, cached);
    } else {
      const mintPk = new PublicKey(mint);
      uncached.push({ mint, pda: getMetadataPda(mintPk) });
    }
  }

  if (uncached.length === 0) return results;

  // 1 RPC call: fetch ALL metadata accounts at once
  const accounts = await connection.getMultipleAccountsInfo(
    uncached.map((u) => u.pda),
  );

  // Parse on-chain data → { name, symbol, uri }
  const toFetchJson: { mint: string; name: string; symbol: string; uri: string }[] = [];

  for (let i = 0; i < uncached.length; i++) {
    const { mint } = uncached[i];
    const info = accounts[i];

    if (!info?.data) {
      const fallback: TokenMetadata = {
        name: `Token ${mint.slice(0, 6)}`,
        symbol: mint.slice(0, 4).toUpperCase(),
        uri: "",
        image: null,
      };
      metadataCache.set(mint, fallback);
      results.set(mint, fallback);
      continue;
    }

    const parsed = parseMetadataAccount(info.data as Buffer);
    if (!parsed || !parsed.uri) {
      const fallback: TokenMetadata = {
        name: parsed?.name || `Token ${mint.slice(0, 6)}`,
        symbol: parsed?.symbol || mint.slice(0, 4).toUpperCase(),
        uri: parsed?.uri || "",
        image: null,
      };
      metadataCache.set(mint, fallback);
      results.set(mint, fallback);
      continue;
    }

    toFetchJson.push({ mint, ...parsed });
  }

  // Fetch all JSON URIs in parallel (HTTP only, no RPC calls)
  await Promise.all(
    toFetchJson.map(async ({ mint, name, symbol, uri }) => {
      const json = await fetchJsonMetadata(uri);
      const meta = buildMetadata(name, symbol, uri, json);
      metadataCache.set(mint, meta);
      results.set(mint, meta);
    }),
  );

  return results;
}
