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
import { DEFAULT_TRADE_FEE_BPS } from "@sdk/constants";

const QUICK_PCTS = [25, 50, 75, 100];
const SLIPPAGE_OPTIONS = [0.5, 1, 2];
const TOKEN_DECIMALS = 1_000_000; // 10^6
const FEE_BPS = DEFAULT_TRADE_FEE_BPS; // 100 = 1%

interface TradeFormProps {
  tokenSymbol: string;
  tokenPrice: number;
  color: string;
  mint?: string;
  virtualSol?: BN;
  virtualToken?: BN;
  tokenImage?: string | null;
}

export function TradeForm({
  tokenSymbol,
  tokenPrice,
  color,
  mint,
  virtualSol,
  virtualToken,
  tokenImage,
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

  // Calculate output using real bonding curve math (fee-adjusted, matches on-chain)
  const outputTokens = (() => {
    if (numAmount <= 0) return 0;
    if (virtualSol && virtualToken) {
      if (isBuy) {
        const solBn = new BN(Math.floor(numAmount * LAMPORTS_PER_SOL));
        // Program deducts fee BEFORE the swap: solAfterFee = sol * (10000 - feeBps) / 10000
        const solAfterFee = solBn.muln(10000 - FEE_BPS).divn(10000);
        const tokens = calculateBuyAmount(virtualSol, virtualToken, solAfterFee);
        return tokens.toNumber() / TOKEN_DECIMALS;
      } else {
        const tokenBn = new BN(Math.floor(numAmount * TOKEN_DECIMALS));
        const solRaw = calculateSellAmount(tokenBn, virtualSol, virtualToken);
        // Program deducts fee AFTER computing SOL out
        const solAfterFee = solRaw.muln(10000 - FEE_BPS).divn(10000);
        return solAfterFee.toNumber() / LAMPORTS_PER_SOL;
      }
    }
    // Fallback to simple estimate
    return isBuy ? numAmount / tokenPrice : numAmount * tokenPrice;
  })();

  // Price impact (includes fee)
  const priceImpact = (() => {
    if (numAmount <= 0 || !virtualSol || !virtualToken) return 0;
    const spotPrice =
      virtualSol.toNumber() / LAMPORTS_PER_SOL /
      (virtualToken.toNumber() / TOKEN_DECIMALS);
    if (isBuy) {
      // effectivePrice = SOL spent / tokens received (fee already deducted in outputTokens)
      const effectivePrice = numAmount / (outputTokens || 1);
      return ((effectivePrice - spotPrice) / spotPrice) * 100;
    } else {
      // effectivePrice = SOL received / tokens sold (fee already deducted in outputTokens)
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
        // Fee-adjusted estimate (matches on-chain logic)
        const solAfterFee = solAmount.muln(10000 - FEE_BPS).divn(10000);
        const estimatedTokens = virtualSol && virtualToken
          ? calculateBuyAmount(virtualSol, virtualToken, solAfterFee)
          : new BN(0);
        // Apply slippage tolerance on top
        const minTokensOut = estimatedTokens
          .muln(Math.floor((100 - slippage) * 100))
          .divn(10000);

        await client.buyToken(mintPk, solAmount, minTokensOut, referral);
      } else {
        const tokenAmount = new BN(Math.floor(numAmount * TOKEN_DECIMALS));
        const rawSol = virtualSol && virtualToken
          ? calculateSellAmount(tokenAmount, virtualSol, virtualToken)
          : new BN(0);
        // Fee-adjusted estimate (matches on-chain logic)
        const estimatedSol = rawSol.muln(10000 - FEE_BPS).divn(10000);
        // Apply slippage tolerance on top
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
            <span className="shrink-0 pl-3 flex items-center gap-1.5 text-[12px] font-mono text-text-2">
              {isBuy ? (
                <>
                  <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="h-4 w-4 rounded-full" />
                  SOL
                </>
              ) : (
                <>
                  {tokenImage && <img src={tokenImage} alt={tokenSymbol} className="h-4 w-4 rounded-full object-cover" />}
                  {tokenSymbol}
                </>
              )}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent py-3 px-3 text-right font-mono text-[16px] text-text-1 placeholder:text-text-3/50 focus:outline-none"
            />
          </div>

          {/* Quick % buttons */}
          <div className="mt-2 flex items-center gap-1.5">
            {QUICK_PCTS.map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  if (isBuy && solBalance !== null) {
                    const val = pct === 100
                      ? Math.max(0, solBalance - 0.01)
                      : (solBalance * pct) / 100;
                    setAmount(val > 0 ? val.toFixed(4) : "");
                  } else if (!isBuy && tokenBalance !== null) {
                    const val = (tokenBalance * pct) / 100;
                    setAmount(val > 0 ? (pct === 100 ? val.toString() : Math.floor(val).toString()) : "");
                  }
                }}
                className={`flex-1 py-1.5 text-[11px] font-mono transition-colors border ${
                  pct === 100
                    ? "font-medium"
                    : "text-text-3 border-border hover:border-border-hover hover:text-text-2"
                }`}
                style={pct === 100 ? { borderColor: accent, color: accent } : undefined}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
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

        {/* Arrow divider — click to switch buy/sell */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setMode(isBuy ? "sell" : "buy");
              setAmount("");
            }}
            className="rounded-full border border-border p-1.5 transition-colors hover:border-brand hover:bg-brand/5"
          >
            <ArrowDownUp className="h-3.5 w-3.5 text-text-3" />
          </button>
        </div>

        {/* Output estimate */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-text-3">
            You receive
          </label>
          <div className="mt-1.5 flex items-center justify-between border border-border bg-bg/50 py-3 px-3">
            <span className="flex items-center gap-1.5 text-[12px] font-mono text-text-2">
              {isBuy ? (
                <>
                  {tokenImage && <img src={tokenImage} alt={tokenSymbol} className="h-4 w-4 rounded-full object-cover" />}
                  {tokenSymbol}
                </>
              ) : (
                <>
                  <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="h-4 w-4 rounded-full" />
                  SOL
                </>
              )}
            </span>
            <span className="font-mono text-[16px] text-text-1">
              {numAmount > 0
                ? isBuy
                  ? Math.floor(outputTokens).toLocaleString()
                  : outputTokens.toFixed(4)
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
                {Math.abs(priceImpact).toFixed(2)}%
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
