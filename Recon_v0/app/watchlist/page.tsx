"use client"

import { useEffect, useState } from "react"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Button } from "@/components/ui/button"
import { ProtectedLayout } from "@/components/protected-layout"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { getWatchlist, removeFromWatchlist } from "@/lib/watchlist"

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const items = await getWatchlist(true, "watchlist")
        const movies: Movie[] = items.map(({ addedAt: _addedAt, status: _status, ...movie }) => movie)
        setWatchlist(movies)
      } catch (error) {
        console.error("[Watchlist] Error loading watchlist:", error)
        toast({
          title: "Error",
          description: "Failed to load your watchlist.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadWatchlist()
  }, [])

  const handleRemoveFromWatchlist = async (movieId: number, movieTitle: string) => {
    const removed = await removeFromWatchlist(movieId)
    if (!removed) {
      toast({
        title: "Error",
        description: "Failed to remove movie from watchlist.",
        variant: "destructive",
      })
      return
    }

    setWatchlist((prev) => prev.filter((movie) => movie.id !== movieId))
    toast({
      title: "Removed from watchlist",
      description: `${movieTitle} has been removed from your watchlist.`,
    })
  }

  const handleClearWatchlist = async () => {
    if (watchlist.length === 0) return
    
    if (confirm("Are you sure you want to clear your entire watchlist?")) {
      try {
        const items = await getWatchlist(true)
        const results = await Promise.all(items.map((item) => removeFromWatchlist(item.id)))
        if (results.some((ok) => !ok)) {
          throw new Error("Failed to clear some items")
        }
        setWatchlist([])
        toast({
          title: "Watchlist cleared",
          description: "Your watchlist has been cleared.",
        })
      } catch (error) {
        console.error("[Watchlist] Error clearing watchlist:", error)
        toast({
          title: "Error",
          description: "Failed to clear watchlist.",
          variant: "destructive"
        })
      }
    }
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <p className="font-retro text-[10px] uppercase tracking-[0.3em] text-primary/60">// WATCHLIST_MODULE</p>
            <h1 className="font-retro mt-2 text-2xl font-bold uppercase tracking-wider text-foreground">My Queue</h1>
          </div>
          <MovieGridSkeleton count={12} />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-retro text-[10px] uppercase tracking-[0.3em] text-primary/60">// WATCHLIST_MODULE</p>
            <h1 className="font-retro mt-2 text-2xl font-bold uppercase tracking-wider text-foreground">
              My Queue
              {watchlist.length > 0 && (
                <span className="font-retro ml-4 text-sm font-normal text-muted-foreground">
                  [{watchlist.length} {watchlist.length === 1 ? "ENTRY" : "ENTRIES"}]
                </span>
              )}
            </h1>
          </div>
          {watchlist.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearWatchlist}
              className="text-destructive hover:border-destructive hover:text-destructive"
            >
              <span className="font-retro text-xs uppercase tracking-wider">CLEAR ALL</span>
            </Button>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="font-retro mb-4 text-4xl text-primary/20" aria-hidden="true">[ ]</div>
            <h2 className="font-retro mb-2 text-sm uppercase tracking-wider text-foreground">Queue is empty</h2>
            <p className="font-retro mb-8 max-w-md text-xs text-muted-foreground">
              Start adding movies to your watchlist and they&apos;ll appear here. You can add movies from the movie details page or directly from movie cards.
            </p>
            <Button asChild>
              <a href="/home">
                <span className="font-retro text-xs uppercase tracking-wider">BROWSE MOVIES</span>
              </a>
            </Button>
          </div>
        ) : (
          <MovieGrid movies={watchlist} showReason={false} />
        )}
      </div>
    </ProtectedLayout>
  )
}
