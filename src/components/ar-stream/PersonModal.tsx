'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  Calendar,
  MapPin,
  Film,
  Tv,
  Star,
  Loader2,
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
import type { ContentItem } from '@/lib/store';

// ─── Image URL helpers ───────────────────────────────────────────────
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function profileUrl(path: string | null, size: string = 'h632'): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function posterUrl(path: string | null): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMAGE_BASE}/w500${path}`;
}

// ─── TMDB Types ──────────────────────────────────────────────────────

interface PersonDetail {
  id: number;
  name: string;
  known_for_department: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  biography: string;
  profile_path: string | null;
  homepage: string | null;
}

interface CastCredit {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  character: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  popularity: number;
}

interface CrewCredit {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  job: string;
  department: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  popularity: number;
}

interface CombinedCredits {
  cast: CastCredit[];
  crew: CrewCredit[];
}

function getYear(date?: string): string {
  if (!date) return '';
  return date.split('-')[0];
}

function getAge(birthday: string | null, deathday: string | null): string {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return `${age} years old`;
}

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Props ───────────────────────────────────────────────────────────

interface PersonModalProps {
  open: boolean;
  onClose: () => void;
  personId: number | null;
  onContentClick?: (item: ContentItem) => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function PersonModal({ open, onClose, personId, onContentClick }: PersonModalProps) {
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [credits, setCredits] = useState<CombinedCredits | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'acting' | 'crew'>('acting');

  const fetchPersonData = useCallback(async () => {
    if (!personId || !open) return;

    setLoading(true);
    setPerson(null);
    setCredits(null);
    setActiveTab('acting');

    try {
      const [personRes, creditsRes] = await Promise.allSettled([
        fetch(`/api/tmdb/person/${personId}`),
        fetch(`/api/tmdb/person/${personId}/combined_credits`),
      ]);

      if (personRes.status === 'fulfilled' && personRes.value.ok) {
        const data = await personRes.value.json();
        setPerson(data);
      }

      if (creditsRes.status === 'fulfilled' && creditsRes.value.ok) {
        const data = await creditsRes.value.json();
        setCredits(data);
      }
    } catch (err) {
      console.error('Failed to fetch person data:', err);
    } finally {
      setLoading(false);
    }
  }, [personId, open]);

  useEffect(() => {
    if (open && personId) {
      fetchPersonData();
    } else if (!open) {
      setPerson(null);
      setCredits(null);
      setLoading(false);
    }
  }, [open, personId, fetchPersonData]);

  const handleContentClick = (credit: CastCredit | CrewCredit) => {
    if (onContentClick) {
      const item: ContentItem = {
        id: credit.id,
        title: credit.title || credit.name || '',
        originalTitle: credit.original_title || credit.original_name,
        overview: '',
        posterPath: credit.poster_path,
        backdropPath: credit.backdrop_path,
        releaseDate: credit.release_date || credit.first_air_date || '',
        voteAverage: credit.vote_average || 0,
        voteCount: 0,
        type: credit.media_type === 'tv' ? 'tv' : 'movie',
        genreIds: credit.genre_ids,
        popularity: credit.popularity,
      };
      onContentClick(item);
    }
    onClose();
  };

  // Sort credits by popularity
  const sortedCast = credits?.cast
    ? [...credits.cast].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    : [];

  const sortedCrew = credits?.crew
    ? [...credits.crew].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    : [];

  const displayCredits = activeTab === 'acting' ? sortedCast : sortedCrew;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="slide-up p-0 gap-0 max-w-4xl sm:max-w-4xl w-full sm:w-[95vw]
          h-[90vh] sm:h-[85vh] rounded-xl border-border/50
          bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {person?.name ?? 'Person Details'}
        </DialogTitle>

        <div className="relative flex-1 overflow-y-auto overscroll-contain">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm
              text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {loading ? (
            <PersonSkeleton />
          ) : person ? (
            <>
              {/* Header Section */}
              <div className="relative bg-gradient-to-b from-ars/10 to-transparent">
                <div className="px-4 sm:px-6 pt-6 pb-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    {/* Profile Photo */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <div className="relative w-[160px] h-[240px] sm:w-[200px] sm:h-[300px] rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10">
                        {person.profile_path ? (
                          <Image
                            src={profileUrl(person.profile_path)}
                            alt={person.name}
                            fill
                            sizes="200px"
                            className="object-cover"
                            priority
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-5xl font-bold text-muted-foreground/30">
                              {person.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left space-y-3 sm:pt-4">
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                        {person.name}
                      </h2>

                      {person.known_for_department && (
                        <Badge variant="secondary" className="text-xs">
                          Known for: {person.known_for_department}
                        </Badge>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start text-sm text-muted-foreground">
                        {person.birthday && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(person.birthday)}
                            {!person.deathday && ` (${getAge(person.birthday, null)})`}
                          </span>
                        )}
                        {person.deathday && (
                          <span className="flex items-center gap-1 text-destructive">
                            <Calendar className="h-4 w-4" />
                            Died {formatDate(person.deathday)} ({getAge(person.birthday, person.deathday)})
                          </span>
                        )}
                        {person.place_of_birth && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {person.place_of_birth}
                          </span>
                        )}
                      </div>

                      {person.homepage && (
                        <Button variant="outline" size="sm" asChild className="gap-1.5">
                          <a href={person.homepage} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Official Site
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Biography */}
              {person.biography && (
                <div className="px-4 sm:px-6 py-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Biography</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {person.biography}
                  </p>
                </div>
              )}

              {/* Filmography */}
              {credits && (
                <div className="px-4 sm:px-6 py-4 space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Filmography</h3>

                  {/* Tabs */}
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <button
                      onClick={() => setActiveTab('acting')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'acting'
                          ? 'bg-ars text-ars-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      Acting ({sortedCast.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('crew')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        activeTab === 'crew'
                          ? 'bg-ars text-ars-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      Crew ({sortedCrew.length})
                    </button>
                  </div>

                  {/* Credits Grid */}
                  {displayCredits.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {displayCredits.map((credit) => {
                        const title = credit.title || credit.name || 'Unknown';
                        const year = getYear(credit.release_date || credit.first_air_date);
                        const character = 'character' in credit ? credit.character : (credit as CrewCredit).job;
                        const mediaType = credit.media_type;

                        return (
                          <div
                            key={`${mediaType}-${credit.id}-${character}`}
                            className="group cursor-pointer rounded-lg overflow-hidden bg-card/60 border border-border/30 hover:border-ars/30 hover:bg-card/80 transition-all"
                            onClick={() => handleContentClick(credit)}
                          >
                            {/* Poster */}
                            <div className="relative aspect-[2/3] overflow-hidden">
                              {credit.poster_path ? (
                                <Image
                                  src={posterUrl(credit.poster_path)}
                                  alt={title}
                                  fill
                                  sizes="200px"
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  {mediaType === 'tv' ? (
                                    <Tv className="h-8 w-8 text-muted-foreground/30" />
                                  ) : (
                                    <Film className="h-8 w-8 text-muted-foreground/30" />
                                  )}
                                </div>
                              )}
                              {/* Type badge */}
                              <span
                                className={`absolute top-1.5 right-1.5 px-1 py-0.5 text-[9px] font-bold uppercase rounded ${
                                  mediaType === 'tv' ? 'badge-tv text-white' : 'badge-movie text-white'
                                }`}
                              >
                                {mediaType === 'tv' ? 'TV' : 'Movie'}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="p-2 space-y-0.5">
                              <h4 className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                                {title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {year && <span>{year}</span>}
                                {credit.vote_average > 0 && (
                                  <span className="flex items-center gap-0.5">
                                    <Star className="h-2.5 w-2.5 rating-star fill-current" />
                                    {credit.vote_average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              {character && (
                                <p className="text-[10px] text-muted-foreground/80 line-clamp-1 italic">
                                  {character}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No {activeTab === 'acting' ? 'acting' : 'crew'} credits found.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Failed to load person details.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────

function PersonSkeleton() {
  return (
    <div className="px-4 sm:px-6 pt-6 pb-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <Skeleton className="w-[160px] h-[240px] sm:w-[200px] sm:h-[300px] rounded-xl mx-auto sm:mx-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-5 w-24 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="w-full aspect-[2/3] rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded" />
              <Skeleton className="h-2 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
