'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Search, Film, Tv, Sparkles, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

interface SuggestionItem {
  id: number;
  title: string;
  year: string;
  type: 'movie' | 'tv' | 'anime';
  posterUrl: string;
}

interface SearchAutocompleteProps {
  searchQuery: string;
  isFocused: boolean;
  onClose: () => void;
}

function getTypeIcon(type: SuggestionItem['type']) {
  switch (type) {
    case 'movie':
      return <Film className="size-3.5" />;
    case 'tv':
      return <Tv className="size-3.5" />;
    case 'anime':
      return <Sparkles className="size-3.5" />;
  }
}

function getTypeBadgeClasses(type: SuggestionItem['type']): string {
  switch (type) {
    case 'movie':
      return 'badge-movie text-white';
    case 'tv':
      return 'badge-tv text-white';
    case 'anime':
      return 'badge-anime text-white';
  }
}

function getTypeLabel(type: SuggestionItem['type']): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv':
      return 'TV';
    case 'anime':
      return 'Anime';
  }
}

export default function SearchAutocomplete({ searchQuery, isFocused, onClose }: SearchAutocompleteProps) {
  const { setSearchQuery, setActiveSection } = useAppStore();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const shouldShow = isFocused && searchQuery.trim().length >= 2;

  const fetchSuggestions = useCallback(async (query: string) => {
    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const [tmdbRes, jikanRes] = await Promise.allSettled([
        fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(query)}&page=1`, {
          signal: controller.signal,
        }),
        fetch(`/api/jikan/anime?q=${encodeURIComponent(query)}&limit=3`, {
          signal: controller.signal,
        }),
      ]);

      const results: SuggestionItem[] = [];

      // Process TMDB results
      if (tmdbRes.status === 'fulfilled' && tmdbRes.value.ok) {
        const tmdbData = await tmdbRes.value.json();
        if (tmdbData.results) {
          const movies: SuggestionItem[] = [];
          const tvShows: SuggestionItem[] = [];

          for (const item of tmdbData.results) {
            if (movies.length >= 3 && tvShows.length >= 3) break;
            if (item.media_type === 'movie' && movies.length < 3) {
              movies.push({
                id: item.id,
                title: item.title || item.name || 'Unknown',
                year: (item.release_date || '').split('-')[0],
                type: 'movie',
                posterUrl: item.poster_path
                  ? `${TMDB_IMAGE_BASE}${item.poster_path}`
                  : '/placeholder-poster.svg',
              });
            } else if ((item.media_type === 'tv') && tvShows.length < 3) {
              tvShows.push({
                id: item.id,
                title: item.name || item.title || 'Unknown',
                year: (item.first_air_date || '').split('-')[0],
                type: 'tv',
                posterUrl: item.poster_path
                  ? `${TMDB_IMAGE_BASE}${item.poster_path}`
                  : '/placeholder-poster.svg',
              });
            }
          }

          results.push(...movies, ...tvShows);
        }
      }

      // Process Jikan/Anime results
      if (jikanRes.status === 'fulfilled' && jikanRes.value.ok) {
        const jikanData = await jikanRes.value.json();
        if (jikanData.data) {
          for (const item of jikanData.data.slice(0, 3)) {
            results.push({
              id: item.mal_id,
              title: item.title || 'Unknown',
              year: (item.aired?.prop?.from?.year || '').toString(),
              type: 'anime',
              posterUrl: item.images?.jpg?.image_url || '/placeholder-poster.svg',
            });
          }
        }
      }

      if (!controller.signal.aborted) {
        setSuggestions(results);
      }
    } catch {
      // Silently handle errors (abort, network, etc.)
      if (!controller.signal.aborted) {
        setSuggestions([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!shouldShow) {
      setSuggestions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, shouldShow, fetchSuggestions]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isFocused) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused, onClose]);

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const groups: { type: SuggestionItem['type']; label: string; items: SuggestionItem[] }[] = [];
    const movieItems = suggestions.filter((s) => s.type === 'movie');
    const tvItems = suggestions.filter((s) => s.type === 'tv');
    const animeItems = suggestions.filter((s) => s.type === 'anime');

    if (movieItems.length > 0) groups.push({ type: 'movie', label: 'Movies', items: movieItems });
    if (tvItems.length > 0) groups.push({ type: 'tv', label: 'TV Shows', items: tvItems });
    if (animeItems.length > 0) groups.push({ type: 'anime', label: 'Anime', items: animeItems });

    return groups;
  }, [suggestions]);

  const allFlattened = useMemo(() => {
    // Build a flat list including the "Search for" footer for keyboard nav
    const flat: (SuggestionItem | 'search-action')[] = [...suggestions, 'search-action'];
    return flat;
  }, [suggestions]);

  const handleSelect = useCallback(
    (item: SuggestionItem) => {
      setSearchQuery(item.title);
      setActiveSection('search');
      onClose();
    },
    [setSearchQuery, setActiveSection, onClose]
  );

  const handleFullSearch = useCallback(() => {
    setActiveSection('search');
    onClose();
  }, [setActiveSection, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!shouldShow) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < allFlattened.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allFlattened.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const item = allFlattened[activeIndex];
        if (item === 'search-action') {
          handleFullSearch();
        } else {
          handleSelect(item);
        }
      }
    },
    [shouldShow, allFlattened, activeIndex, handleFullSearch, handleSelect]
  );

  // Expose keydown handler via a ref-based approach
  // We use a custom event pattern so the parent can forward key events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      handleKeyDown(e.detail as React.KeyboardEvent);
    };
    window.addEventListener('autocomplete-keydown' as string, handler as EventListener);
    return () =>
      window.removeEventListener('autocomplete-keydown' as string, handler as EventListener);
  }, [handleKeyDown]);

  if (!shouldShow) return null;

  const hasResults = groupedSuggestions.length > 0;

  // Track flat index offset for grouping headers
  let flatIdx = 0;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 z-[60] mt-1 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden">
        {loading && !hasResults ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        ) : hasResults ? (
          <>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {groupedSuggestions.map((group) => {
                const groupStartIdx = flatIdx;
                flatIdx += group.items.length;

                return (
                  <div key={group.type}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/30">
                      {getTypeIcon(group.type)}
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </span>
                    </div>

                    {/* Group items */}
                    {group.items.map((item, itemIdx) => {
                      const globalIdx = groupStartIdx + itemIdx;
                      const isActive = activeIndex === globalIdx;

                      return (
                        <button
                          key={`${item.type}-${item.id}`}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-150 ${
                            isActive
                              ? 'bg-ars/10 text-foreground'
                              : 'hover:bg-muted/50 text-foreground'
                          }`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                        >
                          {/* Poster thumbnail */}
                          <div className="relative size-10 rounded overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={item.posterUrl}
                              alt={item.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-poster.svg';
                              }}
                            />
                          </div>

                          {/* Title & year */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            {item.year && (
                              <p className="text-xs text-muted-foreground">{item.year}</p>
                            )}
                          </div>

                          {/* Type badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded flex-shrink-0 ${getTypeBadgeClasses(item.type)}`}
                          >
                            {getTypeIcon(item.type)}
                            {getTypeLabel(item.type)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Search for [query] action */}
            <button
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-border/30 transition-colors duration-150 ${
                activeIndex === allFlattened.length - 1
                  ? 'bg-ars/10 text-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
              onClick={handleFullSearch}
              onMouseEnter={() => setActiveIndex(allFlattened.length - 1)}
            >
              <div className="flex items-center justify-center size-8 rounded-full bg-ars/10 flex-shrink-0">
                <Search className="size-4 text-ars" />
              </div>
              <span className="text-sm">
                Search for{' '}
                <span className="font-semibold text-ars">&ldquo;{searchQuery.trim()}&rdquo;</span>
              </span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Search className="size-6 mb-2 opacity-40" />
            <span className="text-sm">No results found</span>
            <button
              className="mt-2 text-xs text-ars hover:underline"
              onClick={handleFullSearch}
            >
              Search for &ldquo;{searchQuery.trim()}&rdquo;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
