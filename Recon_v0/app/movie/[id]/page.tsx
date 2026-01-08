"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import { Star, Clock, Calendar, Plus, Check } from "lucide-react"
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
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist"
import { extractGenreNames } from "@/lib/genres"

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original"

function toTmdbUrl(path: unknown, kind: "poster" | "backdrop") {
  if (!path || typeof path !== "string") return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${kind === "backdrop" ? TMDB_BACKDROP_BASE_URL : TMDB_POSTER_BASE_URL}${normalized}`
}

export default function MovieDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [recommended, setRecommended] = useState<Movie[]>([])
  const [isLoadingMovie, setIsLoadingMovie] = useState(true)
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true)
  const [movieError, setMovieError] = useState(false)
  const [recommendedError, setRecommendedError] = useState(false)
  const [isInWatchlistState, setIsInWatchlistState] = useState(false)

  const fetchMovie = async (maybeSignal?: unknown) => {
    try {
      setIsLoadingMovie(true)
      setMovieError(false)

      // `fetchMovie` is also used as a retry handler. Some button components
      // call it with a click event, so we must guard against non-AbortSignal values.
      const signal =
        typeof maybeSignal === "object" &&
        maybeSignal !== null &&
        "aborted" in (maybeSignal as any) &&
        typeof (maybeSignal as any).addEventListener === "function"
          ? (maybeSignal as AbortSignal)
          : undefined

      const response = await fetch(`/api/movies/${encodeURIComponent(id)}`, {
        cache: "no-store",
        ...(signal ? { signal } : {}),
      })

      if (!response.ok) {
        setMovie(null)
        setMovieError(true)
        return
      }

      const raw = (await response.json()) as any
      const normalized: Movie = {
        id: Number(raw?.id),
        title: String(raw?.title ?? "Untitled"),
        overview: String(raw?.overview ?? ""),
        poster_path: toTmdbUrl(raw?.poster_path, "poster"),
        backdrop_path: toTmdbUrl(raw?.backdrop_path, "backdrop"),
        release_date: String(raw?.release_date ?? "1970-01-01"),
        vote_average:
          typeof raw?.vote_average === "number"
            ? raw.vote_average
            : Number(raw?.vote_average ?? 0) || 0,
        // TMDB details returns `genres: [{ id, name }]`. If we `String(g)` we get "[object Object]".
        genres: extractGenreNames(raw?.genres),
      }

      if (!Number.isFinite(normalized.id)) {
        setMovie(null)
        setMovieError(true)
        return
      }

      setMovie(normalized)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
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

      const response = await fetch(`/api/movies/recommend/${encodeURIComponent(id)}`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations")
      }

      const data = await response.json()
      // Map the API response to match the Movie type
      const results = Array.isArray(data?.results) ? (data.results as any[]) : []
      const recommendedMovies: Movie[] = results
        .filter((m) => m && typeof m === "object")
        .map((m) => ({
          id: Number(m.id),
          title: String(m.title ?? "Untitled"),
          overview: String(m.overview ?? ""),
          poster_path: toTmdbUrl(m.poster_path, "poster"),
          backdrop_path: toTmdbUrl(m.backdrop_path, "backdrop"),
          release_date: String(m.release_date ?? "1970-01-01"),
          vote_average: typeof m.vote_average === "number" ? m.vote_average : Number(m.vote_average ?? 0) || 0,
          genres: extractGenreNames(m.genres),
        }))
        .filter((m) => Number.isFinite(m.id))
      
      setRecommended(recommendedMovies)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      setRecommendedError(true)
      console.error("[v0] Error fetching recommendations:", error)
    } finally {
      setIsLoadingRecommended(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchMovie(controller.signal)
    fetchRecommended()
    return () => controller.abort()
  }, [id])
  
  useEffect(() => {
    if (movie) {
      isInWatchlist(movie.id).then(setIsInWatchlistState)
    }
  }, [movie])

  const handleWatchlistToggle = () => {
    if (!movie) return
    toggleWatchlist(movie).then((result) => {
      setIsInWatchlistState(result.added)
      toast({
        title: result.message,
        description: `${movie.title} ${result.added ? "added to" : "removed from"} your watchlist.`,
      })
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
          onRetry={() => fetchMovie()}
        />
      </ProtectedLayout>
    )
  }

  const ratingText = Number.isFinite(movie.vote_average) ? movie.vote_average.toFixed(1) : "0.0"
  const releaseYear = (() => {
    const d = new Date(movie.release_date)
    const y = d.getFullYear()
    return Number.isFinite(y) ? String(y) : "Unknown"
  })()

  return (
    <ProtectedLayout>
      <div className="min-h-screen">
        {/* Full-bleed (100vw) cinematic hero like the home banner */}
        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden">
          <div className="relative aspect-video w-full max-h-[600px]">
            <Image
              src={movie.backdrop_path || "/placeholder.svg"}
              alt={movie.title}
              fill
              className="object-cover object-top"
              priority
              quality={100}
              unoptimized
            />
            {/* Smooth cinematic overlays */}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

            <div className="absolute inset-0 flex items-end">
              <div className="container mx-auto w-full px-6 pb-10 md:px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-end">
                  <div className="relative aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 md:w-52">
                    <Image src={movie.poster_path || "/placeholder.svg"} alt={movie.title} fill className="object-cover" quality={90} />
                  </div>

                  <div className="flex-1">
                    <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-lg md:text-5xl">{movie.title}</h1>

                    <div className="mb-4 flex flex-wrap items-center gap-4 text-white/80">
                      <div className="flex items-center gap-1">
                        <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        <span className="text-lg font-semibold text-white">{ratingText}</span>
                        <span className="text-sm text-white/60">/10</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="size-4" aria-hidden="true" />
                        <span>{releaseYear}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-4" aria-hidden="true" />
                        <span>2h 15m</span>
                      </div>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                      {(movie.genres ?? []).map((genre) => (
                        <Badge key={genre} variant="secondary">
                          {genre}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      size="lg"
                      onClick={handleWatchlistToggle}
                      aria-label={`${isInWatchlistState ? "Remove" : "Add"} ${movie.title} to watchlist`}
                    >
                      {isInWatchlistState ? (
                        <Check className="mr-2 size-5" aria-hidden="true" />
                      ) : (
                        <Plus className="mr-2 size-5" aria-hidden="true" />
                      )}
                      {isInWatchlistState ? "Remove from Watchlist" : "Add to Watchlist"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-bold text-foreground">Overview</h2>
            <p className="max-w-4xl text-lg leading-relaxed text-muted-foreground">{movie.overview}</p>
          </div>

          <Separator className="my-12" />

          <section className="mt-12">
            <h2 className="mb-6 text-2xl font-bold text-foreground">Recommended for You</h2>
            {isLoadingRecommended ? (
              <MovieGridSkeleton count={14} />
            ) : recommendedError ? (
              <ErrorState
                title="Failed to load recommendations"
                description="We couldn't fetch movie recommendations. Please try again."
                onRetry={fetchRecommended}
                className="py-8"
              />
            ) : recommended.length > 0 ? (
              <MovieGrid movies={recommended} showReason={true} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-2 text-muted-foreground">No recommendations found</p>
                <p className="text-sm text-muted-foreground">We couldn't find any similar movies at the moment.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedLayout>
  )
}
