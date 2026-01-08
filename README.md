# Recon - Movie Recommendation App

A modern movie discovery and recommendation platform built with Next.js, featuring personalized recommendations, watchlist management, and a cinematic streaming-style UI.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)

## Features

- 🎬 Browse popular and trending movies from TMDB
- 🔍 Search for movies with real-time results
- 📝 Personal watchlist management
- 🎯 AI-powered movie recommendations
- 🔐 Authentication via Google OAuth or email/password
- 🌙 Dark theme with cinematic UI
- 📱 Fully responsive design

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth & Credentials
- **Database**: Supabase (PostgreSQL)
- **API**: TMDB for movie data
- **Deployment**: Vercel

## Project Structure

```
MovieRec/
├── Recon_v0/          # Next.js frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities and API helpers
│   └── ...
└── backend/           # Flask backend (optional)
    └── app.py
```

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
