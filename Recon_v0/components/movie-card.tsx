"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star, Plus, Check, Bookmark, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { isInWatchlist, toggleWatchlist, markAsCompleted } from "@/lib/watchlist"

interface MovieCardProps {
  movie: Movie
  showReason?: boolean
  variant?: "default" | "large"
  /** Index within the grid — drives stagger delay */
  index?: number
}

export function MovieCard({ movie, showReason = false, variant = "default", index = 0 }: MovieCardProps) {
  const [isInWatchlistState, setIsInWatchlistState] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  useEffect(() => {
    isInWatchlist(movie.id).then(setIsInWatchlistState)
  }, [movie.id])
  
  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    toggleWatchlist(movie).then((result) => {
      setIsInWatchlistState(result.added)
      toast({
        title: result.message,
        description: `${movie.title} ${result.added ? "added to" : "removed from"} your watchlist.`,
      })
    })
  }

  const handleMarkAsWatched = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
  }

  const isLarge = variant === "large"

  /* ── 3D tilt on hover ── */
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width   // 0‥1
    const y = (e.clientY - rect.top) / rect.height    // 0‥1
    setTilt({
      rotateX: (y - 0.5) * -12,  // ±6°
      rotateY: (x - 0.5) * 12,   // ±6°
      glowX: x * 100,
      glowY: y * 100,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setTilt({ rotateX: 0, rotateY: 0, glowX: 50, glowY: 50 })
  }, [])

  return (
    <Link href={`/movie/${movie.id}`}>
      {/* Outer wrapper — float up on hover like a file lifting from a drawer */}
      <motion.div
        ref={cardRef}
        className="group relative"
        style={{
          perspective: "600px",
          transformStyle: "preserve-3d" as const,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{
          duration: 0.45,
          delay: Math.min(index * 0.04, 0.4),
          ease: "easeOut" as const,
        }}
        whileHover={{ y: -6, transition: { duration: 0.25, ease: "easeOut" as const } }}
      >
        {/* ── Focus-frame corners (mechanical selection reticle) ── */}
        <span
          className="pointer-events-none absolute -inset-1 z-10 border-primary transition-opacity duration-200"
          aria-hidden="true"
          style={{
            opacity: isHovered ? 1 : 0,
            /* Four-corner clip-path: only corners visible */
            clipPath:
              "polygon(" +
              /* top-left corner */
              "0 0, 25% 0, 25% 1px, 1px 1px, 1px 25%, 0 25%," +
              /* top-right corner */
              "100% 0, 100% 25%, calc(100% - 1px) 25%, calc(100% - 1px) 1px, 75% 1px, 75% 0," +
              /* bottom-right corner */
              "100% 100%, 75% 100%, 75% calc(100% - 1px), calc(100% - 1px) calc(100% - 1px), calc(100% - 1px) 75%, 100% 75%," +
              /* bottom-left corner */
              "0 100%, 0 75%, 1px 75%, 1px calc(100% - 1px), 25% calc(100% - 1px), 25% 100%" +
              ")",
            border: "1px solid var(--primary)",
          }}
        />

        <div
          className={`relative overflow-hidden border border-border bg-card transition-all duration-200 ease-out ${
            isLarge ? "rounded-sm" : "rounded-sm"
          } ${isHovered ? "border-primary/40" : ""}`}
          style={{
            transform: isHovered
              ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.02)`
              : "rotateX(0deg) rotateY(0deg) scale(1)",
            transition: isHovered ? "transform 0.1s ease-out" : "transform 0.4s ease-out",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Tilt glow — follows cursor */}
          {isHovered && (
            <div
              className="pointer-events-none absolute inset-0 z-20"
              style={{
                background: `radial-gradient(circle at ${tilt.glowX}% ${tilt.glowY}%, rgba(74,191,173,0.15) 0%, transparent 60%)`,
              }}
            />
          )}
          {/* Poster image container */}
          <div className="relative w-full aspect-[2/3]">
            <Image
              src={movie.poster_path || "/placeholder.svg"}
              alt={movie.title}
              fill
              className="object-cover object-center transition-opacity duration-500 ease-out"
              sizes={isLarge ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"}
              style={{ opacity: isHovered ? 0.8 : 1 }}
            />
            
            {/* Dark gradient overlay — minimal, bottom-heavy */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Action buttons - top right, opacity transition */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={`size-8 rounded-none border transition-all duration-200 ${
                  isInWatchlistState 
                    ? "border-primary bg-primary/20 text-primary opacity-100" 
                    : "border-transparent bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:border-primary hover:text-primary"
                }`}
                onClick={handleWatchlistToggle}
              >
                {isInWatchlistState ? <Check className="size-4" /> : <Bookmark className="size-4" />}
                <span className="sr-only">{isInWatchlistState ? "Remove from Watchlist" : "Add to Watchlist"}</span>
              </Button>
              {isInWatchlistState && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-none border border-primary/40 bg-primary/10 text-primary transition-all duration-200 hover:bg-primary/30"
                  onClick={handleMarkAsWatched}
                >
                  <Eye className="size-4" />
                  <span className="sr-only">Mark as Watched</span>
                </Button>
              )}
            </div>

            {/* Rating badge — monospace, top left */}
            {movie.vote_average > 0 && (
            <div className="font-retro absolute top-2 left-2 flex items-center gap-1 border border-border/50 bg-black/60 px-2 py-1 text-[10px] tracking-wider text-primary backdrop-blur-sm">
              <Star className="size-3 fill-primary text-primary" />
              <span>{movie.vote_average.toFixed(1)}</span>
            </div>
            )}

            {/* Bottom content */}
            <div className="absolute inset-x-0 bottom-0 p-3 pb-2">
              <h3 className={`line-clamp-2 font-semibold text-foreground transition-all duration-200 ${
                isLarge ? "text-base mb-1" : "text-sm mb-0.5"
              }`}>
                {movie.title}
              </h3>
              
              {/* Meta info — appears on hover */}
              <div className={`font-retro flex items-center gap-2 text-[10px] tracking-wider text-muted-foreground transition-all duration-200 ${
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
              }`}>
                <span>{movie.release_date ? new Date(movie.release_date).getFullYear() || "—" : "—"}</span>
                {movie.genres && movie.genres.length > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="line-clamp-1 uppercase">{movie.genres.slice(0, 2).join(" / ")}</span>
                  </>
                )}
              </div>
              
              {showReason && movie.reason && (
                <div className={`font-retro mt-1.5 line-clamp-2 text-[10px] tracking-wider text-primary/80 transition-all duration-200 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}>
                  {movie.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
