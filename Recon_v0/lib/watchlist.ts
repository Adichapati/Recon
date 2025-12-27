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
    
    // Check if movie already exists
    if (watchlist.some(item => item.id === movie.id)) {
      return false // Already in watchlist
    }
    
    const watchlistItem: WatchlistItem = {
      ...movie,
      addedAt: new Date().toISOString()
    }
    
    watchlist.push(watchlistItem)
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist))
    return true
  } catch (error) {
    console.error("[Watchlist] Error adding to watchlist:", error)
    return false
  }
}

export function removeFromWatchlist(movieId: number): boolean {
  if (typeof window === "undefined") return false
  
  try {
    const watchlist = getWatchlist()
    const filtered = watchlist.filter(item => item.id !== movieId)
    
    if (filtered.length === watchlist.length) {
      return false // Movie not found
    }
    
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error("[Watchlist] Error removing from watchlist:", error)
    return false
  }
}

export function isInWatchlist(movieId: number): boolean {
  if (typeof window === "undefined") return false
  
  try {
    const watchlist = getWatchlist()
    return watchlist.some(item => item.id === movieId)
  } catch (error) {
    console.error("[Watchlist] Error checking watchlist:", error)
    return false
  }
}

export function toggleWatchlist(movie: Movie): { added: boolean; message: string } {
  if (isInWatchlist(movie.id)) {
    const removed = removeFromWatchlist(movie.id)
    return {
      added: false,
      message: removed ? "Removed from watchlist" : "Failed to remove from watchlist"
    }
  } else {
    const added = addToWatchlist(movie)
    return {
      added: true,
      message: added ? "Added to watchlist" : "Failed to add to watchlist"
    }
  }
}
