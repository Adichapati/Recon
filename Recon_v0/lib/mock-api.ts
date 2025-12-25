// TODO: Replace with real API calls when backend is ready
// Mock API helpers for placeholder data

export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  genres: string[]
}

type TmdbMovie = {
  id: number
  title?: string
  name?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
}

const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

function mapTmdbMovieToMovie(movie: TmdbMovie): Movie {
  const releaseDate = movie.release_date || movie.first_air_date || "1970-01-01"

  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    overview: movie.overview || "",
    poster_path: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : "",
    backdrop_path: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}` : "",
    release_date: releaseDate,
    vote_average: typeof movie.vote_average === "number" ? movie.vote_average : 0,
    genres: [],
  }
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query || !query.trim()) return []

  try {
    const url = `/api/movies/search?query=${encodeURIComponent(query)}`
    const response = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      console.warn("[v0] Search movies request failed:", response.status)
      return []
    }

    const data = await response.json()
    const results = Array.isArray(data?.results) ? (data.results as TmdbMovie[]) : []
    return results.map(mapTmdbMovieToMovie)
  } catch (error) {
    console.warn("[v0] Search movies request errored:", error)
    return []
  }
}

export async function getPopularMovies(): Promise<Movie[]> {
  try {
    const response = await fetch("/api/movies/popular", {
      cache: "no-store",
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      console.warn("[v0] Popular movies request failed:", response.status)
      return []
    }

    const data = await response.json()
    const results = Array.isArray(data?.results) ? (data.results as TmdbMovie[]) : []
    return results.map(mapTmdbMovieToMovie)
  } catch (error) {
    console.warn("[v0] Popular movies request errored:", error)
    return []
  }
}

// Mock movie data generator
function generateMockMovie(id: number): Movie {
  const titles = [
    "Stellar Horizons",
    "The Last Echo",
    "Midnight Runner",
    "Chronicles of Tomorrow",
    "Shadow Protocol",
    "The Infinite Canvas",
    "Whispers in Time",
    "Neon Dreams",
    "The Silent Guardian",
    "Echoes of Eternity",
  ]

  const genres = [
    ["Action", "Thriller"],
    ["Drama", "Mystery"],
    ["Sci-Fi", "Adventure"],
    ["Romance", "Comedy"],
    ["Horror", "Thriller"],
  ]

  return {
    id,
    title: titles[id % titles.length] || `Movie ${id}`,
    overview: `An incredible cinematic experience that will leave you breathless. This film explores the depths of human emotion and adventure in ways never before seen.`,
    poster_path: `/placeholder.svg?height=600&width=400&query=movie+poster+${id}`,
    backdrop_path: `/placeholder.svg?height=1080&width=1920&query=cinematic+backdrop+${id}`,
    release_date: `202${id % 5}-0${(id % 9) + 1}-15`,
    vote_average: 7 + (id % 3),
    genres: genres[id % genres.length] || ["Drama"],
  }
}

export const mockApi = {
  // Get popular movies
  getPopular: async (): Promise<Movie[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    return Array.from({ length: 20 }, (_, i) => generateMockMovie(i + 1))
  },

  // Get trending movies
  getTrending: async (): Promise<Movie[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return Array.from({ length: 10 }, (_, i) => generateMockMovie(i + 20))
  },

  // Search movies
  search: async (query: string): Promise<Movie[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    if (!query) return []
    return Array.from({ length: 8 }, (_, i) => ({
      ...generateMockMovie(i + 100),
      title: `${query} ${i + 1}`,
    }))
  },

  // Get movie by ID
  getById: async (id: number): Promise<Movie> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return generateMockMovie(id)
  },

  // Get recommended movies
  getRecommended: async (movieId: number): Promise<Movie[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return Array.from({ length: 6 }, (_, i) => generateMockMovie(movieId + i + 1))
  },
}
