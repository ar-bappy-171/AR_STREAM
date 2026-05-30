/**
 * AR-Stream API Configuration
 * 
 * This file centralizes all API configurations.
 * To add a new API provider:
 * 1. Add a new entry to the API_PROVIDERS object
 * 2. Create a corresponding client in /lib/<provider>.ts
 * 3. Add proxy route in /app/api/<provider>/[...path]/route.ts
 */

export const API_PROVIDERS = {
  tmdb: {
    name: 'The Movie Database (TMDB)',
    baseUrl: 'https://api.themoviedb.org/3',
    imageBase: 'https://image.tmdb.org/t/p',
    apiKey: process.env.TMDB_API_KEY || 'fd4ebbc695b3b73c2ed344aea65f0b6b',
    posterSizes: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
    backdropSizes: ['w300', 'w780', 'w1280', 'original'],
    profileSizes: ['w45', 'w185', 'h632', 'original'],
  },
  jikan: {
    name: 'Jikan (MyAnimeList)',
    baseUrl: 'https://api.jikan.moe/v4',
    imageBase: '', // Anime images come with full URLs
    apiKey: '', // Jikan is free, no key needed
  },
  omdb: {
    name: 'OMDb (Open Movie Database)',
    baseUrl: 'https://www.omdbapi.com',
    imageBase: '',
    apiKey: process.env.OMDB_API_KEY || '20ccc009',
  },
} as const;

export type ApiProvider = keyof typeof API_PROVIDERS;

// TMDB Genre IDs
export const TMDB_GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIENCE_FICTION: 878,
  TV_MOVIE: 10770,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
} as const;

// TV Genre IDs
export const TMDB_TV_GENRES = {
  ACTION_ADVENTURE: 10759,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  KIDS: 10762,
  MYSTERY: 9648,
  NEWS: 10763,
  REALITY: 10764,
  SCIENCE_FICTION_FANTASY: 10765,
  SOAP: 10766,
  TALK: 10767,
  WAR_POLITICS: 10768,
  WESTERN: 37,
} as const;

// Helper to build TMDB image URLs
export function getTmdbImageUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-poster.svg';
  return `${API_PROVIDERS.tmdb.imageBase}/${size}${path}`;
}

export function getTmdbBackdropUrl(path: string | null, size: string = 'w1280'): string {
  if (!path) return '/placeholder-backdrop.svg';
  return `${API_PROVIDERS.tmdb.imageBase}/${size}${path}`;
}

// Section definitions for the homepage
export interface SectionConfig {
  id: string;
  title: string;
  type: 'tmdb-movie' | 'tmdb-tv' | 'tmdb-discover-movie' | 'tmdb-discover-tv' | 'jikan-anime' | 'live-tv' | 'continue-watching' | 'favorites';
  params?: Record<string, string>;
  icon?: string;
}

export const HOME_SECTIONS: SectionConfig[] = [
  { id: 'trending-movies', title: 'Trending Movies Today', type: 'tmdb-movie', params: { endpoint: 'trending' } },
  { id: 'trending-tv', title: 'Trending Series Today', type: 'tmdb-tv', params: { endpoint: 'trending' } },
  { id: 'popular-movies', title: 'Popular Now', type: 'tmdb-movie', params: { endpoint: 'popular' } },
  { id: 'top-rated', title: 'Top Rated All Time', type: 'tmdb-movie', params: { endpoint: 'top_rated' } },
  { id: 'now-playing', title: 'Now Playing in Theaters', type: 'tmdb-movie', params: { endpoint: 'now_playing' } },
  { id: 'upcoming', title: 'Upcoming Movies', type: 'tmdb-movie', params: { endpoint: 'upcoming' } },
  { id: 'popular-tv', title: 'Popular TV Shows', type: 'tmdb-tv', params: { endpoint: 'popular' } },
  { id: 'top-rated-tv', title: 'Top Rated TV Shows', type: 'tmdb-tv', params: { endpoint: 'top_rated' } },
];

export const GENRE_SECTIONS: SectionConfig[] = [
  { id: 'action', title: 'Action & Adventure', type: 'tmdb-discover-movie', params: { with_genres: '28,12' } },
  { id: 'sci-fi', title: 'Sci-Fi & Fantasy', type: 'tmdb-discover-movie', params: { with_genres: '878,14' } },
  { id: 'horror', title: 'Horror & Thriller', type: 'tmdb-discover-movie', params: { with_genres: '27,53' } },
  { id: 'comedy', title: 'Comedy', type: 'tmdb-discover-movie', params: { with_genres: '35' } },
  { id: 'romance', title: 'Romance', type: 'tmdb-discover-movie', params: { with_genres: '10749' } },
  { id: 'documentary', title: 'Documentary', type: 'tmdb-discover-movie', params: { with_genres: '99' } },
  { id: 'crime', title: 'Crime & Mystery', type: 'tmdb-discover-movie', params: { with_genres: '80,9648' } },
  { id: 'drama', title: 'Drama', type: 'tmdb-discover-movie', params: { with_genres: '18' } },
];

export const ANIME_SECTIONS: SectionConfig[] = [
  { id: 'anime-airing', title: 'MAL Top Airing Right Now', type: 'jikan-anime', params: { endpoint: 'top', filter: 'airing' } },
  { id: 'anime-alltime', title: 'MAL All-Time Top', type: 'jikan-anime', params: { endpoint: 'top', filter: 'all' } },
  { id: 'anime-popular', title: 'MAL Most Popular', type: 'jikan-anime', params: { endpoint: 'top', filter: 'bypopularity' } },
  { id: 'anime-upcoming', title: 'Upcoming Anime Season', type: 'jikan-anime', params: { endpoint: 'seasons', filter: 'upcoming' } },
];

export const REGIONAL_SECTIONS: SectionConfig[] = [
  { id: 'bollywood', title: 'Bollywood Hits', type: 'tmdb-discover-movie', params: { with_origin_country: 'IN', with_original_language: 'hi', sort_by: 'popularity.desc' } },
  { id: 'k-drama', title: 'K-Drama', type: 'tmdb-discover-tv', params: { with_origin_country: 'KR', with_genres: '18', sort_by: 'popularity.desc' } },
  { id: 'asian-cinema', title: 'Asian Cinema', type: 'tmdb-discover-movie', params: { with_origin_country: 'KR,JP,CN', sort_by: 'popularity.desc' } },
];
