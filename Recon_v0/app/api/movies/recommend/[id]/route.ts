import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import { tmdbFetchJson } from "@/lib/tmdb-server"

export const runtime = "nodejs"

type BackendRecommendedMovie = {
  id: number
  title?: string
  poster_path?: string
  backdrop_path?: string
  release_date?: string
  vote_average?: number
  overview?: string
  genres?: string[]
  genre_ids?: number[]
  similarity_score?: number
  reason?: string
}

type BackendRecommendResponse = {
  results?: BackendRecommendedMovie[]
  original_movie?: { id?: number; title?: string; genres?: string[] }
  warning?: string
  [k: string]: unknown
}

type WatchlistRow = {
  movie_id: number
  created_at?: string
  movie_title?: string | null
  status?: string
}

const ANALYZE_WATCHLIST_LIMIT = 25
const RECENT_LIMIT = 5
const TOP_GENRES_LIMIT = 5

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeGenre(genre: unknown): string | null {
  if (typeof genre !== "string") return null
  const g = genre.trim()
  if (!g) return null
  return g
}

function buildGenreCounts(movies: Array<{ genres?: unknown }>) {
  const counts = new Map<string, number>()
  for (const m of movies) {
    for (const g of safeArray<string>(m.genres).map(normalizeGenre)) {
      if (!g) continue
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
  }
  return counts
}

function topGenres(counts: Map<string, number>, limit: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }))
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const v of a) if (b.has(v)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

type TmdbGenre = { id: number; name: string }
type TmdbGenreListResponse = { genres?: TmdbGenre[] }

type TmdbMovieDetails = {
  id: number
  title?: string
  genres?: Array<{ id?: number; name?: string }>
}

type TmdbRecommendationsResponse = {
  results?: Array<{
    id: number
    title?: string
    poster_path?: string | null
    backdrop_path?: string | null
    release_date?: string
    vote_average?: number
    overview?: string
    genre_ids?: number[]
  }>
}

type TmdbRecommendationMovie = NonNullable<TmdbRecommendationsResponse["results"]>[number]

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (idx < items.length) {
      const current = idx++
      results[current] = await fn(items[current])
    }
  })

  await Promise.all(workers)
  return results
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const movieId = Number(id)
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  // Base recommendations from TMDB (server-side; works on Vercel without Flask).
  let baseResults: BackendRecommendedMovie[] = []
  let originalMovie: BackendRecommendResponse["original_movie"] | undefined
  let genreMap = new Map<number, string>()
  try {
    const [recs, details, genreList] = await Promise.all([
      tmdbFetchJson<TmdbRecommendationsResponse>(`/movie/${encodeURIComponent(String(movieId))}/recommendations`, {
        language: "en-US",
        page: 1,
      }),
      tmdbFetchJson<TmdbMovieDetails>(`/movie/${encodeURIComponent(String(movieId))}`, {
        language: "en-US",
      }),
      tmdbFetchJson<TmdbGenreListResponse>("/genre/movie/list", {
        language: "en-US",
      }),
    ])

    const genres = safeArray<TmdbGenre>(genreList.genres)
    genreMap = new Map(genres.map((g) => [g.id, g.name]))

    originalMovie = {
      id: details?.id,
      title: details?.title,
      genres: safeArray(details?.genres).map((g: any) => String(g?.name ?? "")).filter(Boolean),
    }

    baseResults = safeArray<TmdbRecommendationMovie>(recs.results).map((m) => {
      const genreNames = safeArray<number>(m.genre_ids)
        .map((gid) => genreMap.get(gid))
        .filter(Boolean) as string[]

      return {
        id: m.id,
        title: m.title,
        poster_path: m.poster_path ?? undefined,
        backdrop_path: m.backdrop_path ?? undefined,
        release_date: m.release_date,
        vote_average: m.vote_average,
        overview: m.overview,
        genre_ids: safeArray<number>(m.genre_ids),
        genres: genreNames,
        // Preserve original ordering as a weak prior.
        similarity_score: 0,
      }
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch recommendations"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const base: BackendRecommendResponse = {
    results: baseResults,
    original_movie: originalMovie,
  }

  // If the user isn't signed in, return the base response unchanged.
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ...base, results: baseResults })
  }

  // Fetch watchlist AND completed movies for this user.
  let watchlistRows: WatchlistRow[] = []
  let completedRows: WatchlistRow[] = []
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("watchlist")
      .select("movie_id, created_at, movie_title, status")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(ANALYZE_WATCHLIST_LIMIT * 2)

    if (error) throw error
    const allRows = (data ?? []) as WatchlistRow[]
    watchlistRows = allRows.filter((r) => r.status !== "completed")
    completedRows = allRows.filter((r) => r.status === "completed")
  } catch (e) {
    // If Supabase is misconfigured, don't break recommendations.
    // Return base recommendations (still valid for unauth-like behavior).
    console.error("[recommend][watchlist] failed", e)
    return NextResponse.json({ ...base, results: baseResults, warning: "Personalization unavailable" })
  }

  if (watchlistRows.length === 0 && completedRows.length === 0) {
    return NextResponse.json({ ...base, results: baseResults })
  }

  const watchlistIds = new Set(watchlistRows.map((r) => Number(r.movie_id)).filter(Number.isFinite))
  const completedIds = new Set(completedRows.map((r) => Number(r.movie_id)).filter(Number.isFinite))
  // Exclude both watchlist and completed movies from results
  const excludeIds = new Set([...watchlistIds, ...completedIds])

  // Fetch details for watchlist movies (genres), prioritizing the most recent.
  // Use TMDB directly so this works without Flask.
  const watchlistDetails = await mapWithConcurrency(
    watchlistRows.slice(0, ANALYZE_WATCHLIST_LIMIT),
    4,
    async (row) => {
      try {
        const d = await tmdbFetchJson<any>(`/movie/${encodeURIComponent(String(row.movie_id))}`, {
          language: "en-US",
        })
        return {
          id: d?.id,
          title: d?.title,
          genres: safeArray(d?.genres).map((g: any) => String(g?.name ?? "")).filter(Boolean),
        }
      } catch {
        return { id: row.movie_id, title: row.movie_title ?? undefined, genres: [] }
      }
    }
  )

  // Fetch details for completed movies — these are stronger positive signals.
  const completedDetails = await mapWithConcurrency(
    completedRows.slice(0, ANALYZE_WATCHLIST_LIMIT),
    4,
    async (row) => {
      try {
        const d = await tmdbFetchJson<any>(`/movie/${encodeURIComponent(String(row.movie_id))}`, {
          language: "en-US",
        })
        return {
          id: d?.id,
          title: d?.title,
          genres: safeArray(d?.genres).map((g: any) => String(g?.name ?? "")).filter(Boolean),
        }
      } catch {
        return { id: row.movie_id, title: row.movie_title ?? undefined, genres: [] }
      }
    }
  )

  const recentDetails = watchlistDetails.slice(0, RECENT_LIMIT)

  const genreCounts = buildGenreCounts(watchlistDetails)
  // Merge completed-movie genres into overall genre profile (no manual
  // double-counting — the adaptive weighting below controls emphasis).
  const completedGenreCounts = buildGenreCounts(completedDetails)
  for (const [g, count] of completedGenreCounts) {
    genreCounts.set(g, (genreCounts.get(g) ?? 0) + count)
  }
  const top = topGenres(genreCounts, TOP_GENRES_LIMIT)
  const maxGenreCount = top[0]?.count ?? 1

  const topGenreSet = new Set(top.map((g) => g.genre))
  const recentSets = recentDetails.map((m) => new Set(safeArray<string>(m.genres).map(normalizeGenre).filter(Boolean) as string[]))
  const completedSets = completedDetails.map((m) => new Set(safeArray<string>(m.genres).map(normalizeGenre).filter(Boolean) as string[]))

  // ──────────────────────────────────────────────────────────────────
  // Adaptive weighting: quiz/watchlist influence decays as the user
  // completes more movies. Completed movies are a stronger signal of
  // actual taste than items merely saved to watchlist.
  //
  //   quizWeight     = max(FLOOR, 1 − n / (n + K))
  //   completedWeight = 1 − quizWeight
  //
  // K = 10   → at 10 completed movies, both signals are equally weighted
  // FLOOR = 0.30 → quiz/watchlist influence never drops below 30%
  // ──────────────────────────────────────────────────────────────────
  const QUIZ_FLOOR = 0.30
  const DECAY_K = 10
  const completedCount = completedDetails.length
  const rawQuizWeight = 1 - completedCount / (completedCount + DECAY_K)
  const quizWeight = Math.max(QUIZ_FLOOR, rawQuizWeight)
  const completedWeight = 1 - quizWeight

  // Re-rank base results with deterministic boosts.
  // - Genre boost: favors movies matching the user's frequent watchlist/completed genres
  // - Recent similarity: favors movies whose genres overlap with recently added movies
  // - Completed similarity: favors movies whose genres overlap with watched movies (stronger signal)
  // Also, remove movies already in the watchlist or completed.
  const reranked = baseResults
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => !excludeIds.has(Number(m.id)))
    .map(({ m, idx }) => {
      const genres = safeArray<string>(m.genres).map(normalizeGenre).filter(Boolean) as string[]
      const genreSet = new Set(genres)

      // Genre boost
      let genreBoost = 0
      for (const g of genres) {
        if (!topGenreSet.has(g)) continue
        const count = genreCounts.get(g) ?? 0
        genreBoost += count / maxGenreCount
      }
      // Normalize to 0..1-ish
      genreBoost = Math.min(1, genreBoost / Math.max(1, TOP_GENRES_LIMIT))

      // Recent similarity boost (max Jaccard overlap with any recent movie)
      let recentBoost = 0
      for (const rs of recentSets) {
        recentBoost = Math.max(recentBoost, jaccard(genreSet, rs))
      }

      // Completed similarity boost (max Jaccard overlap with any completed movie)
      let completedBoost = 0
      for (const cs of completedSets) {
        completedBoost = Math.max(completedBoost, jaccard(genreSet, cs))
      }

      // Preserve TMDB ordering as the primary signal.
      // Adaptive weighting scales quiz-derived coefficients (genre, recent)
      // down and completed-derived coefficient up as completedCount grows.
      const baseRankScore = (baseResults.length - idx) / Math.max(1, baseResults.length)
      const finalScore = baseRankScore
        + quizWeight * 0.15 * genreBoost
        + quizWeight * 0.10 * recentBoost
        + completedWeight * 0.25 * completedBoost

      const reasonBits: string[] = []
      if (completedBoost > 0.15) reasonBits.push("Similar to movies you've watched")
      if (genreBoost > 0.05) reasonBits.push("Matches your favorite genres")
      if (recentBoost > 0.15) reasonBits.push("Similar to your recently added movies")

      return {
        ...m,
        similarity_score: finalScore,
        reason: [m.reason, ...reasonBits].filter(Boolean).join("; "),
      }
    })
    .sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0))
    .slice(0, 8)

  return NextResponse.json({
    ...base,
    results: reranked,
    personalization: {
      top_genres: top.map((g) => g.genre),
      recent_count: recentDetails.length,
      completed_count: completedCount,
      quiz_weight: Math.round(quizWeight * 100) / 100,
      completed_weight: Math.round(completedWeight * 100) / 100,
    },
  })
}
