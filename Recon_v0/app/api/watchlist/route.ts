import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import { verifyTurnstileToken } from "@/lib/turnstile"
import type { Session } from "next-auth"

export const runtime = "nodejs"

type WatchlistInsertBody = {
  id?: number
  title?: string
  poster_path?: string
  turnstileToken?: string
}

async function resolveStableUserId(session: Session | null) {
  const email = session?.user?.email ?? null
  const sessionUserId = session?.user?.id ? String(session.user.id) : null

  if (!email && !sessionUserId) {
    return { ok: false as const, error: "Unauthorized" }
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return { ok: false as const, error: message, status: 500 as const }
  }

  // If we have an email, prefer the existing Supabase `users.id` for that email.
  if (email) {
    const { data: existing, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      console.error("[watchlist][resolveUserId] Supabase lookup error", error)
      const msg = String(error.message || "")
      return { ok: false as const, error: msg || "User lookup failed", status: 500 as const }
    }

    if (existing?.id) {
      return { ok: true as const, userId: String(existing.id), supabase }
    }
  }

  // Fallback: use session user id (first login before user row exists).
  if (sessionUserId && email) {
    const { error: insertError } = await supabase.from("users").insert({
      id: sessionUserId,
      email,
      name: session?.user?.name ?? null,
      image: (session?.user as { image?: string | null } | null)?.image ?? null,
    })

    if (insertError) {
      console.error("[watchlist][resolveUserId] Supabase user insert error", insertError)
      const msg = String(insertError.message || "")
      return { ok: false as const, error: msg || "User insert failed", status: 500 as const }
    }

    return { ok: true as const, userId: sessionUserId, supabase }
  }

  return { ok: false as const, error: "Unauthorized", status: 401 as const }
}

const VALID_STATUSES = new Set(["watchlist", "completed"])

export async function GET(req: Request) {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 401 })
  }

  const { supabase, userId } = resolved

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status")

  let query = supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (statusFilter && VALID_STATUSES.has(statusFilter)) {
    query = query.eq("status", statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error("[watchlist][GET] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Watchlist query failed" }, { status })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 401 })
  }

  const { supabase, userId } = resolved

  const movie = (await req.json()) as WatchlistInsertBody

  // Verify Turnstile CAPTCHA
  const captcha = await verifyTurnstileToken(movie.turnstileToken)
  if (!captcha.success) {
    return NextResponse.json({ error: captcha.error }, { status: 403 })
  }

  const movieId = Number(movie?.id)
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  const { error } = await supabase.from("watchlist").insert({
    user_id: userId,
    movie_id: movieId,
    movie_title: movie.title ?? "",
    poster_path: movie.poster_path ?? "",
    status: "watchlist",
  })

  if (error) {
    console.error("[watchlist][POST] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Watchlist insert failed" }, { status })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(req: Request) {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 401 })
  }

  const { supabase, userId } = resolved

  const body = (await req.json()) as { movieId?: number; status?: string; turnstileToken?: string }

  // Verify Turnstile CAPTCHA
  const captcha = await verifyTurnstileToken(body.turnstileToken)
  if (!captcha.success) {
    return NextResponse.json({ error: captcha.error }, { status: 403 })
  }

  const movieId = Number(body?.movieId)
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  const newStatus = body?.status
  if (typeof newStatus !== "string" || !VALID_STATUSES.has(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const { error } = await supabase
    .from("watchlist")
    .update({ status: newStatus })
    .eq("user_id", userId)
    .eq("movie_id", movieId)

  if (error) {
    console.error("[watchlist][PATCH] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Status update failed" }, { status })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status ?? 401 })
  }

  const { supabase, userId } = resolved

  const body = (await req.json()) as { movieId?: number; turnstileToken?: string }

  // Verify Turnstile CAPTCHA
  const captcha = await verifyTurnstileToken(body.turnstileToken)
  if (!captcha.success) {
    return NextResponse.json({ error: captcha.error }, { status: 403 })
  }

  const movieId = Number(body?.movieId)
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("movie_id", movieId)

  if (error) {
    console.error("[watchlist][DELETE] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Watchlist delete failed" }, { status })
  }

  return NextResponse.json({ success: true })
}
