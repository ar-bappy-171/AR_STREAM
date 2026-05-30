'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  Clock,
  Film,
  Tv,
  Sparkles,
  ArrowUpDown,
  Trash2,
  X,
  Grid3X3,
  LayoutList,
  Star,
  Calendar,
  History,
} from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import type { WatchListCategory } from '@/lib/storage';
import { ContentCard } from './ContentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ──────────────────────────────────────────────────────────

type FilterTab = 'all' | 'movies' | 'tv' | 'anime';
type SortOption = 'recent' | 'oldest' | 'name-az' | 'name-za' | 'rating-high' | 'rating-low' | 'year-new' | 'year-old';
type ViewMode = 'grid' | 'list';

interface ContinueWatchingSectionProps {
  items: ContentItem[];
  onItemClick: (item: ContentItem) => void;
  onWatchListToggle: (item: ContentItem, category: WatchListCategory | null) => void;
  watchListStatus: (id: number, type: string) => WatchListCategory | null;
  onRemoveItem: (id: number, type: string) => void;
  onClearAll: () => void;
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
    'recent': 'Most Recent',
    'oldest': 'Oldest Viewed',
    'name-az': 'Name A → Z',
    'name-za': 'Name Z → A',
    'rating-high': 'Rating ↑',
    'rating-low': 'Rating ↓',
    'year-new': 'Newest Year',
    'year-old': 'Oldest Year',
  };
  return labels[sort];
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

// ─── Stats Bar ──────────────────────────────────────────────────────

function ContinueWatchingStatsBar({ items }: { items: ContentItem[] }) {
  const movies = items.filter(i => i.type === 'movie').length;
  const tvShows = items.filter(i => i.type === 'tv').length;
  const anime = items.filter(i => i.type === 'anime').length;
  const avgRating = items.length > 0
    ? (items.reduce((sum, i) => sum + (i.voteAverage || 0), 0) / items.filter(i => i.voteAverage > 0).length || 0).toFixed(1)
    : '0.0';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-card/80 border border-border/50 rounded-lg p-3 text-center">
        <p className="text-2xl font-bold text-foreground">{items.length}</p>
        <p className="text-xs text-muted-foreground">Total Viewed</p>
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
        <p className="text-2xl font-bold text-foreground">
          {items.length > 0 ? getRelativeTime(Math.max(...items.map(i => i.addedAt || 0))) : '—'}
        </p>
        <p className="text-xs text-muted-foreground">Last Viewed</p>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export default function ContinueWatchingSection({
  items,
  onItemClick,
  onWatchListToggle,
  watchListStatus,
  onRemoveItem,
  onClearAll,
}: ContinueWatchingSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

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
        case 'recent':
          return (b.addedAt || 0) - (a.addedAt || 0);
        case 'oldest':
          return (a.addedAt || 0) - (b.addedAt || 0);
        case 'name-az':
          return a.title.localeCompare(b.title);
        case 'name-za':
          return b.title.localeCompare(a.title);
        case 'rating-high':
          return (b.voteAverage || 0) - (a.voteAverage || 0);
        case 'rating-low':
          return (a.voteAverage || 0) - (b.voteAverage || 0);
        case 'year-new':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'year-old':
          return (a.releaseDate || '').localeCompare(b.releaseDate || '');
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

  const getStatus = useCallback(
    (item: ContentItem) => watchListStatus(item.id, item.type),
    [watchListStatus]
  );

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (confirmClearAll) {
      onClearAll();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
    }
  }, [confirmClearAll, onClearAll]);

  // ─── Empty State ────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Continue Watching</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="size-20 rounded-full bg-ars/10 flex items-center justify-center mb-4">
            <Clock className="size-10 text-ars/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Watch History</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Start browsing movies, TV shows, or anime and they&apos;ll appear here so you can pick up where you left off.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Film className="h-3.5 w-3.5" /> Movies</span>
            <span className="flex items-center gap-1"><Tv className="h-3.5 w-3.5" /> TV Shows</span>
            <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Anime</span>
          </div>
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
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Continue Watching</h2>
            <p className="text-sm text-muted-foreground">
              {filteredItems.length === items.length
                ? `${items.length} viewed item${items.length !== 1 ? 's' : ''}`
                : `${filteredItems.length} of ${items.length} items`
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
            {/* Clear All */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className={`gap-1.5 text-xs ${confirmClearAll ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'text-muted-foreground'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmClearAll ? 'Confirm?' : 'Clear All'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 sm:px-6 lg:px-8">
        <ContinueWatchingStatsBar items={items} />
      </div>

      {/* Search + Filter + Sort Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search your watch history by title or overview..."
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
                { key: 'all', label: 'All', icon: History },
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
                    'recent',
                    'oldest',
                    'name-az',
                    'name-za',
                    'rating-high',
                    'rating-low',
                    'year-new',
                    'year-old',
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
              ? `No items matching "${searchQuery}". Try a different search term.`
              : `No ${activeFilter === 'all' ? '' : activeFilter === 'movies' ? 'movies' : activeFilter === 'tv' ? 'TV shows' : 'anime'} in your watch history.`
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
                onWatchListToggle={onWatchListToggle}
                watchListStatus={getStatus(item)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ─── List View ─────────────────────────────────────────── */
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="space-y-2">
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
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.overview || 'No overview available'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {item.addedAt && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {getRelativeTime(item.addedAt)}
                        </span>
                      )}
                      {(item.voteAverage || 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 rating-star fill-current" />
                          {(item.voteAverage || 0).toFixed(1)}
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

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id, item.type); }}
                      className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      aria-label="Remove from history"
                    >
                      <X className="h-4 w-4" />
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
            Showing {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
            {searchQuery && ` · Matching "${searchQuery}"`}
            {activeFilter !== 'all' && ` · Filtered by ${activeFilter}`}
          </p>
        </div>
      )}
    </div>
  );
}
