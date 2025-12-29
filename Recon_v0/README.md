# Movie recommendation UI

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/adithyarajkanayamkott-5244s-projects/v0-movie-recommendation-ui)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/cS00Ml854Ln)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/adithyarajkanayamkott-5244s-projects/v0-movie-recommendation-ui](https://vercel.com/adithyarajkanayamkott-5244s-projects/v0-movie-recommendation-ui)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/cS00Ml854Ln](https://v0.app/chat/cS00Ml854Ln)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Local development

Frontend (Next.js, TMDB-only — default):

1. Create `Recon_v0/.env.local` using `Recon_v0/.env.example`
2. Set `TMDB_API_KEY` in `Recon_v0/.env.local`
3. Make sure `BACKEND_URL` is blank/removed (so Next serves `/api/movies/*` itself)
4. From `Recon_v0/`:
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
