interface SparklineProps {
  data: number[];
  positive: boolean;
  id: string;
  className?: string;
  delay?: number;
}

export function Sparkline({
  data,
  positive,
  id,
  className = "",
  delay = 0,
}: SparklineProps) {
  if (data.length < 2) return null;

  const w = 120;
  const h = 32;
  const pad = 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const color = positive ? "var(--buy)" : "var(--sell)";
  const gid = `sf-${id}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="300"
        strokeDashoffset="0"
        style={{
          animation: `draw-spark 1s ease-out both`,
          animationDelay: `${delay}ms`,
        }}
      />
    </svg>
  );
}
