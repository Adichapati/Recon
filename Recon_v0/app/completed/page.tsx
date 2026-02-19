"use client"

import { useEffect, useState } from "react"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
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
          <h1 className="mb-8 text-4xl font-bold text-foreground">Completed</h1>
          <MovieGridSkeleton count={12} />
        </div>
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Completed
            {completed.length > 0 && (
              <span className="ml-4 text-2xl font-normal text-muted-foreground">
                ({completed.length} {completed.length === 1 ? "movie" : "movies"})
              </span>
            )}
          </h1>
        </div>

        {completed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 rounded-full bg-muted p-6">
              <Eye className="size-12 text-muted-foreground" />
            </div>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">No completed movies yet</h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Movies you mark as watched will appear here. Use the eye icon on any movie in your watchlist to mark it as completed.
            </p>
            <Button asChild>
              <a href="/watchlist">Go to Watchlist</a>
            </Button>
          </div>
        ) : (
          <MovieGrid movies={completed} showReason={false} />
        )}
      </div>
    </ProtectedLayout>
  )
}
