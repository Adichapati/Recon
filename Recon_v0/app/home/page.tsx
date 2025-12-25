"use client"

import { useEffect, useState } from "react"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { ErrorState } from "@/components/error-state"
import { Separator } from "@/components/ui/separator"
import { getPopularMovies, mockApi, type Movie } from "@/lib/mock-api"

export default function HomePage() {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([])
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([])
  const [isLoadingPopular, setIsLoadingPopular] = useState(true)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [popularError, setPopularError] = useState(false)
  const [trendingError, setTrendingError] = useState(false)

  const fetchPopular = async () => {
    try {
      setIsLoadingPopular(true)
      setPopularError(false)
      const movies = await getPopularMovies()
      setPopularMovies(movies)
    } catch (error) {
      setPopularError(true)
      console.error("[v0] Error fetching popular movies:", error)
    } finally {
      setIsLoadingPopular(false)
    }
  }

  const fetchTrending = async () => {
    try {
      setIsLoadingTrending(true)
      setTrendingError(false)
      // TODO: Replace with real API call to backend
      const movies = await mockApi.getTrending()
      setTrendingMovies(movies)
    } catch (error) {
      setTrendingError(true)
      console.error("[v0] Error fetching trending movies:", error)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  useEffect(() => {
    fetchPopular()
    fetchTrending()
  }, [])

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <section className="mb-12">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Popular Movies</h1>
          <p className="mb-6 text-muted-foreground">Discover the most popular movies right now</p>

          {isLoadingPopular && <MovieGridSkeleton count={20} />}
          {!isLoadingPopular && popularError && (
            <ErrorState
              title="Failed to load popular movies"
              description="We couldn't fetch the popular movies. Please try again."
              onRetry={fetchPopular}
            />
          )}
          {!isLoadingPopular && !popularError && <MovieGrid movies={popularMovies} />}
        </section>

        <Separator className="my-12" />

        <section>
          <h2 className="mb-2 text-3xl font-bold text-foreground">Trending This Week</h2>
          <p className="mb-6 text-muted-foreground">What everyone is watching this week</p>

          {isLoadingTrending && <MovieGridSkeleton count={10} />}
          {!isLoadingTrending && trendingError && (
            <ErrorState
              title="Failed to load trending movies"
              description="We couldn't fetch the trending movies. Please try again."
              onRetry={fetchTrending}
            />
          )}
          {!isLoadingTrending && !trendingError && <MovieGrid movies={trendingMovies} />}
        </section>
      </div>
    </ProtectedLayout>
  )
}
