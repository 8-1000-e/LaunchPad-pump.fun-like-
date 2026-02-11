"use client";

import { useState } from "react";
import { Menu, X, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Tokens", href: "/" },
  { label: "Create", href: "/create" },
  { label: "Leaderboard", href: "/leaderboard" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <div className="relative h-6 w-6" style={{ filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))" }}>
            <div className="absolute inset-0 rotate-45 bg-brand" />
          </div>
          <span className="font-display text-[17px] font-bold tracking-tight">
            LAUNCH
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active ? "text-text-1" : "text-text-3 hover:text-text-2"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block font-mono text-[13px] text-text-2 tabular-nums">
            2.45 SOL
          </span>

          {/* Gradient wallet button */}
          <button
            className="group relative overflow-hidden px-4 py-1.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
          >
            <span
              className="absolute inset-0 bg-gradient-to-r from-brand via-brand-bright to-brand"
              style={{
                backgroundSize: "200% 100%",
                animation: "gradient-x 4s ease infinite",
              }}
            />
            <span className="relative flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect</span>
            </span>
          </button>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-1 text-text-3 hover:text-text-1 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile nav ── */}
      {open && (
        <nav className="md:hidden border-t border-border px-4 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-[13px] text-text-2 hover:text-text-1 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
