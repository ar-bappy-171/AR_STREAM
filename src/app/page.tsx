'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore, type ContentItem, type ContentDetail } from '@/lib/store';
import {
  getContinueWatching,
  addToContinueWatching,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  type FavoriteItem,
} from '@/lib/storage';
import {
  HOME_SECTIONS,
  GENRE_SECTIONS,
  ANIME_SECTIONS,
  REGIONAL_SECTIONS,
  type SectionConfig,
} from '@/lib/api-config';

import Header from '@/components/ar-stream/Header';
import Sidebar from '@/components/ar-stream/Sidebar';
import HeroCarousel from '@/components/ar-stream/HeroCarousel';
import { ContentRow } from '@/components/ar-stream/ContentRow';
import { DetailModal } from '@/components/ar-stream/DetailModal';
import SearchResults from '@/components/ar-stream/SearchResults';
import LiveTVSection from '@/components/ar-stream/LiveTVSection';
import Footer from '@/components/ar-stream/Footer';

// ─── TMDB Result Mapper ──────────────────────────────────────────────
function mapTmdbResult(item: Record<string, unknown>, type: 'movie' | 'tv'): ContentItem {
  return {
    id: item.id as number,
    title: (item.title || item.name || 'Unknown') as string,
    originalTitle: (item.original_title || item.original_name) as string | undefined,
    overview: (item.overview || '') as string,
    posterPath: (item.poster_path as string) || null,
    backdropPath: (item.backdrop_path as string) || null,
    releaseDate: ((item.release_date || item.first_air_date || '') as string),
    voteAverage: (item.vote_average as number) || 0,
    voteCount: (item.vote_count as number) || 0,
    type,
    genreIds: item.genre_ids as number[] | undefined,
    popularity: item.popularity as number | undefined,
  };
}

function mapJikanResult(item: Record<string, unknown>): ContentItem {
  const images = item.images as Record<string, Record<string, string>> | undefined;
  return {
    id: item.mal_id as number,
    title: (item.title as string) || 'Unknown',
    originalTitle: item.title_japanese as string | undefined,
    overview: (item.synopsis as string) || '',
    posterPath: (images?.jpg?.image_url || images?.webp?.image_url || null) as string | null,
    backdropPath: null,
    releaseDate: (() => {
      const aired = item.aired as Record<string, Record<string, Record<string, number>>> | undefined;
      const year = aired?.prop?.from?.year;
      return year ? String(year) : '';
    })(),
    voteAverage: ((item.score as number) || 0),
    voteCount: (item.scored_by as number) || 0,
    type: 'anime',
    episodes: item.episodes as number | undefined,
    status: item.status as string | undefined,
    genres: item.genres as { mal_id: number; name: string }[] | undefined,
  };
}

// ─── Data Fetching Functions ─────────────────────────────────────────

async function fetchTmdbSection(section: SectionConfig): Promise<ContentItem[]> {
  const { type, params = {} } = section;
  const endpoint = params.endpoint || 'popular';
  let url = '';

  if (type === 'tmdb-movie') {
    switch (endpoint) {
      case 'trending':
        url = '/api/tmdb/trending/movie/day';
        break;
      case 'popular':
        url = '/api/tmdb/movie/popular';
        break;
      case 'top_rated':
        url = '/api/tmdb/movie/top_rated';
        break;
      case 'now_playing':
        url = '/api/tmdb/movie/now_playing';
        break;
      case 'upcoming':
        url = '/api/tmdb/movie/upcoming';
        break;
      default:
        url = '/api/tmdb/movie/popular';
    }
  } else if (type === 'tmdb-tv') {
    switch (endpoint) {
      case 'trending':
        url = '/api/tmdb/trending/tv/day';
        break;
      case 'popular':
        url = '/api/tmdb/tv/popular';
        break;
      case 'top_rated':
        url = '/api/tmdb/tv/top_rated';
        break;
      default:
        url = '/api/tmdb/tv/popular';
    }
  } else if (type === 'tmdb-discover-movie') {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'endpoint') queryParams.set(key, value);
    });
    url = `/api/tmdb/discover/movie?${queryParams.toString()}`;
  } else if (type === 'tmdb-discover-tv') {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'endpoint') queryParams.set(key, value);
    });
    url = `/api/tmdb/discover/tv?${queryParams.toString()}`;
  }

  if (!url) return [];

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data = await res.json();
  const mediaType = type.includes('tv') ? 'tv' : 'movie';
  return (data.results || []).slice(0, 20).map((item: Record<string, unknown>) => mapTmdbResult(item, mediaType));
}

async function fetchJikanSection(section: SectionConfig): Promise<ContentItem[]> {
  const { params = {} } = section;
  const endpoint = params.endpoint || 'top';
  const filter = params.filter || '';
  let url = '';

  switch (endpoint) {
    case 'top':
      url = `/api/jikan/top/anime?limit=20${filter ? `&filter=${filter}` : ''}`;
      break;
    case 'seasons':
      url = '/api/jikan/seasons/now?limit=20';
      break;
    default:
      url = '/api/jikan/top/anime?limit=20';
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch anime: ${res.status}`);
  const data = await res.json();
  return (data.data || []).slice(0, 20).map((item: Record<string, unknown>) => mapJikanResult(item));
}

// ─── Section Mapping ─────────────────────────────────────────────────

function getSectionsForView(activeSection: string): SectionConfig[] {
  // For home, show all sections
  if (activeSection === 'home') {
    return [
      ...HOME_SECTIONS,
      ...GENRE_SECTIONS,
      ...ANIME_SECTIONS,
      ...REGIONAL_SECTIONS,
    ];
  }

  // For specific section, find the matching config
  const allSections = [...HOME_SECTIONS, ...GENRE_SECTIONS, ...ANIME_SECTIONS, ...REGIONAL_SECTIONS];
  const match = allSections.find(s => s.id === activeSection);
  if (match) return [match];

  return [];
}

// ─── Main Page Component ─────────────────────────────────────────────

export default function Home() {
  const {
    activeSection,
    searchQuery,
    selectedContent,
    detailModalOpen,
    sectionData,
    sectionLoading,
    sectionError,
    sidebarCollapsed,
    setActiveSection,
    setSelectedContent,
    setDetailModalOpen,
    setSectionData,
    setSectionLoading,
    setSectionError,
  } = useAppStore();

  // Initialize state from localStorage using lazy initializers
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const favs = getFavorites();
    return new Set(favs.map(f => `${f.type}-${f.id}`));
  });
  const [favoriteItems, setFavoriteItems] = useState<ContentItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const favs = getFavorites();
    return favs.map(f => ({
      id: f.id,
      title: f.title,
      overview: f.overview,
      posterPath: f.posterPath,
      backdropPath: null,
      releaseDate: f.releaseDate,
      voteAverage: f.voteAverage,
      voteCount: 0,
      type: f.type,
    }));
  });
  const [continueWatchingItems, setContinueWatchingItems] = useState<ContentItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const cw = getContinueWatching();
    return cw.map(w => ({
      id: w.id,
      title: w.title,
      overview: '',
      posterPath: w.posterPath,
      backdropPath: null,
      releaseDate: '',
      voteAverage: 0,
      voteCount: 0,
      type: w.type,
    }));
  });
  const fetchedSections = useRef<Set<string>>(new Set());
  const mainRef = useRef<HTMLDivElement>(null);

  // Fetch data for a section
  const fetchSectionData = useCallback(async (section: SectionConfig) => {
    // Use ref as primary guard to prevent re-fetching
    if (fetchedSections.current.has(section.id)) return;

    fetchedSections.current.add(section.id);
    setSectionLoading(section.id, true);

    try {
      let items: ContentItem[];

      if (section.type.startsWith('tmdb')) {
        items = await fetchTmdbSection(section);
      } else if (section.type === 'jikan-anime') {
        items = await fetchJikanSection(section);
      } else {
        items = [];
      }

      setSectionData(section.id, items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load content';
      setSectionError(section.id, message);
      // Remove from fetched on error so retry works
      fetchedSections.current.delete(section.id);
    }
  }, [setSectionData, setSectionLoading, setSectionError]);

  // Fetch data when activeSection changes
  useEffect(() => {
    const sections = getSectionsForView(activeSection);
    sections.forEach(section => {
      if (!fetchedSections.current.has(section.id)) {
        fetchSectionData(section);
      }
    });
  }, [activeSection, fetchSectionData]);

  // Scroll to top when section changes
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeSection]);

  // Handle content item click → open detail modal
  const handleItemClick = useCallback((item: ContentItem) => {
    setSelectedContent(item as ContentDetail);
    setDetailModalOpen(true);

    // Add to continue watching
    addToContinueWatching({
      id: item.id,
      title: item.title,
      posterPath: item.posterPath,
      type: item.type,
      timestamp: Date.now(),
    });

    // Update local continue watching state
    const cw = getContinueWatching();
    setContinueWatchingItems(cw.map(w => ({
      id: w.id,
      title: w.title,
      overview: '',
      posterPath: w.posterPath,
      backdropPath: null,
      releaseDate: '',
      voteAverage: 0,
      voteCount: 0,
      type: w.type,
    })));
  }, [setSelectedContent, setDetailModalOpen]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((item: ContentItem | ContentDetail) => {
    const key = `${item.type}-${item.id}`;
    const isFav = favorites.has(key);

    if (isFav) {
      removeFromFavorites(item.id, item.type);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      const favItem: FavoriteItem = {
        id: item.id,
        title: item.title,
        posterPath: item.posterPath,
        type: item.type,
        voteAverage: item.voteAverage,
        releaseDate: item.releaseDate,
        overview: item.overview,
        addedAt: Date.now(),
      };
      addToFavorites(favItem);
      setFavorites(prev => new Set(prev).add(key));
    }

    // Refresh favorites items
    const favs = getFavorites();
    setFavoriteItems(favs.map(f => ({
      id: f.id,
      title: f.title,
      overview: f.overview,
      posterPath: f.posterPath,
      backdropPath: null,
      releaseDate: f.releaseDate,
      voteAverage: f.voteAverage,
      voteCount: 0,
      type: f.type,
    })));
  }, [favorites]);

  // Retry handler
  const handleRetry = useCallback((sectionId: string) => {
    const allSections = [...HOME_SECTIONS, ...GENRE_SECTIONS, ...ANIME_SECTIONS, ...REGIONAL_SECTIONS];
    const section = allSections.find(s => s.id === sectionId);
    if (section) {
      fetchedSections.current.delete(sectionId);
      fetchSectionData(section);
    }
  }, [fetchSectionData]);

  // Get hero items (trending movies)
  const heroItems = (sectionData['trending-movies'] || []).slice(0, 5);
  const heroLoading = sectionLoading['trending-movies'] && !sectionData['trending-movies'];

  // Render sections based on active view
  const renderContent = () => {
    // Search view
    if (activeSection === 'search') {
      return (
        <SearchResults
          query={searchQuery}
          onItemClick={handleItemClick}
          onFavoriteToggle={handleFavoriteToggle}
          favorites={favorites}
        />
      );
    }

    // Live TV view
    if (activeSection === 'live-tv') {
      return <LiveTVSection />;
    }

    // Continue Watching view
    if (activeSection === 'continue-watching') {
      return (
        <div className="w-full fade-in">
          <div className="px-4 sm:px-6 lg:px-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Continue Watching</h2>
            <p className="text-sm text-muted-foreground">Pick up where you left off</p>
          </div>
          {continueWatchingItems.length > 0 ? (
            <ContentRow
              title="Recently Viewed"
              items={continueWatchingItems}
              onItemClick={handleItemClick}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <svg className="size-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Watch History</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Start watching movies, TV shows, or anime to see them here.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Favorites view
    if (activeSection === 'favorites') {
      return (
        <div className="w-full fade-in">
          <div className="px-4 sm:px-6 lg:px-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">My Favorites</h2>
            <p className="text-sm text-muted-foreground">Your saved movies, shows, and anime</p>
          </div>
          {favoriteItems.length > 0 ? (
            <ContentRow
              title="Saved Items"
              items={favoriteItems}
              onItemClick={handleItemClick}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <svg className="size-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Favorites Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Click the heart icon on any movie, TV show, or anime to save it here.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Home or specific section view
    const sections = getSectionsForView(activeSection);

    return (
      <div className="w-full space-y-8 fade-in">
        {/* Hero Carousel - only on home */}
        {activeSection === 'home' && (
          <div className="px-4 sm:px-6 lg:px-8">
            <HeroCarousel
              items={heroItems}
              loading={heroLoading}
              onItemClick={handleItemClick}
            />
          </div>
        )}

        {/* Continue Watching Row - only on home */}
        {activeSection === 'home' && continueWatchingItems.length > 0 && (
          <ContentRow
            title="Continue Watching"
            items={continueWatchingItems}
            onItemClick={handleItemClick}
            onFavoriteToggle={handleFavoriteToggle}
            favorites={favorites}
          />
        )}

        {/* Dynamic Content Sections */}
        {sections.map(section => (
          <ContentRow
            key={section.id}
            title={section.title}
            items={sectionData[section.id] || []}
            loading={sectionLoading[section.id] || false}
            error={sectionError[section.id] || null}
            onRetry={() => handleRetry(section.id)}
            onItemClick={handleItemClick}
            onFavoriteToggle={handleFavoriteToggle}
            favorites={favorites}
          />
        ))}
      </div>
    );
  };

  // Calculate main content margin based on sidebar
  const mainMarginLeft = sidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px]';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main
        ref={mainRef}
        className={`flex-1 ${mainMarginLeft} transition-all duration-300 pt-4 pb-8`}
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        <div className="flex flex-col min-h-full">
          {/* Content */}
          <div className="flex-1">
            {renderContent()}
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </main>

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        content={selectedContent}
        onFavoriteToggle={handleFavoriteToggle}
        isFavorite={selectedContent ? favorites.has(`${selectedContent.type}-${selectedContent.id}`) : false}
        onSimilarItemClick={handleItemClick}
      />
    </div>
  );
}
