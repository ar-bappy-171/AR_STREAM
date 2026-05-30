'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Sparkles, Film, Tv, Globe, Loader2 } from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import type { WatchListCategory } from '@/lib/storage';
import { getWatchList, getContinueWatching } from '@/lib/storage';
import { ContentRow } from './ContentRow';

// ─── Helpers ─────────────────────────────────────────────────────────

interface RecommendationSource {
  id: number;
  title: string;
  type: 'movie' | 'tv' | 'anime';
  posterPath: string | null;
}

interface RecommendationRow {
  source: RecommendationSource;
  items: ContentItem[];
}

function mapTmdbRecResult(item: Record<string, unknown>, type: 'movie' | 'tv'): ContentItem {
  return {
    id: item.id as number,
    title: (item.title || item.name || 'Unknown') as string,
    originalTitle: (item.original_title || item.original_name) as string | undefined,
    overview: (item.overview || '') as string,
    posterPath: (item.poster_path as string) || null,
    backdropPath: (item.backdrop_path as string) || null,
    releaseDate: ((item.release_date || item.first_air_date || '') as string),
    voteAverage: (item.vote_average as number) || 0,
    voteCount: (item.vote_count as number) || 0,
    type,
    genreIds: item.genre_ids as number[] | undefined,
    popularity: item.popularity as number | undefined,
  };
}

// ─── Data fetching logic ─────────────────────────────────────────────

async function fetchRecommendationRows(maxSources: number): Promise<RecommendationRow[]> {
  const finishedItems = getWatchList('finished');
  const watchingItems = getWatchList('watching');
  const cwItems = getContinueWatching();

  const seenIds = new Set<string>();
  const sources: RecommendationSource[] = [];

  const addItem = (item: { id: number; title: string; type: 'movie' | 'tv' | 'anime'; posterPath: string | null }) => {
    const key = `${item.type}-${item.id}`;
    if (!seenIds.has(key) && item.type !== 'anime') {
      seenIds.add(key);
      sources.push({
        id: item.id,
        title: item.title,
        type: item.type,
        posterPath: item.posterPath,
      });
    }
  };

  finishedItems.sort((a, b) => b.addedAt - a.addedAt).forEach(addItem);
  watchingItems.sort((a, b) => b.addedAt - a.addedAt).forEach(addItem);
  cwItems.sort((a, b) => b.timestamp - a.timestamp).forEach(addItem);

  const topSources = sources.slice(0, maxSources);
  if (topSources.length === 0) return [];

  const results = await Promise.allSettled(
    topSources.map(async (source) => {
      const mediaType = source.type === 'tv' ? 'tv' : 'movie';
      const [recRes, simRes] = await Promise.allSettled([
        fetch(`/api/tmdb/${mediaType}/${source.id}/recommendations`),
        fetch(`/api/tmdb/${mediaType}/${source.id}/similar`),
      ]);

      const items: ContentItem[] = [];
      const seenItemIds = new Set<number>();
      const maxItems = maxSources <= 5 ? 10 : 20;

      if (recRes.status === 'fulfilled' && recRes.value.ok) {
        const data = await recRes.value.json();
        for (const item of (data.results || []).slice(0, maxItems)) {
          if (!seenItemIds.has(item.id as number)) {
            seenItemIds.add(item.id as number);
            items.push(mapTmdbRecResult(item, mediaType));
          }
        }
      }

      if (simRes.status === 'fulfilled' && simRes.value.ok) {
        const data = await simRes.value.json();
        for (const item of (data.results || []).slice(0, maxItems)) {
          if (!seenItemIds.has(item.id as number)) {
            seenItemIds.add(item.id as number);
            items.push(mapTmdbRecResult(item, mediaType));
          }
        }
      }

      return { source, items: items.slice(0, maxSources <= 5 ? 12 : 20) };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RecommendationRow> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((r) => r.items.length > 0);
}

// ─── AIRecommendations Component (Home page row) ────────────────────

interface AIRecommendationsProps {
  onItemClick?: (item: ContentItem) => void;
  onWatchListToggle?: (item: ContentItem, category: WatchListCategory | null) => void;
  watchListStatus?: (id: number, type: string) => WatchListCategory | null;
}

export function AIRecommendations({
  onItemClick,
  onWatchListToggle,
  watchListStatus,
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    fetchRecommendationRows(5).then((rows) => {
      if (!cancelled) {
        setRecommendations(rows);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  // Don't render anything if no sources
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Sparkles className="h-5 w-5 text-ars" />
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Recommended For You</h2>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12 px-4">
          <Loader2 className="h-6 w-6 animate-spin text-ars mr-3" />
          <span className="text-sm text-muted-foreground">Finding recommendations based on your watch history...</span>
        </div>
      )}

      {/* Recommendation rows */}
      {!loading && recommendations.map((row) => (
        <ContentRow
          key={`rec-${row.source.type}-${row.source.id}`}
          title={`Because you watched ${row.source.title}`}
          items={row.items}
          onItemClick={onItemClick}
          onWatchListToggle={onWatchListToggle}
          watchListStatus={watchListStatus}
        />
      ))}
    </div>
  );
}

// ─── Full Recommendations Section (for sidebar nav) ──────────────────

export function FullRecommendationsSection({
  onItemClick,
  onWatchListToggle,
  watchListStatus,
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    fetchRecommendationRows(8).then((rows) => {
      if (!cancelled) {
        setRecommendations(rows);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  if (!loading && recommendations.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">For You</h2>
          <p className="text-sm text-muted-foreground">Personalized recommendations</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="size-20 rounded-full bg-ars/10 flex items-center justify-center mb-4">
            <Sparkles className="size-10 text-ars/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Recommendations Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Add movies or TV shows to your &quot;Watching&quot; or &quot;Finished&quot; lists, and we&apos;ll recommend similar content you might enjoy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full fade-in space-y-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-ars" />
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">For You</h2>
        </div>
        <p className="text-sm text-muted-foreground">Personalized recommendations based on your watch history</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 px-4">
          <Loader2 className="h-6 w-6 animate-spin text-ars mr-3" />
          <span className="text-sm text-muted-foreground">Analyzing your watch history...</span>
        </div>
      )}

      {!loading && recommendations.map((row) => (
        <ContentRow
          key={`rec-full-${row.source.type}-${row.source.id}`}
          title={`Because you watched ${row.source.title}`}
          items={row.items}
          onItemClick={onItemClick}
          onWatchListToggle={onWatchListToggle}
          watchListStatus={watchListStatus}
        />
      ))}
    </div>
  );
}
