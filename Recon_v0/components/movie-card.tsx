"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star, Plus, Check, Bookmark, Eye } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { isInWatchlist, toggleWatchlist, markAsCompleted } from "@/lib/watchlist"

interface MovieCardProps {
  movie: Movie
  showReason?: boolean
  variant?: "default" | "large"
}

export function MovieCard({ movie, showReason = false, variant = "default" }: MovieCardProps) {
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

  return (
    <Link href={`/movie/${movie.id}`}>
      <Card 
        className={`group relative overflow-hidden border-0 bg-neutral-900/50 transition-all duration-500 ease-out hover:shadow-2xl hover:shadow-black/50 ${
          isLarge ? "rounded-2xl" : "rounded-xl"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ transform: isHovered ? "scale(1.03)" : "scale(1)" }}
      >
        {/* Poster image container */}
        <div className="relative w-full aspect-[2/3]">
          <Image
            src={movie.poster_path || "/placeholder.svg"}
            alt={movie.title}
            fill
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            sizes={isLarge ? "(max-width: 768px) 50vw, 25vw" : "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"}
          />
          
          {/* Smooth gradient overlay - always visible at bottom for title */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-95" />

          {/* Action buttons - top right, smooth fade */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              className={`size-8 transition-all duration-300 ease-out ${
                isInWatchlistState 
                  ? "bg-amber-500/90 text-black opacity-100 hover:bg-amber-400" 
                  : "bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60"
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
                className="size-8 bg-green-600/90 text-white opacity-100 transition-all duration-300 ease-out hover:bg-green-500"
                onClick={handleMarkAsWatched}
              >
                <Eye className="size-4" />
                <span className="sr-only">Mark as Watched</span>
              </Button>
            )}
          </div>

          {/* Rating badge - top left, always visible */}
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-semibold text-amber-400 backdrop-blur-sm">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span>{movie.vote_average.toFixed(1)}</span>
          </div>

          {/* Bottom content - title always visible, more info on hover */}
          <div className="absolute inset-x-0 bottom-0 p-3 pb-2">
            <h3 className={`line-clamp-2 font-semibold text-white transition-all duration-300 ${
              isLarge ? "text-base mb-1" : "text-sm mb-0.5"
            }`}>
              {movie.title}
            </h3>
            
            {/* Additional info - fades in on hover */}
            <div className={`flex items-center gap-2 text-xs text-white/70 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}>
              <span>{movie.release_date ? new Date(movie.release_date).getFullYear() || "—" : "—"}</span>
              {movie.genres && movie.genres.length > 0 && (
                <>
                  <span className="text-white/40">•</span>
                  <span className="line-clamp-1">{movie.genres.slice(0, 2).join(", ")}</span>
                </>
              )}
            </div>
            
            {showReason && movie.reason && (
              <div className={`mt-1.5 line-clamp-2 text-xs text-amber-400/90 italic transition-all duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}>
                {movie.reason}
              </div>
            )}
          </div>

          {/* Progress bar at bottom - for watchlist items */}
          {isInWatchlistState && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800/80">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                style={{ width: `${Math.floor(Math.random() * 70) + 20}%` }}
              />
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
