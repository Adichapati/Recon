"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getPopularMovies, getTrendingMovies, type Movie } from "@/lib/mock-api"

export default function HomePage() {
  const [popularMovies, setPopularMovies] = useState<Movie[]>([])
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([])
  const [isLoadingPopular, setIsLoadingPopular] = useState(true)
  const [isLoadingTrending, setIsLoadingTrending] = useState(true)
  const [popularError, setPopularError] = useState(false)
  const [trendingError, setTrendingError] = useState(false)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [isBannerPaused, setIsBannerPaused] = useState(false)

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
      const movies = await getTrendingMovies()
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

  const bannerMovies = popularMovies.slice(0, 5)
  const bannerMovie = bannerMovies[bannerIndex]

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

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        {!isLoadingPopular && !popularError && bannerMovie && (
          <section className="mb-12">
            <div
              className="group relative aspect-video w-full max-h-[520px] overflow-hidden rounded-xl"
              onMouseEnter={() => setIsBannerPaused(true)}
              onMouseLeave={() => setIsBannerPaused(false)}
            >
              <Link
                href={`/movie/${bannerMovie.id}`}
                className="absolute inset-0 block h-full w-full cursor-pointer"
                aria-label={`Open details for ${bannerMovie.title}`}
              >
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
                    />
                  </div>
                ))}

                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="max-w-2xl">
                    <h2 className="mb-2 text-3xl font-bold text-white md:text-4xl">{bannerMovie.title}</h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-white/80 md:text-base">
                      {bannerMovie.overview}
                    </p>
                  </div>
                </div>
              </Link>

              {bannerMovies.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="bg-background/60 hover:bg-background/80"
                    onClick={goPrevBanner}
                    aria-label="Previous popular movie"
                  >
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="bg-background/60 hover:bg-background/80"
                    onClick={goNextBanner}
                    aria-label="Next popular movie"
                  >
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

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
          {!isLoadingTrending && !trendingError && trendingMovies.length === 0 && (
            <EmptyState title="No trending movies" description="Please check back later." />
          )}
          {!isLoadingTrending && !trendingError && trendingMovies.length > 0 && <MovieGrid movies={trendingMovies} />}
        </section>
      </div>
    </ProtectedLayout>
  )
}
