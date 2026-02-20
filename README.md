# Recon - Movie Recommendation App

A modern movie discovery and recommendation platform built with Next.js, featuring personalized recommendations, watchlist management, completed-movie tracking, and a cinematic streaming-style UI.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
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
- 🔐 Authentication via Google OAuth or email/password
- 🌙 Dark theme with cinematic UI
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
| `/profile` | User info, viewing insights, and watchlist overview |
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

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Authentication**: NextAuth.js v5 (beta) with Google OAuth & Credentials
- **Database**: Supabase (PostgreSQL)
- **API**: TMDB for movie data
- **Deployment**: Vercel

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
│   │   │   └── signup/          # Account creation
│   │   ├── home/                # Authenticated homepage
│   │   ├── movie/[id]/          # Movie detail page
│   │   ├── search/              # Search page
│   │   ├── watchlist/           # Watchlist page (status = "watchlist")
│   │   ├── completed/           # Completed movies page (status = "completed")
│   │   ├── profile/             # Profile + Viewing Insights
│   │   ├── onboarding/          # Preference quiz
│   │   ├── login/               # Login page
│   │   └── signup/              # Signup page
│   ├── components/              # React components (MovieCard, Navbar, etc.)
│   ├── lib/                     # Utilities (watchlist, genres, TMDB, Supabase)
│   └── hooks/                   # Custom hooks (useToast)
└── backend/                     # Flask backend (optional)
    └── app.py
```

## Database Schema

The app uses four Supabase tables:

| Table | Key Columns |
|-------|-------------|
| `users` | `id`, `email`, `name`, `image` |
| `user_credentials` | `user_id`, `password_hash` |
| `user_preferences` | `user_id`, `genres`, `moods`, `era`, `pacing`, `popularity`, `completed` |
| `watchlist` | `user_id`, `movie_id`, `movie_title`, `poster_path`, `status`, `created_at` |

The `watchlist.status` column supports `"watchlist"` (default) and `"completed"`.

### Migration

If upgrading from a version without the `status` column:

```sql
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'watchlist';
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
| POST | `/api/preferences` | Save quiz preferences |
| POST | `/api/signup` | Create account |

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
