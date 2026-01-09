import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import { hasTmdbApiKey, tmdbFetchJson, getTmdbMovieGenreMap } from "@/lib/tmdb-server"
import { extractGenreNames, mapGenreIdsToNames } from "@/lib/genres"
import type { Session } from "next-auth"

export const runtime = "nodejs"

// Map user-friendly genre names to TMDB genre IDs
const GENRE_NAME_TO_ID: Record<string, number> = {
  "Action": 28,
  "Adventure": 12,
  "Animation": 16,
  "Comedy": 35,
  "Crime": 80,
  "Documentary": 99,
  "Drama": 18,
  "Family": 10751,
  "Fantasy": 14,
  "History": 36,
  "Horror": 27,
  "Music": 10402,
  "Mystery": 9648,
  "Romance": 10749,
  "Science Fiction": 878,
  "Thriller": 53,
  "TV Movie": 10770,
  "War": 10752,
  "Western": 37,
}

async function resolveStableUserId(session: Session | null) {
  const email = session?.user?.email ?? null
  const sessionUserId = session?.user?.id ? String(session.user.id) : null

  if (!email && !sessionUserId) {
    return { ok: false as const, error: "Unauthorized", status: 401 as const }
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return { ok: false as const, error: message, status: 500 as const }
  }

  if (email) {
    const { data: existing, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      console.error("[recommendations][resolveUserId] Supabase lookup error", error)
      const msg = String(error.message || "")
      return { ok: false as const, error: msg || "User lookup failed", status: 500 as const }
    }

    if (existing?.id) {
      return { ok: true as const, userId: String(existing.id), supabase }
    }
  }

  if (sessionUserId) {
    return { ok: true as const, userId: sessionUserId, supabase }
  }

  return { ok: false as const, error: "Unauthorized", status: 401 as const }
}

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"

function toTmdbImageUrl(path: string | null | undefined, kind: "poster" | "backdrop"): string {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `${kind === "backdrop" ? TMDB_BACKDROP_BASE_URL : TMDB_POSTER_BASE_URL}${path}`
}

function transformMovie(m: any, genres: string[]) {
  return {
    ...m,
    genres,
    poster_path: toTmdbImageUrl(m?.poster_path, "poster"),
    backdrop_path: toTmdbImageUrl(m?.backdrop_path, "backdrop"),
  }
}

async function fetchPopularFallback() {
  const data = await tmdbFetchJson<any>("/movie/popular", {
    language: "en-US",
    page: 1,
  })

  const genreMap = await getTmdbMovieGenreMap()
  const results = Array.isArray(data?.results)
    ? data.results.map((m: any) => {
        const explicit = extractGenreNames(m?.genres)
        const resolved = explicit.length > 0 ? explicit : mapGenreIdsToNames(m?.genre_ids, genreMap)
        return transformMovie(m, resolved)
      })
    : []

  return results
}

async function fetchDiscoverMovies(genreIds: number[]) {
  const params: Record<string, string | number> = {
    language: "en-US",
    sort_by: "popularity.desc",
    page: 1,
    include_adult: "false",
    include_video: "false",
  }

  if (genreIds.length > 0) {
    params.with_genres = genreIds.join(",")
  }

  const data = await tmdbFetchJson<any>("/discover/movie", params)

  const genreMap = await getTmdbMovieGenreMap()
  const results = Array.isArray(data?.results)
    ? data.results.map((m: any) => {
        const explicit = extractGenreNames(m?.genres)
        const resolved = explicit.length > 0 ? explicit : mapGenreIdsToNames(m?.genre_ids, genreMap)
        return transformMovie(m, resolved)
      })
    : []

  return results
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const resolved = await resolveStableUserId(session)
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status })
    }

    const { supabase, userId } = resolved

    // Fetch user preferences
    const { data: prefs, error: prefsError } = await supabase
      .from("user_preferences")
      .select("genres, moods, era, pacing, popularity, completed")
      .eq("user_id", userId)
      .maybeSingle()

    if (prefsError) {
      console.error("[recommendations] Failed to fetch preferences:", prefsError)
    }

    // Fetch user watchlist for overlap detection
    const { data: watchlist } = await supabase
      .from("watchlist")
      .select("id, title")
      .eq("user_id", userId)

    const watchlistIds = new Set((watchlist || []).map((w: any) => w.id))
    const watchlistTitles = new Map((watchlist || []).map((w: any) => [w.id, w.title]))

    // If no preferences or not completed, fall back to popular movies
    if (!prefs?.completed || !prefs?.genres || prefs.genres.length === 0) {
      const movies = await fetchPopularFallback()
      // Add generic explanations for popular movies
      const moviesWithReasons = movies.map((m: any) => ({
        ...m,
        reason: watchlistIds.has(m.id) 
          ? "Already in your watchlist" 
          : "Trending now",
      }))
      return NextResponse.json({
        results: moviesWithReasons,
        source: "popular",
      })
    }

    // Convert genre names to TMDB IDs
    const genreIds = prefs.genres
      .map((name: string) => GENRE_NAME_TO_ID[name])
      .filter((id: number | undefined): id is number => typeof id === "number")

    // Fetch recommendations from TMDB discover
    const movies = await fetchDiscoverMovies(genreIds)

    // Generate explanations for each movie
    const moviesWithReasons = movies.map((m: any) => {
      const movieGenres: string[] = m.genres || []
      
      // Check for watchlist overlap
      if (watchlistIds.has(m.id)) {
        return { ...m, reason: "Already in your watchlist" }
      }

      // Find matching genres between movie and user preferences
      const matchingGenres = movieGenres.filter((g: string) => 
        prefs.genres.some((pg: string) => pg.toLowerCase() === g.toLowerCase())
      )

      // Build explanation based on matches
      if (matchingGenres.length > 0) {
        const genreList = matchingGenres.slice(0, 2).join(" and ")
        return { ...m, reason: `Because you like ${genreList}` }
      }

      // Fallback explanations based on other preferences
      if (prefs.moods && prefs.moods.length > 0) {
        const mood = prefs.moods[0]
        return { ...m, reason: `Matches your ${mood.toLowerCase()} mood` }
      }

      if (prefs.popularity === "hidden") {
        return { ...m, reason: "A hidden gem for you" }
      }

      if (prefs.popularity === "blockbuster") {
        return { ...m, reason: "Popular pick for you" }
      }

      return { ...m, reason: "Recommended for you" }
    })

    return NextResponse.json({
      results: moviesWithReasons,
      source: "personalized",
    })
  } catch (err) {
    const keyPresent = hasTmdbApiKey()
    const message = err instanceof Error ? err.message : "Failed to fetch recommendations"

    console.error("[recommendations] Error:", err)

    return NextResponse.json(
      { error: message },
      {
        status: keyPresent ? 502 : 500,
      }
    )
  }
}
