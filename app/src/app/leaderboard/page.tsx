"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Crown,
  Medal,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
  Users,
  BarChart3,
  Star,
  Zap,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "../../components/navbar";
import { Footer } from "../../components/footer";

/* ═══════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════ */

const MOCK_TOKENS = Array.from({ length: 25 }, (_, i) => {
  const names = [
    "DogWifHat", "MoonCat", "SolPepe", "BabyDegen", "GigaChad",
    "WenLambo", "Ponke", "Bonk2", "JeetKiller", "DiamondPaws",
    "RocketFuel", "SolGold", "MegaPump", "AlphaDAO", "DegenApe",
    "LunarToken", "CosmicCat", "NeonPunk", "CryptoFrog", "PixelDoge",
    "StarDust", "VortexFi", "ZenMoon", "OmegaBull", "PhoenixSol",
  ];
  const symbols = [
    "WIF", "MCAT", "SPEPE", "BDGN", "GIGA",
    "WLMB", "PONKE", "BONK2", "JEET", "DPAW",
    "RFUEL", "SGOLD", "MEGA", "ALPHA", "DAPE",
    "LUNAR", "CCAT", "NPUNK", "CFROG", "PDOGE",
    "SDUST", "VRTX", "ZENMN", "OMEGA", "PHNX",
  ];
  const colors = [
    "#f97316", "#8b5cf6", "#22c55e", "#ef4444", "#3b82f6",
    "#eab308", "#ec4899", "#06b6d4", "#d946ef", "#c9a84c",
    "#f43f5e", "#22c55e", "#f97316", "#8b5cf6", "#3b82f6",
    "#06b6d4", "#ec4899", "#d946ef", "#eab308", "#c9a84c",
    "#ef4444", "#22c55e", "#f97316", "#3b82f6", "#8b5cf6",
  ];
  const graduated = i < 5 || i === 8 || i === 12;
  const gradPct = graduated ? 100 : Math.floor(30 + Math.random() * 65);
  return {
    rank: i + 1,
    name: names[i],
    symbol: symbols[i],
    color: colors[i],
    price: i < 3 ? +(0.01 + Math.random() * 0.5).toFixed(4) : +(0.0001 + Math.random() * 0.05).toFixed(6),
    marketCap: Math.floor(500 + Math.random() * 50000) * (i < 5 ? 10 : 1),
    volume24h: Math.floor(50 + Math.random() * 8000) * (i < 5 ? 5 : 1),
    holders: Math.floor(10 + Math.random() * 2000) * (i < 3 ? 3 : 1),
    age: i < 5 ? `${Math.floor(1 + Math.random() * 28)}d` : `${Math.floor(1 + Math.random() * 23)}h`,
    graduationPct: gradPct,
    graduated,
    change24h: +(Math.random() * 80 - 20).toFixed(1),
  };
}).sort((a, b) => b.marketCap - a.marketCap);

const MOCK_TRADERS = Array.from({ length: 20 }, (_, i) => {
  const wallets = [
    "7xK2mB", "3pRqN4", "9dFwL8", "2aHcP5", "6bVtG1",
    "8mJsE7", "4kXnR2", "1wYpD6", "5cTfA3", "0qZuH9",
    "7nBrK4", "3sLwM8", "9fCxP2", "2hGdR6", "6jVeT1",
    "8aWqN5", "4mXsF3", "1kYtD7", "5pZuA9", "0bHcL2",
  ];
  const pnl = i < 3 ? +(20 + Math.random() * 200).toFixed(2) : +(-30 + Math.random() * 150).toFixed(2);
  return {
    rank: i + 1,
    wallet: wallets[i],
    pnl,
    winRate: Math.floor(35 + Math.random() * 55),
    trades: Math.floor(20 + Math.random() * 500),
    volume: Math.floor(100 + Math.random() * 20000),
  };
}).sort((a, b) => b.pnl - a.pnl);

const MOCK_CREATORS = Array.from({ length: 18 }, (_, i) => {
  const wallets = [
    "5rAmK9", "8wPnL3", "2dSqF7", "6hVtG1", "4cXeR5",
    "9jYuN8", "3bTfA2", "7kZwH6", "1mBrD4", "0pCsE0",
    "6qLxM7", "4nGdR1", "8sVeT5", "2aWqN9", "5hXsF3",
    "9kYtD7", "3pZuA1", "7bHcL5",
  ];
  const launched = Math.floor(2 + Math.random() * 30);
  const graduated = Math.min(launched, Math.floor(Math.random() * launched * 0.6));
  return {
    rank: i + 1,
    wallet: wallets[i],
    launched,
    graduated,
    gradRate: launched > 0 ? Math.floor((graduated / launched) * 100) : 0,
    volume: Math.floor(200 + Math.random() * 30000),
    feesEarned: +(1 + Math.random() * 80).toFixed(2),
  };
}).sort((a, b) => b.volume - a.volume);

const GRADUATED_TOKENS = MOCK_TOKENS.filter((t) => t.graduated).slice(0, 8);

const ACTIVITY_FEED = [
  { type: "buy" as const, wallet: "7xK2mB", amount: 2.5, symbol: "WIF", time: "2s" },
  { type: "sell" as const, wallet: "3pRqN4", amount: 0.8, symbol: "SPEPE", time: "5s" },
  { type: "graduated" as const, wallet: "", amount: 0, symbol: "MCAT", time: "12s" },
  { type: "buy" as const, wallet: "9dFwL8", amount: 5.0, symbol: "GIGA", time: "18s" },
  { type: "sell" as const, wallet: "2aHcP5", amount: 1.2, symbol: "BONK2", time: "23s" },
  { type: "buy" as const, wallet: "6bVtG1", amount: 0.3, symbol: "PONKE", time: "30s" },
  { type: "graduated" as const, wallet: "", amount: 0, symbol: "SGOLD", time: "45s" },
  { type: "buy" as const, wallet: "8mJsE7", amount: 10.0, symbol: "WIF", time: "51s" },
  { type: "sell" as const, wallet: "4kXnR2", amount: 3.1, symbol: "BDGN", time: "58s" },
  { type: "buy" as const, wallet: "1wYpD6", amount: 0.7, symbol: "MEGA", time: "1m" },
  { type: "graduated" as const, wallet: "", amount: 0, symbol: "DPAW", time: "2m" },
  { type: "buy" as const, wallet: "5cTfA3", amount: 1.5, symbol: "ALPHA", time: "2m" },
];

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function formatSol(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

function truncAddr(addr: string): string {
  return `${addr}…`;
}

/* ─── Animated counter hook ─── */
function useAnimatedCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = null;
    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

/* ─── Rank medal ─── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-bg"
        style={{
          background: "linear-gradient(135deg, #c9a84c, #dbb85e)",
          boxShadow: "0 0 10px -2px rgba(201,168,76,0.5)",
        }}
      >
        1
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-bg bg-[#a8a8a8]">
        2
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-bg bg-[#b87333]">
        3
      </div>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center text-[12px] font-mono text-text-3">
      {rank}
    </span>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

type Tab = "tokens" | "traders" | "creators";
type Timeframe = "24h" | "7d" | "30d" | "all";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("tokens");
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");
  const [mounted, setMounted] = useState(false);
  const hallRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  /* Animated hero counters */
  const totalVolume = useAnimatedCounter(142_850, 2500);
  const tokensLaunched = useAnimatedCounter(1_247, 2000);
  const totalGraduated = useAnimatedCounter(89, 1800);
  const activeTraders = useAnimatedCounter(3_412, 2200);

  /* Podium data based on tab */
  const podium = useMemo(() => {
    if (tab === "tokens") return MOCK_TOKENS.slice(0, 3);
    if (tab === "traders") return MOCK_TRADERS.slice(0, 3);
    return MOCK_CREATORS.slice(0, 3);
  }, [tab]);

  return (
    <>
      <Navbar />

      {/* ═══ COMING SOON OVERLAY ═══ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="flex flex-col items-center gap-4 pointer-events-auto"
          style={{ animation: "fade-in-up 0.6s ease-out both 0.3s" }}
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <Crown className="h-7 w-7 text-brand" style={{ filter: "drop-shadow(0 0 8px rgba(201,168,76,0.5))" }} />
          </div>
          <div className="text-center">
            <h2
              className="font-display text-3xl font-bold text-text-1 sm:text-4xl"
              style={{ textShadow: "0 0 30px rgba(201,168,76,0.3)" }}
            >
              Coming Soon
            </h2>
            <p className="mt-2 text-[14px] text-text-2 max-w-xs">
              The leaderboard is being built. Stay tuned.
            </p>
          </div>
          <Link
            href="/"
            className="mt-2 px-5 py-2 text-[13px] font-medium text-brand border border-brand/20 hover:bg-brand/5 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* ─── Background effects (same atmosphere as landing) ─── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: "90%",
            height: "55%",
            background:
              "radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: "45%",
            height: "45%",
            background:
              "radial-gradient(ellipse at bottom right, rgba(201,168,76,0.05) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 500,
            height: 500,
            top: "5%",
            right: "20%",
            borderRadius: "50%",
            background: "var(--brand)",
            opacity: 0.05,
            filter: "blur(120px)",
            animation: "float-orb-1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 400,
            height: 400,
            bottom: "15%",
            left: "5%",
            borderRadius: "50%",
            background: "var(--brand)",
            opacity: 0.04,
            filter: "blur(100px)",
            animation: "float-orb-2 30s ease-in-out infinite",
          }}
        />
      </div>
      <div className="noise-overlay" />

      <div className="relative z-10 select-none blur-[6px] pointer-events-none">
        {/* ═══════════════════════════════════════════
            LIVE ACTIVITY TICKER
            ═══════════════════════════════════════════ */}
        <div className="overflow-hidden border-b border-border bg-surface/30 backdrop-blur-sm">
          <div
            className="flex items-center gap-8 whitespace-nowrap py-2 px-4"
            style={{ animation: "ticker-scroll 40s linear infinite", width: "max-content" }}
          >
            {[...ACTIVITY_FEED, ...ACTIVITY_FEED].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[12px]">
                {item.type === "buy" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-buy" />
                    <span className="text-text-3">{truncAddr(item.wallet)}</span>
                    <span className="text-buy font-medium">bought</span>
                    <span className="font-mono text-text-2">{item.amount} SOL</span>
                    <span className="text-text-3">of</span>
                    <span className="font-mono font-medium text-text-1">${item.symbol}</span>
                  </>
                )}
                {item.type === "sell" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-sell" />
                    <span className="text-text-3">{truncAddr(item.wallet)}</span>
                    <span className="text-sell font-medium">sold</span>
                    <span className="font-mono text-text-2">{item.amount} SOL</span>
                    <span className="text-text-3">of</span>
                    <span className="font-mono font-medium text-text-1">${item.symbol}</span>
                  </>
                )}
                {item.type === "graduated" && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="font-mono font-medium text-brand">${item.symbol}</span>
                    <span className="text-brand font-medium">graduated!</span>
                    <Rocket className="h-3 w-3 text-brand" />
                  </>
                )}
                <span className="text-[10px] text-text-3/50">{item.time}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            HERO — GLOBAL STATS + TROPHY
            ═══════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-4 sm:px-6 sm:pt-14 sm:pb-6">
          <div className="flex items-start justify-between gap-8">
            {/* Stats */}
            <div style={{ animation: "fade-in-up 0.5s ease-out both" }}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-buy" style={{ animation: "graduating-glow 2s ease-in-out infinite" }} />
                <span className="text-[11px] font-medium uppercase tracking-wider text-buy">Live</span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
                Leaderboard
              </h1>
              <p className="mt-2 text-[14px] text-text-2">
                Top performers on the launchpad
              </p>

              {/* Counter grid */}
              <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4">
                {[
                  { label: "Total Volume", value: totalVolume, suffix: " SOL", icon: BarChart3 },
                  { label: "Tokens Launched", value: tokensLaunched, suffix: "", icon: Rocket },
                  { label: "Graduated", value: totalGraduated, suffix: "", icon: Star },
                  { label: "Active Traders", value: activeTraders, suffix: "", icon: Users },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{ animation: `fade-in-up 0.5s ease-out both ${200 + i * 100}ms` }}
                  >
                    <div className="flex items-center gap-1.5">
                      <stat.icon className="h-3 w-3 text-text-3" />
                      <span className="text-[11px] uppercase tracking-wider text-text-3">
                        {stat.label}
                      </span>
                    </div>
                    <p
                      className="mt-1 font-mono text-2xl font-bold tabular-nums text-text-1 sm:text-3xl"
                      style={{ textShadow: "0 0 20px rgba(201,168,76,0.3)" }}
                    >
                      {stat.value.toLocaleString()}
                      {stat.suffix && (
                        <span className="ml-1 text-[13px] font-normal text-text-3">
                          {stat.suffix}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3D Trophy — CSS animated gold trophy */}
            <div
              className="relative hidden shrink-0 sm:block"
              style={{
                width: 160,
                height: 180,
                animation: "fade-in-up 0.6s ease-out both 0.4s",
              }}
            >
              {/* Trophy glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)",
                  animation: "pulse-glow 3s ease-in-out infinite",
                }}
              />
              {/* Trophy body */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  width: 80,
                  height: 100,
                  perspective: "400px",
                  animation: "float-orb-1 8s ease-in-out infinite",
                }}
              >
                {/* Crown */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                  style={{
                    animation: "float-orb-2 6s ease-in-out infinite",
                  }}
                >
                  <Crown
                    className="h-10 w-10"
                    style={{
                      color: "#dbb85e",
                      filter: "drop-shadow(0 0 8px rgba(201,168,76,0.6))",
                    }}
                  />
                </div>
                {/* Cup shape */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2"
                  style={{
                    width: 56,
                    height: 64,
                    background: "linear-gradient(180deg, #dbb85e 0%, #c9a84c 40%, #8a7034 100%)",
                    borderRadius: "4px 4px 28px 28px",
                    boxShadow: "0 0 30px -4px rgba(201,168,76,0.5), inset 0 -8px 16px rgba(0,0,0,0.2)",
                    transform: "rotateY(0deg)",
                    animation: "trophy-rotate 12s ease-in-out infinite",
                  }}
                >
                  {/* Star emblem */}
                  <div className="flex h-full items-center justify-center">
                    <Star
                      className="h-6 w-6"
                      style={{
                        color: "#0c0a09",
                        opacity: 0.3,
                      }}
                    />
                  </div>
                </div>
                {/* Base */}
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  style={{
                    width: 44,
                    height: 8,
                    background: "linear-gradient(180deg, #8a7034 0%, #6b5628 100%)",
                    borderRadius: "2px",
                  }}
                />
                <div
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2"
                  style={{
                    width: 52,
                    height: 6,
                    background: "linear-gradient(180deg, #6b5628 0%, #524220 100%)",
                    borderRadius: "2px",
                  }}
                />
              </div>
              {/* Floating particles */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 3 + Math.random() * 3,
                    height: 3 + Math.random() * 3,
                    background: "var(--brand)",
                    opacity: 0.3 + Math.random() * 0.4,
                    left: `${15 + Math.random() * 70}%`,
                    top: `${10 + Math.random() * 70}%`,
                    filter: "blur(0.5px)",
                    animation: `float-orb-${(i % 3) + 1} ${5 + Math.random() * 8}s ease-in-out infinite ${Math.random() * 3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            TABS + TIMEFRAME
            ═══════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div
            className="flex items-center justify-between border-b border-border"
            style={{ animation: "fade-in-up 0.4s ease-out both 0.3s" }}
          >
            {/* Tab buttons */}
            <div className="flex items-center gap-0">
              {([
                { id: "tokens" as Tab, label: "Top Tokens", icon: TrendingUp },
                { id: "traders" as Tab, label: "Top Traders", icon: BarChart3 },
                { id: "creators" as Tab, label: "Top Creators", icon: Rocket },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium transition-colors ${
                    tab === t.id
                      ? "text-text-1"
                      : "text-text-3 hover:text-text-2"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.label.split(" ")[1]}</span>
                  {tab === t.id && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{
                        background: "var(--brand)",
                        boxShadow: "0 0 8px rgba(201,168,76,0.4)",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Timeframe */}
            <div className="flex items-center gap-0.5">
              {(["24h", "7d", "30d", "all"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-medium transition-colors ${
                    timeframe === tf
                      ? "text-brand bg-brand/8"
                      : "text-text-3 hover:text-text-2"
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            PODIUM TOP 3
            ═══════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex items-end justify-center gap-3 sm:gap-4">
            {/* #2 — left, shorter */}
            <PodiumCard data={podium[1]} rank={2} tab={tab} mounted={mounted} delay={200} />
            {/* #1 — center, tallest */}
            <PodiumCard data={podium[0]} rank={1} tab={tab} mounted={mounted} delay={0} />
            {/* #3 — right, shortest */}
            <PodiumCard data={podium[2]} rank={3} tab={tab} mounted={mounted} delay={350} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            MAIN TABLE
            ═══════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <div
            className="border border-border bg-surface/40 overflow-hidden"
            style={{ animation: "fade-in-up 0.4s ease-out both 0.5s" }}
          >
            {tab === "tokens" && <TokensTable tokens={MOCK_TOKENS} mounted={mounted} />}
            {tab === "traders" && <TradersTable traders={MOCK_TRADERS} mounted={mounted} />}
            {tab === "creators" && <CreatorsTable creators={MOCK_CREATORS} mounted={mounted} />}
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            HALL OF FAME — Recently Graduated
            ═══════════════════════════════════════════ */}
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div
            className="flex items-center justify-between"
            style={{ animation: "fade-in-up 0.4s ease-out both 0.6s" }}
          >
            <div>
              <h2 className="font-display text-lg font-bold sm:text-xl">
                Hall of Fame
              </h2>
              <p className="mt-1 text-[12px] text-text-3">
                Recently graduated to Raydium
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => hallRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                className="p-1.5 text-text-3 hover:text-text-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => hallRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                className="p-1.5 text-text-3 hover:text-text-1 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={hallRef}
            className="mt-4 flex gap-3 overflow-x-auto pb-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {GRADUATED_TOKENS.map((token, i) => (
              <HallOfFameCard key={token.symbol} token={token} index={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="blur-[6px] pointer-events-none select-none">
        <Footer />
      </div>

      {/* ─── Inline CSS for trophy animation ─── */}
      <style jsx>{`
        @keyframes trophy-rotate {
          0%, 100% { transform: rotateY(-8deg) rotateX(2deg); }
          50% { transform: rotateY(8deg) rotateX(-2deg); }
        }
      `}</style>
    </>
  );
}

/* ═══════════════════════════════════════════════
   PODIUM CARD
   ═══════════════════════════════════════════════ */

function PodiumCard({
  data,
  rank,
  tab,
  mounted,
  delay,
}: {
  data: (typeof MOCK_TOKENS)[0] | (typeof MOCK_TRADERS)[0] | (typeof MOCK_CREATORS)[0];
  rank: number;
  tab: Tab;
  mounted: boolean;
  delay: number;
}) {
  const isFirst = rank === 1;
  const heights = { 1: "h-[200px] sm:h-[220px]", 2: "h-[170px] sm:h-[190px]", 3: "h-[150px] sm:h-[170px]" };
  const widths = { 1: "w-[140px] sm:w-[200px]", 2: "w-[120px] sm:w-[170px]", 3: "w-[120px] sm:w-[170px]" };
  const medalColors = { 1: "#c9a84c", 2: "#a8a8a8", 3: "#b87333" };

  const color = "color" in data ? data.color : "var(--brand)";
  const name = "name" in data ? data.name : `${data.wallet}…`;
  const symbol = "symbol" in data ? `$${data.symbol}` : "";

  return (
    <div
      className={`relative flex flex-col items-center justify-end border bg-surface/60 backdrop-blur-sm ${heights[rank as 1 | 2 | 3]} ${widths[rank as 1 | 2 | 3]} ${
        isFirst ? "border-brand/30" : "border-border"
      }`}
      style={{
        animation: mounted ? `fade-in-up 0.5s ease-out both ${delay}ms` : "none",
        boxShadow: isFirst ? "0 0 30px -8px rgba(201,168,76,0.3)" : "none",
      }}
    >
      {/* Crown for #1 */}
      {isFirst && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Crown
            className="h-7 w-7"
            style={{
              color: "#dbb85e",
              filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))",
              animation: "pulse-glow 2.5s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center px-3 pb-4">
        {/* Medal */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-bg"
          style={{
            background: `linear-gradient(135deg, ${medalColors[rank as 1 | 2 | 3]}, ${medalColors[rank as 1 | 2 | 3]}dd)`,
            boxShadow: `0 0 12px -2px ${medalColors[rank as 1 | 2 | 3]}80`,
          }}
        >
          {rank}
        </div>

        {/* Avatar / identity */}
        {tab === "tokens" && "color" in data && (
          <div
            className="mt-3 flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-bg"
            style={{ background: color }}
          >
            {("symbol" in data ? data.symbol : "?").charAt(0)}
          </div>
        )}

        <p className="mt-2 text-center text-[13px] font-semibold text-text-1 leading-tight">
          {name}
        </p>
        {symbol && (
          <p className="mt-0.5 text-[11px] font-mono text-text-3">{symbol}</p>
        )}

        {/* Key stat */}
        <div className="mt-2 text-center">
          {tab === "tokens" && "marketCap" in data && (
            <>
              <p className="font-mono text-[15px] font-semibold text-text-1">
                {formatSol(data.marketCap)}
              </p>
              <p className="text-[10px] text-text-3">MCap SOL</p>
            </>
          )}
          {tab === "traders" && "pnl" in data && (
            <>
              <p
                className="font-mono text-[15px] font-semibold"
                style={{ color: data.pnl >= 0 ? "var(--buy)" : "var(--sell)" }}
              >
                {data.pnl >= 0 ? "+" : ""}
                {data.pnl.toFixed(1)} SOL
              </p>
              <p className="text-[10px] text-text-3">PnL</p>
            </>
          )}
          {tab === "creators" && "volume" in data && !("pnl" in data) && (
            <>
              <p className="font-mono text-[15px] font-semibold text-text-1">
                {formatSol(data.volume)} SOL
              </p>
              <p className="text-[10px] text-text-3">Volume</p>
            </>
          )}
        </div>
      </div>

      {/* Rank pedestal gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${medalColors[rank as 1 | 2 | 3]}60, transparent)`,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TOKENS TABLE
   ═══════════════════════════════════════════════ */

function TokensTable({ tokens, mounted }: { tokens: typeof MOCK_TOKENS; mounted: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-3">
            <th className="py-3 pl-4 pr-2 font-medium">#</th>
            <th className="py-3 px-2 font-medium">Token</th>
            <th className="py-3 px-2 font-medium text-right hidden sm:table-cell">Price</th>
            <th className="py-3 px-2 font-medium text-right">MCap</th>
            <th className="py-3 px-2 font-medium text-right hidden md:table-cell">Vol 24h</th>
            <th className="py-3 px-2 font-medium text-right hidden lg:table-cell">Holders</th>
            <th className="py-3 px-2 font-medium text-right">24h</th>
            <th className="py-3 pl-2 pr-4 font-medium text-right hidden sm:table-cell">Grad</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
            <tr
              key={t.symbol}
              className="group border-b border-border/50 transition-colors hover:bg-surface-hover/50 last:border-0"
              style={{
                animation: mounted ? `fade-in-up 0.3s ease-out both ${i * 30}ms` : "none",
              }}
            >
              <td className="py-3 pl-4 pr-2">
                <RankBadge rank={t.rank} />
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-bg"
                    style={{ background: t.color }}
                  >
                    {t.symbol.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[13px] font-medium text-text-1 truncate">
                      {t.name}
                    </span>
                    <span className="text-[11px] font-mono text-text-3">${t.symbol}</span>
                  </div>
                  {t.graduated && (
                    <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider bg-status-graduated/12 text-status-graduated">
                      <Star className="h-2 w-2" />
                      GRAD
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums text-text-2 hidden sm:table-cell">
                {t.price >= 0.01 ? t.price.toFixed(4) : t.price.toFixed(6)}
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] font-medium tabular-nums text-text-1">
                {formatSol(t.marketCap)}
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums text-text-2 hidden md:table-cell">
                {formatSol(t.volume24h)}
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums text-text-2 hidden lg:table-cell">
                {t.holders.toLocaleString()}
              </td>
              <td className="py-3 px-2 text-right">
                <span
                  className="inline-flex items-center gap-0.5 font-mono text-[12px] font-medium tabular-nums"
                  style={{ color: t.change24h >= 0 ? "var(--buy)" : "var(--sell)" }}
                >
                  {t.change24h >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(t.change24h)}%
                </span>
              </td>
              <td className="py-3 pl-2 pr-4 hidden sm:table-cell">
                <div className="flex items-center gap-2 justify-end">
                  <div className="relative h-[3px] w-16 bg-border/50 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${
                        t.graduated
                          ? "bg-status-graduated"
                          : t.graduationPct > 80
                            ? "bg-status-graduating"
                            : "bg-buy/60"
                      }`}
                      style={{ width: `${t.graduationPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] tabular-nums text-text-3">
                    {t.graduationPct}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRADERS TABLE
   ═══════════════════════════════════════════════ */

function TradersTable({ traders, mounted }: { traders: typeof MOCK_TRADERS; mounted: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-3">
            <th className="py-3 pl-4 pr-2 font-medium">#</th>
            <th className="py-3 px-2 font-medium">Wallet</th>
            <th className="py-3 px-2 font-medium text-right">PnL</th>
            <th className="py-3 px-2 font-medium text-right hidden sm:table-cell">Win Rate</th>
            <th className="py-3 px-2 font-medium text-right hidden md:table-cell">Trades</th>
            <th className="py-3 pl-2 pr-4 font-medium text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {traders.map((t, i) => (
            <tr
              key={t.wallet}
              className="group border-b border-border/50 transition-colors hover:bg-surface-hover/50 last:border-0"
              style={{
                animation: mounted ? `fade-in-up 0.3s ease-out both ${i * 30}ms` : "none",
              }}
            >
              <td className="py-3 pl-4 pr-2">
                <RankBadge rank={t.rank} />
              </td>
              <td className="py-3 px-2">
                <Link href={`/profile/${t.wallet}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: `hsl(${(t.wallet.charCodeAt(0) * 37) % 360}, 50%, 30%)`,
                      color: `hsl(${(t.wallet.charCodeAt(0) * 37) % 360}, 60%, 70%)`,
                    }}
                  >
                    {t.wallet.slice(0, 2)}
                  </div>
                  <span className="font-mono text-[13px] text-text-2 hover:text-text-1 transition-colors">{t.wallet}…</span>
                </Link>
              </td>
              <td className="py-3 px-2 text-right">
                <span
                  className="inline-flex items-center gap-0.5 font-mono text-[13px] font-bold tabular-nums"
                  style={{ color: t.pnl >= 0 ? "var(--buy)" : "var(--sell)" }}
                >
                  {t.pnl >= 0 ? "+" : ""}
                  {t.pnl.toFixed(1)}
                  <span className="text-[10px] font-normal opacity-60 ml-0.5">SOL</span>
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums hidden sm:table-cell">
                <span style={{ color: t.winRate >= 50 ? "var(--buy)" : "var(--sell)" }}>
                  {t.winRate}%
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums text-text-2 hidden md:table-cell">
                {t.trades}
              </td>
              <td className="py-3 pl-2 pr-4 text-right font-mono text-[12px] font-medium tabular-nums text-text-1">
                {formatSol(t.volume)}
                <span className="text-[10px] font-normal text-text-3 ml-0.5">SOL</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CREATORS TABLE
   ═══════════════════════════════════════════════ */

function CreatorsTable({ creators, mounted }: { creators: typeof MOCK_CREATORS; mounted: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-3">
            <th className="py-3 pl-4 pr-2 font-medium">#</th>
            <th className="py-3 px-2 font-medium">Creator</th>
            <th className="py-3 px-2 font-medium text-right">Launched</th>
            <th className="py-3 px-2 font-medium text-right hidden sm:table-cell">Graduated</th>
            <th className="py-3 px-2 font-medium text-right hidden md:table-cell">Grad Rate</th>
            <th className="py-3 px-2 font-medium text-right hidden md:table-cell">Volume</th>
            <th className="py-3 pl-2 pr-4 font-medium text-right">Fees Earned</th>
          </tr>
        </thead>
        <tbody>
          {creators.map((c, i) => (
            <tr
              key={c.wallet}
              className="group border-b border-border/50 transition-colors hover:bg-surface-hover/50 last:border-0"
              style={{
                animation: mounted ? `fade-in-up 0.3s ease-out both ${i * 30}ms` : "none",
              }}
            >
              <td className="py-3 pl-4 pr-2">
                <RankBadge rank={c.rank} />
              </td>
              <td className="py-3 px-2">
                <Link href={`/profile/${c.wallet}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{
                      background: `hsl(${(c.wallet.charCodeAt(0) * 51) % 360}, 45%, 28%)`,
                      color: `hsl(${(c.wallet.charCodeAt(0) * 51) % 360}, 55%, 65%)`,
                    }}
                  >
                    {c.wallet.slice(0, 2)}
                  </div>
                  <span className="font-mono text-[13px] text-text-2 hover:text-text-1 transition-colors">{c.wallet}…</span>
                </Link>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[13px] font-medium tabular-nums text-text-1">
                {c.launched}
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums hidden sm:table-cell">
                <span className="text-brand font-medium">{c.graduated}</span>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums hidden md:table-cell">
                <span style={{ color: c.gradRate >= 30 ? "var(--buy)" : "var(--text-3)" }}>
                  {c.gradRate}%
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono text-[12px] tabular-nums text-text-2 hidden md:table-cell">
                {formatSol(c.volume)}
              </td>
              <td className="py-3 pl-2 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums text-brand">
                +{c.feesEarned}
                <span className="text-[10px] font-normal text-text-3 ml-0.5">SOL</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HALL OF FAME CARD
   ═══════════════════════════════════════════════ */

function HallOfFameCard({
  token,
  index,
}: {
  token: (typeof MOCK_TOKENS)[0];
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative shrink-0 w-[250px] border bg-surface/60 backdrop-blur-sm overflow-hidden transition-transform duration-300"
      style={{
        borderColor: hovered ? `${token.color}50` : "var(--border)",
        animation: `fade-in-up 0.4s ease-out both ${index * 80}ms`,
        transform: hovered
          ? "perspective(600px) rotateY(-3deg) rotateX(2deg) scale(1.02)"
          : "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)",
        boxShadow: hovered ? `0 8px 30px -8px ${token.color}30` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Holographic border glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: `linear-gradient(135deg, ${token.color}15, transparent 50%, ${token.color}10)`,
        }}
      />

      {/* Animated gold border on top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${token.color}, transparent)`,
          backgroundSize: "200% 100%",
          animation: "gradient-x 3s ease infinite",
        }}
      />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-bg"
            style={{ background: token.color }}
          >
            {token.symbol.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-1 truncate">
              {token.name}
            </p>
            <p className="text-[11px] font-mono text-text-3">${token.symbol}</p>
          </div>
          <Star
            className="ml-auto h-4 w-4 shrink-0"
            style={{
              color: token.color,
              filter: `drop-shadow(0 0 4px ${token.color}80)`,
            }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-3">MCap</p>
            <p className="font-mono text-[12px] font-medium text-text-1">
              {formatSol(token.marketCap)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-3">Volume</p>
            <p className="font-mono text-[12px] text-text-2">
              {formatSol(token.volume24h)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-text-3">Age</p>
            <p className="font-mono text-[12px] text-text-2">{token.age}</p>
          </div>
        </div>

        {/* Graduated badge */}
        <div className="mt-3 flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: `${token.color}15`,
              color: token.color,
            }}
          >
            <Rocket className="h-2.5 w-2.5" />
            Graduated
          </div>
          <span className="text-[10px] text-text-3">→ Raydium</span>
        </div>
      </div>
    </div>
  );
}
