"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Odometer-style price ticker ─── */

function Digit({ value, flash }: { value: string; flash: "up" | "down" | null }) {
  const [prev, setPrev] = useState(value);
  const [anim, setAnim] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value !== prev) {
      setAnim(true);
      const t = setTimeout(() => {
        setPrev(value);
        setAnim(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  const isNum = /\d/.test(value);

  if (!isNum) {
    return (
      <span className="inline-block" style={{ width: value === "." ? "0.35em" : "0.5em" }}>
        {value}
      </span>
    );
  }

  const flashColor =
    flash === "up" ? "var(--buy)" : flash === "down" ? "var(--sell)" : undefined;

  return (
    <span
      ref={spanRef}
      className="relative inline-block overflow-hidden"
      style={{
        width: "0.62em",
        height: "1.15em",
        verticalAlign: "bottom",
      }}
    >
      {/* Old digit (slides out) */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-transform duration-250 ease-out"
        style={{
          transform: anim ? "translateY(-100%)" : "translateY(0)",
          color: flashColor,
        }}
      >
        {prev}
      </span>
      {/* New digit (slides in) */}
      <span
        className="absolute inset-0 flex items-center justify-center transition-transform duration-250 ease-out"
        style={{
          transform: anim ? "translateY(0)" : "translateY(100%)",
          color: flashColor,
        }}
      >
        {value}
      </span>
    </span>
  );
}

function autoDecimals(price: number): number {
  if (price === 0) return 6;
  if (price >= 1) return 4;
  if (price >= 0.001) return 6;
  // For very small prices, find first significant digit
  const str = price.toFixed(20);
  const dotIdx = str.indexOf(".");
  if (dotIdx === -1) return 2;
  for (let i = dotIdx + 1; i < str.length; i++) {
    if (str[i] !== "0") {
      // Show 4 significant digits after the first non-zero
      return Math.min(i - dotIdx + 3, 14);
    }
  }
  return 10;
}

export function TickerPrice({
  price,
  decimals,
  flash,
  className = "",
}: {
  price: number;
  decimals?: number;
  flash: "up" | "down" | null;
  className?: string;
}) {
  const d = decimals ?? autoDecimals(price);
  const formatted = price.toFixed(d);
  const chars = formatted.split("");

  return (
    <span className={`inline-flex font-mono font-bold tabular-nums ${className}`}>
      {chars.map((ch, i) => (
        <Digit key={`${i}-${ch}`} value={ch} flash={flash} />
      ))}
    </span>
  );
}
