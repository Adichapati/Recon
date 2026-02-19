"use client"

import { useEffect, useState } from "react"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
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
          <h1 className="mb-8 text-4xl font-bold text-foreground">My Watchlist</h1>
          <MovieGridSkeleton count={12} />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">
            My Watchlist
            {watchlist.length > 0 && (
              <span className="ml-4 text-2xl font-normal text-muted-foreground">
                ({watchlist.length} {watchlist.length === 1 ? "movie" : "movies"})
              </span>
            )}
          </h1>
          {watchlist.length > 0 && (
            <Button
              variant="outline"
              onClick={handleClearWatchlist}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="mr-2 size-4" />
              Clear All
            </Button>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 rounded-full bg-muted p-6">
              <Trash2 className="size-12 text-muted-foreground" />
            </div>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Your watchlist is empty</h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Start adding movies to your watchlist and they'll appear here. You can add movies from the movie details page or directly from movie cards.
            </p>
            <Button asChild>
              <a href="/">Browse Movies</a>
            </Button>
          </div>
        ) : (
          <MovieGrid movies={watchlist} showReason={false} />
        )}
      </div>
    </ProtectedLayout>
  )
}
