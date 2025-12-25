"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import { Star, Clock, Calendar, Plus } from "lucide-react"
import { ProtectedLayout } from "@/components/protected-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { MovieDetailsSkeleton } from "@/components/movie-details-skeleton"
import { ErrorState } from "@/components/error-state"
import { mockApi, type Movie } from "@/lib/mock-api"
import { toast } from "@/hooks/use-toast"

export default function MovieDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [recommended, setRecommended] = useState<Movie[]>([])
  const [isLoadingMovie, setIsLoadingMovie] = useState(true)
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true)
  const [movieError, setMovieError] = useState(false)
  const [recommendedError, setRecommendedError] = useState(false)

  const fetchMovie = async () => {
    try {
      setIsLoadingMovie(true)
      setMovieError(false)
      // TODO: Replace with real API call to backend
      const data = await mockApi.getById(Number(id))
      setMovie(data)
    } catch (error) {
      setMovieError(true)
      console.error("[v0] Error fetching movie details:", error)
    } finally {
      setIsLoadingMovie(false)
    }
  }

  const fetchRecommended = async () => {
    try {
      setIsLoadingRecommended(true)
      setRecommendedError(false)
      // TODO: Replace with real API call to backend
      const data = await mockApi.getRecommended(Number(id))
      setRecommended(data)
    } catch (error) {
      setRecommendedError(true)
      console.error("[v0] Error fetching recommendations:", error)
    } finally {
      setIsLoadingRecommended(false)
    }
  }

  useEffect(() => {
    fetchMovie()
    fetchRecommended()
  }, [id])

  const handleAddToWatchlist = () => {
    // TODO: Connect to real backend API
    toast({
      title: "Added to Watchlist",
      description: `${movie?.title} has been added to your watchlist.`,
    })
  }

  if (isLoadingMovie) {
    return (
      <ProtectedLayout>
        <MovieDetailsSkeleton />
      </ProtectedLayout>
    )
  }

  if (movieError || !movie) {
    return (
      <ProtectedLayout>
        <ErrorState
          title="Failed to load movie details"
          description="We couldn't load the movie information. Please try again."
          onRetry={fetchMovie}
        />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen">
        <div className="relative h-[60vh] overflow-hidden">
          <Image
            src={movie.backdrop_path || "/placeholder.svg"}
            alt={movie.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0">
            <div className="container mx-auto px-4 pb-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-end">
                <div className="relative aspect-[2/3] w-48 shrink-0 overflow-hidden rounded-lg shadow-2xl">
                  <Image
                    src={movie.poster_path || "/placeholder.svg"}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">{movie.title}</h1>

                  <div className="mb-4 flex flex-wrap items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="size-5 fill-primary text-primary" aria-hidden="true" />
                      <span className="text-lg font-semibold text-foreground">{movie.vote_average.toFixed(1)}</span>
                      <span className="text-sm">/10</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="size-4" aria-hidden="true" />
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-4" aria-hidden="true" />
                      <span>2h 15m</span>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {movie.genres.map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>

                  <Button size="lg" onClick={handleAddToWatchlist} aria-label={`Add ${movie.title} to watchlist`}>
                    <Plus className="mr-2 size-5" aria-hidden="true" />
                    Add to Watchlist
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Overview</h2>
            <p className="max-w-4xl text-lg leading-relaxed text-muted-foreground">{movie.overview}</p>
          </div>

          <Separator className="my-12" />

          <section>
            <h2 className="mb-6 text-2xl font-bold text-foreground">Recommended for You</h2>
            {isLoadingRecommended && <MovieGridSkeleton count={6} />}
            {!isLoadingRecommended && recommendedError && (
              <ErrorState
                title="Failed to load recommendations"
                description="We couldn't fetch movie recommendations. Please try again."
                onRetry={fetchRecommended}
              />
            )}
            {!isLoadingRecommended && !recommendedError && <MovieGrid movies={recommended} />}
          </section>
        </div>
      </div>
    </ProtectedLayout>
  )
}
