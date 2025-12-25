"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Star, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"

interface MovieCardProps {
  movie: Movie
}

export function MovieCard({ movie }: MovieCardProps) {
  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.preventDefault()
    // TODO: Connect to real backend API
    toast({
      title: "Added to Watchlist",
      description: `${movie.title} has been added to your watchlist.`,
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
            variant="secondary"
            className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleAddToWatchlist}
          >
            <Plus className="size-4" />
            <span className="sr-only">Add to Watchlist</span>
          </Button>
        </AspectRatio>

        <div className="absolute bottom-0 left-0 right-0 translate-y-full p-4 transition-transform group-hover:translate-y-0">
          <h3 className="mb-2 line-clamp-1 font-semibold text-foreground">{movie.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-primary text-primary" />
              <span className="text-sm font-medium text-foreground">{movie.vote_average.toFixed(1)}</span>
            </div>
            <span className="text-xs text-muted-foreground">{new Date(movie.release_date).getFullYear()}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  )
}
