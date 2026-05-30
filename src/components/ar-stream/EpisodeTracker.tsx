'use client';

import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, SkipForward, CheckCircle, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getWatchProgress,
  updateWatchProgress,
  updateWatchTotals,
  moveWatchListItem,
} from '@/lib/storage';

interface EpisodeTrackerProps {
  contentId: number;
  contentType: 'movie' | 'tv' | 'anime';
  title: string;
  totalSeasons?: number;
  totalEpisodes?: number;
  onProgressUpdate?: () => void;
}

function getInitialProgress(
  contentId: number,
  contentType: string,
  totalSeasons?: number,
  totalEpisodes?: number
) {
  const progress = getWatchProgress(contentId, contentType);
  // Update totals if provided
  if (totalSeasons && totalEpisodes) {
    updateWatchTotals(contentId, contentType, totalSeasons, totalEpisodes);
  }
  return {
    currentSeason: progress?.currentSeason || 1,
    currentEpisode: progress?.currentEpisode || 0,
    totalSeasons: progress?.totalSeasons || totalSeasons || 1,
    totalEpisodes: progress?.totalEpisodes || totalEpisodes || 0,
  };
}

export default function EpisodeTracker({
  contentId,
  contentType,
  totalSeasons,
  totalEpisodes,
  onProgressUpdate,
}: EpisodeTrackerProps) {
  // Use lazy initializer to avoid setting state in effect
  const [progressState, setProgressState] = useState(() =>
    getInitialProgress(contentId, contentType, totalSeasons, totalEpisodes)
  );

  const currentSeason = progressState.currentSeason;
  const currentEpisode = progressState.currentEpisode;
  const storedTotalSeasons = progressState.totalSeasons;
  const storedTotalEpisodes = progressState.totalEpisodes;

  const saveProgress = useCallback((season: number, episode: number) => {
    updateWatchProgress(contentId, contentType, season, episode);
    onProgressUpdate?.();
  }, [contentId, contentType, onProgressUpdate]);

  const handleSeasonChange = useCallback((delta: number) => {
    setProgressState(prev => {
      const newSeason = Math.max(1, Math.min(prev.totalSeasons, prev.currentSeason + delta));
      if (newSeason !== prev.currentSeason) {
        updateWatchProgress(contentId, contentType, newSeason, 0);
        onProgressUpdate?.();
        return { ...prev, currentSeason: newSeason, currentEpisode: 0 };
      }
      return prev;
    });
  }, [contentId, contentType, onProgressUpdate]);

  const handleEpisodeChange = useCallback((delta: number) => {
    setProgressState(prev => {
      const newEpisode = Math.max(0, Math.min(prev.totalEpisodes, prev.currentEpisode + delta));
      if (newEpisode !== prev.currentEpisode) {
        updateWatchProgress(contentId, contentType, prev.currentSeason, newEpisode);
        onProgressUpdate?.();
        return { ...prev, currentEpisode: newEpisode };
      }
      return prev;
    });
  }, [contentId, contentType, onProgressUpdate]);

  const handleNextEpisode = useCallback(() => {
    setProgressState(prev => {
      const nextEp = prev.currentEpisode + 1;
      if (nextEp <= prev.totalEpisodes) {
        updateWatchProgress(contentId, contentType, prev.currentSeason, nextEp);
        onProgressUpdate?.();
        return { ...prev, currentEpisode: nextEp };
      }
      return prev;
    });
  }, [contentId, contentType, onProgressUpdate]);

  const handleMarkComplete = useCallback(() => {
    setProgressState(prev => {
      updateWatchProgress(contentId, contentType, prev.totalSeasons, prev.totalEpisodes);
      moveWatchListItem(contentId, contentType, 'finished');
      onProgressUpdate?.();
      return {
        ...prev,
        currentSeason: prev.totalSeasons,
        currentEpisode: prev.totalEpisodes,
      };
    });
  }, [contentId, contentType, onProgressUpdate]);

  // Calculate progress percentage
  const progressPercent = storedTotalEpisodes > 0
    ? Math.round((currentEpisode / storedTotalEpisodes) * 100)
    : 0;

  const isComplete = currentEpisode >= storedTotalEpisodes && storedTotalEpisodes > 0;
  const hasStarted = currentEpisode > 0;

  // Only show for TV/anime
  if (contentType === 'movie') return null;

  return (
    <div className="bg-card/60 border border-border/50 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Tv className="h-5 w-5 text-ars" />
        <h3 className="text-base font-semibold text-foreground">Episode Progress</h3>
        {isComplete && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Complete
          </span>
        )}
      </div>

      {/* Season Stepper */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-14">Season</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleSeasonChange(-1)}
            disabled={currentSeason <= 1}
            aria-label="Previous season"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-sm font-bold text-foreground">
            {currentSeason}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleSeasonChange(1)}
            disabled={currentSeason >= storedTotalSeasons}
            aria-label="Next season"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          of {storedTotalSeasons} season{storedTotalSeasons !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Episode Stepper */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-14">Episode</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEpisodeChange(-1)}
            disabled={currentEpisode <= 0}
            aria-label="Previous episode"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-sm font-bold text-foreground">
            {currentEpisode}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleEpisodeChange(1)}
            disabled={currentEpisode >= storedTotalEpisodes}
            aria-label="Next episode"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          of {storedTotalEpisodes} episode{storedTotalEpisodes !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Progress Bar */}
      {storedTotalEpisodes > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{hasStarted ? `S${currentSeason}E${currentEpisode}` : 'Not started'}</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? 'bg-emerald-500' : 'bg-ars'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-1">
        {!isComplete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={handleNextEpisode}
            disabled={currentEpisode >= storedTotalEpisodes}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Next Episode
          </Button>
        )}
        {!isComplete && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/30"
            onClick={handleMarkComplete}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}
