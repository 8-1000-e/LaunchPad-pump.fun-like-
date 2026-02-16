"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Copy, Check, ArrowDownUp, Loader2 } from "lucide-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { useButtonParticles } from "./button-particles";
import { useToast } from "./toast";
import { useTokenLaunchpad } from "@/hooks/use-token-launchpad";
import { calculateBuyAmount, calculateSellAmount } from "@sdk/math";

const QUICK_AMOUNTS = [0.1, 0.5, 1, 5];
const SLIPPAGE_OPTIONS = [0.5, 1, 2];
const TOKEN_DECIMALS = 1_000_000; // 10^6

interface TradeFormProps {
  tokenSymbol: string;
  tokenPrice: number;
  color: string;
  mint?: string;
  virtualSol?: BN;
  virtualToken?: BN;
}

export function TradeForm({
  tokenSymbol,
  tokenPrice,
  color,
  mint,
  virtualSol,
  virtualToken,
}: TradeFormProps) {
  const burst = useButtonParticles();
  const toast = useToast();
  const { client, connected, connection } = useTokenLaunchpad();
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const referralParam = searchParams.get("ref");

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippageOpen, setSlippageOpen] = useState(false);
  const [slippage, setSlippage] = useState(1);
  const [customSlippage, setCustomSlippage] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Real balances
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connection) return;
    let cancelled = false;

    async function fetchBalances() {
      try {
        const sol = await connection.getBalance(publicKey!);
        if (!cancelled) setSolBalance(sol / LAMPORTS_PER_SOL);
      } catch { /* ignore */ }

      if (mint) {
        try {
          const mintPk = new PublicKey(mint);
          const ata = await getAssociatedTokenAddress(mintPk, publicKey!);
          const info = await connection.getTokenAccountBalance(ata);
          if (!cancelled) setTokenBalance(Number(info.value.uiAmount));
        } catch {
          if (!cancelled) setTokenBalance(0);
        }
      }
    }

    fetchBalances();
    return () => { cancelled = true; };
  }, [publicKey, connection, mint, refreshKey]);

  const isBuy = mode === "buy";
  const accent = isBuy ? "var(--buy)" : "var(--sell)";
  const numAmount = parseFloat(amount) || 0;

  // Calculate output using real bonding curve math when available
  const outputTokens = (() => {
    if (numAmount <= 0) return 0;
    if (virtualSol && virtualToken) {
      if (isBuy) {
        const solBn = new BN(Math.floor(numAmount * LAMPORTS_PER_SOL));
        const tokens = calculateBuyAmount(virtualSol, virtualToken, solBn);
        return tokens.toNumber() / TOKEN_DECIMALS;
      } else {
        const tokenBn = new BN(Math.floor(numAmount * TOKEN_DECIMALS));
        const sol = calculateSellAmount(tokenBn, virtualSol, virtualToken);
        return sol.toNumber() / LAMPORTS_PER_SOL;
      }
    }
    // Fallback to simple estimate
    return isBuy ? numAmount / tokenPrice : numAmount * tokenPrice;
  })();

  // Price impact estimate
  const priceImpact = (() => {
    if (numAmount <= 0 || !virtualSol || !virtualToken) return 0;
    const spotPrice =
      virtualSol.toNumber() / LAMPORTS_PER_SOL /
      (virtualToken.toNumber() / TOKEN_DECIMALS);
    if (isBuy) {
      const effectivePrice = numAmount / (outputTokens || 1);
      return ((effectivePrice - spotPrice) / spotPrice) * 100;
    } else {
      const effectivePrice = outputTokens / numAmount;
      return ((spotPrice - effectivePrice) / spotPrice) * 100;
    }
  })();

  async function handleTrade(e: React.MouseEvent<HTMLButtonElement>) {
    if (numAmount <= 0) return;
    burst(e, isBuy ? "#22c55e" : "#ef4444");

    if (!connected || !client || !mint) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      const mintPk = new PublicKey(mint);
      const referral = referralParam
        ? new PublicKey(referralParam)
        : undefined;

      if (isBuy) {
        const solAmount = new BN(Math.floor(numAmount * LAMPORTS_PER_SOL));
        // Apply slippage to output
        const estimatedTokens = virtualSol && virtualToken
          ? calculateBuyAmount(virtualSol, virtualToken, solAmount)
          : new BN(0);
        const minTokensOut = estimatedTokens
          .muln(Math.floor((100 - slippage) * 100))
          .divn(10000);

        await client.buyToken(mintPk, solAmount, minTokensOut, referral);
      } else {
        const tokenAmount = new BN(Math.floor(numAmount * TOKEN_DECIMALS));
        const estimatedSol = virtualSol && virtualToken
          ? calculateSellAmount(tokenAmount, virtualSol, virtualToken)
          : new BN(0);
        const minSolOut = estimatedSol
          .muln(Math.floor((100 - slippage) * 100))
          .divn(10000);

        await client.sellToken(mintPk, tokenAmount, minSolOut, referral);
      }

      toast.success("Transaction confirmed");
      setAmount("");
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyRef() {
    const refLink = mint
      ? `${window.location.origin}/token/${mint}?ref=${referralParam || ""}`
      : "";
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-border bg-surface/60 backdrop-blur-sm">
      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2">
        <button
          onClick={() => setMode("buy")}
          className={`py-3 text-center text-[13px] font-semibold transition-colors ${
            isBuy
              ? "bg-buy/10 text-buy border-b-2 border-buy"
              : "text-text-3 hover:text-text-2 border-b border-border"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`py-3 text-center text-[13px] font-semibold transition-colors ${
            !isBuy
              ? "bg-sell/10 text-sell border-b-2 border-sell"
              : "text-text-3 hover:text-text-2 border-b border-border"
          }`}
        >
          Sell
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Input */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-text-3">
            {isBuy ? "You pay" : "You sell"}
          </label>
          <div
            className="mt-1.5 flex items-center border transition-colors"
            style={{ borderColor: numAmount > 0 ? accent : "var(--border)" }}
          >
            <span className="shrink-0 pl-3 text-[12px] font-mono text-text-2">
              {isBuy ? "SOL" : tokenSymbol}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent py-3 px-3 text-right font-mono text-[16px] text-text-1 placeholder:text-text-3/50 focus:outline-none"
            />
          </div>

          {/* Quick amount buttons */}
          <div className="mt-2 flex items-center gap-1.5">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(qa.toString())}
                className="flex-1 py-1.5 text-[11px] font-mono text-text-3 border border-border transition-colors hover:border-border-hover hover:text-text-2"
              >
                {qa}
              </button>
            ))}
            <button
              onClick={() => {
                if (isBuy && solBalance !== null) {
                  // Keep 0.01 SOL for fees
                  setAmount(Math.max(0, solBalance - 0.01).toFixed(4));
                } else if (!isBuy && tokenBalance !== null) {
                  setAmount(tokenBalance.toString());
                }
              }}
              className="flex-1 py-1.5 text-[11px] font-mono font-medium transition-colors border"
              style={{ borderColor: accent, color: accent }}
            >
              MAX
            </button>
          </div>

          <p className="mt-1.5 text-[11px] text-text-3">
            Balance:{" "}
            <span className="font-mono text-text-2">
              {isBuy
                ? solBalance !== null
                  ? `${solBalance.toFixed(4)} SOL`
                  : "— SOL"
                : tokenBalance !== null
                  ? `${tokenBalance.toLocaleString()} ${tokenSymbol}`
                  : `— ${tokenSymbol}`}
            </span>
          </p>
        </div>

        {/* Arrow divider */}
        <div className="flex justify-center">
          <div className="rounded-full border border-border p-1.5">
            <ArrowDownUp className="h-3.5 w-3.5 text-text-3" />
          </div>
        </div>

        {/* Output estimate */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-text-3">
            You receive
          </label>
          <div className="mt-1.5 flex items-center justify-between border border-border bg-bg/50 py-3 px-3">
            <span className="text-[12px] font-mono text-text-2">
              {isBuy ? tokenSymbol : "SOL"}
            </span>
            <span className="font-mono text-[16px] text-text-1">
              {numAmount > 0
                ? isBuy
                  ? `~${Math.floor(outputTokens).toLocaleString()}`
                  : `~${outputTokens.toFixed(4)}`
                : "—"}
            </span>
          </div>
          {numAmount > 0 && (
            <p className="mt-1.5 text-[11px] text-text-3">
              Price impact:{" "}
              <span
                className="font-mono"
                style={{ color: priceImpact > 5 ? "var(--sell)" : "var(--text-2)" }}
              >
                ~{Math.abs(priceImpact).toFixed(1)}%
              </span>
            </p>
          )}
        </div>

        {/* Slippage */}
        <div>
          <button
            onClick={() => setSlippageOpen(!slippageOpen)}
            className="flex w-full items-center justify-between text-[11px] text-text-3 hover:text-text-2 transition-colors"
          >
            <span>
              Slippage tolerance:{" "}
              <span className="font-mono text-text-2">{slippage}%</span>
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${slippageOpen ? "rotate-180" : ""}`}
            />
          </button>

          {slippageOpen && (
            <div className="mt-2 flex items-center gap-1.5">
              {SLIPPAGE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSlippage(s);
                    setCustomSlippage("");
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-mono transition-colors border ${
                    slippage === s && !customSlippage
                      ? "border-brand text-brand bg-brand/5"
                      : "border-border text-text-3 hover:text-text-2"
                  }`}
                >
                  {s}%
                </button>
              ))}
              <input
                type="number"
                value={customSlippage}
                onChange={(e) => {
                  setCustomSlippage(e.target.value);
                  const v = parseFloat(e.target.value);
                  if (v > 0 && v <= 50) setSlippage(v);
                }}
                placeholder="Custom"
                className="flex-1 border border-border bg-transparent py-1.5 px-2 text-center text-[11px] font-mono text-text-1 placeholder:text-text-3/50 focus:border-brand/40 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={handleTrade}
          disabled={loading}
          className="group relative w-full overflow-hidden py-3.5 text-[14px] font-semibold text-bg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
          style={{
            animation: numAmount > 0 && !loading ? "pulse-glow 3s ease-in-out infinite" : "none",
            boxShadow: numAmount > 0 ? `0 0 20px -4px ${accent}40` : "none",
          }}
        >
          <span
            className="absolute inset-0"
            style={{ background: accent }}
          />
          <span className="relative font-display flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : numAmount > 0 ? (
              `${isBuy ? "Buy" : "Sell"} ${tokenSymbol}`
            ) : (
              "Enter an amount"
            )}
          </span>
        </button>

        {/* Referral */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-3">
              Share & earn <span className="text-brand font-medium">10%</span> of fees
            </p>
            <button
              onClick={handleCopyRef}
              className="flex items-center gap-1 text-[11px] text-brand hover:text-brand-bright transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
