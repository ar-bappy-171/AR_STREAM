/**
 * AR-Stream Local Storage Utilities
 * Handles Continue Watching, WatchList, Activity Log, and UI preferences
 */

export interface WatchItem {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv' | 'anime';
  timestamp: number;
  progress?: number;
  overview?: string;
  voteAverage?: number;
  releaseDate?: string;
  originalTitle?: string;
}

export interface FavoriteItem {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv' | 'anime';
  voteAverage: number;
  releaseDate: string;
  overview: string;
  addedAt: number;
}

export type WatchListCategory = 'watching' | 'watchlist' | 'finished';

export interface WatchListItem {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv' | 'anime';
  voteAverage: number;
  releaseDate: string;
  overview: string;
  originalTitle?: string;
  category: WatchListCategory;
  addedAt: number;
  // Episode tracker fields
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
}

export type ColorTheme = 'default' | 'ocean' | 'forest' | 'midnight' | 'sunset';

export interface ActivityEntry {
  id: string;
  itemId: number;
  itemType: 'movie' | 'tv' | 'anime';
  itemTitle: string;
  itemPosterPath: string | null;
  action: 'viewed' | 'added_watching' | 'added_watchlist' | 'added_finished' | 'moved_list' | 'removed';
  timestamp: number;
  details?: string;
}

const COLOR_THEME_KEY = 'ar-stream-color-theme';

const STORAGE_KEYS = {
  CONTINUE_WATCHING: 'ar-stream-continue-watching',
  FAVORITES: 'ar-stream-favorites',
  WATCHLIST: 'ar-stream-watchlist',
  SIDEBAR_COLLAPSED: 'ar-stream-sidebar-collapsed',
  THEME: 'ar-stream-theme',
  LAST_SECTION: 'ar-stream-last-section',
  WATCHLIST_MIGRATED: 'ar-stream-watchlist-migrated',
  COLOR_THEME: COLOR_THEME_KEY,
  ACTIVITY_LOG: 'ar-stream-activity-log',
} as const;

// Continue Watching
export function getContinueWatching(): WatchItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToContinueWatching(item: WatchItem): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getContinueWatching();
    // Remove if already exists
    const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));
    // Add to front
    filtered.unshift({ ...item, timestamp: Date.now() });
    // Keep only last 20
    const trimmed = filtered.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable
  }
}

export function removeFromContinueWatching(id: number, type: string): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getContinueWatching();
    const filtered = items.filter(i => !(i.id === id && i.type === type));
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(filtered));
  } catch {
    // Storage unavailable
  }
}

// ─── Favorites (kept for backward compatibility / migration) ────────

export function getFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToFavorites(item: FavoriteItem): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getFavorites();
    // Check if already exists
    if (items.some(i => i.id === item.id && i.type === item.type)) return;
    items.unshift({ ...item, addedAt: Date.now() });
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(items));
  } catch {
    // Storage full or unavailable
  }
}

export function removeFromFavorites(id: number, type: string): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getFavorites();
    const filtered = items.filter(i => !(i.id === id && i.type === type));
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
  } catch {
    // Storage unavailable
  }
}

export function isFavorite(id: number, type: string): boolean {
  const items = getFavorites();
  return items.some(i => i.id === id && i.type === type);
}

// ─── WatchList ──────────────────────────────────────────────────────

export function getWatchList(category?: WatchListCategory): WatchListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    const items: WatchListItem[] = data ? JSON.parse(data) : [];
    if (category) {
      return items.filter(i => i.category === category);
    }
    return items;
  } catch {
    return [];
  }
}

export function addToWatchList(item: WatchListItem): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getWatchList();
    // Remove if already exists (to move between categories)
    const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));
    filtered.unshift({ ...item, addedAt: item.addedAt || Date.now() });
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));
  } catch {
    // Storage full or unavailable
  }
}

export function removeFromWatchList(id: number, type: string): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getWatchList();
    const filtered = items.filter(i => !(i.id === id && i.type === type));
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(filtered));
  } catch {
    // Storage unavailable
  }
}

export function getWatchListStatus(id: number, type: string): WatchListCategory | null {
  const items = getWatchList();
  const found = items.find(i => i.id === id && i.type === type);
  return found ? found.category : null;
}

export function moveWatchListItem(id: number, type: string, newCategory: WatchListCategory): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getWatchList();
    const idx = items.findIndex(i => i.id === id && i.type === type);
    if (idx !== -1) {
      items[idx].category = newCategory;
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    }
  } catch {
    // Storage unavailable
  }
}

export function migrateFavoritesToWatchList(): void {
  if (typeof window === 'undefined') return;
  try {
    // Check if already migrated
    const migrated = localStorage.getItem(STORAGE_KEYS.WATCHLIST_MIGRATED);
    if (migrated === 'true') return;

    const favorites = getFavorites();
    if (favorites.length === 0) {
      // Mark as migrated even if no favorites
      localStorage.setItem(STORAGE_KEYS.WATCHLIST_MIGRATED, 'true');
      return;
    }

    const existingWatchList = getWatchList();
    const existingKeys = new Set(existingWatchList.map(i => `${i.type}-${i.id}`));

    // Convert favorites to watching items (if not already in watchlist)
    const newItems: WatchListItem[] = favorites
      .filter(f => !existingKeys.has(`${f.type}-${f.id}`))
      .map(f => ({
        id: f.id,
        title: f.title,
        posterPath: f.posterPath,
        type: f.type,
        voteAverage: f.voteAverage,
        releaseDate: f.releaseDate,
        overview: f.overview,
        category: 'watching' as WatchListCategory,
        addedAt: f.addedAt,
      }));

    const merged = [...newItems, ...existingWatchList];
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(merged));
    localStorage.setItem(STORAGE_KEYS.WATCHLIST_MIGRATED, 'true');
  } catch {
    // Storage unavailable
  }
}

// ─── UI Preferences ─────────────────────────────────────────────────

export function getSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(collapsed));
  } catch {
    // Storage unavailable
  }
}

export function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function setTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // Storage unavailable
  }
}

// ─── Activity Log ───────────────────────────────────────────────────

export function getActivityLog(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addActivityEntry(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getActivityLog();
    const newEntry: ActivityEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    log.unshift(newEntry);
    // Keep only last 500 entries
    const trimmed = log.slice(0, 500);
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(trimmed));
  } catch {
    // Storage unavailable
  }
}

export function clearActivityLog(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOG);
  } catch {
    // Storage unavailable
  }
}

// ─── Export / Import ────────────────────────────────────────────────

export interface ExportData {
  version: string;
  exportedAt: number;
  watchlist: WatchListItem[];
  continueWatching: WatchItem[];
  activityLog: ActivityEntry[];
  theme: string;
  colorTheme: string;
}

export function exportAllData(): string {
  const data: ExportData = {
    version: '1.0',
    exportedAt: Date.now(),
    watchlist: getWatchList(),
    continueWatching: getContinueWatching(),
    activityLog: getActivityLog(),
    theme: getTheme(),
    colorTheme: localStorage.getItem(COLOR_THEME_KEY) || 'default',
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString) as Partial<ExportData>;

    // Validate structure
    if (!data.version || !data.exportedAt) {
      return { success: false, message: 'Invalid backup file: missing version or timestamp.' };
    }

    if (typeof window === 'undefined') {
      return { success: false, message: 'Cannot import: not in browser environment.' };
    }

    // Import watchlist
    if (Array.isArray(data.watchlist)) {
      try {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(data.watchlist));
      } catch {
        // Storage full
      }
    }

    // Import continue watching
    if (Array.isArray(data.continueWatching)) {
      try {
        localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(data.continueWatching));
      } catch {
        // Storage full
      }
    }

    // Import activity log
    if (Array.isArray(data.activityLog)) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(data.activityLog));
      } catch {
        // Storage full
      }
    }

    // Import theme
    if (data.theme === 'light' || data.theme === 'dark') {
      localStorage.setItem(STORAGE_KEYS.THEME, data.theme);
    }

    // Import color theme
    if (typeof data.colorTheme === 'string') {
      localStorage.setItem(COLOR_THEME_KEY, data.colorTheme);
    }

    return { success: true, message: 'Data imported successfully!' };
  } catch {
    return { success: false, message: 'Invalid JSON file. Please check the file and try again.' };
  }
}

export function getStorageSize(): { bytes: number; formatted: string } {
  if (typeof window === 'undefined') return { bytes: 0, formatted: '0 B' };
  try {
    let totalBytes = 0;
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        totalBytes += key.length + item.length;
      }
    }
    // Each char is ~2 bytes in UTF-16
    totalBytes *= 2;

    if (totalBytes < 1024) return { bytes: totalBytes, formatted: `${totalBytes} B` };
    if (totalBytes < 1024 * 1024) return { bytes: totalBytes, formatted: `${(totalBytes / 1024).toFixed(1)} KB` };
    return { bytes: totalBytes, formatted: `${(totalBytes / (1024 * 1024)).toFixed(1)} MB` };
  } catch {
    return { bytes: 0, formatted: '0 B' };
  }
}

// ─── Color Theme ────────────────────────────────────────────────────

export function getColorTheme(): ColorTheme {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = localStorage.getItem(COLOR_THEME_KEY);
    const valid: ColorTheme[] = ['default', 'ocean', 'forest', 'midnight', 'sunset'];
    if (stored && valid.includes(stored as ColorTheme)) return stored as ColorTheme;
    return 'default';
  } catch {
    return 'default';
  }
}

export function setColorTheme(theme: ColorTheme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COLOR_THEME_KEY, theme);
    // Apply or remove data-theme attribute
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch {
    // Storage unavailable
  }
}

// ─── Watch Progress (Episode Tracker) ───────────────────────────────

export function getWatchProgress(id: number, type: string): { currentSeason: number; currentEpisode: number } | null {
  const items = getWatchList();
  const item = items.find(i => i.id === id && i.type === type);
  if (!item) return null;
  return {
    currentSeason: item.currentSeason || 1,
    currentEpisode: item.currentEpisode || 0,
  };
}

export function updateWatchProgress(id: number, type: string, season: number, episode: number): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getWatchList();
    const idx = items.findIndex(i => i.id === id && i.type === type);
    if (idx !== -1) {
      items[idx].currentSeason = season;
      items[idx].currentEpisode = episode;
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    }
  } catch {
    // Storage unavailable
  }
}

export function updateWatchTotals(id: number, type: string, totalSeasons: number, totalEpisodes: number): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getWatchList();
    const idx = items.findIndex(i => i.id === id && i.type === type);
    if (idx !== -1) {
      items[idx].totalSeasons = totalSeasons;
      items[idx].totalEpisodes = totalEpisodes;
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(items));
    }
  } catch {
    // Storage unavailable
  }
}

// ─── Parental Controls ──────────────────────────────────────────────

export interface ParentalSettings {
  enabled: boolean;
  pin: string;
  filterLevel: 'none' | 'mild' | 'strict';
}

const PARENTAL_KEY = 'ar-stream-parental-controls';

export function getParentalSettings(): ParentalSettings {
  if (typeof window === 'undefined') return { enabled: false, pin: '', filterLevel: 'none' };
  try {
    const data = localStorage.getItem(PARENTAL_KEY);
    if (data) return JSON.parse(data);
    return { enabled: false, pin: '', filterLevel: 'none' };
  } catch {
    return { enabled: false, pin: '', filterLevel: 'none' };
  }
}

export function setParentalSettings(settings: ParentalSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PARENTAL_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable
  }
}

export function verifyPin(pin: string): boolean {
  const settings = getParentalSettings();
  return settings.pin === pin;
}

// TMDB genre IDs for content filtering
const HORROR_THRILLER_GENRES = [27, 53]; // Horror, Thriller
const FAMILY_GENRES = [10751, 16]; // Family, Animation

export function isContentBlocked(item: { voteAverage: number; genreIds?: number[]; type: string }): boolean {
  const settings = getParentalSettings();
  if (!settings.enabled) return false;

  switch (settings.filterLevel) {
    case 'none':
      return false;
    case 'mild':
      // Block horror/thriller genres and very low-rated content
      if (item.genreIds && item.genreIds.some(g => HORROR_THRILLER_GENRES.includes(g))) return true;
      if (item.voteAverage > 0 && item.voteAverage < 3) return true;
      return false;
    case 'strict':
      // Only allow family genres and well-rated content
      if (item.genreIds && !item.genreIds.some(g => FAMILY_GENRES.includes(g))) return true;
      return false;
    default:
      return false;
  }
}
