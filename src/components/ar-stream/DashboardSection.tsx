'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  Clock,
  ListChecks,
  Star,
  Flame,
  Film,
  Tv,
  Sparkles,
  TrendingUp,
  Trophy,
  CheckCircle,
} from 'lucide-react';
import {
  getWatchList,
  getContinueWatching,
  getActivityLog,
  type WatchListItem,
  type ActivityEntry,
} from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function posterUrl(path: string | null): string {
  if (!path) return '/placeholder-poster.svg';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}${path}`;
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function estimateWatchTime(items: WatchListItem[]): number {
  let totalMinutes = 0;
  for (const item of items) {
    if (item.type === 'movie') {
      totalMinutes += 120; // ~2h per movie
    } else if (item.type === 'tv') {
      // Use totalEpisodes if available, otherwise estimate 10 episodes
      const episodes = item.totalEpisodes || 10;
      totalMinutes += episodes * 45;
    } else if (item.type === 'anime') {
      const episodes = item.totalEpisodes || 12;
      totalMinutes += episodes * 24;
    }
  }
  return totalMinutes;
}

function calculateStreak(entries: ActivityEntry[]): number {
  if (entries.length === 0) return 0;

  const days = new Set<string>();
  entries.forEach(entry => {
    const date = new Date(entry.timestamp);
    days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  });

  const sortedDays = Array.from(days)
    .map(d => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m, day).getTime();
    })
    .sort((a, b) => b - a);

  if (sortedDays.length === 0) return 0;

  let streak = 1;
  const oneDayMs = 86400000;

  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i - 1] - sortedDays[i] <= oneDayMs) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

// ─── Genre mapping ──────────────────────────────────────────────────

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
};

// ─── Color palette for charts ───────────────────────────────────────

const CHART_COLORS = [
  'bg-ars',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
];

// ─── Sub-components ─────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, subtext, color = 'text-ars' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
          </div>
          <div className={`size-10 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-')}/10`}>
            <Icon className={`size-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GenreBarChart({ items }: { items: WatchListItem[] }) {
  const genreData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      // Use the type as a pseudo-genre since we don't have genre IDs in watchlist items
      const type = item.type === 'movie' ? 'Movies' : item.type === 'tv' ? 'TV Shows' : 'Anime';
      counts[type] = (counts[type] || 0) + 1;
    }

    // Also derive from categories
    const categories: Record<string, number> = {};
    for (const item of items) {
      const cat = item.category === 'watching' ? 'Watching' : item.category === 'watchlist' ? 'Watch List' : 'Finished';
      categories[cat] = (categories[cat] || 0) + 1;
    }

    // Combine all
    const combined = { ...counts, ...categories };
    return Object.entries(combined)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [items]);

  if (genreData.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  const maxCount = Math.max(...genreData.map(d => d[1]));

  return (
    <div className="space-y-3">
      {genreData.map(([genre, count], idx) => (
        <div key={genre} className="flex items-center gap-3">
          <span className="text-xs font-medium text-foreground w-24 sm:w-28 text-right truncate">{genre}</span>
          <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${CHART_COLORS[idx % CHART_COLORS.length]} transition-all duration-700`}
              style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-8">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ContentTypeDonut({ items }: { items: WatchListItem[] }) {
  const data = useMemo(() => {
    const movies = items.filter(i => i.type === 'movie').length;
    const tv = items.filter(i => i.type === 'tv').length;
    const anime = items.filter(i => i.type === 'anime').length;
    const total = movies + tv + anime;
    return [
      { label: 'Movies', count: movies, color: 'bg-orange-500', ring: 'border-orange-500' },
      { label: 'TV Shows', count: tv, color: 'bg-emerald-500', ring: 'border-emerald-500' },
      { label: 'Anime', count: anime, color: 'bg-violet-500', ring: 'border-violet-500' },
    ].filter(d => d.count > 0).map(d => ({ ...d, pct: total > 0 ? Math.round((d.count / total) * 100) : 0 }));
  }, [items]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* CSS Donut */}
      <div className="relative size-32 sm:size-40 flex-shrink-0">
        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
          {data.map((d, i) => {
            const prevPct = data.slice(0, i).reduce((s, x) => s + x.pct, 0);
            const colors = ['#f97316', '#10b981', '#8b5cf6'];
            return (
              <circle
                key={d.label}
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="4"
                strokeDasharray={`${d.pct} ${100 - d.pct}`}
                strokeDashoffset={`${-prevPct}`}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{total}</p>
            <p className="text-[10px] text-muted-foreground">total</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2.5">
            <div className={`size-3 rounded-full ${d.color}`} />
            <span className="text-sm text-foreground font-medium">{d.label}</span>
            <span className="text-xs text-muted-foreground">{d.count} ({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyActivityChart({ entries }: { entries: ActivityEntry[] }) {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; year: number; month: number; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: getMonthLabel(d), year: d.getFullYear(), month: d.getMonth(), count: 0 });
    }

    for (const entry of entries) {
      const d = new Date(entry.timestamp);
      const match = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (match) match.count++;
    }

    return months;
  }, [entries]);

  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  return (
    <div className="flex items-end gap-2 sm:gap-3 h-40">
      {monthlyData.map((m) => (
        <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-foreground">{m.count || ''}</span>
          <div className="w-full bg-muted/50 rounded-t-sm relative" style={{ height: '100px' }}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-ars/80 rounded-t-sm transition-all duration-700"
              style={{ height: `${maxCount > 0 ? (m.count / maxCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function TopRatedList({ items }: { items: WatchListItem[] }) {
  const topItems = useMemo(() => {
    return [...items]
      .filter(i => i.voteAverage > 0)
      .sort((a, b) => b.voteAverage - a.voteAverage)
      .slice(0, 5);
  }, [items]);

  if (topItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No rated items yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topItems.map((item, idx) => (
        <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-card/60 border border-border/30 hover:border-ars/20 transition-colors">
          <span className={`text-sm font-bold w-6 text-center ${idx === 0 ? 'text-ars' : 'text-muted-foreground'}`}>
            {idx + 1}
          </span>
          <div className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0">
            <Image src={posterUrl(item.posterPath)} alt={item.title} fill sizes="32px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.type === 'movie' ? 'Movie' : item.type === 'tv' ? 'TV' : 'Anime'}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="h-3.5 w-3.5 rating-star fill-current" />
            <span className="text-sm font-bold text-foreground">{item.voteAverage.toFixed(1)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentlyFinishedList({ items }: { items: WatchListItem[] }) {
  const finishedItems = useMemo(() => {
    return items
      .filter(i => i.category === 'finished')
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 5);
  }, [items]);

  if (finishedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No finished items yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {finishedItems.map(item => (
        <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-card/60 border border-border/30 hover:border-ars/20 transition-colors">
          <div className="relative w-8 h-12 rounded overflow-hidden flex-shrink-0">
            <Image src={posterUrl(item.posterPath)} alt={item.title} fill sizes="32px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
            <p className="text-[10px] text-muted-foreground">{item.type === 'movie' ? 'Movie' : item.type === 'tv' ? 'TV' : 'Anime'}</p>
          </div>
          <CheckCircle className="h-4 w-4 text-sky-500 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function DashboardSection() {
  const watchListItems = useMemo(() => getWatchList(), []);
  const continueWatchingItems = useMemo(() => getContinueWatching(), []);
  const activityLog = useMemo(() => getActivityLog(), []);

  // ─── Computed Stats ──────────────────────────────────────────────
  const totalItems = watchListItems.length;
  const watchTimeMinutes = estimateWatchTime(watchListItems);
  const avgRating = totalItems > 0
    ? (watchListItems.reduce((sum, i) => sum + i.voteAverage, 0) / totalItems).toFixed(1)
    : '0.0';
  const streak = calculateStreak(activityLog);

  // Empty state
  if (totalItems === 0 && continueWatchingItems.length === 0 && activityLog.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Your personal stats and insights</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="size-20 rounded-full bg-ars/10 flex items-center justify-center mb-4">
            <BarChart3 className="size-10 text-ars/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Start adding content to your lists to see your personal dashboard with stats, charts, and insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full fade-in space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-ars/10 flex items-center justify-center">
            <BarChart3 className="size-5 text-ars" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Your personal stats and insights</p>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={ListChecks}
            label="Total Items"
            value={totalItems}
            subtext="across all lists"
            color="text-ars"
          />
          <StatCard
            icon={Clock}
            label="Watch Time"
            value={formatDuration(watchTimeMinutes)}
            subtext="estimated"
            color="text-emerald-500"
          />
          <StatCard
            icon={Star}
            label="Avg Rating"
            value={avgRating}
            subtext="of your content"
            color="text-amber-500"
          />
          <StatCard
            icon={Flame}
            label="Longest Streak"
            value={`${streak}d`}
            subtext="consecutive days"
            color="text-rose-500"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Genre Breakdown */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-ars" />
              Content Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GenreBarChart items={watchListItems} />
          </CardContent>
        </Card>

        {/* Content Type Distribution */}
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Film className="size-4 text-ars" />
              Content Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContentTypeDonut items={watchListItems} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Activity */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-ars" />
              Monthly Activity <span className="text-muted-foreground font-normal">(last 6 months)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyActivityChart entries={activityLog} />
          </CardContent>
        </Card>
      </div>

      {/* Top Rated & Recently Finished */}
      <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              Top Rated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopRatedList items={watchListItems} />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="size-4 text-sky-500" />
              Recently Finished
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentlyFinishedList items={watchListItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
