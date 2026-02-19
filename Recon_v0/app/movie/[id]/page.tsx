"use client"

import { useEffect, useState, use } from "react"
import Image from "next/image"
import { ProtectedLayout } from "@/components/protected-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { MovieDetailsSkeleton } from "@/components/movie-details-skeleton"
import { ErrorState } from "@/components/error-state"
import { mockApi, type Movie } from "@/lib/mock-api"
import { toast } from "@/hooks/use-toast"
import { isInWatchlist, toggleWatchlist, markAsCompleted } from "@/lib/watchlist"
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
      console.error("Error fetching movie details:", error)
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
      console.error("Error fetching recommendations:", error)
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
        {/* Full-bleed cinematic hero */}
        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-border">
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
            {/* Dark overlays */}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

            {/* Scanline hint */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
              }}
              aria-hidden="true"
            />

            <div className="absolute inset-0 flex items-end">
              <div className="container mx-auto w-full px-6 pb-10 md:px-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-end">
                  {/* Poster */}
                  <div className="relative aspect-[2/3] w-44 shrink-0 overflow-hidden border border-border md:w-52">
                    <Image src={movie.poster_path || "/placeholder.svg"} alt={movie.title} fill className="object-cover" quality={90} />
                  </div>

                  <div className="flex-1">
                    {/* System label */}
                    <p className="font-retro mb-2 text-[10px] uppercase tracking-[0.3em] text-primary/60">
                      // MOVIE_DETAIL
                    </p>

                    <h1 className="font-retro mb-4 text-3xl font-bold uppercase tracking-wider text-foreground md:text-5xl">{movie.title}</h1>

                    {/* Metadata row — text-driven */}
                    <div className="font-retro mb-4 flex flex-wrap items-center gap-3 text-xs tracking-wider text-muted-foreground">
                      <span className="text-primary tabular-nums">{ratingText}/10</span>
                      <span className="text-border">|</span>
                      <span>{releaseYear}</span>
                      <span className="text-border">|</span>
                      <span>2h 15m</span>
                    </div>

                    <div className="mb-6 flex flex-wrap gap-2">
                      {(movie.genres ?? []).map((genre) => (
                        <Badge key={genre} variant="secondary">
                          {genre}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        size="lg"
                        onClick={handleWatchlistToggle}
                        aria-label={`${isInWatchlistState ? "Remove" : "Add"} ${movie.title} to watchlist`}
                      >
                        <span className="font-retro text-xs uppercase tracking-wider">
                          {isInWatchlistState ? "- REMOVE FROM QUEUE" : "+ ADD TO QUEUE"}
                        </span>
                      </Button>
                      {isInWatchlistState && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            markAsCompleted(movie.id).then((ok) => {
                              if (ok) {
                                setIsInWatchlistState(false)
                                toast({
                                  title: "Marked as watched",
                                  description: `${movie.title} moved to your completed list.`,
                                })
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to mark movie as watched.",
                                  variant: "destructive",
                                })
                              }
                            })
                          }}
                          aria-label={`Mark ${movie.title} as watched`}
                        >
                          <span className="font-retro text-xs uppercase tracking-wider">MARK AS WATCHED</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          {/* Overview section */}
          <div className="mb-12">
            <h2 className="font-retro mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Overview</h2>
            <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">{movie.overview}</p>
          </div>

          <div className="my-10 border-t border-border/20" />

          {/* Recommendations section */}
          <section className="mt-10">
            <h2 className="font-retro mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Recommended for You</h2>
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
                <p className="font-retro text-xs uppercase tracking-wider text-muted-foreground">No recommendations found</p>
                <p className="font-retro mt-1 text-[10px] text-muted-foreground/50">We couldn&apos;t find any similar movies at the moment.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedLayout>
  )
}
