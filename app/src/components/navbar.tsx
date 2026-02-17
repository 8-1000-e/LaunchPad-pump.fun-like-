"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Menu, X, Wallet, ChevronDown, Copy, Check, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const NAV_ITEMS = [
  { label: "Tokens", href: "/" },
  { label: "Create", href: "/create" },
  { label: "Leaderboard", href: "/leaderboard" },
];

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const pathname = usePathname();
  const { publicKey, wallet, wallets, select, disconnect, connected } = useWallet();
  const { connection } = useConnection();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Fetch balance ──
  useEffect(() => {
    if (!publicKey || !connection) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    };

    fetchBalance();

    const subId = connection.onAccountChange(publicKey, (info) => {
      if (!cancelled) setBalance(info.lamports / LAMPORTS_PER_SOL);
    });

    return () => {
      cancelled = true;
      connection.removeAccountChangeListener(subId);
    };
  }, [publicKey, connection]);

  // ── Close on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (
        walletModalOpen &&
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        setWalletModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [walletModalOpen]);

  // ── Escape key ──
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setWalletModalOpen(false);
        setDropdownOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleCopy = useCallback(() => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [publicKey]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setDropdownOpen(false);
  }, [disconnect]);

  // ── Wallet icon helper ──
  const walletIcon = wallet?.adapter.icon;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 select-none">
            <img
              src="/logo_launch.jpeg"
              alt="LAUNCH"
              className="h-9 w-9 rounded-md object-cover"
              style={{ filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))" }}
            />
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
            {connected && publicKey ? (
              <>
                {/* Balance */}
                {balance !== null && (
                  <span className="hidden sm:block font-mono text-[13px] text-text-2 tabular-nums">
                    {balance.toFixed(2)} SOL
                  </span>
                )}

                {/* My Profile button */}
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-text-3 hover:text-text-1 transition-colors"
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Link>

                {/* Connected button → dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand/30 bg-brand/5 hover:bg-brand/10 transition-colors"
                  >
                    {walletIcon && (
                      <img
                        src={walletIcon}
                        alt=""
                        className="h-4 w-4"
                      />
                    )}
                    <span className="font-mono text-[13px] text-text-1">
                      {truncateAddress(publicKey.toBase58())}
                    </span>
                    <ChevronDown
                      className={`h-3 w-3 text-text-3 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* ── Dropdown ── */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 border border-border bg-bg/95 backdrop-blur-xl shadow-xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Wallet info */}
                      <div className="px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2 mb-1">
                          {walletIcon && (
                            <img src={walletIcon} alt="" className="h-4 w-4" />
                          )}
                          <span className="text-[12px] font-medium text-text-2">
                            {wallet?.adapter.name}
                          </span>
                        </div>
                        <button
                          onClick={handleCopy}
                          className="flex items-center gap-1.5 text-[12px] font-mono text-text-3 hover:text-brand transition-colors"
                        >
                          {publicKey.toBase58().slice(0, 16)}...
                          {copied ? (
                            <Check className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      {/* Balance in dropdown */}
                      {balance !== null && (
                        <div className="px-4 py-2.5 border-b border-border">
                          <span className="text-[11px] text-text-3 uppercase tracking-wider">
                            Balance
                          </span>
                          <p className="font-mono text-[14px] text-text-1 mt-0.5">
                            {balance.toFixed(4)} SOL
                          </p>
                        </div>
                      )}

                      {/* My Profile (mobile only, hidden on desktop where it's in header) */}
                      <Link
                        href={`/profile/${publicKey.toBase58()}`}
                        onClick={() => setDropdownOpen(false)}
                        className="sm:hidden w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-text-2 hover:text-text-1 hover:bg-brand/5 transition-colors"
                      >
                        <User className="h-3.5 w-3.5" />
                        My Profile
                      </Link>

                      {/* Disconnect */}
                      <button
                        onClick={handleDisconnect}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ── Connect button ── */
              <button
                onClick={() => setWalletModalOpen(true)}
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
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1 text-text-3 hover:text-text-1 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* ── Mobile nav ── */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 text-[13px] text-text-2 hover:text-text-1 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* ── Wallet Selector Modal ── */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWalletModalOpen(false)}
          />

          {/* Modal */}
          <div
            ref={modalRef}
            className="relative w-full max-w-sm mx-4 border border-border bg-bg/95 backdrop-blur-xl shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-display font-semibold text-text-1">
                Connect Wallet
              </h2>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="p-1 text-text-3 hover:text-text-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Wallet list */}
            <div className="p-3 space-y-1">
              {wallets.map((w) => {
                const installed = w.readyState === "Installed";
                return (
                  <button
                    key={w.adapter.name}
                    onClick={() => {
                      select(w.adapter.name);
                      setWalletModalOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/8 transition-colors group"
                  >
                    <img
                      src={w.adapter.icon}
                      alt={w.adapter.name}
                      className="h-8 w-8 rounded-lg"
                    />
                    <div className="flex-1 text-left">
                      <span className="text-[14px] font-medium text-text-1 group-hover:text-brand transition-colors">
                        {w.adapter.name}
                      </span>
                    </div>
                    {installed ? (
                      <span className="text-[11px] font-medium text-brand/70 bg-brand/10 px-2 py-0.5 rounded-full">
                        Detected
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-3">
                        Not installed
                      </span>
                    )}
                  </button>
                );
              })}

              {wallets.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Wallet className="h-8 w-8 text-text-3 mx-auto mb-3" />
                  <p className="text-[13px] text-text-3">
                    No wallets found. Install{" "}
                    <a
                      href="https://phantom.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Phantom
                    </a>{" "}
                    or{" "}
                    <a
                      href="https://solflare.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Solflare
                    </a>{" "}
                    to get started.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border">
              <p className="text-[11px] text-text-3 text-center">
                Devnet only &middot; No real funds
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
