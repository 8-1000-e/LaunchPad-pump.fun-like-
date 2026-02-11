"use client";

import { Coins, ArrowLeftRight, GraduationCap } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Create a token",
    desc: "Pick a name, symbol, and image. Your token launches instantly on a bonding curve — no code, no liquidity needed.",
    icon: Coins,
    accent: "var(--brand)",
  },
  {
    num: "02",
    title: "Trade on the curve",
    desc: "Anyone can buy and sell immediately. The bonding curve sets the price automatically — more buys, higher price.",
    icon: ArrowLeftRight,
    accent: "var(--buy)",
  },
  {
    num: "03",
    title: "Graduate to Raydium",
    desc: "When the curve fills to 85 SOL, liquidity migrates to Raydium. Your token is now fully tradeable on the open market.",
    icon: GraduationCap,
    accent: "var(--status-graduating)",
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Section header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand">
            How it works
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-text-1 sm:text-3xl">
            From zero to DEX in three steps
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-text-3">
            No coding. No seed liquidity. Just launch, trade, and graduate.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4 lg:gap-6">
          {/* Connecting line (desktop only) */}
          <div className="pointer-events-none absolute top-16 left-[20%] right-[20%] hidden md:block">
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--border-hover) 20%, var(--border-hover) 80%, transparent)",
              }}
            />
          </div>

          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className="group relative"
              style={{
                animation: `fade-in-up 0.5s ease-out both ${200 + i * 150}ms`,
              }}
            >
              <div className="relative flex flex-col items-center text-center">
                {/* Icon circle */}
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full border transition-colors duration-300"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      boxShadow: `0 0 30px -8px ${step.accent}`,
                    }}
                  />
                  <step.icon
                    className="relative h-5 w-5 transition-colors duration-300"
                    style={{ color: step.accent }}
                  />
                </div>

                {/* Step number */}
                <p className="mt-5 font-mono text-[11px] tracking-widest text-text-3">
                  {step.num}
                </p>

                {/* Title */}
                <h3 className="mt-2 font-display text-[16px] font-semibold text-text-1">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-text-3">
                  {step.desc}
                </p>
              </div>

              {/* Mobile arrow (between steps) */}
              {i < STEPS.length - 1 && (
                <div className="flex justify-center py-2 md:hidden">
                  <div className="h-6 w-px bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
