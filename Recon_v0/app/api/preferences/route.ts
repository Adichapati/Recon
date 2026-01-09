import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import type { Session } from "next-auth"

export const runtime = "nodejs"

type UserPreferences = {
  genres?: string[]
  moods?: string[]
  era?: string[]
  pacing?: string
  popularity?: string
  completed?: boolean
}

async function resolveStableUserId(session: Session | null) {
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

  // If we have an email, prefer the existing Supabase `users.id` for that email.
  if (email) {
    const { data: existing, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (error) {
      console.error("[preferences][resolveUserId] Supabase lookup error", error)
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
      console.error("[preferences][resolveUserId] Supabase user insert error", insertError)
      const msg = String(insertError.message || "")
      return { ok: false as const, error: msg || "User insert failed", status: 500 as const }
    }

    return { ok: true as const, userId: sessionUserId, supabase }
  }

  return { ok: false as const, error: "Unauthorized", status: 401 as const }
}

export async function GET() {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { supabase, userId } = resolved

  const { data, error } = await supabase
    .from("user_preferences")
    .select("genres, moods, era, pacing, popularity, completed")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    console.error("[preferences][GET] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Preferences query failed" }, { status })
  }

  // Return empty object if no preferences exist yet
  return NextResponse.json(data ?? {})
}

export async function POST(req: Request) {
  const session = await auth()

  const resolved = await resolveStableUserId(session)
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const { supabase, userId } = resolved

  let body: UserPreferences
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate and sanitize input
  const genres = Array.isArray(body.genres)
    ? body.genres.filter((g): g is string => typeof g === "string")
    : undefined
  const moods = Array.isArray(body.moods)
    ? body.moods.filter((m): m is string => typeof m === "string")
    : undefined
  const era = Array.isArray(body.era)
    ? body.era.filter((e): e is string => typeof e === "string")
    : undefined
  const pacing = typeof body.pacing === "string" ? body.pacing : undefined
  const popularity = typeof body.popularity === "string" ? body.popularity : undefined
  const completed = typeof body.completed === "boolean" ? body.completed : undefined

  const upsertData: Record<string, unknown> = { user_id: userId }
  if (genres !== undefined) upsertData.genres = genres
  if (moods !== undefined) upsertData.moods = moods
  if (era !== undefined) upsertData.era = era
  if (pacing !== undefined) upsertData.pacing = pacing
  if (popularity !== undefined) upsertData.popularity = popularity
  if (completed !== undefined) upsertData.completed = completed

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(upsertData, { onConflict: "user_id" })
    .select("genres, moods, era, pacing, popularity, completed")
    .single()

  if (error) {
    console.error("[preferences][POST] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Preferences upsert failed" }, { status })
  }

  return NextResponse.json(data)
}
