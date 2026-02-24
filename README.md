# Recon - Movie Recommendation App

A modern movie discovery and recommendation platform built with Next.js, featuring personalized recommendations, watchlist management, completed-movie tracking, a Chrome extension for automatic detection, and a cinematic retro-terminal UI.

**Live at [www.sprake.lol](https://www.sprake.lol)**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://www.sprake.lol)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)

## Features

- 🎬 Browse popular and trending movies from TMDB
- 🔍 Search for movies with real-time results
- 📝 Personal watchlist management
- ✅ Mark movies as watched (completed) with separate tracking
- 🎯 Personalized recommendations powered by quiz preferences and watch history
- 📊 Adaptive recommendation engine — quiz influence decays as you watch more movies
- 📈 Viewing Insights on your profile (top genres, influence breakdown)
- ⟳ Recalibrate preferences inline from your profile — no need to redo the full quiz
- 🧩 **Chrome Extension** — automatically detects movies on Netflix, Prime Video, and any streaming site
- 🔑 Token-based extension auth for secure cross-origin syncing
- 🔐 Authentication via Google OAuth or email/password
- 🌙 Dark retro-terminal theme with cinematic UI
- 🤖 Procedural 3D robot mascot on the landing page (Three.js)
- ✨ Ambient floating particle background (instanced mesh)
- 📺 CRT page transition effect on route changes
- 🃏 3D tilt-on-hover movie cards with cursor-following glow
- 📡 Interactive "Signal Lost" 404 page with glitch text & CRT static
- 📊 3D genre radar chart on profile (mouse-tilt interactive)
- 🎞️ CRT poster frame on movie details & VHS tape header on watchlist
- 🎵 Cassette tape loading spinner with animated reels
- 📱 Fully responsive design

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/home` | Personalised homepage with recommendations |
| `/search` | Movie search |
| `/movie/[id]` | Movie details + per-movie recommendations |
| `/watchlist` | Movies saved to watch later |
| `/completed` | Movies you've watched |
| `/profile` | User info, viewing insights, preference recalibration, and extension setup |
| `/onboarding/preferences` | Quiz-based preference setup |
| `/login` | Sign in |
| `/signup` | Create account |

## Recommendation System

Recommendations blend three signals with **adaptive weighting**:

1. **Quiz preferences** — genres, moods, era, pacing, popularity selected during onboarding
2. **Watchlist activity** — genres and recency of saved movies
3. **Completed movies** — strongest signal; movies the user actually watched

### Adaptive Decay Formula

As the user completes more movies, quiz influence decays in favour of watch history:

```
quizWeight     = max(0.30, 1 − completedCount / (completedCount + 10))
completedWeight = 1 − quizWeight
```

| Completed Movies | Quiz Weight | Watch History Weight |
|-----------------|-------------|---------------------|
| 0 | 100% | 0% |
| 5 | 67% | 33% |
| 10 | 50% | 50% |
| 20 | 33% | 67% |
| 50+ | 30% (floor) | 70% |

This is applied consistently across both `/api/movies/recommend/[id]` (per-movie) and `/api/recommendations` (homepage).

## Chrome Extension

The **Recon Chrome Extension** ([GitHub repo](https://github.com/Adichapati/Recon_ext)) automatically detects movies playing on streaming sites and syncs them to your Recon watchlist.

### How it works

1. **Content script** runs on every page and watches for `<video>` elements
2. Platform-specific detection for **Netflix** (URL-based) and **Prime Video** (MutationObserver)
3. **Generic mode** works on any site with a video player (pstream, 123movies, etc.)
4. Extracts the movie title from DOM elements, `aria-label`, or `document.title`
5. Smart title cleaning strips quality tags, site names, and streaming noise
6. Year extraction from meta tags and page text for accurate TMDB matching
7. **Badge indicator** on the extension icon when a movie is detected
8. Popup lets you **Add to Watchlist**, **Mark Completed**, or **Ignore**

### Install

1. Clone the [extension repo](https://github.com/Adichapati/Recon_ext)
2. Open `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select the cloned folder

### Connect to your account

1. Go to your **Profile** page on [sprake.lol](https://www.sprake.lol/profile)
2. Click **Generate Token** under the Chrome Extension section
3. Copy the token
4. Click the Recon extension icon → ⚙ gear → paste token → **Save**

The extension authenticates via `Authorization: Bearer <token>` headers. Tokens are SHA-256 hashed in the database.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **3D / Animation**: Three.js, React Three Fiber, drei, Framer Motion
- **Authentication**: NextAuth.js v5 (beta) with Google OAuth & Credentials
- **Database**: Supabase (PostgreSQL)
- **API**: TMDB for movie data
- **Deployment**: Vercel

## Retro UI System

The app uses a custom retro-terminal design system (`#0b0b0b` background, `#c8a832` amber primary, `#4abfad` teal accent, Geist Mono font).

| Feature | Location | Description |
|---------|----------|-------------|
| Procedural 3D Robot | Landing hero | BMO-inspired mascot with glitch animations, spark particles, and CRT screen — built procedurally in Three.js |
| Ambient Particles | Site-wide | 80 instanced teal/amber dots floating upward with sine-wave motion |
| CRT Page Transition | Site-wide | Screen darkens → squishes to a glowing horizontal line → fades out on route changes |
| 3D Tilt Cards | All movie cards | Cards rotate ±6° toward cursor with perspective transform and radial teal glow |
| Signal Lost 404 | `/not-found` | Canvas noise, scrambling glitch text, red pulsing LED, terminal error log |
| Genre Radar | Profile | Three.js spider chart with amber data polygon, teal wireframe grid, mouse-tilt interaction |
| CRT Poster Frame | Movie detail | Corner brackets, teal glow, NOW PLAYING label, scanline overlay on poster |
| VHS Tape Header | Watchlist | Side colour stripes, decorative reel counter, gradient accent line |
| Cassette Loader | Loading states | Spinning reels with spokes, tape body, "RECON MIX" label above progress bar |
| Typewriter Reveal | Landing hero | Character-by-character heading animation with blinking cursor |

## Project Structure

```
MovieRec/
├── Recon_v0/                    # Next.js frontend
│   ├── app/
│   │   ├── api/
│   │   │   ├── movies/          # TMDB proxy routes (search, trending, popular, recommend)
│   │   │   ├── recommendations/ # Homepage personalised recommendations
│   │   │   ├── watchlist/       # Watchlist CRUD + status management
│   │   │   ├── preferences/     # User quiz preferences
│   │   │   ├── extension/       # Chrome extension endpoints
│   │   │   │   ├── token/       # Generate / revoke API tokens
│   │   │   │   └── watchlist/   # Extension watchlist sync (token auth)
│   │   │   └── signup/          # Account creation
│   │   ├── home/                # Authenticated homepage
│   │   ├── movie/[id]/          # Movie detail page
│   │   ├── search/              # Search page
│   │   ├── watchlist/           # Watchlist page (status = "watchlist")
│   │   ├── completed/           # Completed movies page (status = "completed")
│   │   ├── profile/             # Profile, Viewing Insights, Recalibrate, Extension setup
│   │   ├── onboarding/          # Preference quiz
│   │   ├── login/               # Login page
│   │   └── signup/              # Signup page
│   ├── components/
│   │   ├── retro/               # Retro UI components (3D models, particles, transitions)
│   │   ├── layouts/             # Auth & main layout wrappers
│   │   └── ui/                  # shadcn/ui primitives (Button, Card, etc.)
│   ├── lib/                     # Utilities (watchlist, genres, TMDB, Supabase)
│   └── hooks/                   # Custom hooks (useToast)
├── recon-extension/             # Chrome Extension (MV3)
│   ├── manifest.json            # Extension manifest
│   ├── background.js            # Service worker (sync + badge)
│   ├── content.js               # Content script (video detection)
│   ├── popup.html/css/js        # Extension popup UI
│   └── icon-128.png             # Extension icon
└── backend/                     # Flask backend (optional, legacy)
    └── app.py
```

## Database Schema

The app uses five Supabase tables:

| Table | Key Columns |
|-------|-------------|
| `users` | `id`, `email`, `name`, `image` |
| `user_credentials` | `user_id`, `password_hash` |
| `user_preferences` | `user_id`, `genres`, `moods`, `era`, `pacing`, `popularity`, `completed` |
| `watchlist` | `user_id`, `movie_id`, `movie_title`, `poster_path`, `status`, `created_at` |
| `extension_tokens` | `user_id`, `token_hash`, `created_at` |

The `watchlist.status` column supports `"watchlist"` (default) and `"completed"`.

### Migrations

If upgrading from a version without the `status` column:

```sql
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watchlist';
```

To add Chrome extension token support:

```sql
CREATE TABLE IF NOT EXISTS public.extension_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/movies/popular` | Popular movies |
| GET | `/api/movies/trending` | Trending movies |
| GET | `/api/movies/search?q=` | Search movies |
| GET | `/api/movies/[id]` | Movie details |
| GET | `/api/movies/recommend/[id]` | Per-movie recommendations (adaptive scoring) |
| GET | `/api/recommendations` | Homepage personalised recommendations |
| GET | `/api/watchlist` | User watchlist (supports `?status=` filter) |
| POST | `/api/watchlist` | Add to watchlist |
| PATCH | `/api/watchlist` | Update status (watchlist ↔ completed) |
| DELETE | `/api/watchlist` | Remove from watchlist |
| GET | `/api/preferences` | User quiz preferences |
| POST | `/api/preferences` | Save / recalibrate quiz preferences |
| POST | `/api/signup` | Create account |
| GET | `/api/extension/token` | Check if extension token exists |
| POST | `/api/extension/token` | Generate new extension API token |
| DELETE | `/api/extension/token` | Revoke extension token |
| POST | `/api/extension/watchlist` | Add movie from Chrome extension (token auth) |

## Local Development

### Frontend (Next.js)

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd Recon_v0
   ```
3. Create `.env.local` using `.env.example`
4. Set required environment variables (see below)
5. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

### Backend (Flask — optional)

If you want to run the legacy Flask backend instead of Next.js TMDB routes:

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create `.env` using `.env.example`
3. Set up Python environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```
4. Install dependencies and run:
   ```bash
   pip install -r requirements.txt
   python app.py
   ```
   The API will be available at `http://localhost:5000`

5. Set `BACKEND_URL=http://localhost:5000` in `Recon_v0/.env.local`

## Environment Variables

### Frontend (`Recon_v0/.env.local`)

| Variable | Description |
|----------|-------------|
| `TMDB_API_KEY` | TMDB API key (required for movie data) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXTAUTH_SECRET` | NextAuth.js secret key |
| `NEXTAUTH_URL` | App URL (e.g., `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `BACKEND_URL` | Optional: Flask backend URL |

## Troubleshooting

If PowerShell blocks `npm` due to execution policy, run via cmd:
```bash
cmd /c npm run dev
```

## License

MIT
