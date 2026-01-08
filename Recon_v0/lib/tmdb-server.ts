import "server-only"

type TmdbGenre = { id: number; name: string }
type TmdbGenreListResponse = { genres?: TmdbGenre[] }

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

// Simple in-memory cache for the genre list.
// This avoids re-fetching the same static genre catalog on every request in a warm runtime.
let cachedMovieGenreMap: { value: Map<number, string>; expiresAt: number } | null = null

export function hasTmdbApiKey() {
  return !!process.env.TMDB_API_KEY
}

function requireTmdbApiKey() {
  const key = process.env.TMDB_API_KEY
  if (!key) {
    throw new Error("TMDB_API_KEY is not set")
  }
  return key
}

export async function tmdbFetchJson<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`)
  url.searchParams.set("api_key", requireTmdbApiKey())

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue
    url.searchParams.set(key, String(value))
  }

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  })

  const json = (await res.json().catch(() => null)) as any
  if (!res.ok) {
    const message =
      typeof json?.status_message === "string"
        ? json.status_message
        : typeof json?.error === "string"
          ? json.error
          : `TMDB request failed: ${res.status}`

    const err = new Error(message) as Error & { status?: number; body?: unknown }
    err.status = res.status
    err.body = json
    throw err
  }

  return json as T
}

export async function getTmdbMovieGenreMap(): Promise<Map<number, string>> {
  // TMDB list endpoints return `genre_ids: number[]`.
  // We map those IDs to readable names by fetching the canonical genre list.
  const now = Date.now()
  if (cachedMovieGenreMap && cachedMovieGenreMap.expiresAt > now) {
    return cachedMovieGenreMap.value
  }

  try {
    const data = await tmdbFetchJson<TmdbGenreListResponse>("/genre/movie/list", {
      language: "en-US",
    })

    const genres = Array.isArray(data?.genres) ? data.genres : []
    const map = new Map<number, string>(
      genres
        .filter((g) => g && typeof g.id === "number" && typeof g.name === "string")
        .map((g) => [g.id, g.name])
    )

    // Cache for 24h; TMDB genres rarely change.
    cachedMovieGenreMap = { value: map, expiresAt: now + 24 * 60 * 60 * 1000 }
    return map
  } catch {
    // Production-safe fallback: if the genre list fails, don't break list endpoints.
    const empty = new Map<number, string>()
    cachedMovieGenreMap = { value: empty, expiresAt: now + 5 * 60 * 1000 }
    return empty
  }
}
