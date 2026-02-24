"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { TerminalLine } from "@/components/retro/terminal-line"
import { BlinkingCursor } from "@/components/retro/blinking-cursor"
import { RetroLoader } from "@/components/retro/retro-loader"
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
      <div className="min-h-screen bg-background">
        {/* ── Banner carousel ──────────────────────────── */}
        {!isLoadingPopular && !popularError && bannerMovie && (
          <section
            className="relative mb-10 w-full overflow-hidden border-b border-border"
            onMouseEnter={() => setIsBannerPaused(true)}
            onMouseLeave={() => setIsBannerPaused(false)}
          >
            <div className="relative aspect-video w-full max-h-[550px]">
              <AnimatePresence mode="popLayout">
                {bannerMovies.map((movie, index) =>
                  index === bannerIndex ? (
                    <motion.div
                      key={movie.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.8, ease: "easeOut" as const }}
                    >
                      {/* Ken Burns slow zoom while slide is active */}
                      <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 1 }}
                        animate={{ scale: 1.06 }}
                        transition={{ duration: 8, ease: "linear" as const }}
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
                      </motion.div>
                    </motion.div>
                  ) : null
                )}
              </AnimatePresence>

              {/* Dark overlays — bottom & left fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

              {/* Scanline hint on the banner */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
                }}
                aria-hidden="true"
              />

              {/* Sweep line — travels down the banner */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="animate-retro-scanline absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
              </div>

              {/* Content — lower left */}
              <div className="absolute inset-0 flex items-end">
                <div className="container mx-auto w-full px-6 pb-16 md:px-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={bannerMovie.id}
                      className="max-w-2xl text-left"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: "easeOut" as const }}
                    >
                    {/* System label */}
                    <p className="font-retro mb-2 text-[10px] uppercase tracking-[0.3em] text-primary/70">
                      NOW SHOWING // {String(bannerIndex + 1).padStart(2, "0")}/{String(bannerMovies.length).padStart(2, "0")}
                    </p>

                    {/* Title */}
                    <h2 className="font-retro mb-3 text-balance text-3xl font-bold uppercase tracking-wider text-foreground md:text-5xl lg:text-6xl">
                      {bannerMovie.title}
                    </h2>

                    {/* Metadata row */}
                    <div className="font-retro mb-4 flex flex-wrap items-center gap-3 text-xs tracking-wider text-muted-foreground">
                      <span className="text-primary tabular-nums">
                        {Number(bannerMovie.vote_average ?? 0).toFixed(1)}
                      </span>
                      <span className="text-border">|</span>
                      <span>{new Date(bannerMovie.release_date).getFullYear() || "----"}</span>
                      {(bannerMovie.genres ?? []).length > 0 && (
                        <>
                          <span className="text-border">|</span>
                          <span className="uppercase">{(bannerMovie.genres ?? []).slice(0, 3).join(" / ")}</span>
                        </>
                      )}
                    </div>

                    {/* Overview */}
                    <p className="mb-6 line-clamp-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {bannerMovie.overview}
                    </p>

                    {/* Action buttons — retro styled */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/movie/${bannerMovie.id}`}
                        className="font-retro border border-primary bg-primary px-6 py-2.5 text-xs uppercase tracking-widest text-primary-foreground transition-colors duration-150 hover:bg-primary/80"
                      >
                        VIEW DETAILS
                      </Link>
                      <button
                        onClick={handleBannerWatchlistToggle}
                        className="font-retro border border-border px-6 py-2.5 text-xs uppercase tracking-widest text-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
                        aria-label={`${isBannerInWatchlist ? "Remove" : "Add"} ${bannerMovie.title} ${isBannerInWatchlist ? "from" : "to"} watchlist`}
                      >
                        {isBannerInWatchlist ? "− REMOVE FROM QUEUE" : "+ ADD TO QUEUE"}
                      </button>
                    </div>
                  </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Slide indicators — animated dashes */}
              {bannerMovies.length > 1 && (
                <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
                  {bannerMovies.map((m, i) => (
                    <motion.button
                      key={m.id}
                      type="button"
                      onClick={() => setBannerIndex(i)}
                      className={`h-0.5 transition-colors duration-200 ${
                        i === bannerIndex
                          ? "bg-primary"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      animate={{ width: i === bannerIndex ? 24 : 12 }}
                      transition={{ duration: 0.3, ease: "easeOut" as const }}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation arrows — minimal squares */}
              {bannerMovies.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevBanner}
                    className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center border border-border/40 bg-background/60 text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextBanner}
                    className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center border border-border/40 bg-background/60 text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary"
                    aria-label="Next"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Feed sections ────────────────────────────── */}
        <div className="container mx-auto px-4 py-6">

          {/* ── Recommended ────────────────────────────── */}
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
          >
            <div className="mb-5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <TerminalLine prefix=">" className="text-sm text-foreground">
                  <span className="font-retro uppercase tracking-[0.2em]">RECOMMENDED FOR YOU</span>
                </TerminalLine>
                <span className="font-retro text-[10px] text-muted-foreground/40">// ADAPTIVE_ENGINE</span>
              </div>
              {!isLoadingRecommended && !recommendedError && recommendedMovies.length > 0 && (
                <span className="font-retro text-[10px] tabular-nums text-muted-foreground/40">
                  {recommendedMovies.length} RESULTS
                </span>
              )}
            </div>

            {isLoadingRecommended && (
              <div className="flex items-center justify-center py-12">
                <RetroLoader label="LOADING RECOMMENDATIONS" />
              </div>
            )}
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
            {!isLoadingRecommended && !recommendedError && recommendedMovies.length > 0 && (
              <MovieGrid movies={recommendedMovies} showReason />
            )}
          </motion.section>

          <div className="my-8 border-t border-border/20" />

          {/* ── Popular ────────────────────────────────── */}
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" as const }}
          >
            <div className="mb-5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <TerminalLine prefix=">" className="text-sm text-foreground">
                  <span className="font-retro uppercase tracking-[0.2em]">POPULAR</span>
                </TerminalLine>
                <span className="font-retro text-[10px] text-muted-foreground/40">// TMDB_API</span>
              </div>
              {!isLoadingPopular && !popularError && popularMovies.length > 0 && (
                <span className="font-retro text-[10px] tabular-nums text-muted-foreground/40">
                  {popularMovies.length} RESULTS
                </span>
              )}
            </div>

            {isLoadingPopular && <MovieGridSkeleton count={20} />}
            {!isLoadingPopular && popularError && (
              <ErrorState
                title="Failed to load popular movies"
                description="We couldn't fetch the popular movies. Please try again."
                onRetry={fetchPopular}
              />
            )}
            {!isLoadingPopular && !popularError && <MovieGrid movies={popularMovies} />}
          </motion.section>

          <div className="my-8 border-t border-border/20" />

          {/* ── Trending ───────────────────────────────── */}
          <motion.section
            className="mb-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" as const }}
          >
            <div className="mb-5 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <TerminalLine prefix=">" className="text-sm text-foreground">
                  <span className="font-retro uppercase tracking-[0.2em]">TRENDING THIS WEEK</span>
                </TerminalLine>
                <span className="font-retro text-[10px] text-muted-foreground/40">// TMDB_API</span>
              </div>
              {!isLoadingTrending && !trendingError && trendingMovies.length > 0 && (
                <span className="font-retro text-[10px] tabular-nums text-muted-foreground/40">
                  {trendingMovies.length} RESULTS
                </span>
              )}
            </div>

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
            {!isLoadingTrending && !trendingError && trendingMovies.length > 0 && (
              <MovieGrid movies={trendingMovies} />
            )}
          </motion.section>

          {/* ── Session footer ─────────────────────────── */}
          <div className="border-t border-border/20 py-4">
            <div className="flex items-center gap-2">
              <TerminalLine prefix=">" className="text-[10px] text-muted-foreground/30">
                SESSION ACTIVE
              </TerminalLine>
              <BlinkingCursor className="text-[10px]" />
            </div>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
