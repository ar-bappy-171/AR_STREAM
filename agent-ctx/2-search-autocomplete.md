# Task 2: Implement Search Autocomplete for AR-Stream

## Summary
Implemented search autocomplete/suggestions that appear as the user types in the search bar, showing movie titles, TV show names, and anime titles grouped by type.

## Files Created
- `src/components/ar-stream/SearchAutocomplete.tsx` - New autocomplete component

## Files Modified
- `src/components/ar-stream/Header.tsx` - Integrated SearchAutocomplete into both desktop and mobile search bars

## Implementation Details

### SearchAutocomplete Component
- **Props**: `searchQuery` (string), `isFocused` (boolean), `onClose` (callback)
- **Data fetching**: Fetches from TMDB search/multi API and Jikan anime API in parallel using `Promise.allSettled` for resilience
- **Debouncing**: 300ms debounce on API calls via `setTimeout` with cleanup
- **Abort controller**: In-flight requests are aborted when a new search is triggered
- **Grouping**: Results grouped by type (Movies, TV Shows, Anime) with headers showing type icons
- **Limits**: Max 3 results per type (max 9 total)
- **Each suggestion shows**: Poster thumbnail (40x40), title (truncated), year, type badge with icon
- **"Search for [query]" option**: At the bottom of the dropdown, triggers full search
- **Empty state**: Shows "No results found" with a clickable search link
- **Loading state**: Spinner with "Searching..." text
- **Glass-morphism styling**: `bg-card/80 backdrop-blur-xl` with border and shadow
- **Animation**: `animate-in fade-in slide-in-from-top-2 duration-200`
- **Keyboard navigation**: Arrow Up/Down to navigate, Enter to select, Escape to close
- **Click outside**: Closes the dropdown
- **Performance**: Uses `useCallback`, `useMemo`, and ref-based debounce/abort patterns

### Header Component Changes
- Added `searchFocused` state to track input focus
- Added `onFocus` handler to both desktop and mobile search inputs
- Added `handleAutocompleteClose` callback
- Forwarded ArrowDown/ArrowUp/Escape keydown events to autocomplete via custom events
- Rendered `SearchAutocomplete` inside both desktop and mobile search containers (positioned absolutely)
- `SearchAutocomplete` is positioned with `absolute top-full` below the search input

### Style
- Uses `text-ars` for accent color
- Uses existing `badge-movie`, `badge-tv`, `badge-anime` classes for type badges
- Uses lucide-react icons: Search, Film, Tv, Sparkles, Loader2
- Responsive: full-width dropdown on all screens
- z-index: 60 (above header z-50)
- Custom scrollbar via `custom-scrollbar` class

### Lint
- Both new and modified files pass ESLint with zero errors
- Pre-existing lint error in `GenreBreakdownChart.tsx` is unrelated
