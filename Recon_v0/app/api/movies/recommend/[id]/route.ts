import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"

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
}

const ANALYZE_WATCHLIST_LIMIT = 25
const RECENT_LIMIT = 5
const TOP_GENRES_LIMIT = 5

function backendBaseUrl() {
  return process.env.BACKEND_URL || "http://localhost:5000"
}

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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`)
  }
  return (await res.json()) as T
}

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

  // Always get the base recommendations from the existing Flask route.
  // This keeps the route stable and the logic deterministic.
  let base: BackendRecommendResponse
  try {
    base = await fetchJson<BackendRecommendResponse>(
      `${backendBaseUrl()}/api/movies/recommend/${encodeURIComponent(String(movieId))}`
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch recommendations"
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const baseResults = safeArray<BackendRecommendedMovie>(base.results)

  // If the user isn't signed in, return the base response unchanged.
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ...base, results: baseResults })
  }

  // Fetch watchlist for this user.
  let watchlistRows: WatchlistRow[] = []
  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from("watchlist")
      .select("movie_id, created_at, movie_title")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(ANALYZE_WATCHLIST_LIMIT)

    if (error) throw error
    watchlistRows = (data ?? []) as WatchlistRow[]
  } catch (e) {
    // If Supabase is misconfigured, don't break recommendations.
    // Return base recommendations (still valid for unauth-like behavior).
    console.error("[recommend][watchlist] failed", e)
    return NextResponse.json({ ...base, results: baseResults, warning: "Personalization unavailable" })
  }

  if (watchlistRows.length === 0) {
    return NextResponse.json({ ...base, results: baseResults })
  }

  const watchlistIds = new Set(watchlistRows.map((r) => Number(r.movie_id)).filter(Number.isFinite))

  // Fetch details for watchlist movies (genres), prioritizing the most recent.
  // We use the existing Flask `/api/movies/:id` endpoint so mapping is consistent.
  const watchlistDetails = await mapWithConcurrency(
    watchlistRows.slice(0, ANALYZE_WATCHLIST_LIMIT),
    4,
    async (row) => {
      try {
        return await fetchJson<{ genres?: string[]; title?: string; id?: number }>(
          `${backendBaseUrl()}/api/movies/${encodeURIComponent(String(row.movie_id))}`
        )
      } catch {
        return { id: row.movie_id, title: row.movie_title ?? undefined, genres: [] }
      }
    }
  )

  const recentDetails = watchlistDetails.slice(0, RECENT_LIMIT)

  const genreCounts = buildGenreCounts(watchlistDetails)
  const top = topGenres(genreCounts, TOP_GENRES_LIMIT)
  const maxGenreCount = top[0]?.count ?? 1

  const topGenreSet = new Set(top.map((g) => g.genre))
  const recentSets = recentDetails.map((m) => new Set(safeArray<string>(m.genres).map(normalizeGenre).filter(Boolean) as string[]))

  // Re-rank base results with deterministic boosts.
  // - Genre boost: favors movies matching the user's frequent watchlist genres
  // - Recent similarity: favors movies whose genres overlap with recently added movies
  // Also, remove movies already in the watchlist.
  const reranked = baseResults
    .filter((m) => !watchlistIds.has(Number(m.id)))
    .map((m) => {
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

      const baseScore = typeof m.similarity_score === "number" ? m.similarity_score : 0

      // Keep the existing content-based score as the main driver.
      // Add small, explainable boosts.
      const finalScore = baseScore + 0.15 * genreBoost + 0.15 * recentBoost

      const reasonBits: string[] = []
      if (genreBoost > 0.05) reasonBits.push("Matches your watchlist genres")
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
    },
  })
}
