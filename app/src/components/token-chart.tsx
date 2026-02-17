"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { TradeData } from "@/hooks/use-trade-data";
import { type Timeframe, TF_SECONDS } from "@/hooks/use-trade-data";

interface ChartPoint {
  time: number;
  value: number;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "all", label: "All" },
];

/**
 * Build ALL chart data points from trades (no time filtering).
 * Each trade = one point (max precision).
 * Deduplicates by keeping last price per second.
 */
function buildAllPoints(trades: TradeData[]): ChartPoint[] {
  if (trades.length === 0) return [];

  const sorted = [...trades]
    .filter((t) => t.price > 0 && t.timestamp > 0)
    .reverse(); // chronological

  if (sorted.length === 0) return [];

  // Keep last price per second (lightweight-charts needs unique timestamps)
  const bySecond = new Map<number, number>();
  for (const trade of sorted) {
    bySecond.set(trade.timestamp, trade.price);
  }

  // Extend to current time so the line reaches "now"
  const now = Math.floor(Date.now() / 1000);
  const lastPrice = sorted[sorted.length - 1].price;
  if (now - sorted[sorted.length - 1].timestamp > 2) {
    bySecond.set(now, lastPrice);
  }

  return Array.from(bySecond.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time, value }));
}

/* ─── Chart Component ─── */

export function TokenChart({
  color = "#c9a84c",
  trades,
  loading,
  timeframe,
  onTimeframeChange,
}: {
  color?: string;
  trades: TradeData[];
  loading: boolean;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const seriesRef = useRef<ReturnType<ReturnType<typeof import("lightweight-charts").createChart>["addSeries"]> | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    price: string;
    change: string;
    time: string;
    isUp: boolean;
  } | null>(null);

  // All data points — never filtered, always the full history
  const points = useMemo(() => buildAllPoints(trades), [trades]);

  // Stable ref for points (used in tooltip callback)
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // Apply visible range for a given timeframe
  const applyVisibleRange = useCallback((tf: Timeframe) => {
    const chart = chartRef.current;
    if (!chart) return;

    // Re-enable autoScale before changing range
    chart.priceScale("right").applyOptions({ autoScale: true });

    const now = Math.floor(Date.now() / 1000);
    const windowSec = TF_SECONDS[tf];

    if (windowSec > 0 && pointsRef.current.length > 0) {
      try {
        chart.timeScale().setVisibleRange({
          from: (now - windowSec) as import("lightweight-charts").UTCTimestamp,
          to: now as import("lightweight-charts").UTCTimestamp,
        });
      } catch {
        chart.timeScale().fitContent();
      }
    } else {
      chart.timeScale().fitContent();
    }
  }, []);

  // Effect 1: Create chart ONCE
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    (async () => {
      if (disposed || !containerRef.current) return;

      const { createChart, AreaSeries, ColorType, CrosshairMode, LineStyle } = await import(
        "lightweight-charts"
      );

      if (disposed || !containerRef.current) return;

      // Clean up any existing chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      const chart = createChart(containerRef.current, {
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
          autoScale: true,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "#2e2b28",
          timeVisible: true,
          secondsVisible: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: { time: true, price: false },
          axisDoubleClickReset: { time: true, price: false },
        },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      const lineSeries = chart.addSeries(AreaSeries, {
        lineColor: color,
        lineWidth: 2,
        topColor: color + "40",       // gold ~25% opacity at top
        bottomColor: color + "05",    // nearly transparent at bottom
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: color,
        crosshairMarkerBackgroundColor: "#0c0a09",
        priceFormat: { type: "price", precision: 10, minMove: 0.0000000001 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor: color + "60",
        priceLineStyle: LineStyle.Dashed,
      });

      // Force Y-axis to always auto-fit visible data.
      // lightweight-charts disables autoScale when user interacts with price axis,
      // so we re-enable it on every visible range change (zoom, pan, timeframe switch).
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        chart.priceScale("right").applyOptions({ autoScale: true });
      });

      // Tooltip
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData.size) {
          setTooltip(null);
          return;
        }

        const sd = param.seriesData.get(lineSeries) as { value: number } | undefined;
        if (!sd) {
          setTooltip(null);
          return;
        }

        const p = sd.value;
        const pts = pointsRef.current;
        const firstPrice = pts.length > 0 ? pts[0].value : p;
        const changePct = firstPrice > 0 ? ((p - firstPrice) / firstPrice) * 100 : 0;
        const date = new Date((param.time as number) * 1000);
        const timeStr = date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setTooltip({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          price: p.toFixed(10),
          change: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
          time: timeStr,
          isUp: changePct >= 0,
        });
      });

      chartRef.current = chart;
      seriesRef.current = lineSeries;

      // ResizeObserver
      const ro = new ResizeObserver((entries) => {
        if (disposed) return;
        for (const entry of entries) {
          chart.applyOptions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      ro.observe(containerRef.current);
      roRef.current = ro;
    })();

    return () => {
      disposed = true;
      roRef.current?.disconnect();
      roRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
    };
  }, [color]); // Only recreate when color changes

  // Effect 2: Update data when points change
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || points.length === 0) return;

    series.setData(
      points.map((d) => ({
        time: d.time as import("lightweight-charts").UTCTimestamp,
        value: d.value,
      })),
    );

    // After data update, apply visible range with a frame delay
    // so the chart processes the new data first
    requestAnimationFrame(() => {
      applyVisibleRange(timeframe);
    });
  }, [points, timeframe, applyVisibleRange]);

  // Effect 3: Adjust visible range when timeframe changes
  // (separate from data so it runs even when points haven't changed)
  useEffect(() => {
    applyVisibleRange(timeframe);
  }, [timeframe, applyVisibleRange]);

  return (
    <div className="relative">
      {/* Timeframe selector */}
      <div className="mb-3 flex items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
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
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/60">
            <div className="flex items-center gap-2 text-text-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-3 border-t-transparent" />
              <span className="text-[12px]">Loading chart...</span>
            </div>
          </div>
        )}

        {!loading && points.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <span className="text-[12px] text-text-3">No trade data yet</span>
          </div>
        )}

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
