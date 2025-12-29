import "server-only"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

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
