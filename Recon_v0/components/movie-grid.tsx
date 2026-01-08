import { MovieCard } from "./movie-card"
import type { Movie } from "@/lib/mock-api"

interface MovieGridProps {
  movies: Movie[]
  className?: string
  showReason?: boolean
  variant?: "default" | "large"
}

export function MovieGrid({ movies, className = '', showReason = false, variant = "default" }: MovieGridProps) {
  const defaultGridClass = variant === "large" 
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4'
    : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
  
  return (
    <div className={`grid gap-4 ${className || defaultGridClass}`}>
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} showReason={showReason} variant={variant} />
      ))}
    </div>
  )
}
