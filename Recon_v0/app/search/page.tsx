"use client"

import { useState } from "react"
import { ProtectedLayout } from "@/components/protected-layout"
import { SearchBar } from "@/components/search-bar"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { searchMovies, type Movie } from "@/lib/mock-api"
import { Search } from "lucide-react"

export default function SearchPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [lastQuery, setLastQuery] = useState("")

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    try {
      setIsLoading(true)
      setHasSearched(true)
      setSearchError(false)
      setLastQuery(query)
      const results = await searchMovies(query)
      setMovies(results)
    } catch (error) {
      setSearchError(true)
      console.error("Error searching movies:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const retrySearch = () => {
    if (lastQuery) {
      handleSearch(lastQuery)
    }
  }

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-6 text-3xl font-bold text-foreground">Search Movies</h1>
          <SearchBar onSearch={handleSearch} />
        </div>

        {isLoading && <MovieGridSkeleton count={8} />}

        {!isLoading && searchError && (
          <ErrorState
            title="Search failed"
            description="We couldn't complete your search. Please try again."
            onRetry={retrySearch}
          />
        )}

        {!isLoading && !searchError && hasSearched && movies.length > 0 && (
          <div>
            <p className="mb-6 text-muted-foreground">
              Found {movies.length} {movies.length === 1 ? "result" : "results"}
            </p>
            <MovieGrid movies={movies} />
          </div>
        )}

        {!isLoading && !searchError && hasSearched && movies.length === 0 && (
          <EmptyState
            icon={<Search className="size-8" />}
            title="No movies found"
            description="Try searching with different keywords or check your spelling"
          />
        )}

        {!isLoading && !searchError && !hasSearched && (
          <EmptyState
            icon={<Search className="size-8" />}
            title="Start searching for movies"
            description="Enter a movie title in the search bar above to find your favorites"
          />
        )}
      </div>
    </ProtectedLayout>
  )
}
