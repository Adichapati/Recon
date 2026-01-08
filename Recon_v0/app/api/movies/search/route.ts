import { NextResponse } from "next/server"
import { hasTmdbApiKey, tmdbFetchJson, getTmdbMovieGenreMap } from "@/lib/tmdb-server"
import { extractGenreNames, mapGenreIdsToNames } from "@/lib/genres"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get("query") ?? "").trim()

  if (!query) {
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          "x-tmdb-key-present": hasTmdbApiKey() ? "1" : "0",
        },
      }
    )
  }

  try {
    const data = await tmdbFetchJson<any>("/search/movie", {
      query,
      include_adult: false,
      language: "en-US",
      page: 1,
    })

    // Search results use `genre_ids`; attach a resolved `genres` array for the UI.
    const genreMap = await getTmdbMovieGenreMap()
    const results = Array.isArray(data?.results)
      ? data.results.map((m: any) => {
          const explicit = extractGenreNames(m?.genres)
          const resolved = explicit.length > 0 ? explicit : mapGenreIdsToNames(m?.genre_ids, genreMap)
          return { ...m, genres: resolved }
        })
      : data?.results

    const enriched = { ...data, results }

    return NextResponse.json(enriched, {
      headers: {
        "x-tmdb-key-present": "1",
      },
    })
  } catch (err) {
    const keyPresent = hasTmdbApiKey()
    const message = err instanceof Error ? err.message : "Failed to search movies"

    return NextResponse.json(
      { error: message },
      {
        status: keyPresent ? 502 : 500,
        headers: {
          "x-tmdb-key-present": keyPresent ? "1" : "0",
        },
      }
    )
  }
}
