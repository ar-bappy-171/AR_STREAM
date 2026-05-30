'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X, Star, Play, Film, Tv, Globe } from 'lucide-react';
import type { ContentItem } from '@/lib/store';

// ─── Trailer Cache ───────────────────────────────────────────────────
const trailerCache = new Map<string, string | null>();

async function fetchTrailerKey(id: number, type: ContentItem['type']): Promise<string | null> {
  const cacheKey = `${type}-${id}`;
  if (trailerCache.has(cacheKey)) return trailerCache.get(cacheKey) ?? null;

  if (type === 'anime') {
    trailerCache.set(cacheKey, null);
    return null;
  }

  const mediaType = type === 'tv' ? 'tv' : 'movie';
  try {
    const res = await fetch(`/api/tmdb/${mediaType}/${id}/videos`);
    if (!res.ok) {
      trailerCache.set(cacheKey, null);
      return null;
    }
    const data = await res.json();
    const trailer = (data.results || []).find(
      (v: { site: string; type: string; key: string }) =>
        v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    const key = trailer?.key || null;
    trailerCache.set(cacheKey, key);
    return key;
  } catch {
    trailerCache.set(cacheKey, null);
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function backdropUrl(path: string | null): string {
  if (!path) return '/placeholder-backdrop.svg';
  return `${TMDB_IMAGE_BASE}/w780${path}`;
}

function getYear(date: string): string {
  if (!date) return '';
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

function TypeIcon({ type, className }: { type: ContentItem['type']; className?: string }) {
  switch (type) {
    case 'movie': return <Film className={className} />;
    case 'tv': return <Tv className={className} />;
    case 'anime': return <Globe className={className} />;
    default: return <Film className={className} />;
  }
}

// ─── Preview Component ───────────────────────────────────────────────

interface TrailerPreviewProps {
  item: ContentItem;
  cardRect: DOMRect;
  onClose: () => void;
}

function TrailerPreviewContent({ item, cardRect, onClose }: TrailerPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch trailer key
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    fetchTrailerKey(item.id, item.type).then((key) => {
      if (!cancelled) setTrailerKey(key);
    });
    return () => { cancelled = true; };
  }, [item.id, item.type]);

  // Calculate position
  const previewWidth = 400;
  const previewHeight = 320;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = cardRect.left + cardRect.width / 2 - previewWidth / 2;
  let top = cardRect.top - previewHeight - 12;

  // If not enough space above, show below
  if (top < 10) {
    top = cardRect.bottom + 12;
  }

  // If going off right edge
  if (left + previewWidth > viewportWidth - 10) {
    left = viewportWidth - previewWidth - 10;
  }
  // If going off left edge
  if (left < 10) {
    left = 10;
  }

  // If going off bottom
  if (top + previewHeight > viewportHeight - 10) {
    top = viewportHeight - previewHeight - 10;
  }

  return (
    <div
      ref={previewRef}
      className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-card/95 backdrop-blur-xl"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${previewWidth}px`,
      }}
      onMouseLeave={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
        aria-label="Close preview"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Backdrop / Trailer area */}
      <div className="relative w-full aspect-video overflow-hidden bg-black">
        {showTrailer && trailerKey ? (
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0`}
            title="Trailer Preview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <>
            {item.backdropPath ? (
              <Image
                src={backdropUrl(item.backdropPath)}
                alt={item.title}
                fill
                sizes="400px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
            {/* Play trailer button */}
            {trailerKey && (
              <button
                onClick={() => setShowTrailer(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-ars/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </button>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </>
        )}
      </div>

      {/* Info area */}
      <div className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">
            {item.title}
          </h3>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${getTypeBadgeClasses(item.type)}`}>
            <TypeIcon type={item.type} className="h-2.5 w-2.5" />
            {getTypeLabel(item.type)}
          </span>
          {getYear(item.releaseDate) && (
            <span className="text-xs text-muted-foreground">{getYear(item.releaseDate)}</span>
          )}
          {item.voteAverage > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 rating-star fill-current" />
              {item.voteAverage.toFixed(1)}
            </span>
          )}
        </div>

        {/* Overview */}
        {item.overview && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {item.overview}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Portal Wrapper ──────────────────────────────────────────────────

export function TrailerPreview(props: TrailerPreviewProps) {
  // This component is only rendered on client-side after user interaction,
  // so createPortal is safe to call directly
  return createPortal(
    <TrailerPreviewContent {...props} />,
    document.body
  );
}
