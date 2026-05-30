'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Film } from 'lucide-react';
import type { ContentItem } from '@/lib/store';
import { ContentCard, ContentCardSkeleton } from './ContentCard';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onItemClick?: (item: ContentItem) => void;
  onFavoriteToggle?: (item: ContentItem) => void;
  favorites?: Set<string>; // Set of "type-id" strings
}

const SCROLL_AMOUNT = 800;

export function ContentRow({
  title,
  items,
  loading = false,
  error = null,
  onRetry,
  onItemClick,
  onFavoriteToggle,
  favorites = new Set(),
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const checkScrollability = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScrollability();

    const observer = new ResizeObserver(() => {
      checkScrollability();
    });
    observer.observe(el);

    el.addEventListener('scroll', checkScrollability, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', checkScrollability);
    };
  }, [checkScrollability, items, loading]);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  const isFavorite = useCallback(
    (item: ContentItem) => favorites.has(`${item.type}-${item.id}`),
    [favorites]
  );

  // Determine arrow visibility
  const showArrows = isHovering;

  return (
    <section className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
        <button
          className="text-sm text-ars hover:text-ars/80 font-medium transition-colors"
          aria-label={`See all ${title}`}
        >
          See All
        </button>
      </div>

      {/* Row Container */}
      <div
        className="relative group/row"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={`
              absolute left-0 top-0 bottom-8 z-20 w-10 sm:w-12
              flex items-center justify-center
              bg-gradient-to-r from-background/90 to-transparent
              transition-opacity duration-200
              ${showArrows ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={`
              absolute right-0 top-0 bottom-8 z-20 w-10 sm:w-12
              flex items-center justify-center
              bg-gradient-to-l from-background/90 to-transparent
              transition-opacity duration-200
              ${showArrows ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-foreground" />
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="content-row-scroll hide-scrollbar flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-2"
        >
          {/* Loading State */}
          {loading && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <ContentCardSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center w-full py-10 gap-3">
              <p className="text-sm text-destructive">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ars text-ars-foreground text-sm font-medium hover:bg-ars/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-10 gap-3 text-muted-foreground">
              <Film className="h-10 w-10" />
              <p className="text-sm">No content available</p>
            </div>
          )}

          {/* Content Cards */}
          {!loading && !error && items.length > 0 && (
            <>
              {items.map((item) => (
                <ContentCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onClick={onItemClick}
                  onFavoriteToggle={onFavoriteToggle}
                  isFavorite={isFavorite(item)}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
