import { create } from 'zustand';

export type ContentType = 'movie' | 'tv' | 'anime';
export type ActiveSection = 'home' | 'search' | 'live-tv' | 'favorites' | 'continue-watching' | string;

export interface ContentItem {
  id: number;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  type: ContentType;
  genreIds?: number[];
  popularity?: number;
  // Anime-specific
  episodes?: number;
  status?: string;
  genres?: { mal_id: number; name: string }[];
  score?: number;
  // Favorites-specific
  addedAt?: number;
}

export interface ContentDetail extends ContentItem {
  tagline?: string;
  runtime?: number;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres: { id: number; name: string }[] | { mal_id: number; name: string }[];
  productionCompanies?: { id: number; name: string; logo_path: string | null }[];
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  trailerKey?: string;
  similar?: ContentItem[];
  homepage?: string;
  networks?: { id: number; name: string; logo_path: string | null }[];
  nextEpisodeToAir?: { id: number; name: string; air_date: string };
}

export interface SearchResult {
  results: ContentItem[];
  totalResults: number;
  page: number;
  totalPages: number;
}

interface AppState {
  // UI State
  activeSection: ActiveSection;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
  theme: 'light' | 'dark';

  // Content State
  selectedContent: ContentItem | null;
  detailModalOpen: boolean;
  searchResults: SearchResult | null;
  isSearching: boolean;

  // Data cache
  sectionData: Record<string, ContentItem[]>;
  sectionLoading: Record<string, boolean>;
  sectionError: Record<string, string | null>;

  // Actions
  setActiveSection: (section: ActiveSection) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSelectedContent: (content: ContentItem | null) => void;
  setDetailModalOpen: (open: boolean) => void;
  setSearchResults: (results: SearchResult | null) => void;
  setIsSearching: (searching: boolean) => void;
  setSectionData: (sectionId: string, data: ContentItem[]) => void;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
  setSectionError: (sectionId: string, error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // UI State
  activeSection: 'home',
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  searchQuery: '',
  theme: 'dark',

  // Content State
  selectedContent: null,
  detailModalOpen: false,
  searchResults: null,
  isSearching: false,

  // Data cache
  sectionData: {},
  sectionLoading: {},
  sectionError: {},

  // Actions
  setActiveSection: (section) => set({ activeSection: section, mobileSidebarOpen: false }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTheme: (theme) => set({ theme }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  setDetailModalOpen: (open) => set({ detailModalOpen: open }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  setSectionData: (sectionId, data) =>
    set((state) => ({
      sectionData: { ...state.sectionData, [sectionId]: data },
      sectionLoading: { ...state.sectionLoading, [sectionId]: false },
      sectionError: { ...state.sectionError, [sectionId]: null },
    })),
  setSectionLoading: (sectionId, loading) =>
    set((state) => ({
      sectionLoading: { ...state.sectionLoading, [sectionId]: loading },
    })),
  setSectionError: (sectionId, error) =>
    set((state) => ({
      sectionLoading: { ...state.sectionLoading, [sectionId]: false },
      sectionError: { ...state.sectionError, [sectionId]: error },
    })),
}));
