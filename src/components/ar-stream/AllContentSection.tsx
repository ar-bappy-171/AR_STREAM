'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  LayoutGrid,
  Film,
  Tv,
  Sparkles,
  ArrowUpDown,
  X,
  Grid3X3,
  LayoutList,
  Star,
  Calendar,
  Layers,
} from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import { ContentCard, ContentCardSkeleton } from './ContentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ──────────────────────────────────────────────────────────

type FilterTab = 'all' | 'movies' | 'tv' | 'anime';
type SortOption = 'name-az' | 'name-za' | 'rating-high' | 'rating-low' | 'year-new' | 'year-old' | 'popular' | 'trending';
type ViewMode = 'grid' | 'list';

interface AllContentSectionProps {
  items: ContentItem[];
  loading?: boolean;
  onItemClick: (item: ContentItem) => void;
  onFavoriteToggle: (item: ContentItem) => void;
  favorites: Set<string>;
}

// ─── Helpers ────────────────────────────────────────────────────────

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function posterUrl(path: string | null): string {
  if (!path) return '/placeholder-poster.svg';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}${path}`;
}

function getYear(date: string): string {
  if (!date) return '—';
  return date.split('-')[0];
}

function getTypeBadgeClasses(type: ContentItem['type']): string {
  switch (type) {
    case 'movie': return 'badge-movie text-white';
    case 'tv': return 'badge-tv text-white';
    case 'anime': return 'badge-anime text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: ContentItem['type']): string {
  switch (type) {
    case 'movie': return 'Movie';
    case 'tv': return 'TV';
    case 'anime': return 'Anime';
    default: return type;
  }
}

function getTypeIcon(type: ContentItem['type']) {
  switch (type) {
    case 'movie': return Film;
    case 'tv': return Tv;
    case 'anime': return Sparkles;
    default: return Film;
  }
}

function getSortLabel(sort: SortOption): string {
  const labels: Record<SortOption, string> = {
    'name-az': 'Name A → Z',
    'name-za': 'Name Z → A',
    'rating-high': 'Rating ↑',
    'rating-low': 'Rating ↓',
    'year-new': 'Newest Year',
    'year-old': 'Oldest Year',
    'popular': 'Most Popular',
    'trending': 'Trending',
  };
  return labels[sort];
}

// ─── Stats Bar ──────────────────────────────────────────────────────

function AllContentStatsBar({ items }: { items: ContentItem[] }) {
  const movies = items.filter(i => i.type === 'movie').length;
  const tvShows = items.filter(i => i.type === 'tv').length;
  const anime = items.filter(i => i.type === 'anime').length;
  const avgRating = items.length > 0
    ? (items.reduce((sum, i) => sum + i.voteAverage, 0) / items.filter(i => i.voteAverage > 0).length || 0).toFixed(1)
    : '0.0';
  const uniqueYears = new Set(items.map(i => i.releaseDate?.split('-')[0]).filter(Boolean));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-card/80 border border-border/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{items.length}</p>
        <p className="text-xs text-muted-foreground">Total Content</p>
      </div>
      <div className="bg-card/80 border border-border/50 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Film className="h-4 w-4 text-orange-400" />
          <Tv className="h-4 w-4 text-emerald-400" />
          <Sparkles className="h-4 w-4 text-purple-400" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{movies}M · {tvShows}TV · {anime}A</p>
      </div>
      <div className="bg-card/80 border border-border/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-yellow-500">⭐ {avgRating}</p>
        <p className="text-xs text-muted-foreground">Avg Rating</p>
      </div>
      <div className="bg-card/80 border border-border/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{uniqueYears.size}</p>
        <p className="text-xs text-muted-foreground">Unique Years</p>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function AllContentSection({
  items,
  loading = false,
  onItemClick,
  onFavoriteToggle,
  favorites,
}: AllContentSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter + Search + Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by type
    if (activeFilter === 'movies') result = result.filter(i => i.type === 'movie');
    else if (activeFilter === 'tv') result = result.filter(i => i.type === 'tv');
    else if (activeFilter === 'anime') result = result.filter(i => i.type === 'anime');

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.originalTitle && i.originalTitle.toLowerCase().includes(q)) ||
        i.overview.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-az':
          return a.title.localeCompare(b.title);
        case 'name-za':
          return b.title.localeCompare(a.title);
        case 'rating-high':
          return b.voteAverage - a.voteAverage;
        case 'rating-low':
          return a.voteAverage - b.voteAverage;
        case 'year-new':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'year-old':
          return (a.releaseDate || '').localeCompare(b.releaseDate || '');
        case 'popular':
          return (b.popularity || 0) - (a.popularity || 0);
        case 'trending':
          return (b.voteCount || 0) - (a.voteCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [items, activeFilter, searchQuery, sortBy]);

  // Counts per type
  const counts = useMemo(() => ({
    all: items.length,
    movies: items.filter(i => i.type === 'movie').length,
    tv: items.filter(i => i.type === 'tv').length,
    anime: items.filter(i => i.type === 'anime').length,
  }), [items]);

  const isFavorite = useCallback(
    (item: ContentItem) => favorites.has(`${item.type}-${item.id}`),
    [favorites]
  );

  // ─── Loading State ────────────────────────────────────────────────
  if (loading && items.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">All Content</h2>
          <p className="text-sm text-muted-foreground">Loading content from all sources...</p>
        </div>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ContentCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">All Content</h2>
          <p className="text-sm text-muted-foreground">Browse everything in one place</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="size-20 rounded-full bg-ars/10 flex items-center justify-center mb-4">
            <LayoutGrid className="size-10 text-ars/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Content Available</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Content is loading from various sources. Please wait or check back in a moment.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main View ──────────────────────────────────────────────────
  return (
    <div className="w-full fade-in space-y-5">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">All Content</h2>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length === items.length
                ? `${items.length} title${items.length !== 1 ? 's' : ''} from all sources`
                : `${filteredItems.length} of ${items.length} titles`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="hidden sm:flex items-center bg-muted/50 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-ars text-ars-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-ars text-ars-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 sm:px-6 lg:px-8">
        <AllContentStatsBar items={items} />
      </div>

      {/* Search + Filter + Sort Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search all content by title, original title, or overview..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-card/80 border-border/50 focus:border-ars/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs + Sort */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Type Filter Tabs */}
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
            <TabsList className="bg-muted/50 h-9">
              {([
                { key: 'all', label: 'All', icon: Layers },
                { key: 'movies', label: `Movies (${counts.movies})`, icon: Film },
                { key: 'tv', label: `TV (${counts.tv})`, icon: Tv },
                { key: 'anime', label: `Anime (${counts.anime})`, icon: Sparkles },
              ] as const).map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="gap-1 text-xs px-2.5 data-[state=active]:bg-ars data-[state=active]:text-ars-foreground"
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden"><tab.icon className="h-3.5 w-3.5" /></span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Sort Dropdown */}
          <div className="relative ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="gap-1.5 text-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {getSortLabel(sortBy)}
            </Button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-popover border border-border rounded-lg shadow-xl py-1">
                  {([
                    'popular',
                    'trending',
                    'rating-high',
                    'rating-low',
                    'year-new',
                    'year-old',
                    'name-az',
                    'name-za',
                  ] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-ars/10 transition-colors ${
                        sortBy === option ? 'text-ars font-medium bg-ars/5' : 'text-foreground'
                      }`}
                    >
                      {getSortLabel(option)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No matches found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery
              ? `No content matching "${searchQuery}". Try a different search term.`
              : `No ${activeFilter === 'all' ? '' : activeFilter === 'movies' ? 'movies' : activeFilter === 'tv' ? 'TV shows' : 'anime'} available.`
            }
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Clear Search
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── Grid View ─────────────────────────────────────────── */
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredItems.map((item) => (
              <ContentCard
                key={`${item.type}-${item.id}`}
                item={item}
                onClick={onItemClick}
                onFavoriteToggle={onFavoriteToggle}
                isFavorite={isFavorite(item)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ─── List View ─────────────────────────────────────────── */
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain custom-scrollbar pr-1">
            {filteredItems.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-card/60 border border-border/30 hover:bg-card/80 hover:border-ars/20 transition-all cursor-pointer group"
                  onClick={() => onItemClick(item)}
                >
                  {/* Poster Thumbnail */}
                  <div className="relative w-12 h-18 sm:w-14 sm:h-21 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={posterUrl(item.posterPath)}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded flex-shrink-0 ${getTypeBadgeClasses(item.type)}`}>
                        <TypeIcon className="h-2.5 w-2.5" />
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.overview}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {item.voteAverage > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 rating-star fill-current" />
                          {item.voteAverage.toFixed(1)}
                        </span>
                      )}
                      {item.releaseDate && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {getYear(item.releaseDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Favorite toggle */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onFavoriteToggle(item); }}
                      className={`p-1.5 rounded-full transition-colors ${
                        isFavorite(item)
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                      aria-label={isFavorite(item) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg className="h-4 w-4" fill={isFavorite(item) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer count */}
      {filteredItems.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredItems.length} of {items.length} title{items.length !== 1 ? 's' : ''}
            {searchQuery && ` · Matching "${searchQuery}"`}
            {activeFilter !== 'all' && ` · Filtered by ${activeFilter}`}
          </p>
        </div>
      )}
    </div>
  );
}
