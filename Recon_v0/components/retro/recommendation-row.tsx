"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { isInWatchlist, toggleWatchlist, markAsCompleted } from "@/lib/watchlist"

interface RecommendationRowProps {
  movie: Movie
  /** Zero-based index — used for stagger delay and display ID */
  index: number
  /** Show the recommendation reason line */
  showReason?: boolean
}

/**
 * A single movie rendered as a structured terminal record.
 * Line-based layout, no cards, no shadows, no rounded corners.
 * Hover reveals metadata + focus outline.
 */
export function RecommendationRow({
  movie,
  index,
  showReason = false,
}: RecommendationRowProps) {
  const prefersReduced = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)

  useEffect(() => {
    isInWatchlist(movie.id).then(setInWatchlist)
  }, [movie.id])

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatchlist(movie).then((result) => {
      setInWatchlist(result.added)
      toast({
        title: result.message,
        description: `${movie.title} ${result.added ? "added to" : "removed from"} your watchlist.`,
      })
    })
  }

  const handleMarkWatched = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    markAsCompleted(movie.id).then((ok) => {
      if (ok) {
        setInWatchlist(false)
        toast({
          title: "Marked as watched",
          description: `${movie.title} moved to your completed list.`,
        })
      }
    })
  }

  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "----"
  const rating = Number(movie.vote_average ?? 0).toFixed(1)
  const displayId = String(movie.id).padStart(4, "0").slice(-4)
  const matchScore = Math.min(
    99,
    Math.round((movie.vote_average ?? 5) * 10 + (index < 5 ? 10 - index * 2 : 0))
  )

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: prefersReduced ? 0 : index * 0.06,
        ease: "linear" as const,
      }}
    >
      <Link href={`/movie/${movie.id}`}>
        <div
          className={`group border-t border-border/40 transition-colors duration-150 ${
            isHovered ? "border-primary/40 bg-card/60" : ""
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* ── Primary record line ─────────────────────── */}
          <div className="flex items-baseline gap-x-4 px-4 py-3 sm:gap-x-6 sm:px-6">
            {/* ID */}
            <span className="hidden font-retro text-[10px] text-muted-foreground/40 sm:inline">
              {displayId}
            </span>

            {/* Title */}
            <span
              className={`flex-1 truncate font-retro text-sm uppercase tracking-wider transition-colors duration-100 ${
                isHovered ? "text-primary" : "text-foreground"
              }`}
            >
              {movie.title}
            </span>

            {/* Match score */}
            <span className="font-retro text-xs tabular-nums text-primary">
              {matchScore}%
            </span>

            {/* Rating */}
            <span className="font-retro text-xs tabular-nums text-muted-foreground">
              {rating}
            </span>

            {/* Year */}
            <span className="font-retro text-xs tabular-nums text-muted-foreground/60">
              {year}
            </span>

            {/* Status */}
            <span className="hidden font-retro text-[10px] uppercase tracking-wider text-muted-foreground/50 md:inline">
              {inWatchlist ? "QUEUED" : "RECOMMENDED"}
            </span>
          </div>

          {/* ── Expanded metadata (hover) ──────────────── */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              isHovered ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            }`}
            style={{ transitionTimingFunction: "linear" }}
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-border/20 px-4 py-2.5 sm:px-6">
              {/* Genres */}
              {(movie.genres ?? []).length > 0 && (
                <span className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">
                  GENRE: {(movie.genres ?? []).join(" / ")}
                </span>
              )}

              {/* Reason */}
              {showReason && movie.reason && (
                <span className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  REASON: {movie.reason}
                </span>
              )}

              {/* Actions */}
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  onClick={handleWatchlistToggle}
                  className={`font-retro text-[10px] uppercase tracking-wider transition-colors duration-100 ${
                    inWatchlist
                      ? "text-primary hover:text-primary/70"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  [{inWatchlist ? "− REMOVE" : "+ QUEUE"}]
                </button>
                <button
                  type="button"
                  onClick={handleMarkWatched}
                  className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground transition-colors duration-100 hover:text-foreground"
                >
                  [✓ WATCHED]
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
