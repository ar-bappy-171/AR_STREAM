'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Info, ChevronLeft, ChevronRight, Star, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContentItem } from '@/lib/store';
import { cn } from '@/lib/utils';

interface HeroCarouselProps {
  items: ContentItem[];
  loading?: boolean;
  onItemClick: (item: ContentItem) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w1280';
const AUTO_ADVANCE_INTERVAL = 6000;

function getTypeBadgeClass(type: ContentItem['type']): string {
  switch (type) {
    case 'movie':
      return 'badge-movie';
    case 'tv':
      return 'badge-tv';
    case 'anime':
      return 'badge-anime';
    default:
      return 'badge-movie';
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
      return 'Movie';
  }
}

function getYear(releaseDate: string): string {
  if (!releaseDate) return '—';
  return releaseDate.split('-')[0] || '—';
}

export default function HeroCarousel({ items, loading = false, onItemClick }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalItems = items.length;

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      const nextIndex = ((index % totalItems) + totalItems) % totalItems;
      setCurrentIndex(nextIndex);
      setTimeout(() => setIsTransitioning(false), 700);
    },
    [totalItems, isTransitioning]
  );

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToDot = useCallback(
    (index: number) => {
      goToSlide(index);
    },
    [goToSlide]
  );

  // Auto-advance timer
  useEffect(() => {
    if (isPaused || totalItems <= 1 || loading) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % totalItems;
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 700);
        return next;
      });
    }, AUTO_ADVANCE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalItems, loading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Loading state
  if (loading) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] overflow-hidden rounded-lg">
        <Skeleton className="w-full h-full skeleton-pulse" />
        <div className="hero-gradient absolute inset-0" />
        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <Skeleton className="h-6 w-16 rounded-full skeleton-pulse" />
          <Skeleton className="h-8 w-3/4 skeleton-pulse" />
          <Skeleton className="h-4 w-1/2 skeleton-pulse" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20 skeleton-pulse" />
            <Skeleton className="h-4 w-12 skeleton-pulse" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-32 rounded-md skeleton-pulse" />
            <Skeleton className="h-10 w-28 rounded-md skeleton-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div className="relative w-full h-[350px] md:h-[500px] overflow-hidden rounded-lg bg-card flex items-center justify-center">
        <div className="hero-gradient absolute inset-0" />
        <div className="relative z-10 text-center space-y-3 px-4">
          <div className="mx-auto size-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Play className="size-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">No Trending Content</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Check back later for trending movies, TV shows, and anime.
          </p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div
      ref={containerRef}
      className="group relative w-full h-[350px] md:h-[500px] overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      role="region"
      aria-label="Trending content carousel"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides */}
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        const backdropUrl = item.backdropPath
          ? `${TMDB_IMAGE_BASE}${item.backdropPath}`
          : null;

        return (
          <div
            key={item.id}
            className={cn(
              'hero-slide absolute inset-0',
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            )}
            aria-hidden={!isActive}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${totalItems}: ${item.title}`}
          >
            {/* Backdrop Image */}
            {backdropUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${backdropUrl})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}

            {/* Gradient Overlay */}
            <div className="hero-gradient absolute inset-0" />

            {/* Content - bottom left */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-8 lg:p-10">
              <div className="max-w-2xl space-y-2 md:space-y-3">
                {/* Type Badge */}
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
                    getTypeBadgeClass(item.type)
                  )}
                >
                  {getTypeLabel(item.type)}
                </span>

                {/* Title */}
                <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white leading-tight line-clamp-2">
                  {item.title}
                </h2>

                {/* Overview */}
                <p className="text-sm md:text-base text-white/80 line-clamp-2 max-w-xl">
                  {item.overview}
                </p>

                {/* Rating + Year */}
                <div className="flex items-center gap-3 md:gap-4 text-sm">
                  <span className="flex items-center gap-1 text-white/90">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{item.voteAverage.toFixed(1)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-white/70">
                    <Calendar className="size-3.5" />
                    <span>{getYear(item.releaseDate)}</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-1 md:pt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className="bg-ars hover:bg-ars/90 text-ars-foreground font-semibold gap-2 h-9 md:h-10 px-4 md:px-6"
                  >
                    <Play className="size-4 fill-current" />
                    Watch Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-2 h-9 md:h-10 px-3 md:px-4 backdrop-blur-sm"
                  >
                    <Info className="size-4" />
                    More Info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Previous Arrow */}
      {totalItems > 1 && (
        <button
          onClick={goToPrev}
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 z-20',
            'size-10 md:size-11 rounded-full',
            'bg-black/40 backdrop-blur-sm border border-white/10',
            'text-white hover:bg-black/60 hover:border-white/20',
            'flex items-center justify-center',
            'transition-all duration-300',
            'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
          )}
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Next Arrow */}
      {totalItems > 1 && (
        <button
          onClick={goToNext}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 z-20',
            'size-10 md:size-11 rounded-full',
            'bg-black/40 backdrop-blur-sm border border-white/10',
            'text-white hover:bg-black/60 hover:border-white/20',
            'flex items-center justify-center',
            'transition-all duration-300',
            'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
          )}
          aria-label="Next slide"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Dot Indicators */}
      {totalItems > 1 && (
        <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToDot(index)}
              className={cn(
                'rounded-full transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                index === currentIndex
                  ? 'bg-ars w-6 h-2'
                  : 'bg-white/40 hover:bg-white/60 w-2 h-2'
              )}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
