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
        {/* VHS-style tape header */}
        <div className="relative mb-10 overflow-hidden border border-border/30 bg-card/50 px-6 py-5">
          {/* Left colour stripe (VHS side label) */}
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary/80 via-primary/40 to-primary/80" />
          {/* Right colour stripe */}
          <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-primary/60 via-primary/20 to-primary/60" />

          <div className="flex items-end justify-between">
            <div className="pl-4">
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

            <div className="flex items-center gap-4">
              {/* Decorative tape counter */}
              <div className="font-retro hidden items-center gap-2 text-[10px] tracking-wider text-muted-foreground/50 sm:flex">
                <span className="inline-block h-3 w-3 rounded-full border border-primary/30" />
                <span>REC</span>
                <span className="tabular-nums text-primary/40">{String(watchlist.length).padStart(4, "0")}</span>
                <span className="inline-block h-3 w-3 rounded-full border border-primary/30" />
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
          </div>

          {/* Bottom tape stripe (thin scanline accent) */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
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
