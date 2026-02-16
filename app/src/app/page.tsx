"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown, ChevronDown, ArrowRight, Rocket, TrendingUp, Zap, Loader2 } from "lucide-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";

import { Footer } from "@/components/footer";
import { TokenCard, type TokenData } from "@/components/token-card";
import { useTokenLaunchpad } from "@/hooks/use-token-launchpad";
import { fetchBatchMetadata } from "@/hooks/use-token-metadata";
import { DEFAULT_GRADUATION_THRESHOLD } from "@sdk/constants";

/* ─── Deterministic sparkline data generator ─── */

function spark(seed: number, up: boolean): number[] {
  const d: number[] = [];
  let v = 40 + ((seed * 13) % 25);
  for (let i = 0; i < 20; i++) {
    v +=
      (up ? 0.5 : -0.3) +
      Math.sin(i * 1.2 + seed * 3.7) * 4 +
      Math.cos(i * 0.7 + seed * 2.1) * 3;
    v = Math.max(8, Math.min(92, v));
    d.push(Math.round(v * 10) / 10);
  }
  return d;
}

/* ─── Colors for token icons ─── */

const C = [
  "#c9a84c", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6",
  "#ec4899", "#f59e0b", "#06b6d4", "#84cc16", "#f97316",
  "#14b8a6", "#6366f1",
];

const TOKEN_DECIMALS = 1_000_000;
const GRADUATION_SOL = DEFAULT_GRADUATION_THRESHOLD.toNumber() / LAMPORTS_PER_SOL;

/* ─── Filter / sort ─── */

type Filter = "trending" | "new" | "graduating" | "graduated";
type Sort = "mcap" | "volume" | "newest" | "graduating";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "new", label: "New" },
  { value: "graduating", label: "Graduating" },
  { value: "graduated", label: "Graduated" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "mcap", label: "Market Cap" },
  { value: "volume", label: "Volume" },
  { value: "newest", label: "Newest" },
  { value: "graduating", label: "Graduating" },
];

/* ─── Page ─── */

export default function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("trending");
  const [sort, setSort] = useState<Sort>("mcap");
  const [sortOpen, setSortOpen] = useState(false);

  /* ─── On-chain token data ─── */
  const { client, connection } = useTokenLaunchpad();
  const [onChainTokens, setOnChainTokens] = useState<TokenData[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  useEffect(() => {
    async function fetchTokens() {
      setLoadingTokens(true);
      try {
        // Create a read-only client if wallet not connected
        let fetchClient = client;
        if (!fetchClient) {
          const { TokenLaunchpadClient } = await import("@sdk/client");
          const { AnchorProvider } = await import("@coral-xyz/anchor");
          const readOnlyProvider = new AnchorProvider(
            connection,
            { publicKey: PublicKey.default, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs } as any,
            { commitment: "confirmed" },
          );
          fetchClient = new TokenLaunchpadClient(readOnlyProvider);
        }

        const accounts = await fetchClient.listAllBondingCurves();
        const mints = accounts.map((acc) => acc.account.mint.toBase58());

        // Fetch metadata in parallel
        const metadataMap = await fetchBatchMetadata(connection, mints);

        // Filter out tokens without metadata URI (broken/test tokens)
        const withMetadata = accounts.filter((acc) => {
          const meta = metadataMap.get(acc.account.mint.toBase58());
          return meta && meta.uri;
        });

        const mapped: TokenData[] = withMetadata.map((acc) => {
          const bc = acc.account;
          const mintAddr = bc.mint.toBase58();
          const meta = metadataMap.get(mintAddr);

          const vSol = bc.virtualSol.toNumber() / LAMPORTS_PER_SOL;
          const vToken = bc.virtualToken.toNumber() / TOKEN_DECIMALS;
          const price = vSol / vToken;

          const totalSupply = bc.tokenTotalSupply.toNumber() / TOKEN_DECIMALS;
          const marketCap = price * totalSupply;

          const realSol = bc.realSolReserves.toNumber() / LAMPORTS_PER_SOL;
          const gradPct = Math.min(100, (realSol / GRADUATION_SOL) * 100);

          let status: TokenData["status"] = "active";
          if (bc.completed) status = "graduated";
          else if (gradPct > 75) status = "graduating";
          else if (gradPct < 10) status = "new";

          const hash = mintAddr.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);

          return {
            id: mintAddr,
            name: meta?.name || `Token ${mintAddr.slice(0, 6)}`,
            symbol: meta?.symbol || mintAddr.slice(0, 4).toUpperCase(),
            price,
            priceChange24h: 0,
            marketCap,
            volume24h: 0,
            graduationProgress: Math.round(gradPct),
            status,
            creator: bc.creator.toBase58(),
            createdAgo: "on-chain",
            color: meta?.extensions?.color || C[hash % C.length],
            sparkData: spark(hash, price > 0.00003),
            image: meta?.image || null,
          };
        });

        setOnChainTokens(mapped);
      } catch (err) {
        console.error("Failed to fetch tokens:", err);
        setOnChainTokens([]);
      } finally {
        setLoadingTokens(false);
      }
    }
    fetchTokens();
  }, [client, connection]);

  /* ─── Scroll tracking for parallax & transitions ─── */
  const [scrollY, setScrollY] = useState(0);
  const [heroH, setHeroH] = useState(800);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    setHeroH(mobile ? 400 : window.innerHeight * 0.85);

    // Enable snap scroll on home page only (desktop)
    if (!mobile) document.documentElement.classList.add("snap-page");

    // Load Unicorn Studio
    if (!(window as any).UnicornStudio) {
      (window as any).UnicornStudio = { isInitialized: false };
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
      script.onload = () => {
        if (!(window as any).UnicornStudio.isInitialized) {
          (window as any).UnicornStudio.init();
          (window as any).UnicornStudio.isInitialized = true;
        }
      };
      document.head.appendChild(script);
    } else if ((window as any).UnicornStudio?.init) {
      // Re-init if script already loaded (e.g. navigation back)
      (window as any).UnicornStudio.init();
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.documentElement.classList.remove("snap-page");
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollProgress = Math.min(1, Math.max(0, scrollY / heroH));
  const tokenProgress = Math.min(
    1,
    Math.max(0, (scrollProgress - 0.3) / 0.5),
  );

  const tokens = useMemo(() => {
    let list = [...onChainTokens];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q),
      );
    }

    if (filter === "new") list = list.filter((t) => t.status === "new");
    else if (filter === "graduating")
      list = list.filter((t) => t.status === "graduating");
    else if (filter === "graduated")
      list = list.filter((t) => t.status === "graduated");

    switch (sort) {
      case "mcap":
        list.sort((a, b) => b.marketCap - a.marketCap);
        break;
      case "volume":
        list.sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "newest":
        list.sort((a, b) => a.graduationProgress - b.graduationProgress);
        break;
      case "graduating":
        list.sort((a, b) => b.graduationProgress - a.graduationProgress);
        break;
    }

    return list;
  }, [query, filter, sort, onChainTokens]);

  return (
    <div className="relative min-h-screen">
      {/* ── Background effects — 0.3x parallax ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          transform: `translateY(${-scrollY * 0.3}px)`,
          willChange: "transform",
        }}
      >
        {/* Large ambient gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-5%,rgba(201,168,76,0.16),transparent_60%)]" />
        {/* Secondary warm glow bottom-right */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_85%_85%,rgba(245,158,11,0.08),transparent_50%)]" />
        {/* Tertiary brand glow center-left */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_50%,rgba(201,168,76,0.06),transparent_45%)]" />

        {/* Dot grid — 6% opacity */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--text-3) 0.5px, transparent 0.5px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating gold orbs */}
        <div
          className="absolute top-[5%] left-[10%] h-[700px] w-[700px] rounded-full bg-brand/[0.10] blur-[140px]"
          style={{ animation: "float-orb-1 25s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[45%] right-[5%] h-[650px] w-[650px] rounded-full bg-brand/[0.12] blur-[160px]"
          style={{ animation: "float-orb-2 20s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[0%] left-[35%] h-[550px] w-[550px] rounded-full bg-status-graduating/[0.08] blur-[140px]"
          style={{ animation: "float-orb-3 30s ease-in-out infinite" }}
        />
      </div>

      {/* Noise grain texture (no parallax — stays fixed) */}
      <div className="noise-overlay" />

      {/* ── Unicorn Studio 3D background ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={isMobile ? { opacity: 1 } : {
          // Desktop: cross-fade starts at 20% scroll, full at 55%
          opacity: Math.min(1, Math.max(0, (scrollProgress - 0.2) / 0.35)),
          willChange: "opacity",
        }}
      >
        <div
          data-us-project="cqcLtDwfoHqqRPttBbQE"
          data-us-disablemouse
          className="absolute inset-0"
          style={{ filter: "sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85)" }}
        />
        {/* Readability overlay — darker on mobile for text legibility */}
        <div className={`absolute inset-0 ${isMobile ? "bg-bg/60" : "bg-bg/30"}`} />
      </div>

      {/* ── Floating CTA — appears after scrolling past hero ── */}
      <a
        href="/create"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 overflow-hidden px-5 py-3 text-[13px] font-semibold text-bg shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          opacity: scrollProgress > 0.5 ? 1 : 0,
          transform: `translateY(${scrollProgress > 0.5 ? 0 : 20}px)`,
          pointerEvents: scrollProgress > 0.5 ? "auto" : "none",
          animation: scrollProgress > 0.5 ? "pulse-glow 3s ease-in-out infinite" : "none",
        }}
      >
        <span
          className="absolute inset-0 bg-gradient-to-r from-brand via-brand-bright to-brand"
          style={{
            backgroundSize: "200% 100%",
            animation: "gradient-x 4s ease infinite",
          }}
        />
        <Rocket className="relative h-3.5 w-3.5" />
        <span className="relative font-display">Launch a token</span>
        <ArrowRight className="relative h-3.5 w-3.5" />
      </a>

      {/* ── Content ── */}
      <div className="relative">
        <Navbar />
        <div className="snap-section">
          <Hero scrollProgress={scrollProgress} scrollY={scrollY} />
        </div>

        {/* ── Mobile inline header (no hero section) ── */}
        {isMobile && (
          <div className="relative z-10 px-4 pt-4 pb-2">
            <h1
              className="font-display text-4xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, var(--brand) 0%, var(--text-1) 35%, var(--text-1) 65%, var(--brand-bright) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Launch tokens.<br />Watch them fly.
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-text-3">
              Create meme tokens on Solana with automatic bonding curves.
            </p>
            <div className="mt-4 flex items-center gap-5">
              <div>
                <div className="flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5 text-brand" />
                  <span className="font-mono text-lg font-bold tabular-nums text-brand">1,247</span>
                </div>
                <p className="text-[9px] uppercase tracking-widest text-text-3">tokens</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-text-3" />
                  <span className="font-mono text-lg font-bold tabular-nums text-text-1">4,521</span>
                </div>
                <p className="text-[9px] uppercase tracking-widest text-text-3">SOL vol</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-status-graduating" />
                  <span className="font-mono text-lg font-bold tabular-nums text-status-graduating">3</span>
                </div>
                <p className="text-[9px] uppercase tracking-widest text-text-3">graduating</p>
              </div>
            </div>
            <a
              href="/create"
              className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden px-5 py-2.5 text-[13px] font-semibold text-bg"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-brand via-brand-bright to-brand"
                style={{ backgroundSize: "200% 100%", animation: "gradient-x 4s ease infinite" }}
              />
              <span className="relative font-display">Launch a token</span>
              <ArrowRight className="relative h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <main
          className="snap-section mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-8 pb-20"
          style={isMobile ? {} : {
            opacity: Math.min(1, tokenProgress * 1.8),
            transform: `translateY(${Math.max(0, (1 - tokenProgress) * 100)}px) scale(${0.92 + tokenProgress * 0.08})`,
            transformOrigin: "top center",
            willChange: "opacity, transform",
          }}
        >
          {/* ── Search ── */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or symbol…"
              className="w-full border border-border bg-surface py-3 pl-11 pr-4 text-[13px] text-text-1 placeholder:text-text-3 transition-colors focus:border-brand/40 focus:outline-none"
            />
          </div>

          {/* ── Filters + Sort ── */}
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`whitespace-nowrap px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    filter === f.value
                      ? "text-brand border-b-2 border-brand"
                      : "text-text-3 hover:text-text-2"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-[12px] text-text-3 hover:text-text-2 transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {SORTS.find((s) => s.value === sort)?.label}
                </span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${sortOpen ? "rotate-180" : ""}`}
                />
              </button>

              {sortOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] border border-border bg-surface py-1">
                    {SORTS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => {
                          setSort(s.value);
                          setSortOpen(false);
                        }}
                        className={`block w-full px-3 py-1.5 text-left text-[13px] transition-colors ${
                          sort === s.value
                            ? "text-brand bg-brand/5"
                            : "text-text-2 hover:text-text-1 hover:bg-surface-hover"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Count ── */}
          <p className="mt-6 text-[11px] uppercase tracking-wider text-text-3">
            {tokens.length} token{tokens.length !== 1 && "s"}
          </p>

          {/* ── Grid ── */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {tokens.map((token, i) => {
              const cardP = isMobile
                ? 1
                : Math.min(1, Math.max(0, (tokenProgress - i * 0.05) / 0.2));
              return (
                <div
                  key={token.id}
                  style={isMobile ? { animation: `count-fade 0.4s ease-out both ${i * 50}ms` } : {
                    opacity: cardP,
                    transform: `translateY(${(1 - cardP) * 60}px) scale(${0.9 + cardP * 0.1})`,
                    willChange: "opacity, transform",
                  }}
                >
                  <TokenCard token={token} index={i} />
                </div>
              );
            })}
          </div>

          {loadingTokens && (
            <div className="py-24 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <p className="text-[13px] text-text-3">Loading tokens from devnet...</p>
            </div>
          )}

          {!loadingTokens && tokens.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-[13px] text-text-3">
                {onChainTokens.length === 0
                  ? "No tokens on-chain yet. Be the first to launch!"
                  : "No tokens match your search."}
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
