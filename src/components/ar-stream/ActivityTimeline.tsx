'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  ClipboardList,
  CheckCircle,
  Film,
  Tv,
  Sparkles,
  Plus,
  ArrowRightLeft,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import {
  getActivityLog,
  getWatchList,
  getContinueWatching,
  addActivityEntry,
  clearActivityLog,
  type ActivityEntry,
  type WatchListItem,
  type WatchItem,
} from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Helpers ────────────────────────────────────────────────────────

function getActionLabel(action: ActivityEntry['action']): string {
  switch (action) {
    case 'viewed': return 'Viewed';
    case 'added_watching': return 'Added to Watching';
    case 'added_watchlist': return 'Added to Watch List';
    case 'added_finished': return 'Marked as Finished';
    case 'moved_list': return 'Moved list';
    case 'removed': return 'Removed';
  }
}

function getActionColor(action: ActivityEntry['action']): string {
  switch (action) {
    case 'viewed': return 'text-ars';
    case 'added_watching': return 'text-emerald-500';
    case 'added_watchlist': return 'text-amber-500';
    case 'added_finished': return 'text-sky-500';
    case 'moved_list': return 'text-violet-500';
    case 'removed': return 'text-red-500';
  }
}

function getActionBadgeVariant(action: ActivityEntry['action']): string {
  switch (action) {
    case 'viewed': return 'bg-ars/15 text-ars';
    case 'added_watching': return 'bg-emerald-500/15 text-emerald-500';
    case 'added_watchlist': return 'bg-amber-500/15 text-amber-500';
    case 'added_finished': return 'bg-sky-500/15 text-sky-500';
    case 'moved_list': return 'bg-violet-500/15 text-violet-500';
    case 'removed': return 'bg-red-500/15 text-red-500';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// ─── Calendar Grid ──────────────────────────────────────────────────

function CalendarGrid({
  currentMonth,
  activityByDay,
  onDayClick,
  selectedDay,
}: {
  currentMonth: Date;
  activityByDay: Map<string, ActivityEntry[]>;
  onDayClick: (day: string) => void;
  selectedDay: string | null;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const today = new Date();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  function getIntensity(day: number): number {
    const key = `${year}-${month}-${day}`;
    const entries = activityByDay.get(key);
    if (!entries || entries.length === 0) return 0;
    if (entries.length <= 2) return 1;
    if (entries.length <= 5) return 2;
    return 3;
  }

  const intensityClasses: Record<number, string> = {
    0: 'bg-muted/30 text-muted-foreground',
    1: 'bg-ars/20 text-foreground',
    2: 'bg-ars/40 text-foreground',
    3: 'bg-ars/70 text-ars-foreground',
  };

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const dayKey = (day: number) => `${year}-${month}-${day}`;

  return (
    <div>
      <div className="text-center mb-3">
        <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const intensity = getIntensity(day);
          const key = dayKey(day);
          const isSelected = selectedDay === key;
          const hasActivity = intensity > 0;

          return (
            <button
              key={key}
              onClick={() => onDayClick(key)}
              className={`
                aspect-square rounded-md text-xs font-medium flex items-center justify-center
                transition-all duration-150 cursor-pointer
                ${intensityClasses[intensity]}
                ${isToday(day) ? 'ring-2 ring-ars ring-offset-1 ring-offset-background' : ''}
                ${isSelected ? 'ring-2 ring-ars scale-110' : ''}
                ${hasActivity ? 'hover:scale-105' : 'opacity-60'}
              `}
              title={hasActivity ? `${activityByDay.get(key)?.length} activities` : 'No activity'}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Activity Summary ───────────────────────────────────────────────

function ActivitySummary({ entries, date }: { entries: ActivityEntry[]; date: string }) {
  const viewed = entries.filter(e => e.action === 'viewed').length;
  const added = entries.filter(e => e.action.startsWith('added_')).length;
  const moved = entries.filter(e => e.action === 'moved_list').length;
  const removed = entries.filter(e => e.action === 'removed').length;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {viewed > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-ars/10 text-ars">
          <Eye className="h-3 w-3" /> {viewed} viewed
        </span>
      )}
      {added > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
          <Plus className="h-3 w-3" /> {added} added
        </span>
      )}
      {moved > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/10 text-violet-500">
          <ArrowRightLeft className="h-3 w-3" /> {moved} moved
        </span>
      )}
      {removed > 0 && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500">
          <Trash2 className="h-3 w-3" /> {removed} removed
        </span>
      )}
    </div>
  );
}


// ─── Activity Feed Entry ────────────────────────────────────────────

function ActionIconComponent({ action, className }: { action: ActivityEntry['action']; className?: string }) {
  switch (action) {
    case 'viewed': return <Eye className={className} />;
    case 'added_watching': return <Eye className={className} />;
    case 'added_watchlist': return <ClipboardList className={className} />;
    case 'added_finished': return <CheckCircle className={className} />;
    case 'moved_list': return <ArrowRightLeft className={className} />;
    case 'removed': return <Trash2 className={className} />;
  }
}

function TypeIconComponent({ itemType, className }: { itemType: 'movie' | 'tv' | 'anime'; className?: string }) {
  switch (itemType) {
    case 'movie': return <Film className={className} />;
    case 'tv': return <Tv className={className} />;
    case 'anime': return <Sparkles className={className} />;
  }
}

function ActivityFeedEntry({ entry }: { entry: ActivityEntry }) {
  const actionColor = getActionColor(entry.action);
  const badgeVariant = getActionBadgeVariant(entry.action);

  return (
    <div className="flex items-start gap-3 py-2.5">
      {/* Action Icon */}
      <div className={`size-7 rounded-full flex items-center justify-center flex-shrink-0 ${badgeVariant}`}>
        <ActionIconComponent action={entry.action} className="h-3.5 w-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium ${actionColor}`}>{getActionLabel(entry.action)}</span>
          <TypeIconComponent itemType={entry.itemType} className="h-3 w-3 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">{entry.itemTitle}</p>
        {entry.details && (
          <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-1">
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ActivityTimeline() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const activityLog = useMemo(() => getActivityLog(), []);
  const watchListItems = useMemo(() => getWatchList(), []);
  const continueWatching = useMemo(() => getContinueWatching(), []);

  // Generate synthetic activity from watchlist + continue watching if no activity log exists
  const allActivity = useMemo(() => {
    const log = [...activityLog];

    // If activity log is empty, generate from existing data
    if (log.length === 0) {
      const synthetic: ActivityEntry[] = [];

      for (const item of watchListItems) {
        const action: ActivityEntry['action'] =
          item.category === 'watching' ? 'added_watching' :
          item.category === 'watchlist' ? 'added_watchlist' :
          'added_finished';

        synthetic.push({
          id: `wl-${item.type}-${item.id}`,
          itemId: item.id,
          itemType: item.type,
          itemTitle: item.title,
          itemPosterPath: item.posterPath,
          action,
          timestamp: item.addedAt || Date.now(),
          details: `Added to ${item.category}`,
        });
      }

      for (const item of continueWatching) {
        // Avoid duplicates with watchlist items
        const alreadyExists = synthetic.some(s => s.itemId === item.id && s.itemType === item.type);
        if (!alreadyExists) {
          synthetic.push({
            id: `cw-${item.type}-${item.id}`,
            itemId: item.id,
            itemType: item.type,
            itemTitle: item.title,
            itemPosterPath: item.posterPath,
            action: 'viewed',
            timestamp: item.timestamp,
          });
        }
      }

      return synthetic.sort((a, b) => b.timestamp - a.timestamp);
    }

    return log;
  }, [activityLog, watchListItems, continueWatching]);

  // Group activity by day
  const activityByDay = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const entry of allActivity) {
      const d = new Date(entry.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [allActivity]);

  // Group activity by date for feed
  const groupedFeed = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; entries: ActivityEntry[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    let filtered = allActivity;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = allActivity.filter(e =>
        e.itemTitle.toLowerCase().includes(q) ||
        getActionLabel(e.action).toLowerCase().includes(q)
      );
    }

    for (const entry of filtered) {
      const d = new Date(entry.timestamp);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dateLabel = formatDate(entry.timestamp);

      if (!currentGroup || currentGroup.dateKey !== dateKey) {
        currentGroup = { dateKey, dateLabel, entries: [] };
        groups.push(currentGroup);
      }
      currentGroup.entries.push(entry);
    }

    return groups;
  }, [allActivity, searchQuery]);

  // Navigation
  const prevMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  }, []);

  const handleDayClick = useCallback((day: string) => {
    setSelectedDay(prev => prev === day ? null : day);
  }, []);

  // Selected day entries
  const selectedDayEntries = useMemo(() => {
    if (!selectedDay) return null;
    return activityByDay.get(selectedDay) || [];
  }, [selectedDay, activityByDay]);

  // Clear activity log
  const handleClear = useCallback(() => {
    if (confirmClear) {
      clearActivityLog();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [confirmClear]);

  // Empty state
  if (allActivity.length === 0) {
    return (
      <div className="w-full fade-in">
        <div className="px-4 sm:px-6 lg:px-8 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Activity</h2>
          <p className="text-sm text-muted-foreground">Your viewing timeline</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="size-20 rounded-full bg-ars/10 flex items-center justify-center mb-4">
            <CalendarDays className="size-10 text-ars/50" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Activity Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your viewing activity will appear here as you browse, add items to lists, and watch content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full fade-in space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-ars/10 flex items-center justify-center">
              <CalendarDays className="size-5 text-ars" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Activity</h2>
              <p className="text-sm text-muted-foreground">{allActivity.length} activities recorded</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className={`gap-1.5 text-xs ${confirmClear ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'text-muted-foreground'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmClear ? 'Confirm Clear?' : 'Clear Log'}
          </Button>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 sm:p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="size-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="size-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <CalendarGrid
              currentMonth={currentMonth}
              activityByDay={activityByDay}
              onDayClick={handleDayClick}
              selectedDay={selectedDay}
            />

            {/* Selected day detail */}
            {selectedDay && selectedDayEntries && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {formatDate(selectedDayEntries[0]?.timestamp || Date.now())}
                  <span className="text-muted-foreground font-normal ml-2">({selectedDayEntries.length} activities)</span>
                </h4>
                <ActivitySummary entries={selectedDayEntries} date={selectedDay} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <div className="px-4 sm:px-6 lg:px-8">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
              <span className="text-xs text-muted-foreground">{allActivity.length} entries</span>
            </div>
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-card/80 border-border/50 focus:border-ars/50 h-9 text-sm"
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
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-1 custom-scrollbar">
              {groupedFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
                  <Search className="h-8 w-8 mb-2 opacity-30" />
                  <p>No matching activity found</p>
                </div>
              ) : (
                groupedFeed.map(group => (
                  <div key={group.dateKey} className="mb-4">
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border/30">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">{group.dateLabel}</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {group.entries.length}
                      </Badge>
                    </div>

                    {/* Entries */}
                    {group.entries.map(entry => (
                      <ActivityFeedEntry key={entry.id} entry={entry} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
