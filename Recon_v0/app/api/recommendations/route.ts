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

    // Fetch user watchlist + completed movies for overlap detection and boosting
    const { data: watchlist } = await supabase
      .from("watchlist")
      .select("movie_id, movie_title, status")
      .eq("user_id", userId)

    const allWatchlistRows = watchlist || []
    const watchlistIds = new Set(allWatchlistRows.map((w: any) => Number(w.movie_id)))
    const completedIds = new Set(
      allWatchlistRows.filter((w: any) => w.status === "completed").map((w: any) => Number(w.movie_id))
    )
    const completedTitles = new Map(
      allWatchlistRows.filter((w: any) => w.status === "completed").map((w: any) => [Number(w.movie_id), w.movie_title])
    )

    // Use completed movies to enrich genre preferences
    let completedGenreIds: number[] = []
    if (completedIds.size > 0) {
      const genreMap = await getTmdbMovieGenreMap()
      const movieDetailsPromises = Array.from(completedIds).slice(0, 15).map(async (movieId) => {
        try {
          const d = await tmdbFetchJson<any>(`/movie/${movieId}`, { language: "en-US" })
          return extractGenreNames(d?.genres)
        } catch {
          return []
        }
      })
      const completedGenreArrays = await Promise.all(movieDetailsPromises)
      const completedGenreNames = new Set(completedGenreArrays.flat())
      completedGenreIds = Array.from(completedGenreNames)
        .map((name) => GENRE_NAME_TO_ID[name])
        .filter((id): id is number => typeof id === "number")
    }

    // ────────────────────────────────────────────────────────────────
    // Adaptive weighting: quiz preferences decay as the number of
    // completed movies grows. Completed movies are an explicit
    // positive signal of actual taste.
    //
    //   quizWeight     = max(FLOOR, 1 − n / (n + K))
    //   completedWeight = 1 − quizWeight
    //
    // K = 10   → equal weight at 10 completed movies
    // FLOOR = 0.30 → quiz never drops below 30%
    // ────────────────────────────────────────────────────────────────
    const QUIZ_FLOOR = 0.30
    const DECAY_K = 10
    const completedCount = completedIds.size
    const rawQuizWeight = 1 - completedCount / (completedCount + DECAY_K)
    const quizWeight = Math.max(QUIZ_FLOOR, rawQuizWeight)
    const completedWeight = 1 - quizWeight

    // If no preferences or not completed, try completed-movie genres before falling back
    if (!prefs?.completed || !prefs?.genres || prefs.genres.length === 0) {
      if (completedGenreIds.length > 0) {
        // Use completed movie genres as a preference signal
        const movies = await fetchDiscoverMovies(completedGenreIds)
        const moviesWithReasons = movies
          .filter((m: any) => !completedIds.has(Number(m.id)))
          .map((m: any) => ({
            ...m,
            reason: watchlistIds.has(Number(m.id))
              ? "Already in your watchlist"
              : "Based on movies you've watched",
          }))
        return NextResponse.json({
          results: moviesWithReasons,
          source: "completed-based",
          personalization: {
            quiz_weight: Math.round(quizWeight * 100) / 100,
            completed_weight: Math.round(completedWeight * 100) / 100,
            completed_count: completedCount,
          },
        })
      }

      const movies = await fetchPopularFallback()
      const moviesWithReasons = movies
        .filter((m: any) => !completedIds.has(Number(m.id)))
        .map((m: any) => ({
          ...m,
          reason: watchlistIds.has(Number(m.id)) 
            ? "Already in your watchlist" 
            : "Trending now",
        }))
      return NextResponse.json({
        results: moviesWithReasons,
        source: "popular",
        personalization: {
          quiz_weight: Math.round(quizWeight * 100) / 100,
          completed_weight: Math.round(completedWeight * 100) / 100,
          completed_count: completedCount,
        },
      })
    }

    // Convert genre names to TMDB IDs, then blend with completed-movie
    // genres proportionally based on adaptive weights.
    const prefGenreIds = prefs.genres
      .map((name: string) => GENRE_NAME_TO_ID[name])
      .filter((id: number | undefined): id is number => typeof id === "number")
    
    // Weighted genre blending: allocate slots proportionally so quiz
    // genres dominate early on, completed-movie genres take over later.
    // Cap total to avoid over-constraining the AND-based TMDB query.
    const MAX_DISCOVER_GENRES = 4
    const quizSlots = Math.max(1, Math.round(MAX_DISCOVER_GENRES * quizWeight))
    const completedSlots = MAX_DISCOVER_GENRES - quizSlots
    const quizSelection = prefGenreIds.slice(0, quizSlots)
    const usedQuizSet = new Set(quizSelection)
    const completedSelection = completedGenreIds
      .filter((id) => !usedQuizSet.has(id))
      .slice(0, completedSlots)
    const genreIds = [...quizSelection, ...completedSelection]

    // Fetch recommendations from TMDB discover
    const movies = await fetchDiscoverMovies(genreIds)

    // Generate explanations for each movie, excluding completed movies from results
    const moviesWithReasons = movies
      .filter((m: any) => !completedIds.has(Number(m.id)))
      .map((m: any) => {
        const movieGenres: string[] = m.genres || []
        
        // Check for watchlist overlap
        if (watchlistIds.has(Number(m.id))) {
          return { ...m, reason: "Already in your watchlist" }
        }

        // Check if movie matches completed-movie genres (stronger signal)
        const matchesCompleted = completedGenreIds.some((gid) => {
          const genreName = Object.entries(GENRE_NAME_TO_ID).find(([, id]) => id === gid)?.[0]
          return genreName && movieGenres.some((g: string) => g.toLowerCase() === genreName.toLowerCase())
        })

        // Find matching genres between movie and user preferences
        const matchingGenres = movieGenres.filter((g: string) => 
          prefs.genres.some((pg: string) => pg.toLowerCase() === g.toLowerCase())
        )

        // Build explanation based on matches — prioritize the dominant signal
        if (matchesCompleted && matchingGenres.length > 0) {
          // Both signals match; lead with whichever is dominant
          return completedWeight >= quizWeight
            ? { ...m, reason: "Similar to movies you've watched" }
            : { ...m, reason: `Because you like ${matchingGenres.slice(0, 2).join(" and ")}` }
        }

        if (matchesCompleted) {
          return { ...m, reason: "Based on movies you've watched" }
        }

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
      personalization: {
        quiz_weight: Math.round(quizWeight * 100) / 100,
        completed_weight: Math.round(completedWeight * 100) / 100,
        completed_count: completedCount,
      },
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
