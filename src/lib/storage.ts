/**
 * AR-Stream Local Storage Utilities
 * Handles Continue Watching, Favorites, and UI preferences
 */

export interface WatchItem {
  id: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv' | 'anime';
  timestamp: number;
  progress?: number;
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

const STORAGE_KEYS = {
  CONTINUE_WATCHING: 'ar-stream-continue-watching',
  FAVORITES: 'ar-stream-favorites',
  SIDEBAR_COLLAPSED: 'ar-stream-sidebar-collapsed',
  THEME: 'ar-stream-theme',
  LAST_SECTION: 'ar-stream-last-section',
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

// Favorites
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

// UI Preferences
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
