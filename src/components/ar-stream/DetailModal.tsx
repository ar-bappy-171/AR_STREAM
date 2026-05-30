'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Play,
  Heart,
  Share2,
  X,
  Star,
  Clock,
  Calendar,
  Film,
  Tv,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentCard } from '@/components/ar-stream/ContentCard';
import type { ContentDetail, ContentItem } from '@/lib/store';

// ─── Image URL helpers ──────────────────────────────────────────────
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function posterUrl(path: string | null): string {
  if (!path) return '/placeholder-poster.svg';
  if (path.startsWith('http')) return path;
  return `${TMDB_IMAGE_BASE}/w500${path}`;
}

function backdropUrl(path: string | null): string {
  if (!path) return '/placeholder-backdrop.svg';
  return `${TMDB_IMAGE_BASE}/w1280${path}`;
}

function profileUrl(path: string | null): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMAGE_BASE}/w185${path}`;
}

function logoUrl(path: string | null): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/w92${path}`;
}

// ─── Type helpers ───────────────────────────────────────────────────
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
      return 'TV Show';
    case 'anime':
      return 'Anime';
    default:
      return type;
  }
}

function getTypeIcon(type: ContentItem['type']) {
  switch (type) {
    case 'movie':
      return Film;
    case 'tv':
      return Tv;
    case 'anime':
      return Globe;
    default:
      return Film;
  }
}

function formatRuntime(minutes?: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function getYear(date: string): string {
  if (!date) return '';
  return date.split('-')[0];
}

// ─── TMDB API Response Mappers ─────────────────────────────────────

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

interface TmdbNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface TmdbSimilarResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
}

// ─── Props ──────────────────────────────────────────────────────────

interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  content: ContentDetail | null;
  loading?: boolean;
  onFavoriteToggle?: (item: ContentDetail) => void;
  isFavorite?: boolean;
  onSimilarItemClick?: (item: ContentItem) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function DetailModal({
  open,
  onClose,
  content,
  loading: externalLoading,
  onFavoriteToggle,
  isFavorite,
  onSimilarItemClick,
}: DetailModalProps) {
  const [detail, setDetail] = useState<ContentDetail | null>(null);
  const [fetching, setFetching] = useState(false);
  const [cast, setCast] = useState<TmdbCastMember[]>([]);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [similar, setSimilar] = useState<ContentItem[]>([]);
  const [showTrailer, setShowTrailer] = useState(false);

  const isLoading = externalLoading || fetching;

  // ─── Fetch additional details ───────────────────────────────────
  const fetchDetails = useCallback(async () => {
    if (!content || !open) return;

    // For anime, we already have the data from Jikan
    if (content.type === 'anime') {
      setDetail(content);
      setCast([]);
      setTrailerKey(content.trailerKey ?? null);
      setSimilar(content.similar ?? []);
      setFetching(false);
      return;
    }

    setFetching(true);
    setShowTrailer(false);

    const mediaType = content.type === 'tv' ? 'tv' : 'movie';
    const id = content.id;

    try {
      // Fetch all data in parallel
      const [detailRes, creditsRes, videosRes, similarRes] = await Promise.allSettled([
        fetch(`/api/tmdb/${mediaType}/${id}`),
        fetch(`/api/tmdb/${mediaType}/${id}/credits`),
        fetch(`/api/tmdb/${mediaType}/${id}/videos`),
        fetch(`/api/tmdb/${mediaType}/${id}/similar`),
      ]);

      // Process detail response
      let mergedDetail: ContentDetail = { ...content };

      if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
        const data = await detailRes.value.json();
        mergedDetail = {
          ...mergedDetail,
          tagline: data.tagline || content.tagline,
          runtime: data.runtime || content.runtime,
          numberOfSeasons: data.number_of_seasons || content.numberOfSeasons,
          numberOfEpisodes: data.number_of_episodes || content.numberOfEpisodes,
          genres: data.genres || content.genres,
          productionCompanies: data.production_companies || content.productionCompanies,
          networks: data.networks || content.networks,
          homepage: data.homepage || content.homepage,
          status: data.status || content.status,
          overview: data.overview || content.overview,
          releaseDate: data.release_date || data.first_air_date || content.releaseDate,
          voteAverage: data.vote_average ?? content.voteAverage,
          voteCount: data.vote_count ?? content.voteCount,
          backdropPath: data.backdrop_path || content.backdropPath,
          posterPath: data.poster_path || content.posterPath,
          title: data.title || data.name || content.title,
          originalTitle: data.original_title || data.original_name || content.originalTitle,
        };
      }

      // Process credits
      if (creditsRes.status === 'fulfilled' && creditsRes.value.ok) {
        const data = await creditsRes.value.json();
        const castList: TmdbCastMember[] = (data.cast || [])
          .filter((c: TmdbCastMember) => c.profile_path)
          .sort((a: TmdbCastMember, b: TmdbCastMember) => a.order - b.order)
          .slice(0, 20);
        setCast(castList);
        mergedDetail.cast = castList.map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        }));
      } else {
        setCast([]);
      }

      // Process videos (trailer)
      if (videosRes.status === 'fulfilled' && videosRes.value.ok) {
        const data = await videosRes.value.json();
        const trailer = (data.results || []).find(
          (v: TmdbVideo) =>
            v.site === 'YouTube' &&
            (v.type === 'Trailer' || v.type === 'Teaser')
        );
        const key = trailer?.key || content.trailerKey || null;
        setTrailerKey(key);
        mergedDetail.trailerKey = key ?? undefined;
      } else {
        setTrailerKey(content.trailerKey ?? null);
      }

      // Process similar
      if (similarRes.status === 'fulfilled' && similarRes.value.ok) {
        const data = await similarRes.value.json();
        const similarItems: ContentItem[] = (data.results || []).slice(0, 12).map(
          (item: TmdbSimilarResult) => ({
            id: item.id,
            title: item.title || item.name || '',
            originalTitle: item.original_title || item.original_name,
            overview: item.overview || '',
            posterPath: item.poster_path,
            backdropPath: item.backdrop_path,
            releaseDate: item.release_date || item.first_air_date || '',
            voteAverage: item.vote_average || 0,
            voteCount: item.vote_count || 0,
            type: content.type === 'tv' ? 'tv' : 'movie',
            genreIds: item.genre_ids,
            popularity: item.popularity,
          })
        );
        setSimilar(similarItems);
        mergedDetail.similar = similarItems;
      } else {
        setSimilar(content.similar ?? []);
      }

      setDetail(mergedDetail);
    } catch (err) {
      console.error('Failed to fetch content details:', err);
      setDetail(content);
    } finally {
      setFetching(false);
    }
  }, [content, open]);

  useEffect(() => {
    if (open && content) {
      fetchDetails();
    } else if (!open) {
      // Reset state when modal closes
      setDetail(null);
      setCast([]);
      setTrailerKey(null);
      setSimilar([]);
      setShowTrailer(false);
      setFetching(false);
    }
  }, [open, content, fetchDetails]);

  // ─── Handlers ────────────────────────────────────────────────────
  const handleFavoriteToggle = () => {
    if (detail && onFavoriteToggle) {
      onFavoriteToggle(detail);
    }
  };

  const handleShare = async () => {
    if (!detail) return;
    const text = `${detail.title} - AR-Stream`;
    if (navigator.share) {
      try {
        await navigator.share({ title: detail.title, text, url: detail.homepage || window.location.href });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(detail.homepage || window.location.href);
    }
  };

  // ─── Display data ────────────────────────────────────────────────
  const displayData = detail || content;
  const TypeIcon = displayData ? getTypeIcon(displayData.type) : Film;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="slide-up p-0 gap-0 max-w-5xl sm:max-w-5xl w-full sm:w-[95vw]
          h-[95vh] sm:h-[92vh] rounded-xl border-border/50
          bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {displayData?.title ?? 'Content Details'}
        </DialogTitle>

        <div className="relative flex-1 overflow-y-auto overscroll-contain">
            {/* ─── Close Button ──────────────────────────────────── */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm
                text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* ─── Hero Section ──────────────────────────────────── */}
            {isLoading ? (
              <HeroSkeleton />
            ) : (
              <>
                {/* Backdrop Image */}
                <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] overflow-hidden">
                  {displayData?.backdropPath ? (
                    <Image
                      src={backdropUrl(displayData.backdropPath)}
                      alt={displayData.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 896px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Film className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
                </div>

                {/* Hero Content Overlay */}
                <div className="relative -mt-24 sm:-mt-32 px-4 sm:px-6 pb-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Poster */}
                    <div className="hidden sm:block flex-shrink-0">
                      <div className="relative w-[140px] h-[210px] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                        {displayData?.posterPath ? (
                          <Image
                            src={posterUrl(displayData.posterPath)}
                            alt={displayData.title}
                            fill
                            sizes="140px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Film className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title Info */}
                    <div className="flex-1 pt-2 sm:pt-16 space-y-2">
                      {/* Type Badge */}
                      {displayData && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase rounded-md ${getTypeBadgeClasses(displayData.type)}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {getTypeLabel(displayData.type)}
                        </span>
                      )}

                      {/* Title */}
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                        {displayData?.title}
                      </h2>

                      {/* Original title (if different) */}
                      {displayData?.originalTitle && displayData.originalTitle !== displayData.title && (
                        <p className="text-sm text-muted-foreground italic">
                          {displayData.originalTitle}
                        </p>
                      )}

                      {/* Tagline */}
                      {displayData?.tagline && (
                        <p className="text-sm italic text-ars">
                          &ldquo;{displayData.tagline}&rdquo;
                        </p>
                      )}

                      {/* Meta row: Rating, Year, Runtime */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        {displayData && displayData.voteAverage > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 rating-star fill-current" />
                            <span className="font-semibold text-foreground">
                              {displayData.voteAverage.toFixed(1)}
                            </span>
                            <span className="text-xs">({displayData.voteCount?.toLocaleString()})</span>
                          </span>
                        )}
                        {displayData?.releaseDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {getYear(displayData.releaseDate)}
                          </span>
                        )}
                        {displayData?.runtime ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatRuntime(displayData.runtime)}
                          </span>
                        ) : displayData?.numberOfEpisodes ? (
                          <span className="flex items-center gap-1">
                            <Tv className="h-4 w-4" />
                            {displayData.numberOfSeasons} Season{displayData.numberOfSeasons > 1 ? 's' : ''} &middot; {displayData.numberOfEpisodes} Episode{displayData.numberOfEpisodes > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ─── Action Buttons Row ──────────────────────────────── */}
            {!isLoading && displayData && (
              <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-2">
                <Button
                  className="bg-ars hover:bg-ars/90 text-ars-foreground font-semibold"
                  onClick={() => {
                    if (trailerKey) {
                      setShowTrailer(true);
                    }
                  }}
                >
                  <Play className="h-4 w-4 fill-current" />
                  {trailerKey ? 'Watch Trailer' : 'Watch Now'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleFavoriteToggle}
                  className={isFavorite ? 'border-red-500/50 text-red-500' : ''}
                >
                  <Heart
                    className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {isFavorite ? 'Favorited' : 'Add to Favorites'}
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                {displayData.homepage && (
                  <Button variant="ghost" asChild>
                    <a href={displayData.homepage} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Official Site
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* ─── Content Body ────────────────────────────────────── */}
            <div className="px-4 sm:px-6 pb-6 space-y-6">
              {/* Overview / Synopsis */}
              {isLoading ? (
                <OverviewSkeleton />
              ) : (
                displayData?.overview && (
                  <section>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Overview</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {displayData.overview}
                    </p>
                  </section>
                )
              )}

              {/* Details Grid */}
              {isLoading ? (
                <DetailsGridSkeleton />
              ) : (
                displayData && (
                  <section>
                    <h3 className="text-lg font-semibold text-foreground mb-3">Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Genres */}
                      {displayData.genres && displayData.genres.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Genres
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {displayData.genres.map((g) => (
                              <Badge key={'id' in g ? g.id : g.mal_id} variant="secondary" className="text-xs">
                                {g.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      {displayData.status && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Status
                          </span>
                          <p className="text-sm text-foreground font-medium">{displayData.status}</p>
                        </div>
                      )}

                      {/* Runtime */}
                      {displayData.runtime ? (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Runtime
                          </span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatRuntime(displayData.runtime)}
                          </p>
                        </div>
                      ) : displayData.numberOfEpisodes ? (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Episodes
                          </span>
                          <p className="text-sm text-foreground font-medium">
                            {displayData.numberOfEpisodes} episode{displayData.numberOfEpisodes > 1 ? 's' : ''}
                            {displayData.numberOfSeasons && ` across ${displayData.numberOfSeasons} season${displayData.numberOfSeasons > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      ) : null}

                      {/* Release Date */}
                      {displayData.releaseDate && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Release Date
                          </span>
                          <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {new Date(displayData.releaseDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      )}

                      {/* Production Companies */}
                      {displayData.productionCompanies && displayData.productionCompanies.length > 0 && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Production
                          </span>
                          <div className="flex flex-wrap gap-3">
                            {displayData.productionCompanies.map((pc) => (
                              <div key={pc.id} className="flex items-center gap-2">
                                {pc.logo_path ? (
                                  <div className="relative w-8 h-8 flex-shrink-0 dark:bg-white/10 rounded p-0.5">
                                    <Image
                                      src={logoUrl(pc.logo_path)}
                                      alt={pc.name}
                                      width={32}
                                      height={32}
                                      className="object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                                    <Film className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="text-sm text-foreground">{pc.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Networks (TV Shows) */}
                      {displayData.type === 'tv' && displayData.networks && displayData.networks.length > 0 && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Networks
                          </span>
                          <div className="flex flex-wrap gap-3">
                            {displayData.networks.map((net) => (
                              <div key={net.id} className="flex items-center gap-2">
                                {net.logo_path ? (
                                  <div className="relative w-[48px] h-[20px] flex-shrink-0 dark:bg-white/10 rounded p-0.5">
                                    <Image
                                      src={logoUrl(net.logo_path)}
                                      alt={net.name}
                                      width={48}
                                      height={20}
                                      className="object-contain"
                                    />
                                  </div>
                                ) : null}
                                <span className="text-sm text-foreground">{net.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next Episode (TV Shows) */}
                      {displayData.type === 'tv' && displayData.nextEpisodeToAir && (
                        <div className="space-y-1.5 sm:col-span-2">
                          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                            Next Episode
                          </span>
                          <p className="text-sm text-foreground font-medium">
                            {displayData.nextEpisodeToAir.name} —{' '}
                            {new Date(displayData.nextEpisodeToAir.air_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                )
              )}

              {/* ─── Trailer Section ───────────────────────────────── */}
              {!isLoading && showTrailer && trailerKey && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground">Trailer</h3>
                    <button
                      onClick={() => setShowTrailer(false)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Close
                    </button>
                  </div>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0`}
                      title="Trailer"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </section>
              )}

              {/* Trailer button if not showing */}
              {!isLoading && !showTrailer && trailerKey && (
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Trailer</h3>
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted group cursor-pointer"
                  >
                    {displayData?.backdropPath && (
                      <Image
                        src={backdropUrl(displayData.backdropPath)}
                        alt="Trailer thumbnail"
                        fill
                        sizes="(max-width: 768px) 100vw, 896px"
                        className="object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-ars/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="h-7 w-7 text-white fill-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 text-white text-sm font-medium bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                      Play Trailer
                    </div>
                  </button>
                </section>
              )}

              {/* ─── Cast Section ──────────────────────────────────── */}
              {!isLoading && cast.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Cast</h3>
                  <div className="flex gap-3 overflow-x-auto content-row-scroll hide-scrollbar pb-2">
                    {cast.map((member) => (
                      <div
                        key={member.id}
                        className="flex-shrink-0 w-[100px] sm:w-[110px] text-center group cursor-pointer"
                      >
                        <div className="relative w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-full overflow-hidden mx-auto ring-2 ring-transparent group-hover:ring-ars/50 transition-all">
                          {member.profile_path ? (
                            <Image
                              src={profileUrl(member.profile_path)}
                              alt={member.name}
                              fill
                              sizes="110px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-2xl font-bold text-muted-foreground/40">
                                {member.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs font-medium text-foreground leading-tight line-clamp-2">
                          {member.name}
                        </p>
                        {member.character && (
                          <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                            {member.character}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Cast skeleton */}
              {isLoading && <CastSkeleton />}

              {/* ─── Similar Content ───────────────────────────────── */}
              {!isLoading && similar.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">More Like This</h3>
                  <div className="flex gap-3 overflow-x-auto content-row-scroll hide-scrollbar pb-2">
                    {similar.map((item) => (
                      <ContentCard
                        key={`${item.type}-${item.id}`}
                        item={item}
                        onClick={onSimilarItemClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Similar skeleton */}
              {isLoading && <SimilarSkeleton />}
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton Components ─────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="w-full aspect-[16/9] sm:aspect-[2.2/1]" />
      <div className="px-4 sm:px-6 space-y-3">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-8 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-24 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
    </div>
  );
}

function DetailsGridSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-20 rounded" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

function CastSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-16 rounded" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[100px] text-center">
            <Skeleton className="w-[100px] h-[100px] rounded-full mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto mt-2 rounded" />
            <Skeleton className="h-3 w-12 mx-auto mt-1 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SimilarSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-28 rounded" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[155px]">
            <Skeleton className="w-full aspect-[2/3] rounded-lg" />
            <Skeleton className="h-4 w-3/4 mt-2 rounded" />
            <Skeleton className="h-3 w-1/2 mt-1 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
