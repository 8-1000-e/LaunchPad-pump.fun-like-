"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ArrowUpDown, ChevronDown, ArrowRight, Rocket } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";

import { Footer } from "@/components/footer";
import { TokenCard, type TokenData } from "@/components/token-card";

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

/* ─── Mock data ─── */

const TOKENS: TokenData[] = [
  {
    id: "1", name: "Doge Killer", symbol: "DOGEK",
    price: 0.00234, priceChange24h: 142.5,
    marketCap: 67.8, volume24h: 23.4,
    graduationProgress: 79, status: "graduating",
    creator: "7xK2mBfR3nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "2h", color: C[0], sparkData: spark(1, true),
  },
  {
    id: "2", name: "Pepe Solana", symbol: "PEPES",
    price: 0.000891, priceChange24h: 34.2,
    marketCap: 42.1, volume24h: 15.7,
    graduationProgress: 49, status: "active",
    creator: "3pK9mBfR4nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "4h", color: C[1], sparkData: spark(2, true),
  },
  {
    id: "3", name: "CatWifHat", symbol: "CWH",
    price: 0.00567, priceChange24h: -12.3,
    marketCap: 89.2, volume24h: 31.8,
    graduationProgress: 100, status: "graduated",
    creator: "5xM2nCfR7nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "1d", color: C[2], sparkData: spark(3, false),
  },
  {
    id: "4", name: "MoonBoy", symbol: "MOON",
    price: 0.000042, priceChange24h: 5.2,
    marketCap: 3.6, volume24h: 1.8,
    graduationProgress: 4, status: "new",
    creator: "9kT3nGfR2nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "12m", color: C[3], sparkData: spark(4, true),
  },
  {
    id: "5", name: "Sol Ape", symbol: "SOLAPE",
    price: 0.00123, priceChange24h: 18.7,
    marketCap: 29.8, volume24h: 8.4,
    graduationProgress: 35, status: "active",
    creator: "2mN4pBfR8nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "6h", color: C[4], sparkData: spark(5, true),
  },
  {
    id: "6", name: "Froggy", symbol: "FROG",
    price: 0.00345, priceChange24h: 67.3,
    marketCap: 72.4, volume24h: 28.9,
    graduationProgress: 85, status: "graduating",
    creator: "8jR5kCfR1nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "8h", color: C[5], sparkData: spark(6, true),
  },
  {
    id: "7", name: "SigmaGrind", symbol: "SIGMA",
    price: 0.00198, priceChange24h: -4.1,
    marketCap: 51.3, volume24h: 11.2,
    graduationProgress: 60, status: "active",
    creator: "4pL6mDfR9nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "12h", color: C[6], sparkData: spark(7, false),
  },
  {
    id: "8", name: "BasedChad", symbol: "BASED",
    price: 0.000234, priceChange24h: 231.5,
    marketCap: 12.8, volume24h: 9.1,
    graduationProgress: 15, status: "new",
    creator: "6nM8jBfR5nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "35m", color: C[7], sparkData: spark(8, true),
  },
  {
    id: "9", name: "We All Gonna Make It", symbol: "WAGMI",
    price: 0.00412, priceChange24h: -8.7,
    marketCap: 85.0, volume24h: 19.5,
    graduationProgress: 100, status: "graduated",
    creator: "1kP7nAfR6nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "2d", color: C[8], sparkData: spark(9, false),
  },
  {
    id: "10", name: "PumpKing", symbol: "PUMP",
    price: 0.00789, priceChange24h: 24.3,
    marketCap: 91.2, volume24h: 34.7,
    graduationProgress: 100, status: "graduated",
    creator: "7mQ9pCfR3nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "3d", color: C[9], sparkData: spark(10, true),
  },
  {
    id: "11", name: "GigaChad", symbol: "CHAD",
    price: 0.000089, priceChange24h: 12.0,
    marketCap: 7.5, volume24h: 3.2,
    graduationProgress: 9, status: "new",
    creator: "5jN2mEfR4nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "22m", color: C[10], sparkData: spark(11, true),
  },
  {
    id: "12", name: "RizzLord", symbol: "RIZZ",
    price: 0.00278, priceChange24h: 55.8,
    marketCap: 63.1, volume24h: 21.3,
    graduationProgress: 74, status: "graduating",
    creator: "3kM4nFfR8nDjY8zQpL4wV9eT6kA5hC1sN2gF8dP3nQr",
    createdAgo: "5h", color: C[11], sparkData: spark(12, true),
  },
];

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

  /* ─── Scroll tracking for parallax & transitions ─── */
  const [scrollY, setScrollY] = useState(0);
  const [heroH, setHeroH] = useState(800);

  useEffect(() => {
    setHeroH(window.innerHeight * 0.85);
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollProgress = Math.min(1, Math.max(0, scrollY / heroH));
  const tokenProgress = Math.min(
    1,
    Math.max(0, (scrollProgress - 0.3) / 0.5),
  );

  const tokens = useMemo(() => {
    let list = [...TOKENS];

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
  }, [query, filter, sort]);

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
        <Hero scrollProgress={scrollProgress} scrollY={scrollY} />

        <main
          className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-20"
          style={{
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
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tokens.map((token, i) => {
              const cardP = Math.min(
                1,
                Math.max(0, (tokenProgress - i * 0.05) / 0.2),
              );
              return (
                <div
                  key={token.id}
                  style={{
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

          {tokens.length === 0 && (
            <div className="py-24 text-center">
              <p className="text-[13px] text-text-3">
                No tokens match your search.
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
