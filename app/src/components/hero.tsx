"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Rocket, TrendingUp, Zap, ChevronDown } from "lucide-react";

/* ── Dynamic import for Three.js (no SSR) ── */
const BondingCurve3D = dynamic(
  () =>
    import("./bonding-curve-3d").then((m) => ({
      default: m.BondingCurve3D,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-text-3 text-xs font-mono">Loading...</div>
      </div>
    ),
  },
);

/* ── Animated counter hook ── */

function useCounter(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

/* ── Detect weak hardware ── */

function useCanHandle3D() {
  const [can, setCan] = useState(true);
  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 2;
    if (cores < 4) {
      setCan(false);
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setCan(false);
    } catch {
      setCan(false);
    }
  }, []);
  return can;
}

/* ── SVG Fallback ── */

function BondingCurveFallback() {
  const points: string[] = [];
  let y = 100;
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * 380;
    y += (Math.random() - 0.35) * 8;
    y = Math.max(20, Math.min(110, y));
    if (i > 40) y -= 1.5;
    points.push(`${x},${120 - Math.max(10, y)}`);
  }
  const line = points.join(" ");

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <svg viewBox="0 0 380 130" className="w-full h-full opacity-40">
        <defs>
          <linearGradient id="fb-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a7034" />
            <stop offset="100%" stopColor="#dbb85e" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={i * 30}
            x2="380"
            y2={i * 30}
            stroke="#2e2b28"
            strokeWidth="0.5"
          />
        ))}
        <polyline
          points={line}
          fill="none"
          stroke="url(#fb-stroke)"
          strokeWidth="2"
          strokeDasharray="600"
          strokeDashoffset="0"
          style={{ animation: "draw-curve 3s ease-out both" }}
        />
      </svg>
    </div>
  );
}

/* ── Hero Component — Full-screen immersive canvas ── */

export function Hero({
  scrollProgress = 0,
  scrollY = 0,
}: {
  scrollProgress?: number;
  scrollY?: number;
}) {
  const tokensCount = useCounter(1247, 1400, 400);
  const volumeCount = useCounter(4521, 1400, 600);
  const graduatingCount = useCounter(3, 600, 800);
  const canHandle3D = useCanHandle3D();

  const handlePriceUpdate = useCallback(
    (_price: number, _isSell: boolean) => {
      /* price update received — used for 3D animation only */
    },
    [],
  );

  /* ── Scroll-linked values ── */
  const canvasFade = Math.max(0, 1 - scrollProgress * 1.2);
  const canvasBlur = scrollProgress * 25;
  const canvasScale = 1 + scrollProgress * 0.2; // zoom-in as you scroll down
  const textFade = Math.max(0, 1 - scrollProgress * 1.5);
  const textShift = -scrollProgress * 100;
  const textScale = 1 - scrollProgress * 0.08;

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden">
      {/* ── 3D Canvas background — fills entire hero, 0.5x parallax ── */}
      <div
        className="absolute inset-0"
        style={{
          opacity: canvasFade,
          filter: canvasBlur > 0.5 ? `blur(${canvasBlur}px)` : "none",
          transform: `translateY(${scrollY * 0.5}px) scale(${canvasScale})`,
          transformOrigin: "center center",
          willChange: "opacity, filter, transform",
        }}
      >
        {canHandle3D ? (
          <BondingCurve3D onPriceUpdate={handlePriceUpdate} />
        ) : (
          <BondingCurveFallback />
        )}
      </div>

      {/* ── Readability gradients ── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0c0a09]/90 via-[#0c0a09]/50 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-transparent to-[#0c0a09]/20" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0c0a09]/40 to-transparent h-[30%]" />

      {/* ── Content overlay — scroll fade + translate ── */}
      <div
        style={{
          opacity: textFade,
          transform: `translateY(${textShift}px) scale(${textScale})`,
          transformOrigin: "left center",
          willChange: "opacity, transform",
        }}
      >
        <div className="relative z-10 flex h-[85vh] min-h-[600px] items-end pb-16 sm:items-center sm:pb-0">
          <div className="mx-auto max-w-7xl w-full px-4 sm:px-6">
            <div className="max-w-lg">
              {/* Headline */}
              <h1
                className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                style={{
                  animation: "count-fade 0.7s ease-out both 100ms",
                  background:
                    "linear-gradient(135deg, var(--brand) 0%, var(--text-1) 35%, var(--text-1) 65%, var(--brand-bright) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Launch tokens.
                <br />
                Watch them fly.
              </h1>

              <p
                className="mt-3 max-w-md text-[14px] leading-relaxed text-text-3"
                style={{ animation: "count-fade 0.6s ease-out both 250ms" }}
              >
                Create meme tokens on Solana with automatic bonding curves.
                Trade instantly. Graduate to Raydium.
              </p>

              {/* Stats */}
              <div className="mt-8 flex flex-wrap items-start gap-8 sm:gap-10">
                <div
                  style={{ animation: "count-fade 0.5s ease-out both 400ms" }}
                >
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-brand" />
                    <p className="font-mono text-2xl font-bold tabular-nums text-brand sm:text-3xl">
                      {tokensCount.toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-text-3">
                    tokens launched
                  </p>
                </div>

                <div
                  style={{ animation: "count-fade 0.5s ease-out both 550ms" }}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-text-3" />
                    <p className="font-mono text-2xl font-bold tabular-nums text-text-1 sm:text-3xl">
                      {volumeCount.toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-text-3">
                    SOL volume
                  </p>
                </div>

                <div
                  style={{ animation: "count-fade 0.5s ease-out both 700ms" }}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-status-graduating" />
                    <p className="font-mono text-2xl font-bold tabular-nums text-status-graduating sm:text-3xl">
                      {graduatingCount}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-text-3">
                    graduating now
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div
                className="mt-10"
                style={{ animation: "count-fade 0.5s ease-out both 800ms" }}
              >
                <a
                  href="/create"
                  className="group relative inline-flex items-center gap-2.5 overflow-hidden px-7 py-3.5 text-sm font-semibold text-bg transition-transform hover:scale-[1.03] active:scale-[0.97]"
                  style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-brand via-brand-bright to-brand"
                    style={{
                      backgroundSize: "200% 100%",
                      animation: "gradient-x 4s ease infinite",
                    }}
                  />
                  <span className="relative font-display">
                    Launch a token
                  </span>
                  <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ── Scroll indicator ── */}
      <div
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1"
        style={{
          opacity: Math.max(0, 1 - scrollProgress * 4),
          transition: "opacity 0.15s",
          pointerEvents: scrollProgress > 0.15 ? "none" : "auto",
        }}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-3">
          Explore tokens
        </span>
        <ChevronDown
          className="h-4 w-4 text-text-3"
          style={{ animation: "scroll-bounce 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}
