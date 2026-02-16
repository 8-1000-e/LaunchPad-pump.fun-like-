"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Types ─── */

type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "all";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "all", label: "All" },
];

/* ─── Generate mock price data ─── */

function generateMockData(tf: Timeframe): CandleData[] {
  const count =
    tf === "1m" ? 120 : tf === "5m" ? 100 : tf === "15m" ? 80 : tf === "1h" ? 72 : tf === "4h" ? 60 : 200;

  const interval =
    tf === "1m" ? 60 : tf === "5m" ? 300 : tf === "15m" ? 900 : tf === "1h" ? 3600 : tf === "4h" ? 14400 : 86400;

  const now = Math.floor(Date.now() / 1000);
  const data: CandleData[] = [];
  let price = 0.0008 + Math.random() * 0.001;

  for (let i = 0; i < count; i++) {
    const volatility = 0.02 + Math.random() * 0.06;
    const trend = Math.sin(i / (count * 0.15)) * 0.01 + 0.002;
    const change = (Math.random() - 0.45 + trend) * volatility;

    const open = price;
    price = Math.max(0.0001, price * (1 + change));
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = (0.5 + Math.random() * 4) * (1 + Math.abs(change) * 20);

    data.push({
      time: now - (count - i) * interval,
      open,
      high,
      low,
      close,
      volume,
    });
  }
  return data;
}

/* ─── Chart Component ─── */

export function TokenChart({ color = "#c9a84c" }: { color?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: string;
    change: string;
    time: string;
    isUp: boolean;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let chart: ReturnType<typeof import("lightweight-charts").createChart> | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      if (disposed || !containerRef.current) return;

      const { createChart, AreaSeries, ColorType, CrosshairMode, LineStyle } = await import(
        "lightweight-charts"
      );

      if (disposed || !containerRef.current) return;

      // Dispose previous
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      const data = generateMockData(timeframe);

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#78716c",
          fontFamily: "var(--font-geist-mono), monospace",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "#2e2b2815" },
          horzLines: { color: "#2e2b2830" },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "#44403c", width: 1, style: LineStyle.Dashed, labelVisible: false },
          horzLine: { color: "#44403c", width: 1, style: LineStyle.Dashed, labelVisible: true },
        },
        rightPriceScale: {
          borderColor: "#2e2b28",
          scaleMargins: { top: 0.1, bottom: 0.05 },
        },
        timeScale: {
          borderColor: "#2e2b28",
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: color + "40",
        bottomColor: color + "05",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: "#0c0a09",
        priceFormat: { type: "price", precision: 10, minMove: 0.0000000001 },
      });

      areaSeries.setData(
        data.map((d) => ({
          time: d.time as import("lightweight-charts").UTCTimestamp,
          value: d.close,
        })),
      );

      chart.timeScale().fitContent();

      // Tooltip on crosshair move
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData.size) {
          setTooltip(null);
          return;
        }

        const seriesData = param.seriesData.get(areaSeries) as { value: number } | undefined;
        if (!seriesData) {
          setTooltip(null);
          return;
        }

        const p = seriesData.value;
        const firstPrice = data[0].close;
        const changePct = ((p - firstPrice) / firstPrice) * 100;
        const date = new Date((param.time as number) * 1000);
        const timeStr = date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          price: p.toFixed(10),
          change: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`,
          time: timeStr,
          isUp: changePct >= 0,
        });
      });

      chartRef.current = chart;

      // Resize observer
      ro = new ResizeObserver((entries) => {
        if (disposed) return;
        for (const entry of entries) {
          chart?.applyOptions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      ro.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [timeframe, color]);

  return (
    <div className="relative">
      {/* Timeframe selector */}
      <div className="mb-3 flex items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`px-2.5 py-1 text-[11px] font-mono font-medium transition-colors ${
              timeframe === tf.value
                ? "bg-brand/10 text-brand"
                : "text-text-3 hover:text-text-2"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div className="relative h-[340px] sm:h-[400px]" ref={containerRef}>
        {/* Tooltip overlay */}
        {tooltip?.visible && (
          <div
            className="pointer-events-none absolute z-10 border border-border bg-surface/95 backdrop-blur-sm px-3 py-2"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 160),
              top: Math.max(8, tooltip.y - 60),
            }}
          >
            <p className="font-mono text-[13px] font-bold text-text-1">
              {tooltip.price} SOL
            </p>
            <p
              className={`font-mono text-[11px] font-medium ${
                tooltip.isUp ? "text-buy" : "text-sell"
              }`}
            >
              {tooltip.change}
            </p>
            <p className="text-[10px] text-text-3">{tooltip.time}</p>
          </div>
        )}
      </div>
    </div>
  );
}
