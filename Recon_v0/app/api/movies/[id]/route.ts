import { NextResponse } from "next/server"
import { hasTmdbApiKey, tmdbFetchJson } from "@/lib/tmdb-server"

export const runtime = "nodejs"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const movieId = Number(id)
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  try {
    const data = await tmdbFetchJson<any>(`/movie/${encodeURIComponent(String(movieId))}`, {
      language: "en-US",
    })

    return NextResponse.json(data, {
      headers: {
        "x-tmdb-key-present": "1",
      },
    })
  } catch (err) {
    const keyPresent = hasTmdbApiKey()
    const message = err instanceof Error ? err.message : "Failed to fetch movie"

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
