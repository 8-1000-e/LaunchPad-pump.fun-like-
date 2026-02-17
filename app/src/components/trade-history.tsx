"use client";

import type { TradeData } from "@/hooks/use-trade-data";

function timeAgo(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(0);
}

export function TradeHistory({
  tokenSymbol,
  trades,
  loading,
  error,
}: {
  tokenSymbol: string;
  trades: TradeData[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="border border-border bg-surface/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-3">
          Recent Trades
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-buy" />
          </span>
          <span className="text-[10px] font-mono text-text-3">LIVE</span>
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[52px_1fr_1fr_80px_72px] gap-x-2 border-b border-border px-4 py-2 text-[10px] uppercase tracking-wider text-text-3">
        <span>Type</span>
        <span className="text-right">SOL</span>
        <span className="text-right">{tokenSymbol}</span>
        <span className="text-right">Time</span>
        <span className="text-right">Wallet</span>
      </div>

      {/* Trade rows */}
      <div className="max-h-[320px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8 text-text-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-3 border-t-transparent mr-2" />
            <span className="text-[12px]">Loading trades...</span>
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center text-[12px] text-text-3">{error}</div>
        )}

        {!loading && !error && trades.length === 0 && (
          <div className="py-8 text-center text-[12px] text-text-3">No trades yet</div>
        )}

        {trades.map((trade) => (
          <div
            key={trade.signature}
            className={`grid grid-cols-[52px_1fr_1fr_80px_72px] gap-x-2 px-4 py-1.5 text-[12px] font-mono transition-colors ${
              trade.isNew
                ? trade.type === "buy"
                  ? "bg-buy/8"
                  : "bg-sell/8"
                : "hover:bg-surface-hover/50"
            }`}
          >
            <span
              className="font-medium"
              style={{ color: trade.type === "buy" ? "var(--buy)" : "var(--sell)" }}
            >
              {trade.type === "buy" ? "BUY" : "SELL"}
            </span>
            <span className="text-right text-text-2">{trade.amountSol.toFixed(2)}</span>
            <span className="text-right text-text-2">
              {formatTokens(trade.amountTokens)}
            </span>
            <span className="text-right text-text-3">
              {timeAgo(trade.timestamp)}
            </span>
            <span className="text-right text-text-3">{trade.wallet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
