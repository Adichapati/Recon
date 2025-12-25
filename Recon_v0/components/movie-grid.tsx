import { MovieCard } from "./movie-card"
import type { Movie } from "@/lib/mock-api"

interface MovieGridProps {
  movies: Movie[]
  className?: string
  showReason?: boolean
}

export function MovieGrid({ movies, className = '', showReason = false }: MovieGridProps) {
  return (
    <div className={`grid gap-4 ${className || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}`}>
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} showReason={showReason} />
      ))}
    </div>
  )
}
