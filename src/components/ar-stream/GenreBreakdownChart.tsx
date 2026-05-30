'use client';

import { useMemo, useState, useCallback } from 'react';
import type { WatchListItem } from '@/lib/storage';
import type { ContentItem } from '@/lib/store';

// ─── Genre mapping (same as DashboardSection) ──────────────────────

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// ─── Cinema-inspired warm color palette ─────────────────────────────

const SLICE_COLORS = [
  '#f97316', // orange
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#14b8a6', // teal
  '#e11d48', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo (used sparingly)
  '#d97706', // amber-600
  '#059669', // emerald-600
  '#dc2626', // red-600
  '#7c3aed', // violet-600
];

// ─── Types ──────────────────────────────────────────────────────────

interface GenreSlice {
  id: number;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface GenreBreakdownChartProps {
  items: WatchListItem[];
  sectionData: Record<string, ContentItem[]>;
}

// ─── SVG arc helpers ────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  // If the slice is extremely small, skip
  if (endAngle - startAngle < 0.3) return '';

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

// ─── Taste profile label ────────────────────────────────────────────

function getTasteProfile(genres: GenreSlice[]): string {
  if (genres.length === 0) return '';
  if (genres.length === 1) return `You love ${genres[0].name}!`;
  return `You love ${genres[0].name} & ${genres[1].name}!`;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function GenreBreakdownChart({ items, sectionData }: GenreBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Build a lookup map from sectionData: key = "type-id" → ContentItem
  const contentLookup = useMemo(() => {
    const map = new Map<string, ContentItem>();
    for (const sectionItems of Object.values(sectionData)) {
      for (const item of sectionItems) {
        map.set(`${item.type}-${item.id}`, item);
      }
    }
    return map;
  }, [sectionData]);

  // Compute genre frequency from watchlist items → sectionData genreIds
  const genreData = useMemo(() => {
    const genreCounts: Record<number, number> = {};

    for (const item of items) {
      const key = `${item.type}-${item.id}`;
      const contentItem = contentLookup.get(key);
      if (contentItem?.genreIds && contentItem.genreIds.length > 0) {
        for (const gId of contentItem.genreIds) {
          genreCounts[gId] = (genreCounts[gId] || 0) + 1;
        }
      }
    }

    const totalEntries = Object.values(genreCounts).reduce((s, c) => s + c, 0);

    if (totalEntries === 0) return [];

    const slices: GenreSlice[] = Object.entries(genreCounts)
      .map(([idStr, count]) => ({
        id: Number(idStr),
        name: GENRE_MAP[Number(idStr)] || `Genre ${idStr}`,
        count,
        percentage: Math.round((count / totalEntries) * 100),
        color: '',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12); // Max 12 slices

    // Assign colors
    slices.forEach((s, i) => {
      s.color = SLICE_COLORS[i % SLICE_COLORS.length];
    });

    // Recalculate percentages for displayed slices
    const displayedTotal = slices.reduce((s, x) => s + x.count, 0);
    slices.forEach(s => {
      s.percentage = Math.round((s.count / displayedTotal) * 100);
    });

    return slices;
  }, [items, contentLookup]);

  // Compute cumulative angles for each slice
  const slicesWithAngles = useMemo(() => {
    const total = genreData.reduce((s, x) => s + x.percentage, 0) || 1;
    return genreData.reduce<Array<GenreSlice & { startAngle: number; endAngle: number; midAngle: number }>>(
      (acc, slice) => {
        const prevEnd = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
        const angle = (slice.percentage / total) * 360;
        acc.push({
          ...slice,
          startAngle: prevEnd,
          endAngle: prevEnd + angle,
          midAngle: prevEnd + angle / 2,
        });
        return acc;
      },
      [],
    );
  }, [genreData]);

  const totalGenres = genreData.length;

  const handleMouseEnter = useCallback((idx: number) => setHoveredIndex(idx), []);
  const handleMouseLeave = useCallback(() => setHoveredIndex(null), []);

  // ─── Empty state ──────────────────────────────────────────────────
  if (genreData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-16 rounded-full bg-ars/10 flex items-center justify-center mb-3">
          <svg className="size-8 text-ars/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          Add content to your lists to see your taste profile
        </p>
      </div>
    );
  }

  // ─── SVG dimensions ───────────────────────────────────────────────
  const cx = 100;
  const cy = 100;
  const outerR = 90;
  const innerR = 55;

  return (
    <div className="space-y-4">
      {/* Taste Profile Label */}
      <p className="text-sm font-medium text-ars text-center">
        {getTasteProfile(genreData)}
      </p>

      {/* Donut Chart + Legend */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Donut */}
        <div className="relative size-44 sm:size-52 flex-shrink-0">
          <svg
            viewBox="0 0 200 200"
            className="size-full"
            role="img"
            aria-label="Genre breakdown donut chart"
          >
            {/* Background ring */}
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="currentColor"
              strokeWidth={outerR - innerR}
              className="text-muted/20"
            />

            {/* Slices */}
            {slicesWithAngles.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;
              // Expand slice outward on hover
              const midAngle = slice.midAngle;
              const expandDist = isHovered ? 6 : 0;
              const translateX = (expandDist * Math.cos(((midAngle - 90) * Math.PI) / 180));
              const translateY = (expandDist * Math.sin(((midAngle - 90) * Math.PI) / 180));

              const d = describeArc(cx, cy, outerR, innerR, slice.startAngle, slice.endAngle);
              if (!d) return null;

              return (
                <path
                  key={slice.id}
                  d={d}
                  fill={slice.color}
                  opacity={hoveredIndex !== null && !isHovered ? 0.5 : 1}
                  transform={`translate(${translateX}, ${translateY})`}
                  className="cursor-pointer transition-all duration-200 ease-out"
                  style={{
                    filter: isHovered ? 'brightness(1.15)' : 'none',
                  }}
                  onMouseEnter={() => handleMouseEnter(idx)}
                  onMouseLeave={handleMouseLeave}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalGenres}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">genres</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          <div className="grid grid-cols-1 gap-1.5">
            {genreData.map((slice, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={slice.id}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors duration-150 ${
                    isHovered ? 'bg-muted/60' : ''
                  }`}
                  onMouseEnter={() => handleMouseEnter(idx)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span
                    className="size-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm text-foreground font-medium truncate flex-1 min-w-0">
                    {slice.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                    {slice.count} · {slice.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
