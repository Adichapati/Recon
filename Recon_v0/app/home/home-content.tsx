"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getPopularMovies, getTrendingMovies, type Movie } from "@/lib/mock-api"
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist"
import { toast } from "@/hooks/use-toast"

export default function HomeContent() {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([])
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([])
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([])
  const [isLoadingPopular, setIsLoadingPopular] = useState(true)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [isLoadingRecommended, setIsLoadingRecommended] = useState(true)
  const [popularError, setPopularError] = useState(false)
  const [trendingError, setTrendingError] = useState(false)
  const [recommendedError, setRecommendedError] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [isBannerPaused, setIsBannerPaused] = useState(false)
  const [isBannerInWatchlist, setIsBannerInWatchlist] = useState(false)

  const fetchPopular = async () => {
    try {
      setIsLoadingPopular(true)
      setPopularError(false)
      const movies = await getPopularMovies()
      setPopularMovies(movies)
    } catch (error) {
      setPopularError(true)
      console.error("Error fetching popular movies:", error)
    } finally {
      setIsLoadingPopular(false)
    }
  }

  const fetchTrending = async () => {
    try {
      setIsLoadingTrending(true)
      setTrendingError(false)
      const movies = await getTrendingMovies()
      setTrendingMovies(movies)
    } catch (error) {
      setTrendingError(true)
      console.error("Error fetching trending movies:", error)
    } finally {
      setIsLoadingTrending(false)
    }
  }

  const fetchRecommended = async () => {
    try {
      setIsLoadingRecommended(true)
      setRecommendedError(false)
      const res = await fetch("/api/recommendations")
      if (!res.ok) {
        throw new Error("Failed to fetch recommendations")
      }
      const data = await res.json()
      setRecommendedMovies(data.results || [])
    } catch (error) {
      setRecommendedError(true)
      console.error("Error fetching recommendations:", error)
    } finally {
      setIsLoadingRecommended(false)
    }
  }

  useEffect(() => {
    fetchPopular()
    fetchTrending()
    fetchRecommended()
  }, [])

  const bannerMovies = popularMovies.slice(0, 5)
  const bannerMovie = bannerMovies[bannerIndex]

  useEffect(() => {
    let cancelled = false
    if (!bannerMovie) return
    isInWatchlist(bannerMovie.id).then((v) => {
      if (!cancelled) setIsBannerInWatchlist(v)
    })
    return () => {
      cancelled = true
    }
  }, [bannerMovie?.id])

  useEffect(() => {
    if (bannerMovies.length === 0) return

    setBannerIndex(0)
  }, [bannerMovies.length])

  useEffect(() => {
    if (bannerMovies.length <= 1) return
    if (isBannerPaused) return

    const intervalId = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % bannerMovies.length)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [bannerMovies.length, isBannerPaused])

  const goPrevBanner = () => {
    if (bannerMovies.length === 0) return
    setBannerIndex((current) => (current - 1 + bannerMovies.length) % bannerMovies.length)
  }

  const goNextBanner = () => {
    if (bannerMovies.length === 0) return
    setBannerIndex((current) => (current + 1) % bannerMovies.length)
  }

  const handleBannerWatchlistToggle = async () => {
    if (!bannerMovie) return
    const result = await toggleWatchlist(bannerMovie)
    setIsBannerInWatchlist(result.added)
    toast({
      title: result.message,
      description: `${bannerMovie.title} ${result.added ? "added to" : "removed from"} your watchlist.`,
    })
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen">
        {!isLoadingPopular && !popularError && bannerMovie && (
          <section
            className="relative left-1/2 right-1/2 mb-12 w-screen -translate-x-1/2 overflow-hidden"
            onMouseEnter={() => setIsBannerPaused(true)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div className="relative aspect-video w-full max-h-[600px]">
              {bannerMovies.map((movie, index) => (
                <div
                  key={movie.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === bannerIndex ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden={index !== bannerIndex}
                >
                  <Image
                    src={movie.backdrop_path || movie.poster_path || "/placeholder.svg"}
                    alt={movie.title}
                    fill
                    className="object-cover object-center"
                    priority={index === bannerIndex}
                    quality={100}
                    unoptimized
                  />
                </div>
              ))}

              {/* Smooth cinematic overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />

              {/* Content positioned lower-left like streaming apps */}
              <div className="absolute inset-0 flex items-end">
                <div className="container mx-auto w-full px-6 pb-20 md:px-12">
                  <div className="max-w-2xl text-left">
                    {/* Movie title - large and prominent */}
                    <h2 className="mb-4 text-balance text-4xl font-extrabold tracking-tight text-white drop-shadow-lg md:text-6xl lg:text-7xl">
                      {bannerMovie.title}
                    </h2>

                    {/* Metadata row: rating + year */}
                    <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/90">
                      <div className="flex items-center gap-1">
                        <Star className="size-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                        <span className="font-medium">{Number(bannerMovie.vote_average ?? 0).toFixed(1)}</span>
                      </div>
                      <span className="text-white/60">•</span>
                      <span>{new Date(bannerMovie.release_date).getFullYear() || "2025"}</span>
                      {(bannerMovie.genres ?? []).length > 0 && (
                        <>
                          <span className="text-white/60">•</span>
                          <span>{(bannerMovie.genres ?? []).slice(0, 2).join(", ")}</span>
                        </>
                      )}
                    </div>

                    {/* Overview - more lines visible */}
                    <p className="mb-6 line-clamp-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
                      {bannerMovie.overview}
                    </p>

                    {/* Action buttons - styled like streaming apps */}
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/movie/${bannerMovie.id}`}>
                        <Button
                          size="lg"
                          className="gap-2 rounded-full bg-amber-500 px-6 font-semibold text-black hover:bg-amber-400"
                        >
                          <svg className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          View Details
                        </Button>
                      </Link>
                      <Button
                        size="lg"
                        variant="outline"
                        className="gap-2 rounded-full border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur hover:bg-white/20"
                        onClick={handleBannerWatchlistToggle}
                        aria-label={`${isBannerInWatchlist ? "Remove" : "Add"} ${bannerMovie.title} ${isBannerInWatchlist ? "from" : "to"} watchlist`}
                      >
                        {isBannerInWatchlist ? (
                          <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                        ) : (
                          <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                        )}
                        {isBannerInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide indicator dots - centered at bottom */}
              {bannerMovies.length > 1 && (
                <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
                  {bannerMovies.map((m, i) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBannerIndex(i)}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${i === bannerIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation arrows - smaller, translucent circles at edges */}
              {bannerMovies.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevBanner}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextBanner}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
                    aria-label="Next"
                  >
                    <ChevronRight className="size-6" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </section>
        )}

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

          <section className="mb-12">
          <h2 className="mb-2 text-3xl font-bold text-foreground">Recommended for You</h2>
          <p className="mb-6 text-muted-foreground">Personalized picks based on your preferences</p>

          {isLoadingRecommended && <MovieGridSkeleton count={10} />}
          {!isLoadingRecommended && recommendedError && (
            <ErrorState
              title="Failed to load recommendations"
              description="We couldn't fetch your recommendations. Please try again."
              onRetry={fetchRecommended}
            />
          )}
          {!isLoadingRecommended && !recommendedError && recommendedMovies.length === 0 && (
            <EmptyState title="No recommendations yet" description="Complete your preferences to get personalized recommendations." />
          )}
          {!isLoadingRecommended && !recommendedError && recommendedMovies.length > 0 && <MovieGrid movies={recommendedMovies} showReason />}
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
          {!isLoadingTrending && !trendingError && trendingMovies.length === 0 && (
            <EmptyState title="No trending movies" description="Please check back later." />
          )}
          {!isLoadingTrending && !trendingError && trendingMovies.length > 0 && <MovieGrid movies={trendingMovies} />}
          </section>
        </div>
      </div>
    </ProtectedLayout>
  )
}
