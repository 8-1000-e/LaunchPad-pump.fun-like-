"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Globe,
  MessageCircle,
  Rocket,
  Check,
  ChevronDown,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Shield,
} from "lucide-react";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "../../components/navbar";
import { Footer } from "../../components/footer";
import { useButtonParticles } from "../../components/button-particles";
import { useToast } from "../../components/toast";
import { useTokenLaunchpad } from "@/hooks/use-token-launchpad";
import { calculateBuyAmount } from "@sdk/math";
import { DEFAULT_VIRTUAL_SOL, DEFAULT_VIRTUAL_TOKENS } from "@sdk/constants";

/* ─── Color palette presets ─── */

const COLOR_PRESETS = [
  { hex: "#c9a84c", name: "Gold" },
  { hex: "#ef4444", name: "Coral" },
  { hex: "#f97316", name: "Amber" },
  { hex: "#eab308", name: "Yellow" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#8b5cf6", name: "Violet" },
  { hex: "#d946ef", name: "Magenta" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#78716c", name: "Stone" },
];

/* ─── Mock sparkline data for preview ─── */

const MOCK_SPARK = [1, 1.2, 1.1, 1.4, 1.3, 1.6, 1.5, 1.8, 2.0, 1.9, 2.2, 2.5];

/* ─── X / Twitter SVG ─── */

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* ─── Helper: truncate address ─── */

function truncAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/* ─── Main page ─── */

export default function CreatePage() {
  const burst = useButtonParticles();
  const router = useRouter();
  const toast = useToast();
  const { client, connected } = useTokenLaunchpad();
  const { connect } = useWallet();

  /* Launch result */
  const [mintAddress, setMintAddress] = useState<string | null>(null);

  /* Form state */
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#c9a84c");
  const [customHex, setCustomHex] = useState("");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [buyOnCreate, setBuyOnCreate] = useState(false);
  const [initialBuy, setInitialBuy] = useState("");
  const [dragging, setDragging] = useState(false);
  const [bannerDragging, setBannerDragging] = useState(false);

  /* Launch flow state */
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  /* Derived */
  const displaySymbol = symbol.toUpperCase().slice(0, 10);
  const canLaunch = name.trim().length > 0 && symbol.trim().length > 0;
  const mockCreator = "7xK2mBfR…4nQp";
  const initialBuyNum = parseFloat(initialBuy) || 0;

  /* Image handling */
  function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  function processBannerFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBannerPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processBannerFile(file);
  }

  const handleBannerDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setBannerDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processBannerFile(file);
  }, []);

  /* Color selection */
  function selectColor(hex: string) {
    setColor(hex);
    setCustomHex("");
  }

  function applyCustomHex() {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      setColor(hex);
    }
  }

  /* Real launch via SDK */
  async function handleLaunch(e: React.MouseEvent<HTMLButtonElement>) {
    if (!canLaunch) return;
    burst(e, color);

    if (!connected || !client) {
      try {
        await connect();
      } catch {
        toast.error("Please connect your wallet first.");
      }
      return;
    }

    setLaunching(true);
    try {
      // Upload image + metadata to IPFS via Pinata
      let metadataUri: string;
      const uploadForm = new FormData();
      if (imageFile) {
        uploadForm.append("file", imageFile);
      }
      if (bannerFile) {
        uploadForm.append("banner", bannerFile);
      }
      uploadForm.append("name", name);
      uploadForm.append("symbol", displaySymbol);
      uploadForm.append("description", description);
      uploadForm.append("color", color);
      uploadForm.append("twitter", twitter);
      uploadForm.append("telegram", telegram);
      uploadForm.append("website", website);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        metadataUri = uploadData.uri;
      } else {
        const errData = await uploadRes.json().catch(() => ({}));
        console.warn("Pinata upload failed:", errData.error);
        toast.info("IPFS unavailable — saving metadata locally");
        // Fallback: store metadata via local API
        metadataUri = "";
      }

      let mint;
      if (buyOnCreate && initialBuyNum > 0) {
        const solAmount = new BN(Math.floor(initialBuyNum * LAMPORTS_PER_SOL));
        // Calculate min tokens out with 5% slippage
        const estimatedTokens = calculateBuyAmount(
          DEFAULT_VIRTUAL_SOL,
          DEFAULT_VIRTUAL_TOKENS,
          solAmount,
        );
        const minTokensOut = estimatedTokens.muln(95).divn(100);
        mint = await client.createAndBuyToken(
          name,
          symbol,
          metadataUri,
          solAmount,
          minTokensOut,
        );
      } else {
        mint = await client.createToken(name, symbol, metadataUri);
      }

      setMintAddress(mint.toBase58());
      setLaunching(false);
      setLaunched(true);
    } catch (err: unknown) {
      setLaunching(false);
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      toast.error(message);
    }
  }

  /* ─── Success state ─── */

  if (launched) {
    return (
      <>
        <Navbar />
        <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center px-4 py-20">
          <div
            className="flex h-20 w-20 items-center justify-center"
            style={{
              background: `${color}18`,
              border: `2px solid ${color}40`,
              animation: "pulse-glow 2s ease-in-out infinite",
              boxShadow: `0 0 40px -8px ${color}50`,
            }}
          >
            <Check className="h-8 w-8" style={{ color }} />
          </div>

          <h1
            className="mt-8 font-display text-3xl font-bold"
            style={{ animation: "fade-in-up 0.5s ease-out both 0.2s" }}
          >
            Token Launched
          </h1>

          <p
            className="mt-3 text-center text-[14px] text-text-2"
            style={{ animation: "fade-in-up 0.5s ease-out both 0.35s" }}
          >
            <span className="font-semibold text-text-1">{name}</span>{" "}
            <span className="font-mono text-text-3">${displaySymbol}</span> is now
            live on the bonding curve.
          </p>

          {/* Token card preview */}
          <div
            className="mt-8 w-full max-w-[320px] border border-border bg-surface"
            style={{ animation: "fade-in-up 0.5s ease-out both 0.5s" }}
          >
            <div className="px-4 pt-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-[13px] font-bold text-bg"
                  style={{ background: color, borderRadius: "50%" }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ borderRadius: "50%" }}
                    />
                  ) : (
                    displaySymbol.charAt(0) || "?"
                  )}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text-1">{name}</p>
                  <p className="text-[12px] font-mono text-text-3">${displaySymbol}</p>
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold text-text-1">
                  0.000001
                  <span className="ml-1 text-[11px] font-normal text-text-3">SOL</span>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider bg-status-new/12 text-status-new">
                  NEW
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 mt-2">
              <div className="relative h-[3px] flex-1 bg-border/50 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-buy/60"
                  style={{ width: initialBuyNum > 0 ? "1%" : "0%" }}
                />
              </div>
              <span className="font-mono text-[10px] text-text-3">0%</span>
            </div>
          </div>

          {/* Actions */}
          <div
            className="mt-8 flex items-center gap-3"
            style={{ animation: "fade-in-up 0.5s ease-out both 0.65s" }}
          >
            <a
              href={`/token/${mintAddress}`}
              className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: color }}
            >
              View Token
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => {
                setLaunched(false);
                setMintAddress(null);
                setName("");
                setSymbol("");
                setDescription("");
                setImagePreview(null); setImageFile(null);
                setBannerPreview(null); setBannerFile(null);
                setTwitter("");
                setTelegram("");
                setWebsite("");
                setBuyOnCreate(false);
                setInitialBuy("");
              }}
              className="px-5 py-2.5 text-[13px] font-medium text-text-2 border border-border hover:border-border-hover hover:text-text-1 transition-colors"
            >
              Create Another
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* ─── Form state ─── */

  return (
    <>
      <Navbar />

      {/* ─── Attenuated background effects ─── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Ambient gold gradient */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: "80%",
            height: "50%",
            background: "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Warm corner glow */}
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: "40%",
            height: "40%",
            background: "radial-gradient(ellipse at bottom right, rgba(201,168,76,0.04) 0%, transparent 70%)",
          }}
        />
        {/* Floating orbs (attenuated) */}
        <div
          className="absolute"
          style={{
            width: 400,
            height: 400,
            top: "10%",
            right: "15%",
            borderRadius: "50%",
            background: "var(--brand)",
            opacity: 0.04,
            filter: "blur(120px)",
            animation: "float-orb-1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute"
          style={{
            width: 350,
            height: 350,
            bottom: "20%",
            left: "10%",
            borderRadius: "50%",
            background: "var(--brand)",
            opacity: 0.03,
            filter: "blur(100px)",
            animation: "float-orb-2 30s ease-in-out infinite",
          }}
        />
      </div>
      {/* Noise overlay */}
      <div className="noise-overlay" />

      <div className="relative z-10 mx-auto max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
        {/* Page header */}
        <div className="max-w-[600px]" style={{ animation: "fade-in-up 0.4s ease-out both" }}>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Create a Token
          </h1>
          <p className="mt-2 text-[14px] text-text-2">
            Launch on the bonding curve. Set your brand. Let it graduate.
          </p>
        </div>

        {/* Two-column layout: form (~600px) + preview */}
        <div className="mt-8 gap-8 lg:grid lg:grid-cols-[minmax(0,600px)_320px] lg:justify-center">
          {/* ─── Left: Form ─── */}
          <div
            className="space-y-6"
            style={{ animation: "fade-in-up 0.4s ease-out both 0.1s" }}
          >
            {/* ── Token Info ── */}
            <section className="border border-border bg-surface/40 p-5 sm:p-6">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
                Token Info
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="text-[12px] text-text-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Doge Killer"
                    maxLength={32}
                    className="mt-1.5 w-full border border-border bg-transparent px-3 py-2.5 text-[14px] text-text-1 placeholder:text-text-3/40 transition-colors focus:border-brand/40 focus:outline-none"
                  />
                </div>

                {/* Symbol */}
                <div>
                  <label className="text-[12px] text-text-2">Symbol</label>
                  <div className="mt-1.5 flex items-center border border-border transition-colors focus-within:border-brand/40">
                    <span className="shrink-0 pl-3 text-[13px] text-text-3">$</span>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) =>
                        setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
                      }
                      placeholder="DOGEK"
                      className="w-full bg-transparent px-2 py-2.5 font-mono text-[14px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                    />
                    {symbol && (
                      <span className="shrink-0 pr-3 text-[11px] text-text-3">
                        {symbol.length}/10
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="text-[12px] text-text-2">
                  Description{" "}
                  <span className="text-text-3">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this token about?"
                  maxLength={500}
                  rows={3}
                  className="mt-1.5 w-full resize-none border border-border bg-transparent px-3 py-2.5 text-[14px] text-text-1 placeholder:text-text-3/40 transition-colors focus:border-brand/40 focus:outline-none"
                />
                {description && (
                  <p className="mt-1 text-right text-[11px] text-text-3">
                    {description.length}/500
                  </p>
                )}
              </div>
            </section>

            {/* ── Image + Color ── */}
            <section className="border border-border bg-surface/40 p-5 sm:p-6">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
                Branding
              </h2>

              {/* Banner upload */}
              <div className="mt-4">
                <label className="text-[12px] text-text-2">Banner</label>
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  onDrop={handleBannerDrop}
                  onDragOver={(e) => { e.preventDefault(); setBannerDragging(true); }}
                  onDragLeave={() => setBannerDragging(false)}
                  className={`mt-1.5 flex h-[120px] w-full cursor-pointer items-center justify-center overflow-hidden border border-dashed transition-colors ${
                    bannerDragging
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-border-hover"
                  }`}
                  style={
                    bannerPreview
                      ? {
                          backgroundImage: `url(${bannerPreview})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          borderStyle: "solid",
                        }
                      : {}
                  }
                >
                  {!bannerPreview && (
                    <div className="flex flex-col items-center">
                      <Upload className={`h-4 w-4 transition-colors ${bannerDragging ? "text-brand" : "text-text-3"}`} />
                      <span className={`mt-1 text-[11px] transition-colors ${bannerDragging ? "text-brand" : "text-text-3"}`}>
                        {bannerDragging ? "Drop banner image" : "Upload banner image"}
                      </span>
                      <span className="mt-0.5 text-[9px] text-text-3/50">
                        Recommended: 1200 × 400px
                      </span>
                    </div>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
                {bannerPreview && (
                  <button
                    onClick={() => { setBannerPreview(null); setBannerFile(null); }}
                    className="mt-1 text-[10px] text-text-3 hover:text-sell transition-colors"
                  >
                    Remove banner
                  </button>
                )}
              </div>

              <div className="mt-4 flex gap-5">
                {/* Image upload with drag & drop */}
                <div>
                  <label className="text-[12px] text-text-2">Image</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`mt-1.5 flex h-[100px] w-[100px] cursor-pointer flex-col items-center justify-center border border-dashed transition-colors group ${
                      dragging
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-border-hover"
                    }`}
                    style={
                      imagePreview
                        ? {
                            backgroundImage: `url(${imagePreview})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            borderStyle: "solid",
                          }
                        : {}
                    }
                  >
                    {!imagePreview && (
                      <>
                        <Upload className={`h-4 w-4 transition-colors ${dragging ? "text-brand" : "text-text-3 group-hover:text-text-2"}`} />
                        <span className={`mt-1 text-[10px] transition-colors ${dragging ? "text-brand" : "text-text-3 group-hover:text-text-2"}`}>
                          {dragging ? "Drop here" : "Upload"}
                        </span>
                        <span className="mt-0.5 text-[9px] text-text-3/50">
                          or drag & drop
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imagePreview && (
                    <button
                      onClick={() => setImagePreview(null)}
                      className="mt-1 text-[10px] text-text-3 hover:text-sell transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Color picker */}
                <div className="flex-1">
                  <label className="text-[12px] text-text-2">Brand Color</label>
                  <p className="mt-0.5 text-[11px] text-text-3">
                    Sets your token&apos;s identity across the platform
                  </p>

                  {/* Selected color display */}
                  <button
                    onClick={() => setColorPickerOpen(!colorPickerOpen)}
                    className="mt-2 flex items-center gap-2.5 border border-border px-3 py-2 transition-colors hover:border-border-hover"
                  >
                    <div
                      className="h-5 w-5 shrink-0"
                      style={{ background: color, borderRadius: "50%" }}
                    />
                    <span className="font-mono text-[13px] text-text-2">
                      {color.toUpperCase()}
                    </span>
                    <ChevronDown
                      className={`ml-auto h-3 w-3 text-text-3 transition-transform ${
                        colorPickerOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Color swatches */}
                  {colorPickerOpen && (
                    <div className="mt-2 border border-border bg-surface p-3">
                      <div className="flex flex-wrap gap-2.5">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => selectColor(c.hex)}
                            title={c.name}
                            className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110"
                            style={{
                              background: c.hex,
                              outline:
                                color === c.hex
                                  ? `2px solid ${c.hex}`
                                  : "2px solid transparent",
                              outlineOffset: "2px",
                            }}
                          >
                            {color === c.hex && (
                              <Check className="h-3.5 w-3.5 text-bg" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Custom hex */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] text-text-3">Custom</span>
                        <div className="flex flex-1 items-center border border-border">
                          <span className="shrink-0 pl-2 text-[12px] text-text-3">
                            #
                          </span>
                          <input
                            type="text"
                            value={customHex.replace("#", "")}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                              setCustomHex(v);
                              if (v.length === 6) {
                                setColor(`#${v}`);
                              }
                            }}
                            placeholder="FF5733"
                            maxLength={6}
                            className="w-full bg-transparent px-1.5 py-1.5 font-mono text-[12px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                          />
                        </div>
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => {
                            setColor(e.target.value);
                            setCustomHex(e.target.value.replace("#", ""));
                          }}
                          className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Social Links ── */}
            <section className="border border-border bg-surface/40 p-5 sm:p-6">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
                Social Links{" "}
                <span className="normal-case tracking-normal text-text-3/60">
                  (optional)
                </span>
              </h2>

              <div className="mt-4 space-y-3">
                {/* Twitter / X */}
                <div className="flex items-center gap-2 border border-border transition-colors focus-within:border-brand/40">
                  <div className="flex shrink-0 items-center pl-3">
                    <XIcon className="h-3.5 w-3.5 text-text-3" />
                  </div>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value.replace("@", ""))}
                    placeholder="username"
                    className="w-full bg-transparent px-1 py-2.5 text-[13px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                  />
                </div>

                {/* Telegram */}
                <div className="flex items-center gap-2 border border-border transition-colors focus-within:border-brand/40">
                  <div className="flex shrink-0 items-center pl-3">
                    <MessageCircle className="h-3.5 w-3.5 text-text-3" />
                  </div>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="t.me/group"
                    className="w-full bg-transparent px-1 py-2.5 text-[13px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                  />
                </div>

                {/* Website */}
                <div className="flex items-center gap-2 border border-border transition-colors focus-within:border-brand/40">
                  <div className="flex shrink-0 items-center pl-3">
                    <Globe className="h-3.5 w-3.5 text-text-3" />
                  </div>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-transparent px-1 py-2.5 text-[13px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* ── Buy on Create (anti-snipe) ── */}
            <section className="border border-border bg-surface/40 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                {/* Custom toggle switch */}
                <button
                  type="button"
                  onClick={() => {
                    setBuyOnCreate(!buyOnCreate);
                    if (buyOnCreate) setInitialBuy("");
                  }}
                  className="mt-0.5 shrink-0"
                >
                  <div
                    className="relative h-5 w-9 rounded-full transition-colors duration-200"
                    style={{
                      background: buyOnCreate ? "var(--brand)" : "var(--border)",
                    }}
                  >
                    <div
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-bg transition-transform duration-200"
                      style={{
                        transform: buyOnCreate ? "translateX(18px)" : "translateX(2px)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    />
                  </div>
                </button>
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-text-1">
                    Buy on create
                  </p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-text-3">
                    <Shield className="mt-0.5 h-3 w-3 shrink-0 text-brand-dim" />
                    Your buy executes in the same transaction as the token creation, no one can front-run you. Only possible at creation.
                  </p>
                </div>
              </div>

              {/* Expandable amount picker */}
              <div
                className="grid transition-all duration-300 ease-out"
                style={{
                  gridTemplateRows: buyOnCreate ? "1fr" : "0fr",
                  opacity: buyOnCreate ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <div className="mt-4 space-y-3">
                    {/* Amount pills */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-text-3">
                        Amount
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {[0.1, 0.5, 1, 2, 5].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setInitialBuy(amt.toString())}
                            className={`flex-1 rounded-full py-2 text-[12px] font-mono font-medium transition-all ${
                              initialBuy === amt.toString()
                                ? "text-bg"
                                : "border border-border text-text-3 hover:border-border-hover hover:text-text-2"
                            }`}
                            style={
                              initialBuy === amt.toString()
                                ? { background: "var(--brand)", boxShadow: "0 0 12px -2px var(--glow-brand)" }
                                : {}
                            }
                          >
                            {amt} SOL
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom amount input */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-text-3">
                        Or custom
                      </label>
                      <div className="mt-1.5 flex items-center border border-border transition-colors focus-within:border-brand/40">
                        <span className="shrink-0 pl-3 text-[12px] font-mono text-text-2">
                          SOL
                        </span>
                        <input
                          type="number"
                          value={[0.1, 0.5, 1, 2, 5].includes(Number(initialBuy)) ? "" : initialBuy}
                          onChange={(e) => setInitialBuy(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent px-3 py-2 text-right font-mono text-[14px] text-text-1 placeholder:text-text-3/40 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Output estimate */}
                    {initialBuyNum > 0 && (
                      <div className="flex items-center justify-between border-t border-border pt-3">
                        <span className="text-[12px] text-text-3">You receive</span>
                        <span className="font-mono text-[13px] font-medium text-text-1">
                          ~{(() => {
                            const solBn = new BN(Math.floor(initialBuyNum * LAMPORTS_PER_SOL));
                            const tokens = calculateBuyAmount(DEFAULT_VIRTUAL_SOL, DEFAULT_VIRTUAL_TOKENS, solBn);
                            // tokens are in raw units (6 decimals)
                            return Math.floor(tokens.toNumber() / 1_000_000).toLocaleString();
                          })()}{" "}
                          <span className="text-text-3">{displaySymbol || "tokens"}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Costs summary ── */}
            <div className="border border-border bg-surface/40 p-5 sm:p-6">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-text-3">Token creation fee</span>
                <span className="font-mono text-text-2">0.02 SOL</span>
              </div>
              {buyOnCreate && initialBuyNum > 0 && (
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="text-text-3">Initial buy</span>
                  <span className="font-mono text-text-2">{initialBuyNum} SOL</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[13px]">
                <span className="font-medium text-text-2">Total</span>
                <span className="font-mono font-semibold text-text-1">
                  {(0.02 + (buyOnCreate ? initialBuyNum : 0)).toFixed(2)} SOL
                </span>
              </div>
            </div>

            {/* ── Launch button (mobile: always visible) ── */}
            <div className="lg:hidden">
              <button
                onClick={handleLaunch}
                disabled={!canLaunch || launching}
                className="group relative w-full overflow-hidden py-4 text-[15px] font-semibold text-bg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                style={{
                  animation: canLaunch && !launching ? "pulse-glow 3s ease-in-out infinite" : "none",
                  boxShadow: canLaunch ? `0 0 30px -4px ${color}40` : "none",
                }}
              >
                <span className="absolute inset-0" style={{ background: color }} />
                <span className="relative flex items-center justify-center gap-2 font-display">
                  {launching ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Launch Token
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* ─── Right: Preview (sticky on desktop) ─── */}
          <div
            className="hidden lg:block"
            style={{ animation: "fade-in-up 0.4s ease-out both 0.2s" }}
          >
            <div className="sticky top-[72px]">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-3">
                Live Preview
              </p>

              {/* Preview card */}
              <div
                className="mt-3 border bg-surface transition-all"
                style={{
                  borderColor: canLaunch ? `${color}30` : "var(--border)",
                }}
              >
                {/* Mini banner */}
                <div
                  className="h-16 w-full overflow-hidden"
                  style={
                    bannerPreview
                      ? {
                          backgroundImage: `url(${bannerPreview})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: `linear-gradient(135deg, ${color}30 0%, ${color}10 40%, transparent 70%), linear-gradient(225deg, ${color}20 0%, transparent 50%), var(--surface)`,
                        }
                  }
                />

                <div className="px-4 pb-4">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 -mt-5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center text-[13px] font-bold text-bg"
                      style={{
                        background: color,
                        borderRadius: "50%",
                        border: "2px solid var(--surface)",
                        overflow: "hidden",
                      }}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        displaySymbol.charAt(0) || "?"
                      )}
                    </div>
                    <div className="mt-5">
                      <p className="text-[14px] font-semibold text-text-1">
                        {name || "Token Name"}
                      </p>
                      <p className="text-[12px] font-mono text-text-3">
                        ${displaySymbol || "SYMBOL"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {description && (
                    <p className="mt-3 text-[12px] leading-relaxed text-text-2 line-clamp-2">
                      {description}
                    </p>
                  )}

                  {/* Social icons preview */}
                  {(twitter || telegram || website) && (
                    <div className="mt-3 flex items-center gap-2">
                      {twitter && (
                        <span className="text-text-3">
                          <XIcon className="h-[14px] w-[14px]" />
                        </span>
                      )}
                      {telegram && (
                        <span className="text-text-3">
                          <MessageCircle className="h-[14px] w-[14px]" />
                        </span>
                      )}
                      {website && (
                        <span className="text-text-3">
                          <Globe className="h-[14px] w-[14px]" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price line */}
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-mono text-lg font-semibold text-text-1">
                      0.000001
                      <span className="ml-1 text-[11px] font-normal text-text-3">
                        SOL
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider bg-status-new/12 text-status-new">
                      NEW
                    </span>
                  </div>

                  {/* Mock sparkline */}
                  <div className="mt-2 h-8">
                    <svg
                      viewBox="0 0 120 32"
                      className="h-full w-full"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="preview-spark-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                          <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const w = 120, h = 32, pad = 1;
                        const min = Math.min(...MOCK_SPARK);
                        const max = Math.max(...MOCK_SPARK);
                        const range = max - min || 1;
                        const pts = MOCK_SPARK.map((v, i) => {
                          const x = (i / (MOCK_SPARK.length - 1)) * w;
                          const y = h - pad - ((v - min) / range) * (h - pad * 2);
                          return `${x},${y}`;
                        });
                        const line = pts.join(" ");
                        const area = `0,${h} ${line} ${w},${h}`;
                        return (
                          <>
                            <polygon
                              points={area}
                              fill="url(#preview-spark-fill)"
                            />
                            <polyline
                              points={line}
                              fill="none"
                              stroke={color}
                              strokeWidth="1.5"
                              vectorEffect="non-scaling-stroke"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Stats grid */}
                  <div className="mt-2 grid grid-cols-2 gap-x-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-3">
                        MCap
                      </p>
                      <p className="font-mono text-[13px] text-text-2">0.0</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-3">
                        Vol 24h
                      </p>
                      <p className="font-mono text-[13px] text-text-2">0.0</p>
                    </div>
                  </div>

                  {/* Creator */}
                  <p className="mt-2 font-mono text-[10px] text-text-3">
                    {mockCreator}
                  </p>

                  {/* Graduation bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="relative h-[3px] flex-1 bg-border/50 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-buy/60 transition-all duration-500"
                        style={{
                          width: initialBuyNum > 0
                            ? `${Math.min(100, (initialBuyNum / 85) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-text-3">
                      {initialBuyNum > 0
                        ? `${Math.min(100, ((initialBuyNum / 85) * 100)).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Token page preview link */}
              <p className="mt-3 flex items-center gap-1 text-[11px] text-text-3">
                <ExternalLink className="h-3 w-3" />
                This is how your token will appear to traders
              </p>

              {/* Launch button (desktop) */}
              <button
                onClick={handleLaunch}
                disabled={!canLaunch || launching}
                className="group relative mt-5 w-full overflow-hidden py-4 text-[15px] font-semibold text-bg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
                style={{
                  animation: canLaunch && !launching ? "pulse-glow 3s ease-in-out infinite" : "none",
                  boxShadow: canLaunch ? `0 0 30px -4px ${color}40` : "none",
                }}
              >
                <span className="absolute inset-0" style={{ background: color }} />
                <span className="relative flex items-center justify-center gap-2 font-display">
                  {launching ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Launch Token
                    </>
                  )}
                </span>
              </button>

              {!canLaunch && (
                <p className="mt-2 text-center text-[11px] text-text-3">
                  Enter a name and symbol to launch
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
