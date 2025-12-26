"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star, Plus, Check } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { toast } from "@/hooks/use-toast"

import type { Movie } from "@/lib/mock-api"
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist"
import { useAuth } from "@/lib/auth-context"

interface MovieCardProps {
  movie: Movie
  showReason?: boolean
}

export function MovieCard({ movie, showReason = false }: MovieCardProps) {
  const { user } = useAuth() // ✅ hook used in component (correct)
  const [isInWatchlistState, setIsInWatchlistState] = useState(false)

  useEffect(() => {
    setIsInWatchlistState(isInWatchlist(movie.id))
  }, [movie.id])

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault()

    // ✅ GUEST CHECK BELONGS HERE
    if (user?.role === "guest") {
      toast({
        title: "Login required",
        description: "Sign in with Google or email to save movies.",
      })
      return
    }

    const success = toggleWatchlist(movie)
    setIsInWatchlistState(isInWatchlist(movie.id))

    toast({
      title: success ? "Watchlist updated" : "Action failed",
      description: success
        ? `${movie.title} updated in your watchlist.`
        : "Something went wrong. Please try again.",
    })
  }

  return (
    <Link href={`/movie/${movie.id}`}>
      <Card className="group relative overflow-hidden border-0 bg-card transition-all hover:scale-105 hover:shadow-xl">
        <AspectRatio ratio={2 / 3}>
          <Image
            src={movie.poster_path || "/placeholder.svg"}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

          <Button
            size="icon"
            variant={isInWatchlistState ? "default" : "secondary"}
            className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleWatchlistToggle}
          >
            {isInWatchlistState ? <Check className="size-4" /> : <Plus className="size-4" />}
            <span className="sr-only">
              {isInWatchlistState ? "Remove from Watchlist" : "Add to Watchlist"}
            </span>
          </Button>
        </AspectRatio>

        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform group-hover:translate-y-0">
          <h3 className="mb-2 line-clamp-1 font-semibold text-foreground">
            {movie.title}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-primary text-primary" />
              <span className="text-sm font-medium text-foreground">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(movie.release_date).getFullYear()}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>

          {showReason && movie.reason && (
            <div
              className="mt-2 text-xs text-muted-foreground italic"
              title={movie.reason}
            >
              {movie.reason.length > 40
                ? movie.reason.substring(0, 40) + "..."
                : movie.reason}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
