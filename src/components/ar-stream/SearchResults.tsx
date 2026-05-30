'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Film, Tv, Sparkles, RefreshCw, Loader2, SearchX } from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import type { WatchListCategory } from '@/lib/storage';
import { ContentCard, ContentCardSkeleton } from './ContentCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SearchResultsProps {
  query: string;
  onItemClick: (item: ContentItem) => void;
  onWatchListToggle: (item: ContentItem, category: WatchListCategory | null) => void;
  watchListStatus: (id: number, type: string) => WatchListCategory | null;
}

type FilterTab = 'all' | 'movies' | 'tv' | 'anime';

interface SearchState {
  results: ContentItem[];
  loading: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  totalPages: number;
}

const INITIAL_STATE: SearchState = {
  results: [],
  loading: false,
  error: null,
  page: 1,
  hasMore: false,
  totalPages: 1,
};

function mapTmdbResult(item: Record<string, unknown>): ContentItem {
  const mediaType = item.media_type as string;
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
    type: mediaType === 'tv' ? 'tv' : 'movie',
    genreIds: item.genre_ids as number[] | undefined,
    popularity: item.popularity as number | undefined,
  };
}

function mapJikanResult(item: Record<string, unknown>): ContentItem {
  return {
    id: item.mal_id as number,
    title: (item.title as string) || 'Unknown',
    originalTitle: item.title_japanese as string | undefined,
    overview: (item.synopsis as string) || '',
    posterPath: (item.images?.jpg?.image_url as string) || (item.images?.webp?.image_url as string) || null,
    backdropPath: null,
    releaseDate: (item.aired?.prop?.from?.year ? `${item.aired.prop.from.year}` : '') as string,
    voteAverage: ((item.score as number) || 0),
    voteCount: (item.scored_by as number) || 0,
    type: 'anime',
    episodes: item.episodes as number | undefined,
    status: item.status as string | undefined,
    genres: item.genres as { mal_id: number; name: string }[] | undefined,
    score: item.score as number | undefined,
  };
}

function getFilterIcon(tab: FilterTab) {
  switch (tab) {
    case 'movies':
      return <Film className="h-3.5 w-3.5" />;
    case 'tv':
      return <Tv className="h-3.5 w-3.5" />;
    case 'anime':
      return <Sparkles className="h-3.5 w-3.5" />;
    default:
      return <Search className="h-3.5 w-3.5" />;
  }
}

export default function SearchResults({ query, onItemClick, onWatchListToggle, watchListStatus }: SearchResultsProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [tmdbState, setTmdbState] = useState<SearchState>(INITIAL_STATE);
  const [jikanState, setJikanState] = useState<SearchState>(INITIAL_STATE);

  const getStatus = useCallback(
    (item: ContentItem) => watchListStatus(item.id, item.type),
    [watchListStatus]
  );

  // Fetch TMDB results (movies + TV)
  const fetchTmdbResults = useCallback(async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) return;

    if (page === 1) {
      setTmdbState((prev) => ({ ...prev, loading: true, error: null }));
    } else {
      setTmdbState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}&page=${page}`);
      if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
      const data = await res.json();

      const filtered = (data.results as Record<string, unknown>[])
        .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
        .map(mapTmdbResult);

      setTmdbState((prev) => ({
        results: page === 1 ? filtered : [...prev.results, ...filtered],
        loading: false,
        error: null,
        page: data.page || page,
        hasMore: (data.page || page) < (data.total_pages || 1),
        totalPages: data.total_pages || 1,
      }));
    } catch (err) {
      setTmdbState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to search movies & TV',
      }));
    }
  }, []);

  // Fetch Jikan results (anime)
  const fetchJikanResults = useCallback(async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) return;

    if (page === 1) {
      setJikanState((prev) => ({ ...prev, loading: true, error: null }));
    } else {
      setJikanState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const res = await fetch(`/api/jikan/anime?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`);
      if (!res.ok) throw new Error(`Jikan search failed: ${res.status}`);
      const data = await res.json();

      const mapped = (data.data as Record<string, unknown>[]).map(mapJikanResult);

      const lastPage = data.pagination?.last_visible_page || 1;
      const hasNext = data.pagination?.has_next_page || false;

      setJikanState((prev) => ({
        results: page === 1 ? mapped : [...prev.results, ...mapped],
        loading: false,
        error: null,
        page,
        hasMore: hasNext,
        totalPages: lastPage,
      }));
    } catch (err) {
      setJikanState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to search anime',
      }));
    }
  }, []);

  // Reset and fetch on query change
  useEffect(() => {
    if (!query.trim()) {
      setTmdbState(INITIAL_STATE);
      setJikanState(INITIAL_STATE);
      return;
    }

    setActiveTab('all');
    fetchTmdbResults(query, 1);
    fetchJikanResults(query, 1);
  }, [query, fetchTmdbResults, fetchJikanResults]);

  // Load more for current filter
  const handleLoadMore = useCallback(() => {
    const needsTmdb = activeTab === 'all' || activeTab === 'movies' || activeTab === 'tv';
    const needsJikan = activeTab === 'all' || activeTab === 'anime';

    if (needsTmdb && tmdbState.hasMore && !tmdbState.loading) {
      fetchTmdbResults(query, tmdbState.page + 1);
    }
    if (needsJikan && jikanState.hasMore && !jikanState.loading) {
      fetchJikanResults(query, jikanState.page + 1);
    }
  }, [activeTab, tmdbState, jikanState, query, fetchTmdbResults, fetchJikanResults]);

  // Retry
  const handleRetry = useCallback(() => {
    const needsTmdb = activeTab === 'all' || activeTab === 'movies' || activeTab === 'tv';
    const needsJikan = activeTab === 'all' || activeTab === 'anime';

    if (needsTmdb) fetchTmdbResults(query, 1);
    if (needsJikan) fetchJikanResults(query, 1);
  }, [activeTab, query, fetchTmdbResults, fetchJikanResults]);

  // Filtered results based on tab
  const getFilteredResults = useCallback((): ContentItem[] => {
    switch (activeTab) {
      case 'movies':
        return tmdbState.results.filter((item) => item.type === 'movie');
      case 'tv':
        return tmdbState.results.filter((item) => item.type === 'tv');
      case 'anime':
        return jikanState.results;
      case 'all':
      default:
        return [...tmdbState.results, ...jikanState.results];
    }
  }, [activeTab, tmdbState.results, jikanState.results]);

  const filteredResults = getFilteredResults();
  const isLoading = tmdbState.loading || jikanState.loading;
  const hasError = tmdbState.error || jikanState.error;
  const hasMoreToLoad =
    (activeTab === 'all' && (tmdbState.hasMore || jikanState.hasMore)) ||
    (activeTab === 'movies' && tmdbState.hasMore) ||
    (activeTab === 'tv' && tmdbState.hasMore) ||
    (activeTab === 'anime' && jikanState.hasMore);

  // Empty query state
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Search className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Search AR-Stream</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Search for movies, TV shows, and anime across multiple sources. Start typing to see results.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full fade-in">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
          Results for &apos;{query}&apos;
        </h2>
        <p className="text-sm text-muted-foreground">
          {filteredResults.length > 0
            ? `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''} found`
            : 'Searching...'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
          <TabsList className="bg-muted/50">
            {(['all', 'movies', 'tv', 'anime'] as FilterTab[]).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-ars data-[state=active]:text-ars-foreground"
              >
                {getFilterIcon(tab)}
                <span className="capitalize">{tab === 'tv' ? 'TV Shows' : tab}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Error State */}
      {hasError && !isLoading && filteredResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
          <SearchX className="h-12 w-12 text-destructive/50" />
          <p className="text-sm text-destructive text-center max-w-md">
            {tmdbState.error || jikanState.error}
          </p>
          <Button
            onClick={handleRetry}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && filteredResults.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <ContentCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasError && filteredResults.length === 0 && query.trim() && (
        <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
          <SearchX className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold text-foreground">No results found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            We couldn&apos;t find any matches for &apos;{query}&apos;. Try different keywords or check the spelling.
          </p>
        </div>
      )}

      {/* Results Grid */}
      {filteredResults.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8">
            {filteredResults.map((item) => (
              <ContentCard
                key={`${item.type}-${item.id}`}
                item={item}
                onClick={onItemClick}
                onWatchListToggle={onWatchListToggle}
                watchListStatus={getStatus(item)}
              />
            ))}
            {/* Loading more skeletons at the end */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <ContentCardSkeleton key={`loading-more-${i}`} />
              ))}
          </div>

          {/* Load More */}
          {hasMoreToLoad && !isLoading && (
            <div className="flex justify-center py-8 px-4">
              <Button
                onClick={handleLoadMore}
                variant="outline"
                size="lg"
                className="gap-2 min-w-[200px]"
              >
                <Loader2 className="h-4 w-4 animate-spin opacity-0 group-hover:opacity-100" />
                Load More
              </Button>
            </div>
          )}

          {/* End of results */}
          {!hasMoreToLoad && filteredResults.length > 0 && (
            <div className="flex justify-center py-8 px-4">
              <p className="text-xs text-muted-foreground">
                Showing all results for &apos;{query}&apos;
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
