'use client';

import Image from 'next/image';
import { Star, Heart, Play } from 'lucide-react';
import type { ContentItem } from '@/lib/store';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface ContentCardProps {
  item: ContentItem;
  onClick?: (item: ContentItem) => void;
  onFavoriteToggle?: (item: ContentItem) => void;
  isFavorite?: boolean;
}

function getTypeBadgeClasses(type: ContentItem['type']): string {
  switch (type) {
    case 'movie':
      return 'badge-movie text-white';
    case 'tv':
      return 'badge-tv text-white';
    case 'anime':
      return 'badge-anime text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getTypeLabel(type: ContentItem['type']): string {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv':
      return 'TV';
    case 'anime':
      return 'Anime';
    default:
      return type;
  }
}

function getYear(releaseDate: string): string {
  if (!releaseDate) return '';
  return releaseDate.split('-')[0];
}

function getPosterUrl(item: ContentItem): string {
  if (!item.posterPath) return '/placeholder-poster.svg';
  // If it's an anime with a full URL (from Jikan/MAL API)
  if (item.type === 'anime' && item.posterPath.startsWith('http')) {
    return item.posterPath;
  }
  return `${TMDB_IMAGE_BASE}${item.posterPath}`;
}

export function ContentCard({ item, onClick, onFavoriteToggle, isFavorite }: ContentCardProps) {
  const handleClick = () => {
    onClick?.(item);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(item);
  };

  const posterUrl = getPosterUrl(item);

  return (
    <div
      className="content-card group relative w-[155px] sm:w-[170px] md:w-[185px] flex-shrink-0 cursor-pointer rounded-lg overflow-hidden bg-card"
      onClick={handleClick}
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
        <Image
          src={posterUrl}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 155px, (max-width: 768px) 170px, 185px"
          className="object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder-poster.svg';
          }}
        />

        {/* Type Badge */}
        <span
          className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${getTypeBadgeClasses(item.type)}`}
        >
          {getTypeLabel(item.type)}
        </span>

        {/* Favorite Heart */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 left-2 p-1 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/60 z-20"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite
                ? 'fill-red-500 text-red-500'
                : 'text-white'
            }`}
          />
        </button>

        {/* Hover Overlay with Play Button */}
        <div className="card-overlay absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-ars flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </div>
          <p className="text-white text-xs mt-2 font-medium">Watch Now</p>
        </div>
      </div>

      {/* Card Info */}
      <div className="pt-2 pb-1 px-1 space-y-1">
        {/* Title */}
        <h3 className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
          {item.title}
        </h3>

        {/* Year & Rating */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {getYear(item.releaseDate) && (
            <span>{getYear(item.releaseDate)}</span>
          )}
          {item.voteAverage > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 rating-star fill-current" />
              <span>{item.voteAverage.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Variant ─── */

export function ContentCardSkeleton() {
  return (
    <div className="w-[155px] sm:w-[170px] md:w-[185px] flex-shrink-0 rounded-lg overflow-hidden">
      <div className="relative aspect-[2/3] rounded-lg bg-muted skeleton-pulse" />
      <div className="pt-2 pb-1 px-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted skeleton-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted skeleton-pulse" />
      </div>
    </div>
  );
}
