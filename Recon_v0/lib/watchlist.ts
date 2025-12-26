import type { Movie } from "./mock-api"

const WATCHLIST_KEY = "movie_watchlist"

export interface WatchlistItem extends Movie {
  addedAt: string
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(WATCHLIST_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("[Watchlist] Error reading watchlist:", error)
    return []
  }
}

export function addToWatchlist(movie: Movie): boolean {
  if (typeof window === "undefined") return false

  try {
    const watchlist = getWatchlist()

    if (watchlist.some(item => item.id === movie.id)) {
      return false
    }

    const watchlistItem: WatchlistItem = {
      ...movie,
      addedAt: new Date().toISOString(),
    }

    localStorage.setItem(
      WATCHLIST_KEY,
      JSON.stringify([...watchlist, watchlistItem])
    )

    return true
  } catch (error) {
    console.error("[Watchlist] Error adding:", error)
    return false
  }
}

export function removeFromWatchlist(movieId: number): boolean {
  if (typeof window === "undefined") return false

  try {
    const watchlist = getWatchlist()
    const updated = watchlist.filter(item => item.id !== movieId)

    if (updated.length === watchlist.length) return false

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated))
    return true
  } catch (error) {
    console.error("[Watchlist] Error removing:", error)
    return false
  }
}

export function isInWatchlist(movieId: number): boolean {
  if (typeof window === "undefined") return false

  return getWatchlist().some(item => item.id === movieId)
}

export function toggleWatchlist(movie: Movie): boolean {
  return isInWatchlist(movie.id)
    ? removeFromWatchlist(movie.id)
    : addToWatchlist(movie)
}
