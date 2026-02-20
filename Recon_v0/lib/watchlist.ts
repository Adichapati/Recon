import type { Movie } from "./mock-api"
import { getTurnstileToken } from "./turnstile-client"

type WatchlistRow = {
  user_id?: string
  movie_id?: number
  movie_title?: string
  poster_path?: string
  created_at?: string
  status?: string
}

export interface WatchlistItem extends Movie {
  addedAt: string
  status: string
}

let cachedItems: WatchlistItem[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5_000

export function clearWatchlistCache() {
  cachedItems = null
  cacheTimestamp = 0
}

function rowToItem(row: WatchlistRow): WatchlistItem | null {
  const id = Number(row.movie_id)
  if (!Number.isFinite(id)) return null

  return {
    id,
    title: row.movie_title ?? "Untitled",
    overview: "",
    poster_path: row.poster_path ?? "",
    backdrop_path: "",
    release_date: "1970-01-01",
    vote_average: 0,
    genres: [],
    addedAt: row.created_at ?? new Date().toISOString(),
    status: row.status ?? "watchlist",
  }
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    let details = ""
    try {
      const body = (await res.json()) as any
      if (body?.error) details = String(body.error)
    } catch {
      try {
        details = await res.text()
      } catch {
        // ignore
      }
    }

    const suffix = details ? ` - ${details}` : ""
    throw new Error(`Watchlist request failed: ${res.status}${suffix}`)
  }
  return res.json() as Promise<T>
}

export async function getWatchlist(forceRefresh = false, status?: "watchlist" | "completed"): Promise<WatchlistItem[]> {
  if (!forceRefresh && !status && cachedItems && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedItems
  }

  const url = status ? `/api/watchlist?status=${status}` : "/api/watchlist"
  const rows = await fetchJson<WatchlistRow[]>(url, {
    method: "GET",
  })

  const items = (Array.isArray(rows) ? rows : [])
    .map(rowToItem)
    .filter(Boolean) as WatchlistItem[]

  // Only update the default cache when fetching without a status filter.
  if (!status) {
    cachedItems = items
    cacheTimestamp = Date.now()
  }
  return items
}

export async function addToWatchlist(movie: Movie): Promise<boolean> {
  try {
    const turnstileToken = await getTurnstileToken().catch(() => "")
    await fetchJson("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        turnstileToken,
      }),
    })

    await getWatchlist(true)
    return true
  } catch (error) {
    console.error("[Watchlist] Error adding to watchlist:", error)
    return false
  }
}

export async function removeFromWatchlist(movieId: number): Promise<boolean> {
  try {
    const turnstileToken = await getTurnstileToken().catch(() => "")
    await fetchJson("/api/watchlist", {
      method: "DELETE",
      body: JSON.stringify({ movieId, turnstileToken }),
    })

    await getWatchlist(true)
    return true
  } catch (error) {
    console.error("[Watchlist] Error removing from watchlist:", error)
    return false
  }
}

export async function isInWatchlist(movieId: number): Promise<boolean> {
  try {
    const list = await getWatchlist(false)
    return list.some((item) => item.id === movieId)
  } catch (error) {
    console.error("[Watchlist] Error checking watchlist:", error)
    return false
  }
}

export async function markAsCompleted(movieId: number): Promise<boolean> {
  try {
    const turnstileToken = await getTurnstileToken().catch(() => "")
    await fetchJson("/api/watchlist", {
      method: "PATCH",
      body: JSON.stringify({ movieId, status: "completed", turnstileToken }),
    })

    clearWatchlistCache()
    return true
  } catch (error) {
    console.error("[Watchlist] Error marking as completed:", error)
    return false
  }
}

export async function markAsWatchlist(movieId: number): Promise<boolean> {
  try {
    const turnstileToken = await getTurnstileToken().catch(() => "")
    await fetchJson("/api/watchlist", {
      method: "PATCH",
      body: JSON.stringify({ movieId, status: "watchlist", turnstileToken }),
    })

    clearWatchlistCache()
    return true
  } catch (error) {
    console.error("[Watchlist] Error marking as watchlist:", error)
    return false
  }
}

export async function toggleWatchlist(movie: Movie): Promise<{ added: boolean; message: string }> {
  if (await isInWatchlist(movie.id)) {
    const removed = await removeFromWatchlist(movie.id)
    return {
      added: false,
      message: removed ? "Removed from watchlist" : "Failed to remove from watchlist",
    }
  }

  const added = await addToWatchlist(movie)
  return {
    added: true,
    message: added ? "Added to watchlist" : "Failed to add to watchlist",
  }
}
