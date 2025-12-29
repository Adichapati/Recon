import { NextResponse } from "next/server"
import { hasTmdbApiKey, tmdbFetchJson } from "@/lib/tmdb-server"

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

    return NextResponse.json(data, {
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
