"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
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

async function fetchJsonMetadata(uri: string): Promise<Record<string, any> | null> {
  if (!uri) return null;
  try {
    const res = await globalThis.fetch(uri);
    return await res.json();
  } catch {
    return null;
  }
}

function parseMetadata(
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
    extensions: ext ? {
      color: ext.color || undefined,
      banner: ext.banner || undefined,
      twitter: ext.twitter || undefined,
      telegram: ext.telegram || undefined,
      website: ext.website || undefined,
    } : undefined,
  };
}

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
    async function fetch() {
      setLoading(true);
      try {
        const metaplex = new Metaplex(connection);
        const nft = await metaplex
          .nfts()
          .findByMint({ mintAddress: new PublicKey(mint!) });

        // nft.json may already be loaded, otherwise fetch from URI
        const json = nft.json ?? await fetchJsonMetadata(nft.uri);
        const result = parseMetadata(nft.name, nft.symbol, nft.uri, json);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [mint, connection]);

  return { metadata, loading };
}

/**
 * Batch fetch metadata for multiple mints.
 * Returns a map of mint → TokenMetadata.
 */
export async function fetchBatchMetadata(
  connection: any,
  mints: string[],
): Promise<Map<string, TokenMetadata>> {
  const metaplex = new Metaplex(connection);
  const results = new Map<string, TokenMetadata>();

  const BATCH_SIZE = 5;
  for (let i = 0; i < mints.length; i += BATCH_SIZE) {
    const batch = mints.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (mint) => {
      const cached = metadataCache.get(mint);
      if (cached) {
        results.set(mint, cached);
        return;
      }

      try {
        const nft = await metaplex
          .nfts()
          .findByMint({ mintAddress: new PublicKey(mint) });

        const json = nft.json ?? await fetchJsonMetadata(nft.uri);
        const meta = parseMetadata(nft.name, nft.symbol, nft.uri, json);

        metadataCache.set(mint, meta);
        results.set(mint, meta);
      } catch {
        const fallback: TokenMetadata = {
          name: `Token ${mint.slice(0, 6)}`,
          symbol: mint.slice(0, 4).toUpperCase(),
          uri: "",
          image: null,
        };
        metadataCache.set(mint, fallback);
        results.set(mint, fallback);
      }
    });
    await Promise.all(promises);
  }

  return results;
}
