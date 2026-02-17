"use client";

import { useEffect, useState } from "react";

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const REFRESH_INTERVAL = 60_000; // refresh every 60s

/**
 * Fetches the current SOL/USD price from CoinGecko.
 * Auto-refreshes every 60 seconds.
 */
export function useSolPrice(): number | null {
  const [price, setPrice] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchPrice() {
      try {
        const res = await fetch(COINGECKO_URL);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.solana?.usd) {
          setPrice(data.solana.usd);
        }
      } catch {
        // Silently fail — USD display is optional
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, REFRESH_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return price;
}
