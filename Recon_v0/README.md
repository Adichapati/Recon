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

## Local Development

### Frontend (Next.js)

1. Clone the repository
2. Create `.env.local` using `.env.example`
3. Set `TMDB_API_KEY` in `.env.local`
4. Make sure `BACKEND_URL` is blank/removed (so Next serves `/api/movies/*` itself)
5. Install and run:
	- `npm install`
	- `npm run dev` (runs on `http://localhost:3000`)

Backend (Flask — optional):

If you want to run the legacy Flask backend instead of Next.js TMDB routes:

1. Create `backend/.env` using `backend/.env.example`
2. From the repo root:
	- `cd backend`
	- `python -m venv .venv`
	- Activate venv
	- `pip install -r requirements.txt`
	- `python app.py` (runs on `http://localhost:5000`)
3. Set `BACKEND_URL=http://localhost:5000` in `Recon_v0/.env.local`

Note: if PowerShell blocks `npm` due to execution policy, run via `cmd`:

- `cmd /c npm run dev`

Environment variables (frontend):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `TMDB_API_KEY` (server-only; required for real TMDB data)
- `BACKEND_URL` (optional; if set, proxies `/api/movies/*` to Flask)

Supabase:

- Public (safe to expose to the browser): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Server-only (required for watchlist + user sync writes): `SUPABASE_SERVICE_ROLE_KEY`
