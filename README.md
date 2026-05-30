# AR-Stream - Movies, TV Shows & Anime Streaming Aggregator

A production-ready movie/TV/anime streaming aggregator built with Next.js 16, TypeScript, Tailwind CSS 4, and shadcn/ui.

## 🚀 Deploy to Vercel (Easiest Method)

### Method 1: One-Click Deploy (Fastest)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ar-stream&env=TMDB_API_KEY)

### Method 2: Deploy via Vercel CLI

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Navigate to your project
cd ar-stream

# 4. Deploy (follow the prompts)
vercel

# 5. Deploy to production
vercel --prod
```

### Method 3: Deploy via GitHub + Vercel Dashboard

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - AR-Stream"
   git remote add origin https://github.com/YOUR_USERNAME/ar-stream.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **"Import Git Repository"**
   - Select your GitHub repo
   - Configure environment variables (see below)
   - Click **"Deploy"**

## 🔑 Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `TMDB_API_KEY` | `fd4ebbc695b3b73c2ed344aea65f0b6b` | ✅ Yes |

### How to add environment variables on Vercel:
1. Go to your project dashboard on Vercel
2. Click **Settings** → **Environment Variables**
3. Add `TMDB_API_KEY` with your key
4. Click **Save**
5. Redeploy (Deployments → Latest → ⋯ → Redeploy)

## 📁 Project Structure

```
ar-stream/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with dark mode
│   │   ├── page.tsx            # Main page (all sections)
│   │   ├── globals.css         # Global styles + dark mode
│   │   └── api/
│   │       ├── tmdb/[...path]/ # TMDB API proxy
│   │       └── jikan/[...path]/# Jikan API proxy
│   ├── components/ar-stream/
│   │   ├── Header.tsx          # Search, theme toggle, nav
│   │   ├── Sidebar.tsx         # Collapsible navigation
│   │   ├── HeroCarousel.tsx    # Featured content carousel
│   │   ├── ContentCard.tsx     # Movie/TV/Anime card
│   │   ├── ContentRow.tsx      # Horizontal scroll row
│   │   ├── DetailModal.tsx     # Full detail modal
│   │   ├── SearchResults.tsx   # Multi-source search
│   │   ├── LiveTVSection.tsx   # Mock TV channels
│   │   └── Footer.tsx          # Branding + attribution
│   └── lib/
│       ├── api-config.ts       # API configuration (extensible)
│       ├── storage.ts          # localStorage utilities
│       └── store.ts            # Zustand state management
├── next.config.ts
├── vercel.json
├── .env.example
└── package.json
```

## 🎬 Features

- **20+ Content Sections** - Trending, Popular, Top Rated, Genre rows
- **Anime Integration** - MAL/Jikan API for anime data
- **Regional Content** - Bollywood & K-Drama sections
- **Search** - Multi-source with filters (Movies, TV, Anime)
- **Detail Modal** - Cast, trailer, similar content
- **Dark/Light Mode** - Smooth theme switching
- **Favorites** - Saved to localStorage
- **Continue Watching** - Tracks viewed content
- **Live TV** - Mock channel section
- **Responsive** - Mobile-first design

## 🔧 Adding New APIs

1. Add config to `src/lib/api-config.ts` → `API_PROVIDERS`
2. Create proxy route at `src/app/api/<provider>/[...path]/route.ts`
3. Add section configs to the section arrays
4. Add mapper function in `page.tsx`

## 📝 Local Development

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Run development server
npm run dev

# Open http://localhost:3000
```

## ⚠️ Disclaimer

This project is for **educational and personal use only**. We do not host any streams. All content data is sourced from third-party APIs (TMDB, Jikan/MAL).
