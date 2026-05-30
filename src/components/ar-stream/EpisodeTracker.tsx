'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle2,
  Tv,
  Minus,
  Plus,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SeasonInfo } from '@/lib/store';
import {
  getWatchProgress,
  updateWatchProgress,
  updateWatchTotals,
  updateSeasonEpisodeCounts,
  moveWatchListItem,
} from '@/lib/storage';

// ─── Types ──────────────────────────────────────────────────────────

interface EpisodeTrackerProps {
  contentId: number;
  contentType: 'movie' | 'tv' | 'anime';
  title: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  seasons?: SeasonInfo[];
  onProgressUpdate?: () => void;
}

interface ProgressState {
  currentSeason: number;
  currentEpisode: number;
  totalSeasons: number;
  totalEpisodes: number;
}

// ─── Helper: Build season episode count map ─────────────────────────

function buildSeasonMap(
  seasons?: SeasonInfo[],
  totalSeasons?: number,
  totalEpisodes?: number
): Map<number, number> {
  const map = new Map<number, number>();

  // Primary: use per-season data from TMDB
  if (seasons && seasons.length > 0) {
    for (const s of seasons) {
      map.set(s.seasonNumber, s.episodeCount);
    }
    return map;
  }

  // Fallback: evenly distribute episodes across seasons
  const s = totalSeasons || 1;
  const e = totalEpisodes || 0;
  if (s > 0 && e > 0) {
    const perSeason = Math.ceil(e / s);
    for (let i = 1; i <= s; i++) {
      const remaining = e - (i - 1) * perSeason;
      map.set(i, Math.min(perSeason, Math.max(0, remaining)));
    }
  }

  return map;
}

// ─── Helper: Get episodes watched across all previous seasons ────────

function getEpisodesBeforeSeason(
  targetSeason: number,
  seasonMap: Map<number, number>
): number {
  let total = 0;
  for (const [sn, count] of seasonMap) {
    if (sn < targetSeason) total += count;
  }
  return total;
}

// ─── Helper: Calculate total watched episodes ────────────────────────

function getTotalWatched(
  currentSeason: number,
  currentEpisode: number,
  seasonMap: Map<number, number>
): number {
  const beforeThisSeason = getEpisodesBeforeSeason(currentSeason, seasonMap);
  return beforeThisSeason + currentEpisode;
}

// ─── Init progress from storage ─────────────────────────────────────

function getInitialProgress(
  contentId: number,
  contentType: string,
  totalSeasons?: number,
  totalEpisodes?: number
): ProgressState {
  const progress = getWatchProgress(contentId, contentType);
  return {
    currentSeason: progress?.currentSeason || 1,
    currentEpisode: progress?.currentEpisode || 0,
    totalSeasons: totalSeasons || 1,
    totalEpisodes: totalEpisodes || 0,
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function EpisodeTracker({
  contentId,
  contentType,
  title,
  totalSeasons,
  totalEpisodes,
  seasons,
  onProgressUpdate,
}: EpisodeTrackerProps) {
  // Build season map once
  const seasonMap = useMemo(
    () => buildSeasonMap(seasons, totalSeasons, totalEpisodes),
    [seasons, totalSeasons, totalEpisodes]
  );

  // Save season map and totals to storage when they change
  useEffect(() => {
    if (totalSeasons && totalEpisodes) {
      updateWatchTotals(contentId, contentType, totalSeasons, totalEpisodes);
    }
    if (seasonMap.size > 0) {
      const counts: Record<string, number> = {};
      for (const [sn, count] of seasonMap) {
        counts[String(sn)] = count;
      }
      updateSeasonEpisodeCounts(contentId, contentType, counts);
    }
  }, [seasonMap, contentId, contentType, totalSeasons, totalEpisodes]);

  // Progress state
  const [progressState, setProgressState] = useState(() =>
    getInitialProgress(contentId, contentType, totalSeasons, totalEpisodes)
  );

  const currentSeason = progressState.currentSeason;
  const currentEpisode = progressState.currentEpisode;

  // Per-season episode count for the CURRENT season
  const episodesInCurrentSeason = seasonMap.get(currentSeason) || totalEpisodes || 0;

  // Total episodes across all seasons
  const grandTotalEpisodes = useMemo(() => {
    if (seasonMap.size > 0) {
      let total = 0;
      for (const count of seasonMap.values()) total += count;
      return total;
    }
    return totalEpisodes || 0;
  }, [seasonMap, totalEpisodes]);

  // Total episodes watched across all seasons
  const totalWatched = getTotalWatched(currentSeason, currentEpisode, seasonMap);

  // Overall progress percentage
  const overallPercent = grandTotalEpisodes > 0
    ? Math.round((totalWatched / grandTotalEpisodes) * 100)
    : 0;

  // Current season progress percentage
  const seasonPercent = episodesInCurrentSeason > 0
    ? Math.round((currentEpisode / episodesInCurrentSeason) * 100)
    : 0;

  const isSeasonComplete = currentEpisode >= episodesInCurrentSeason && episodesInCurrentSeason > 0;
  const isShowComplete = totalWatched >= grandTotalEpisodes && grandTotalEpisodes > 0;
  const hasStarted = currentEpisode > 0;

  // ─── Handlers ────────────────────────────────────────────────────

  const persistProgress = useCallback((season: number, episode: number) => {
    updateWatchProgress(contentId, contentType, season, episode);
    onProgressUpdate?.();
  }, [contentId, contentType, onProgressUpdate]);

  const handleSeasonChange = useCallback((newSeason: number) => {
    setProgressState(prev => {
      if (newSeason < 1 || newSeason > prev.totalSeasons || newSeason === prev.currentSeason) return prev;
      persistProgress(newSeason, 0);
      return { ...prev, currentSeason: newSeason, currentEpisode: 0 };
    });
  }, [progressState.totalSeasons, persistProgress]);

  const handleEpisodeChange = useCallback((delta: number) => {
    setProgressState(prev => {
      const maxEp = seasonMap.get(prev.currentSeason) || grandTotalEpisodes || 0;
      const newEpisode = Math.max(0, Math.min(maxEp, prev.currentEpisode + delta));
      if (newEpisode !== prev.currentEpisode) {
        persistProgress(prev.currentSeason, newEpisode);
        return { ...prev, currentEpisode: newEpisode };
      }
      return prev;
    });
  }, [seasonMap, grandTotalEpisodes, persistProgress]);

  const handleNextEpisode = useCallback(() => {
    setProgressState(prev => {
      const maxEp = seasonMap.get(prev.currentSeason) || grandTotalEpisodes || 0;
      const nextEp = prev.currentEpisode + 1;
      if (nextEp <= maxEp) {
        persistProgress(prev.currentSeason, nextEp);
        return { ...prev, currentEpisode: nextEp };
      }
      return prev;
    });
  }, [seasonMap, grandTotalEpisodes, persistProgress]);

  const handleMarkSeasonComplete = useCallback(() => {
    setProgressState(prev => {
      const maxEp = seasonMap.get(prev.currentSeason) || grandTotalEpisodes || 0;
      persistProgress(prev.currentSeason, maxEp);
      return { ...prev, currentEpisode: maxEp };
    });
  }, [seasonMap, grandTotalEpisodes, persistProgress]);

  const handleMarkShowComplete = useCallback(() => {
    const lastSeason = progressState.totalSeasons;
    const lastSeasonEpisodes = seasonMap.get(lastSeason) || 0;
    setProgressState(prev => {
      persistProgress(lastSeason, lastSeasonEpisodes);
      moveWatchListItem(contentId, contentType, 'finished');
      onProgressUpdate?.();
      return {
        ...prev,
        currentSeason: lastSeason,
        currentEpisode: lastSeasonEpisodes,
      };
    });
  }, [progressState.totalSeasons, seasonMap, contentId, contentType, persistProgress, onProgressUpdate]);

  // Only show for TV/anime
  if (contentType === 'movie') return null;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="bg-card/60 border border-border/50 rounded-xl p-4 sm:p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="h-5 w-5 text-ars" />
          <h3 className="text-base font-semibold text-foreground">Episode Progress</h3>
        </div>
        {isShowComplete ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <Trophy className="h-3.5 w-3.5" />
            All Done!
          </span>
        ) : isSeasonComplete ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Season Complete
          </span>
        ) : hasStarted ? (
          <span className="text-xs font-medium text-ars bg-ars/10 px-2.5 py-1 rounded-full">
            S{currentSeason}E{currentEpisode}
          </span>
        ) : null}
      </div>

      {/* ─── Season Selector ──────────────────────────────────────── */}
      {progressState.totalSeasons > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Season
            </span>
            <span className="text-xs text-muted-foreground">
              {currentSeason} of {progressState.totalSeasons}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleSeasonChange(currentSeason - 1)}
              disabled={currentSeason <= 1}
              aria-label="Previous season"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 flex gap-1 overflow-x-auto hide-scrollbar">
              {Array.from({ length: progressState.totalSeasons }, (_, i) => i + 1).map((sn) => {
                const eps = seasonMap.get(sn) || 0;
                const isCurrent = sn === currentSeason;
                const isWatched = sn < currentSeason;
                return (
                  <button
                    key={sn}
                    onClick={() => handleSeasonChange(sn)}
                    className={`
                      relative flex-shrink-0 h-9 min-w-[2.5rem] px-2 rounded-lg text-sm font-medium transition-all
                      ${isCurrent
                        ? 'bg-ars text-ars-foreground shadow-md scale-105'
                        : isWatched
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
                      }
                    `}
                    aria-label={`Season ${sn}`}
                  >
                    {sn}
                    {isWatched && (
                      <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-emerald-500 bg-background rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleSeasonChange(currentSeason + 1)}
              disabled={currentSeason >= progressState.totalSeasons}
              aria-label="Next season"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Season name */}
          {seasons && seasons.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {seasons.find(s => s.seasonNumber === currentSeason)?.name || `Season ${currentSeason}`}
              {' '} &middot; {episodesInCurrentSeason} episode{episodesInCurrentSeason !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ─── Episode Stepper ──────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
            Episode
          </span>
          <span className="text-xs text-muted-foreground">
            {currentEpisode} / {episodesInCurrentSeason}
          </span>
        </div>

        {/* Stepper control */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => handleEpisodeChange(-1)}
            disabled={currentEpisode <= 0}
            aria-label="Previous episode"
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Episode number display + input */}
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {currentEpisode}
            </span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-lg font-semibold text-muted-foreground tabular-nums">
              {episodesInCurrentSeason}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
            onClick={() => handleEpisodeChange(1)}
            disabled={currentEpisode >= episodesInCurrentSeason}
            aria-label="Next episode"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Season progress bar */}
        {episodesInCurrentSeason > 0 && (
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isSeasonComplete ? 'bg-emerald-500' : 'bg-ars'
                }`}
                style={{ width: `${seasonPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{hasStarted ? `S${currentSeason}E${currentEpisode}` : 'Not started'}</span>
              <span>{seasonPercent}% of season</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Overall Progress ─────────────────────────────────────── */}
      {progressState.totalSeasons > 1 && grandTotalEpisodes > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium text-foreground">
              {totalWatched} / {grandTotalEpisodes} episodes ({overallPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isShowComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-ars to-ars/70'
              }`}
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Quick Actions ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!isSeasonComplete && (
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-ars hover:bg-ars/90 text-ars-foreground"
            onClick={handleNextEpisode}
            disabled={currentEpisode >= episodesInCurrentSeason}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Next Episode
          </Button>
        )}
        {!isSeasonComplete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleMarkSeasonComplete}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete Season {currentSeason}
          </Button>
        )}
        {!isShowComplete && progressState.totalSeasons > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/30"
            onClick={handleMarkShowComplete}
          >
            <Trophy className="h-3.5 w-3.5" />
            Complete Show
          </Button>
        )}
      </div>
    </div>
  );
}
