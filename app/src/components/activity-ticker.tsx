"use client";

import { useEffect, useState } from "react";

const EVENTS = [
  { token: "DOGEK", action: "bought", amount: "2.4 SOL", color: "#c9a84c", type: "buy" },
  { token: "PEPES", action: "sold", amount: "0.8 SOL", color: "#22c55e", type: "sell" },
  { token: "Froggy", action: "bought", amount: "5.1 SOL", color: "#ec4899", type: "buy" },
  { token: "WAGMI", action: "graduated", amount: "to Raydium", color: "#f59e0b", type: "grad" },
  { token: "MOON", action: "created", amount: "by 9kT3…fR2n", color: "#3b82f6", type: "new" },
  { token: "SIGMA", action: "bought", amount: "1.2 SOL", color: "#8b5cf6", type: "buy" },
  { token: "BASED", action: "bought", amount: "8.7 SOL", color: "#06b6d4", type: "buy" },
  { token: "CWH", action: "sold", amount: "3.1 SOL", color: "#ef4444", type: "sell" },
  { token: "RIZZ", action: "graduating", amount: "at 74%", color: "#f59e0b", type: "grad" },
  { token: "PUMP", action: "bought", amount: "0.5 SOL", color: "#f97316", type: "buy" },
  { token: "CHAD", action: "created", amount: "by 5jN2…fR4n", color: "#14b8a6", type: "new" },
  { token: "SOLAPE", action: "bought", amount: "3.3 SOL", color: "#84cc16", type: "buy" },
];

function dot(type: string) {
  if (type === "buy") return "var(--buy)";
  if (type === "sell") return "var(--sell)";
  if (type === "grad") return "var(--status-graduating)";
  return "var(--status-new)";
}

export function ActivityTicker() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Double the list for seamless loop
  const items = [...EVENTS, ...EVENTS];

  return (
    <div className="relative overflow-hidden border-y border-border bg-surface/40 backdrop-blur-sm">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg to-transparent" />

      <div
        className="flex items-center gap-6 whitespace-nowrap py-2.5 px-4"
        style={{
          animation: mounted ? "ticker-scroll 40s linear infinite" : "none",
          width: "max-content",
        }}
      >
        {items.map((ev, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-[12px]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: dot(ev.type) }}
            />
            <span className="font-mono font-medium" style={{ color: ev.color }}>
              {ev.token}
            </span>
            <span className="text-text-3">{ev.action}</span>
            <span className="text-text-2">{ev.amount}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
