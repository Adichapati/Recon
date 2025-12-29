import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"

export const runtime = "nodejs"

type WatchlistInsertBody = {
  id?: number
  title?: string
  poster_path?: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!session.user.email) {
    return NextResponse.json(
      { error: "Missing user email in session" },
      { status: 400 }
    )
  }

  const movie = (await req.json()) as WatchlistInsertBody
  const movieId = Number(movie?.id)
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Ensure the referenced user exists (FK: watchlist.user_id -> users.id).
  const { error: userUpsertError } = await supabase.from("users").upsert(
    {
      id: String(session.user.id),
      email: session.user.email,
      name: session.user.name ?? null,
      image: (session.user as { image?: string | null }).image ?? null,
    },
    { onConflict: "id" }
  )

  if (userUpsertError) {
    console.error("[watchlist][POST] Supabase user upsert error", userUpsertError)
    const msg = String(userUpsertError.message || "")
    return NextResponse.json(
      { error: msg || "User upsert failed" },
      { status: 500 }
    )
  }

  const { error } = await supabase.from("watchlist").insert({
    user_id: session.user.id,
    movie_id: movieId,
    movie_title: movie.title ?? "",
    poster_path: movie.poster_path ?? "",
  })

  if (error) {
    console.error("[watchlist][POST] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Watchlist insert failed" }, { status })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as { movieId?: number }
  const movieId = Number(body?.movieId)
  if (!Number.isFinite(movieId)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", session.user.id)
    .eq("movie_id", movieId)

  if (error) {
    console.error("[watchlist][DELETE] Supabase error", error)
    const msg = String(error.message || "")
    const status = /row-level security|permission denied/i.test(msg) ? 403 : 500
    return NextResponse.json({ error: msg || "Watchlist delete failed" }, { status })
  }

  return NextResponse.json({ success: true })
}
