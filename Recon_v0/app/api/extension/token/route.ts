/**
 * POST /api/extension/token
 *
 * Generates (or regenerates) a personal API token for the Chrome
 * extension.  The raw token is returned once; only a SHA-256 hash
 * is stored in Supabase.
 *
 * GET /api/extension/token — returns whether a token exists (not the token itself).
 * DELETE /api/extension/token — revokes the current token.
 *
 * All endpoints require a valid NextAuth session.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import crypto from "crypto"

export const runtime = "nodejs"

/* ── Helpers ───────────────────────────────────────────── */

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

function generateToken(): string {
  // "recon_" prefix + 40 hex chars = easy to identify
  return "recon_" + crypto.randomBytes(20).toString("hex")
}

async function resolveUserId(session: any) {
  const email = session?.user?.email ?? null
  if (!email) return null

  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  return data?.id ? { userId: String(data.id), supabase } : null
}

/* ── GET — check if token exists ───────────────────────── */

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolved = await resolveUserId(session)
  if (!resolved) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { data } = await resolved.supabase
    .from("extension_tokens")
    .select("created_at")
    .eq("user_id", resolved.userId)
    .maybeSingle()

  return NextResponse.json({
    hasToken: !!data,
    createdAt: data?.created_at ?? null,
  })
}

/* ── POST — generate new token ─────────────────────────── */

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolved = await resolveUserId(session)
  if (!resolved) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const { supabase, userId } = resolved
  const raw = generateToken()
  const hash = hashToken(raw)

  // Upsert — replaces any existing token
  const { error } = await supabase.from("extension_tokens").upsert(
    { user_id: userId, token_hash: hash, created_at: new Date().toISOString() },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("[ext-token] upsert error:", error)
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 })
  }

  // Return the raw token — this is the only time it's shown
  return NextResponse.json({ token: raw })
}

/* ── DELETE — revoke token ─────────────────────────────── */

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolved = await resolveUserId(session)
  if (!resolved) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await resolved.supabase
    .from("extension_tokens")
    .delete()
    .eq("user_id", resolved.userId)

  return NextResponse.json({ revoked: true })
}
