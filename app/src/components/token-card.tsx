"use client";

import { useEffect, useState } from "react";
import { Zap, Star } from "lucide-react";
import { Sparkline } from "./sparkline";

export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  graduationProgress: number;
  status: "new" | "active" | "graduating" | "graduated";
  creator: string;
  createdAgo: string;
  color: string;
  sparkData: number[];
}

/* ── Formatting helpers ── */

function formatPrice(sol: number): string {
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K`;
  if (sol >= 1) return sol.toFixed(2);
  if (sol >= 0.01) return sol.toFixed(4);
  return sol.toFixed(6);
}

function formatSol(sol: number): string {
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K`;
  if (sol >= 100) return sol.toFixed(0);
  if (sol >= 1) return sol.toFixed(1);
  return sol.toFixed(2);
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/* ── Status badge ── */

const STATUS_CONFIG = {
  new: { label: "NEW", cls: "bg-status-new/12 text-status-new", icon: null },
  graduating: {
    label: "GRADUATING",
    cls: "bg-status-graduating/12 text-status-graduating shadow-[0_0_10px_-2px_rgba(245,158,11,0.35)]",
    icon: Zap,
  },
  graduated: {
    label: "GRADUATED",
    cls: "bg-status-graduated/12 text-status-graduated shadow-[0_0_10px_-2px_rgba(201,168,76,0.4)]",
    icon: Star,
  },
  active: null,
} as const;

function Badge({ status }: { status: TokenData["status"] }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${cfg.cls}`}
    >
      {cfg.icon && <cfg.icon className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

/* ── Card ── */

export function TokenCard({
  token,
  index = 0,
}: {
  token: TokenData;
  index?: number;
}) {
  const positive = token.priceChange24h >= 0;
  const entranceDelay = index * 55;

  // Animate progress bar after mount
  const [barLoaded, setBarLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarLoaded(true), entranceDelay + 400);
    return () => clearTimeout(t);
  }, [entranceDelay]);

  const isGraduating = token.status === "graduating";

  return (
    <a
      href={`/token/${token.id}`}
      className={`group block bg-surface opacity-0 transition-all duration-300 ${
        isGraduating
          ? "border border-status-graduating/30"
          : "border border-border hover:border-border-hover"
      } hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_8px_40px_-8px_rgba(201,168,76,0.3)]`}
      style={{
        animation: `fade-in-up 0.4s ease-out ${entranceDelay}ms forwards`,
        ...(isGraduating
          ? { animation: `fade-in-up 0.4s ease-out ${entranceDelay}ms forwards, graduating-glow 2.5s ease-in-out infinite ${entranceDelay + 400}ms` }
          : {}),
      }}
    >
      {/* ── Header row ── */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-bold text-bg"
              style={{ background: token.color, borderRadius: "50%" }}
            >
              {token.symbol.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-text-1 truncate block">
                {token.name}
              </span>
              <p className="text-[11px] text-text-3">
                ${token.symbol}
                <span className="mx-1">·</span>
                {token.createdAgo}
              </p>
            </div>
          </div>
          <Badge status={token.status} />
        </div>

        {/* ── Price row ── */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-mono text-lg font-semibold tabular-nums text-text-1">
            {formatPrice(token.price)}
            <span className="ml-1 text-[11px] font-normal text-text-3">
              SOL
            </span>
          </span>
          <span
            className={`font-mono text-[13px] font-medium tabular-nums ${
              positive ? "text-buy" : "text-sell"
            }`}
          >
            {positive ? "+" : ""}
            {token.priceChange24h.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── Sparkline ── */}
      <div className="h-10 px-4 mt-1">
        <Sparkline
          data={token.sparkData}
          positive={positive}
          id={token.id}
          className="h-full w-full"
          delay={entranceDelay + 200}
        />
      </div>

      {/* ── Stats ── */}
      <div className="px-4 mt-1 grid grid-cols-2 gap-x-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-3">
            MCap
          </p>
          <p className="font-mono text-[13px] tabular-nums text-text-2">
            {formatSol(token.marketCap)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-3">
            Vol 24h
          </p>
          <p className="font-mono text-[13px] tabular-nums text-text-2">
            {formatSol(token.volume24h)}
          </p>
        </div>
      </div>

      {/* ── Creator ── */}
      <p className="mt-2 px-4 font-mono text-[10px] text-text-3">
        {truncAddr(token.creator)}
      </p>

      {/* ── Graduation bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 mt-1">
        <div className="relative h-[3px] flex-1 bg-border/50 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 origin-left transition-transform duration-700 ease-out ${
              token.status === "graduated"
                ? "bg-status-graduated"
                : isGraduating
                  ? "bg-status-graduating"
                  : "bg-buy/60"
            }`}
            style={{
              width: `${Math.min(token.graduationProgress, 100)}%`,
              transform: barLoaded ? "scaleX(1)" : "scaleX(0)",
            }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-text-3 w-7 text-right">
          {token.graduationProgress}%
        </span>
      </div>
    </a>
  );
}
