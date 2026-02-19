"use client"

import { useEffect, useState } from "react"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Button } from "@/components/ui/button"
import { ProtectedLayout } from "@/components/protected-layout"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { getWatchlist, markAsWatchlist } from "@/lib/watchlist"

export default function CompletedPage() {
  const [completed, setCompleted] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCompleted = async () => {
      try {
        const items = await getWatchlist(true, "completed")
        const movies: Movie[] = items.map(({ addedAt: _addedAt, status: _status, ...movie }) => movie)
        setCompleted(movies)
      } catch (error) {
        console.error("[Completed] Error loading completed movies:", error)
        toast({
          title: "Error",
          description: "Failed to load your completed movies.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCompleted()
  }, [])

  const handleMoveBack = async (movieId: number, movieTitle: string) => {
    const ok = await markAsWatchlist(movieId)
    if (!ok) {
      toast({
        title: "Error",
        description: "Failed to move movie back to watchlist.",
        variant: "destructive",
      })
      return
    }

    setCompleted((prev) => prev.filter((m) => m.id !== movieId))
    toast({
      title: "Moved to watchlist",
      description: `${movieTitle} has been moved back to your watchlist.`,
    })
  }

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-12">
          <p className="font-retro mb-1 text-[10px] uppercase tracking-wider text-primary">// COMPLETED_MODULE</p>
          <h1 className="font-retro mb-8 text-2xl font-bold uppercase tracking-wider text-foreground">Completed</h1>
          <MovieGridSkeleton count={12} />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="font-retro mb-1 text-[10px] uppercase tracking-wider text-primary">// COMPLETED_MODULE</p>
          <h1 className="font-retro text-2xl font-bold uppercase tracking-wider text-foreground">
            Completed
            {completed.length > 0 && (
              <span className="font-retro ml-3 text-sm font-normal tabular-nums text-muted-foreground">
                [{completed.length} {completed.length === 1 ? "ENTRY" : "ENTRIES"}]
              </span>
            )}
          </h1>
        </div>

        {completed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="font-retro mb-4 text-3xl text-muted-foreground/30">[ ]</p>
            <h2 className="font-retro mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">No completed movies yet</h2>
            <p className="font-retro mb-8 max-w-md text-xs text-muted-foreground">
              Movies you mark as watched will appear here. Use the watch action on any movie in your queue.
            </p>
            <Button asChild>
              <a href="/watchlist">
                <span className="font-retro text-xs uppercase tracking-wider">GO TO QUEUE</span>
              </a>
            </Button>
          </div>
        ) : (
          <MovieGrid movies={completed} showReason={false} />
        )}
      </div>
    </ProtectedLayout>
  )
}
