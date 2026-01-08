// API helpers for movie data (backend-backed, OAuth-safe)

export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  genres: string[]
  reason?: string
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
  genres?: Array<{ name?: string }> | string[]
}

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"

/* =========================
   MAPPING
   ========================= */

function mapTmdbMovieToMovie(movie: TmdbMovie): Movie {
  const releaseDate = movie.release_date || movie.first_air_date || "1970-01-01"

  const toTmdbUrl = (
    path: string | null | undefined,
    kind: "poster" | "backdrop"
  ) => {
    if (!path) return ""
    if (path.startsWith("http")) return path
    return `${kind === "backdrop" ? TMDB_BACKDROP_BASE_URL : TMDB_POSTER_BASE_URL}${path}`
  }

  return {
    id: movie.id,
    title: movie.title || movie.name || "Untitled",
    overview: movie.overview || "",
    poster_path: toTmdbUrl(movie.poster_path, "poster"),
    backdrop_path: toTmdbUrl(movie.backdrop_path, "backdrop"),
    release_date: releaseDate,
    vote_average: movie.vote_average ?? 0,
    genres: Array.isArray(movie.genres)
      ? movie.genres
          .map((g: any) => (typeof g === "string" ? g : g?.name))
          .filter(Boolean)
      : [],
  }
}

/* =========================
   REAL BACKEND API CALLS
   ========================= */

async function safeFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  const tmdbKeyPresent = res.headers.get("x-tmdb-key-present") === "1"
  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      typeof (json as any)?.error === "string"
        ? (json as any).error
        : `Request failed: ${res.status}`

    const err = new Error(message) as Error & { status?: number; tmdbKeyPresent?: boolean }
    err.status = res.status
    err.tmdbKeyPresent = tmdbKeyPresent
    throw err
  }

  return json
}

export async function getPopularMovies(): Promise<Movie[]> {
  try {
    const data = await safeFetch("/api/movies/popular")
    return (data.results ?? []).map(mapTmdbMovieToMovie)
  } catch (err) {
    if (err && typeof err === "object" && (err as any).tmdbKeyPresent) {
      throw err
    }
    console.warn("Falling back to mock popular movies")
    return mockApi.getPopular()
  }
}

export async function getTrendingMovies(): Promise<Movie[]> {
  try {
    const data = await safeFetch("/api/movies/trending")
    return (data.results ?? []).map(mapTmdbMovieToMovie)
  } catch (err) {
    if (err && typeof err === "object" && (err as any).tmdbKeyPresent) {
      throw err
    }
    console.warn("Falling back to mock trending movies")
    return mockApi.getTrending()
  }
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return []

  try {
    const data = await safeFetch(
      `/api/movies/search?query=${encodeURIComponent(query)}`
    )
    return (data.results ?? []).map(mapTmdbMovieToMovie)
  } catch (err) {
    if (err && typeof err === "object" && (err as any).tmdbKeyPresent) {
      throw err
    }
    console.warn("Falling back to mock search")
    return mockApi.search(query)
  }
}

/* =========================
   MOCK FALLBACK ONLY
   ========================= */

function generateMockMovie(id: number): Movie {
  return {
    id,
    title: `Movie ${id}`,
    overview: "Mock movie overview",
    poster_path: "/placeholder.svg",
    backdrop_path: "/placeholder.svg",
    release_date: "2024-01-01",
    vote_average: 7.5,
    genres: ["Drama"],
  }
}

export const mockApi = {
  getPopular: async (): Promise<Movie[]> =>
    Array.from({ length: 20 }, (_, i) => generateMockMovie(i + 1)),

  getTrending: async (): Promise<Movie[]> =>
    Array.from({ length: 10 }, (_, i) => generateMockMovie(i + 50)),

  search: async (query: string): Promise<Movie[]> =>
    Array.from({ length: 8 }, (_, i) => ({
      ...generateMockMovie(i + 100),
      title: `${query} ${i + 1}`,
    })),
}
