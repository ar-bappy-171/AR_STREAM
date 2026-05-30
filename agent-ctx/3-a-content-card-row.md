# Task 3-a: ContentCard & ContentRow Components

## Work Record

**Agent**: ContentCard & ContentRow Builder
**Task ID**: 3-a
**Date**: 2026-03-04

### What was done

1. **Created `/home/z/my-project/src/components/ar-stream/ContentCard.tsx`**
   - `'use client'` component with full `ContentCardProps` interface
   - Imports `ContentItem` from `@/lib/store`
   - Poster image using `next/image` with TMDB base URL construction (`https://image.tmdb.org/t/p/w500${posterPath}`), full URL support for anime
   - Fallback to `/placeholder-poster.svg` on missing posterPath or image load error
   - `aspect-[2/3]` poster container with responsive widths (155px/170px/185px)
   - Title truncated with `line-clamp-2`
   - Year extracted from `releaseDate`
   - Rating displayed with `Star` icon + `voteAverage.toFixed(1)`
   - Type badge in top-right corner using CSS classes `badge-movie`, `badge-tv`, `badge-anime`
   - Hover overlay with `Play` button (opacity transition via `card-overlay` CSS class)
   - Heart icon for favorites (filled red if favorited, outline white if not)
   - `stopPropagation` on heart click to prevent card click
   - `skeleton-pulse` CSS class for loading skeleton variant (`ContentCardSkeleton`)
   - Lazy image loading with `loading="lazy"`
   - Uses `content-card` CSS class for hover scale/shadow effects

2. **Created `/home/z/my-project/src/components/ar-stream/ContentRow.tsx`**
   - `'use client'` component with full `ContentRowProps` interface
   - Section title on left, "See All" button on right
   - Horizontally scrollable container using `content-row-scroll` and `hide-scrollbar` CSS classes
   - Left/right scroll arrows with `ChevronLeft`/`ChevronRight` icons
   - Arrows visible on hover (desktop), hidden by default with gradient fade edges
   - Smooth scroll by ~800px using `useRef` and `scrollBy`
   - Scrollability detection via `ResizeObserver` + scroll event listener
   - Loading state: 8 `ContentCardSkeleton` cards
   - Error state: error message + `RefreshCw` retry button
   - Empty state: `Film` icon + "No content available" message
   - Favorite check via `favorites` Set using `type-id` key format
   - Responsive layout with consistent card sizing

### Files Created
- `src/components/ar-stream/ContentCard.tsx`
- `src/components/ar-stream/ContentRow.tsx`

### Lint Status
- ✅ ESLint passed with no errors

### Dev Server
- ✅ Compiling successfully
