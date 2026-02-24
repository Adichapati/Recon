/**
 * POST /api/extension/watchlist
 *
 * Called by the Recon Chrome extension's background service worker.
 * Receives a movie title (+ streaming source), resolves it to a TMDB
 * movie via search, and inserts it into the authenticated user's
 * Supabase watchlist.
 *
 * ── Request body ──────────────────────────────────────────
 *   { title: string, source: "netflix" | "prime", url?: string }
 *
 * ── Responses ─────────────────────────────────────────────
 *   200  { success: true, movie_id, movie_title }
 *   200  { success: true, duplicate: true }       (already in watchlist)
 *   400  { error: "..." }                         (bad input)
 *   401  { error: "Unauthorized" }                (no session)
 *   404  { error: "Movie not found on TMDB" }     (search yielded nothing)
 *   500  { error: "..." }                         (server error)
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import { tmdbFetchJson, hasTmdbApiKey } from "@/lib/tmdb-server"
import type { Session } from "next-auth"
import crypto from "crypto"

export const runtime = "nodejs"

/* ── Types ──────────────────────────────────────────────── */

interface ExtensionBody {
  title?: string
  source?: string
  url?: string
  status?: "watchlist" | "completed"
  year?: number | string
}

interface TmdbSearchResult {
  id: number
  title: string
  poster_path: string | null
  release_date?: string
  popularity?: number
  vote_count?: number
}

interface TmdbSearchResponse {
  results?: TmdbSearchResult[]
}

/* ── Token-based auth for Chrome extension ──────────────── */

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

/**
 * Resolve user from an API token (Authorization: Bearer recon_...).
 * Falls back to null if no token header or token is invalid.
 */
async function resolveUserByToken(req: Request) {
  const authHeader = req.headers.get("authorization") ?? ""
  if (!authHeader.startsWith("Bearer recon_")) return null

  const raw = authHeader.slice(7) // "Bearer " = 7 chars
  const hash = hashToken(raw)

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch {
    return null
  }

  const { data } = await supabase
    .from("extension_tokens")
    .select("user_id")
    .eq("token_hash", hash)
    .maybeSingle()

  if (!data?.user_id) return null

  return { ok: true as const, userId: String(data.user_id), supabase }
}

/* ── Session-based auth (localhost / same-origin) ───────── */

async function resolveUserBySession(session: Session | null) {
  const email = session?.user?.email ?? null
  const sessionUserId = session?.user?.id ? String(session.user.id) : null

  if (!email && !sessionUserId) {
    return { ok: false as const, error: "Unauthorized", status: 401 as const }
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return { ok: false as const, error: message, status: 500 as const }
  }

  if (email) {
    const { data: existing, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      console.error("[ext-watchlist] user lookup error", error)
      return { ok: false as const, error: "User lookup failed", status: 500 as const }
    }

    if (existing?.id) {
      return { ok: true as const, userId: String(existing.id), supabase }
    }
  }

  if (sessionUserId) {
    return { ok: true as const, userId: sessionUserId, supabase }
  }

  return { ok: false as const, error: "Unauthorized", status: 401 as const }
}

/* ── POST handler ───────────────────────────────────────── */

export async function POST(req: Request) {
  // ── 1. Authenticate (token-first, then session fallback) ──
  // Try token auth first (works cross-origin from extension in production)
  let resolved = await resolveUserByToken(req)

  // Fall back to session auth (works on localhost / same-origin)
  if (!resolved) {
    const session = await auth()
    const sessionResult = await resolveUserBySession(session)
    if (!sessionResult.ok) {
      return NextResponse.json(
        { error: sessionResult.error },
        { status: sessionResult.status }
      )
    }
    resolved = sessionResult
  }

  const { supabase, userId } = resolved

  // ── 2. Parse body ────────────────────────────────────
  let body: ExtensionBody
  try {
    body = (await req.json()) as ExtensionBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 })
  }

  // ── 3. Resolve title → TMDB movie ───────────────────
  if (!hasTmdbApiKey()) {
    return NextResponse.json({ error: "TMDB not configured" }, { status: 500 })
  }

  let movie: TmdbSearchResult | null = null
  const yearHint = body.year ? Number(body.year) : null

  try {
    // If we have a year hint, try a year-specific search first
    const searchParams: Record<string, string | number | boolean> = {
      query: title,
      include_adult: false,
      language: "en-US",
      page: 1,
    }
    if (yearHint && yearHint > 1900 && yearHint < 2100) {
      searchParams.year = yearHint
    }

    let data = await tmdbFetchJson<TmdbSearchResponse>("/search/movie", searchParams)

    // If year-specific search returned nothing, retry without year
    if ((!data.results || data.results.length === 0) && yearHint) {
      delete searchParams.year
      data = await tmdbFetchJson<TmdbSearchResponse>("/search/movie", searchParams)
    }

    if (data.results && data.results.length > 0) {
      // Pick the best match: score by popularity + recency + vote count.
      // A movie streaming on a platform is almost always the popular/recent one.
      movie = data.results.reduce((best, candidate) => {
        const score = (r: TmdbSearchResult) => {
          let s = 0
          // Popularity is the strongest signal (TMDB scale: 0-1000+)
          s += (r.popularity ?? 0)
          // Vote count acts as a tiebreaker for well-known movies
          s += Math.min(r.vote_count ?? 0, 5000) * 0.01
          // Slight boost for movies released in the last 10 years
          if (r.release_date) {
            const yr = parseInt(r.release_date.substring(0, 4), 10)
            if (yr >= new Date().getFullYear() - 10) s += 20
          }
          // Strong boost if the year matches our hint
          if (yearHint && r.release_date) {
            const yr = parseInt(r.release_date.substring(0, 4), 10)
            if (yr === yearHint) s += 200
          }
          // Exact title match gets a boost
          if (r.title.toLowerCase() === title.toLowerCase()) s += 50
          return s
        }
        return score(candidate) > score(best) ? candidate : best
      })

      console.log(
        `[ext-watchlist] Best match for "${title}": "${movie.title}" (${movie.release_date}) popularity=${movie.popularity}`
      )
    }
  } catch (err) {
    console.error("[ext-watchlist] TMDB search error:", err)
    return NextResponse.json({ error: "TMDB search failed" }, { status: 500 })
  }

  if (!movie) {
    return NextResponse.json({ error: "Movie not found on TMDB" }, { status: 404 })
  }

  // ── 4. Check for duplicates ─────────────────────────
  const { data: existing } = await supabase
    .from("watchlist")
    .select("movie_id")
    .eq("user_id", userId)
    .eq("movie_id", movie.id)
    .maybeSingle()

  if (existing) {
    // Already in watchlist — succeed silently
    return NextResponse.json({ success: true, duplicate: true })
  }

  // ── 5. Insert into watchlist ─────────────────────────
  const movieStatus = body.status === "completed" ? "completed" : "watchlist"

  // Ensure poster_path is a full URL (not a raw TMDB path like "/abc.jpg")
  const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500"
  let posterUrl = movie.poster_path ?? ""
  if (posterUrl && !posterUrl.startsWith("http")) {
    posterUrl = TMDB_POSTER_BASE + (posterUrl.startsWith("/") ? posterUrl : `/${posterUrl}`)
  }

  const { error: insertError } = await supabase.from("watchlist").insert({
    user_id: userId,
    movie_id: movie.id,
    movie_title: movie.title,
    poster_path: posterUrl,
    status: movieStatus,
  })

  if (insertError) {
    console.error("[ext-watchlist] Supabase insert error:", insertError)
    const msg = String(insertError.message || "")

    // Unique-constraint violation = duplicate (race-condition safe)
    if (/duplicate|unique|already exists/i.test(msg)) {
      return NextResponse.json({ success: true, duplicate: true })
    }

    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Insert failed" }, { status })
  }

  console.log(`[ext-watchlist] Added "${movie.title}" (${movie.id}) for user ${userId}`)

  return NextResponse.json({
    success: true,
    movie_id: movie.id,
    movie_title: movie.title,
  })
}
