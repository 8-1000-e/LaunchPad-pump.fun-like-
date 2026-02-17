"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Zap,
  Star,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Layers,
  Activity,
  DollarSign,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { Navbar } from "@/components/navbar";
import { TokenChart } from "@/components/token-chart";
import { TradeForm } from "@/components/trade-form";
import { TradeHistory } from "@/components/trade-history";
import { TickerPrice } from "@/components/ticker-price";
import { BondingCurveMini } from "@/components/bonding-curve-mini";
import { useTokenLaunchpad } from "@/hooks/use-token-launchpad";
import { useTokenMetadata } from "@/hooks/use-token-metadata";
import { useBondingCurveLive } from "@/hooks/use-bonding-curve-live";
import { useTradeData, type Timeframe } from "@/hooks/use-trade-data";
import { useSolPrice } from "@/hooks/use-sol-price";
import { DEFAULT_GRADUATION_THRESHOLD } from "@sdk/constants";
import type { BondingCurve } from "@sdk/types";

/* ─── Helpers ─── */

function shorten(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatPrice(p: number): string {
  if (p === 0) return "0";
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.001) return p.toFixed(6);
  // Very small — show significant digits
  const str = p.toFixed(20);
  const dot = str.indexOf(".");
  for (let i = dot + 1; i < str.length; i++) {
    if (str[i] !== "0") {
      return p.toFixed(Math.min(i - dot + 3, 14));
    }
  }
  return p.toFixed(10);
}

const TOKEN_DECIMALS = 1_000_000; // 10^6

function formatUsd(sol: number, solUsd: number | null): string | undefined {
  if (!solUsd) return undefined;
  const usd = sol * solUsd;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  // Very small USD values
  return `$${usd.toExponential(2)}`;
}
const GRADUATION_SOL =
  DEFAULT_GRADUATION_THRESHOLD.toNumber() / LAMPORTS_PER_SOL;

function computePrice(bc: BondingCurve): number {
  const vSol = bc.virtualSol.toNumber() / LAMPORTS_PER_SOL;
  const vToken = bc.virtualToken.toNumber() / TOKEN_DECIMALS;
  return vSol / vToken;
}

function computeGraduation(bc: BondingCurve): number {
  const realSol = bc.realSolReserves.toNumber() / LAMPORTS_PER_SOL;
  return Math.min(100, (realSol / GRADUATION_SOL) * 100);
}

function computeStatus(
  bc: BondingCurve,
  gradPct: number,
): "new" | "active" | "graduating" | "graduated" {
  if (bc.completed) return "graduated";
  if (gradPct > 75) return "graduating";
  if (gradPct < 10) return "new";
  return "active";
}

function computeMarketCap(bc: BondingCurve, price: number): number {
  const totalSupply = bc.tokenTotalSupply.toNumber() / TOKEN_DECIMALS;
  return price * totalSupply;
}

/* ─── Status badge ─── */

function StatusBadge({ status }: { status: string }) {
  if (status === "new")
    return (
      <span className="inline-flex items-center gap-1 bg-status-new/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-status-new">
        NEW
      </span>
    );
  if (status === "graduating")
    return (
      <span
        className="inline-flex items-center gap-1 bg-status-graduating/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-status-graduating"
        style={{ animation: "graduating-glow 2.5s ease-in-out infinite" }}
      >
        <Zap className="h-2.5 w-2.5" /> GRADUATING
      </span>
    );
  if (status === "graduated")
    return (
      <span className="inline-flex items-center gap-1 bg-status-graduated/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-status-graduated">
        <Star className="h-2.5 w-2.5" /> GRADUATED
      </span>
    );
  return null;
}

/* ─── Stats card ─── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-border bg-surface/40 p-3">
      <div className="flex items-center gap-1.5 text-text-3">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 font-mono text-[16px] font-bold tabular-nums text-text-1">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-text-3">{sub}</p>}
    </div>
  );
}

/* ─── Mobile drawer with swipe-to-close ─── */

function MobileDrawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startYRef.current;
    // Only allow dragging down
    setDragY(Math.max(0, dy));
  }

  function onTouchEnd() {
    setDragging(false);
    if (dragY > 120) {
      onClose();
    } else {
      setDragY(0);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: Math.max(0, 1 - dragY / 300) }}
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-bg border-t border-border"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s ease-out",
          animation: dragY === 0 && !dragging ? "slide-up 0.25s ease-out" : "none",
        }}
      >
        {/* Drag handle */}
        <div
          className="sticky top-0 z-10 flex justify-center bg-bg pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Default color based on mint address ─── */
const COLORS = [
  "#c9a84c", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6",
  "#ec4899", "#f59e0b", "#06b6d4", "#84cc16", "#f97316",
  "#14b8a6", "#6366f1",
];
function mintColor(mint: string): string {
  const hash = mint.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

/* ─── Page ─── */

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { client, connection } = useTokenLaunchpad();
  const solUsd = useSolPrice();

  const [bondingCurve, setBondingCurve] = useState<BondingCurve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live WebSocket updates
  const liveBondingCurve = useBondingCurveLive(id, bondingCurve);
  // Use live data when available, fallback to initial fetch
  const activeCurve = liveBondingCurve || bondingCurve;

  // Metaplex metadata
  const { metadata } = useTokenMetadata(id);
  const tokenName = metadata?.name || `Token ${id.slice(0, 6)}`;
  const tokenSymbol = metadata?.symbol || id.slice(0, 4).toUpperCase();
  const tokenImage = metadata?.image || null;
  const tokenDescription = metadata?.description || null;
  const tokenExtensions = metadata?.extensions;

  // Trade data (shared between chart + trade history) — fetches all available trades once
  const [chartTimeframe, setChartTimeframe] = useState<Timeframe>("15m");
  const { trades, loading: tradesLoading, error: tradesError } = useTradeData(id);

  const [mintCopied, setMintCopied] = useState(false);
  const [tradeOpen, setTradeOpen] = useState(false);

  /* ─── Fetch bonding curve data ─── */
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const mintPk = new PublicKey(id);

        // Try fetching via client first, fallback to raw connection
        if (client) {
          const bc = await client.getBondingCurve(mintPk);
          setBondingCurve(bc);
        } else {
          // Without a wallet we can still read accounts using a read-only provider
          // For now, we need the client — show a message
          // Actually, let's try to create a minimal read-only setup
          const { TokenLaunchpadClient } = await import("@sdk/client");
          const { AnchorProvider } = await import("@coral-xyz/anchor");
          const readOnlyProvider = new AnchorProvider(
            connection,
            { publicKey: PublicKey.default, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs } as any,
            { commitment: "confirmed" },
          );
          const readClient = new TokenLaunchpadClient(readOnlyProvider);
          const bc = await readClient.getBondingCurve(mintPk);
          setBondingCurve(bc);
        }

        // Metadata is handled by useTokenMetadata hook
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load token";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, client, connection]);

  /* ─── Real price from bonding curve ─── */
  const price = activeCurve ? computePrice(activeCurve) : 0;
  const prevPriceRef = useRef(0);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price > 0 && prevPriceRef.current > 0 && price !== prevPriceRef.current) {
      setPriceFlash(price > prevPriceRef.current ? "up" : "down");
      const t = setTimeout(() => setPriceFlash(null), 400);
      prevPriceRef.current = price;
      return () => clearTimeout(t);
    }
    if (price > 0) prevPriceRef.current = price;
  }, [price]);

  /* ─── Graduation heat particles ─── */
  const heatCanvasRef = useRef<HTMLCanvasElement>(null);
  const gradPct = activeCurve ? computeGraduation(activeCurve) : 0;
  const status = activeCurve ? computeStatus(activeCurve, gradPct) : "new";

  useEffect(() => {
    if (!activeCurve || gradPct < 75) return;

    const canvas = heatCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const intensity = Math.min(1, (gradPct - 75) / 25);
    const count = Math.floor(12 + intensity * 28);

    interface HeatParticle {
      x: number;
      y: number;
      vy: number;
      size: number;
      opacity: number;
      wobble: number;
      speed: number;
    }

    const particles: HeatParticle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 100,
      vy: -(0.3 + Math.random() * 0.8) * (0.5 + intensity),
      size: 1 + Math.random() * 2.5,
      opacity: 0.2 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    }));

    let frame: number;
    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        p.y += p.vy;
        p.wobble += 0.02;
        p.x += Math.sin(p.wobble * p.speed) * 0.4;
        if (p.y < -20) {
          p.y = canvas!.height + 10;
          p.x = Math.random() * canvas!.width;
        }
        const fadeTop = Math.min(1, p.y / (canvas!.height * 0.3));
        ctx!.globalAlpha = p.opacity * fadeTop;
        ctx!.fillStyle = "#f59e0b";
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    });
    ro.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeCurve, gradPct]);

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-[13px] text-text-3">Loading token data...</p>
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error || !activeCurve) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-text-3">{error || "Token not found."}</p>
        <Link href="/" className="text-[13px] text-brand hover:text-brand-bright">
          Back to home
        </Link>
      </div>
    );
  }

  const color = tokenExtensions?.color || mintColor(id);
  const bannerImage = tokenExtensions?.banner || null;
  const realSol = activeCurve.realSolReserves.toNumber() / LAMPORTS_PER_SOL;
  const marketCap = computeMarketCap(activeCurve, price);
  const totalSupply = activeCurve.tokenTotalSupply.toNumber() / TOKEN_DECIMALS;

  const gradColor =
    gradPct > 80
      ? "var(--status-graduating)"
      : gradPct > 50
        ? "var(--brand)"
        : "var(--text-3)";

  function handleCopyMint() {
    navigator.clipboard.writeText(id);
    setMintCopied(true);
    setTimeout(() => setMintCopied(false), 2000);
  }

  return (
    <div className="relative min-h-screen bg-bg">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(201,168,76,0.08),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--text-3) 0.5px, transparent 0.5px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>
      <div className="noise-overlay" />

      {/* ── Graduation heat particles canvas ── */}
      <canvas
        ref={heatCanvasRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: Math.max(0, Math.min(0.7, (gradPct - 75) / 25 * 0.7)) }}
      />

      {/* ── Graduation heat border glow ── */}
      {gradPct > 75 && (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            boxShadow: `inset 0 0 ${60 + (gradPct - 75) * 3}px -20px rgba(245,158,11,${0.05 + (gradPct - 75) / 25 * 0.12})`,
            animation: "graduating-glow 3s ease-in-out infinite",
          }}
        />
      )}

      <div className="relative">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 pt-6 pb-24 lg:pb-20 sm:px-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-text-3 transition-colors hover:text-text-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All tokens
          </Link>

          {/* ─── Banner ─── */}
          <div
            className="relative mt-4 h-[160px] w-full overflow-hidden sm:h-[180px]"
            style={
              bannerImage
                ? { backgroundImage: `url(${bannerImage})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: `linear-gradient(135deg, ${color}30 0%, ${color}10 40%, transparent 70%), linear-gradient(225deg, ${color}20 0%, transparent 50%), var(--surface)` }
            }
          >
            {!bannerImage && (
              <>
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, var(--text-3) 0.5px, transparent 0.5px)",
                    backgroundSize: "18px 18px",
                  }}
                />
                <div
                  className="absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full opacity-20 blur-[80px]"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="absolute -left-10 bottom-0 h-[150px] w-[300px] rounded-full opacity-10 blur-[60px]"
                  style={{ backgroundColor: color }}
                />
              </>
            )}
          </div>

          {/* ─── Token Header (overlaps banner) ─── */}
          <div className="relative px-1">
            {tokenImage ? (
              <img
                src={tokenImage}
                alt={tokenName}
                className="-mt-10 mb-3 h-[72px] w-[72px] shrink-0 border-[3px] border-bg shadow-lg object-cover"
              />
            ) : (
              <div
                className="-mt-10 mb-3 flex h-[72px] w-[72px] shrink-0 items-center justify-center border-[3px] border-bg text-[24px] font-bold text-bg shadow-lg"
                style={{ backgroundColor: color }}
              >
                {tokenSymbol.slice(0, 2)}
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="font-display text-xl font-bold text-text-1 sm:text-2xl">
                  {tokenName}
                </h1>
                <span className="font-mono text-[14px] text-text-3">
                  ${tokenSymbol}
                </span>
                <StatusBadge status={status} />
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xl sm:text-3xl text-text-1">
                  <TickerPrice price={price} flash={priceFlash} />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-text-3">SOL</span>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-text-3">
              <button
                onClick={handleCopyMint}
                className="inline-flex items-center gap-1 font-mono transition-colors hover:text-text-2"
              >
                {shorten(id)}
                {mintCopied ? (
                  <Check className="h-3 w-3 text-buy" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
              <span>
                Created by{" "}
                <Link href={`/profile/${activeCurve.creator.toBase58()}`} className="font-mono text-text-2 hover:text-text-1 transition-colors">
                  {shorten(activeCurve.creator.toBase58())}
                </Link>
              </span>
            </div>

            {/* Description */}
            {tokenDescription && (
              <p className="mt-3 text-[13px] leading-relaxed text-text-2 max-w-2xl">
                {tokenDescription}
              </p>
            )}

            {/* Social links */}
            {tokenExtensions && (tokenExtensions.twitter || tokenExtensions.telegram || tokenExtensions.website) && (
              <div className="mt-2 flex items-center gap-3">
                {tokenExtensions.twitter && (
                  <a
                    href={`https://x.com/${tokenExtensions.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-text-3 hover:text-text-1 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    @{tokenExtensions.twitter}
                  </a>
                )}
                {tokenExtensions.telegram && (
                  <a
                    href={tokenExtensions.telegram.startsWith("http") ? tokenExtensions.telegram : `https://${tokenExtensions.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-text-3 hover:text-text-1 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Telegram
                  </a>
                )}
                {tokenExtensions.website && (
                  <a
                    href={tokenExtensions.website.startsWith("http") ? tokenExtensions.website : `https://${tokenExtensions.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-text-3 hover:text-text-1 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Website
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ─── 2 Column Layout ─── */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN */}
            <div className="space-y-6 min-w-0">
              {/* Chart */}
              <div className="border border-border bg-surface/40 p-4">
                <TokenChart
                  color={color}
                  trades={trades}
                  loading={tradesLoading}
                  timeframe={chartTimeframe}
                  onTimeframeChange={setChartTimeframe}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={DollarSign}
                  label="Price"
                  value={`${formatPrice(price)} SOL`}
                  sub={formatUsd(price, solUsd)}
                />
                <StatCard
                  icon={TrendingUp}
                  label="Market Cap"
                  value={`${marketCap.toFixed(1)} SOL`}
                  sub={formatUsd(marketCap, solUsd)}
                />
                <StatCard
                  icon={BarChart3}
                  label="Reserve"
                  value={`${realSol.toFixed(2)} SOL`}
                  sub={formatUsd(realSol, solUsd)}
                />
                <StatCard
                  icon={Layers}
                  label="Total Supply"
                  value={formatNum(totalSupply)}
                />
                <StatCard
                  icon={Activity}
                  label="Virtual SOL"
                  value={`${(activeCurve.virtualSol.toNumber() / LAMPORTS_PER_SOL).toFixed(2)}`}
                />
                <StatCard
                  icon={Activity}
                  label="Virtual Tokens"
                  value={formatNum(activeCurve.virtualToken.toNumber() / TOKEN_DECIMALS)}
                />
              </div>

              {/* Graduation Progress */}
              <div className="border border-border bg-surface/40 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-medium uppercase tracking-wider text-text-3">
                    Graduation Progress
                  </h3>
                  <span className="font-mono text-[13px] font-bold" style={{ color: gradColor }}>
                    {gradPct.toFixed(0)}%
                  </span>
                </div>

                <div className="mt-3 h-3 w-full overflow-hidden bg-border/40">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${gradPct}%`,
                      background: `linear-gradient(90deg, var(--brand-dim), ${gradColor})`,
                      animation:
                        gradPct > 75
                          ? "graduating-glow 2.5s ease-in-out infinite"
                          : "none",
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-text-2">
                    {realSol.toFixed(2)} SOL
                  </span>
                  <span className="text-text-3">/ {GRADUATION_SOL} SOL to graduate</span>
                </div>

                <div className="mt-4 h-24">
                  <BondingCurveMini
                    progress={gradPct}
                    color={gradColor}
                  />
                </div>

                {status === "graduated" && (
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-status-graduated">
                    <Star className="h-3.5 w-3.5" />
                    <span>Graduated to Raydium</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Trade History */}
              <TradeHistory
                tokenSymbol={tokenSymbol}
                trades={trades}
                loading={tradesLoading}
                error={tradesError}
              />
            </div>

            {/* RIGHT COLUMN — Sticky trade form (desktop only) */}
            <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start">
              <TradeForm
                tokenSymbol={tokenSymbol}
                tokenPrice={price}
                color={color}
                mint={id}
                virtualSol={activeCurve.virtualSol}
                virtualToken={activeCurve.virtualToken}
                tokenImage={tokenImage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile floating buy button ── */}
      <button
        onClick={() => setTradeOpen(true)}
        className="fixed bottom-5 left-4 right-4 z-50 flex items-center justify-center gap-2 py-3.5 text-[14px] font-semibold text-bg lg:hidden"
        style={{
          background: "var(--buy)",
          boxShadow: "0 4px 24px -4px rgba(34,197,94,0.4)",
        }}
      >
        <span className="font-display">Buy ${tokenSymbol}</span>
      </button>

      {/* ── Mobile trade drawer (swipe to close) ── */}
      {tradeOpen && (
        <MobileDrawer onClose={() => setTradeOpen(false)}>
          <TradeForm
            tokenSymbol={tokenSymbol}
            tokenPrice={price}
            color={color}
            mint={id}
            virtualSol={activeCurve.virtualSol}
            virtualToken={activeCurve.virtualToken}
          />
        </MobileDrawer>
      )}
    </div>
  );
}
