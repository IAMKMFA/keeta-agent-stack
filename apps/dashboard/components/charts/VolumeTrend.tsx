'use client';

import { useMemo } from 'react';

interface Point {
  day: string;
  count: number;
  success: number;
}

interface VolumeTrendProps {
  data: Point[];
  compact?: boolean;
}

/**
 * Lightweight sparkline / area chart rendered inline with SVG — avoids
 * pulling in recharts/d3 for the exec overview. Swap in recharts later if
 * we need richer interactions.
 */
export function VolumeTrend({ data, compact }: VolumeTrendProps) {
  const { path, successPath, max, width, height } = useMemo(() => {
    const w = 600;
    const h = compact ? 120 : 180;
    const m = Math.max(1, ...data.map((d) => d.count));
    if (data.length === 0) return { path: '', successPath: '', max: m, width: w, height: h };
    const step = data.length > 1 ? w / (data.length - 1) : w;
    const toY = (v: number) => h - (v / m) * (h - 8) - 4;
    let path = `M 0 ${toY(data[0]!.count)}`;
    let successPath = `M 0 ${toY(data[0]!.success)}`;
    for (let i = 1; i < data.length; i++) {
      path += ` L ${i * step} ${toY(data[i]!.count)}`;
      successPath += ` L ${i * step} ${toY(data[i]!.success)}`;
    }
    return { path, successPath, max: m, width: w, height: h };
  }, [data, compact]);

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[140px] w-full sm:h-[180px]"
        role="img"
        aria-label="Execution volume trend"
      >
        <defs>
          <linearGradient id="volume-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(50,149,144,0.28)" />
            <stop offset="100%" stopColor="rgba(50,149,144,0)" />
          </linearGradient>
        </defs>
        {path ? (
          <>
            <path
              d={`${path} L ${width} ${height} L 0 ${height} Z`}
              fill="url(#volume-grad)"
              stroke="none"
            />
            <path d={path} fill="none" stroke="var(--keeta-accent-deep)" strokeWidth={1.5} />
            <path
              d={successPath}
              fill="none"
              stroke="var(--keeta-success)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.75}
            />
          </>
        ) : null}
      </svg>
      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--keeta-muted)]">
        <span>{data[0]?.day ?? ''}</span>
        <span>peak {max}</span>
        <span>{data[data.length - 1]?.day ?? ''}</span>
      </div>
    </div>
  );
}
