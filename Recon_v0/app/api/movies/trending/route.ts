import { NextResponse } from "next/server"
import { hasTmdbApiKey, tmdbFetchJson } from "@/lib/tmdb-server"

export const runtime = "nodejs"

export async function GET() {
  try {
    const data = await tmdbFetchJson<any>("/trending/movie/week", {
      language: "en-US",
    })

    return NextResponse.json(data, {
      headers: {
        "x-tmdb-key-present": "1",
      },
    })
  } catch (err) {
    const keyPresent = hasTmdbApiKey()
    const message = err instanceof Error ? err.message : "Failed to fetch trending movies"

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
