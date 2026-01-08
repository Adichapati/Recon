// Shared helpers for safely rendering TMDB genres.
//
// Why this exists:
// - TMDB "movie details" returns `genres: [{ id, name }]`
// - TMDB "list" endpoints return `genre_ids: number[]`
// - If we accidentally do `String({id,name})`, React renders "[object Object]".

export type TmdbGenreObject = { id?: number; name?: string }

export function extractGenreNames(genres: unknown): string[] {
  // Accepts: string[], {id,name}[], or mixed arrays.
  // Returns: clean, non-empty genre names.
  if (!Array.isArray(genres)) return []

  return genres
    .map((g) => {
      if (typeof g === "string") return g
      if (g && typeof g === "object") {
        const name = (g as TmdbGenreObject).name
        return typeof name === "string" ? name : ""
      }
      return ""
    })
    .map((s) => s.trim())
    .filter(Boolean)
}

export function mapGenreIdsToNames(genreIds: unknown, genreMap: Map<number, string>): string[] {
  // Accepts: number[] or unknown.
  // Returns: resolved names (filters unknown IDs).
  if (!Array.isArray(genreIds) || genreMap.size === 0) return []

  return genreIds
    .map((id) => (typeof id === "number" ? genreMap.get(id) : undefined))
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
}
