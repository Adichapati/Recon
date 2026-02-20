import { NextResponse } from "next/server"
import crypto from "node:crypto"

import { getSupabaseAdminClient } from "@/lib/supabase"
import { hashPassword } from "@/lib/password"
import { verifyTurnstileToken } from "@/lib/turnstile"

export const runtime = "nodejs"

type SignupBody = {
  name?: string
  email?: string
  password?: string
  turnstileToken?: string
}

export async function POST(req: Request) {
  let body: SignupBody
  try {
    body = (await req.json()) as SignupBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Verify Turnstile CAPTCHA
  const captcha = await verifyTurnstileToken(body.turnstileToken)
  if (!captcha.success) {
    return NextResponse.json({ error: captcha.error }, { status: 403 })
  }

  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing name, email, or password" }, { status: 400 })
  }

  // Minimal validation; keep it production-safe without being overly opinionated.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  let supabase
  try {
    supabase = getSupabaseAdminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server misconfigured"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Ensure email uniqueness.
  const { data: existing, error: findError } = await supabase.from("users").select("id").eq("email", email).maybeSingle()
  if (findError) {
    return NextResponse.json({ error: findError.message || "User lookup failed" }, { status: 500 })
  }
  if (existing?.id) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  }

  const userId = crypto.randomUUID()
  const pw = await hashPassword(password)

  // Create the user row.
  const { error: insertUserError } = await supabase.from("users").insert({
    id: userId,
    email,
    name,
    image: null,
  })

  if (insertUserError) {
    return NextResponse.json({ error: insertUserError.message || "Failed to create user" }, { status: 500 })
  }

  // Store credentials separately so Google users remain untouched.
  // NOTE: Requires a `user_credentials` table; see README snippet in the repo if you need to create it.
  const { error: insertCredError } = await supabase.from("user_credentials").insert({
    user_id: userId,
    algo: pw.algo,
    params: pw.params,
    salt_b64: pw.saltB64,
    hash_b64: pw.hashB64,
  })

  if (insertCredError) {
    // Roll back the user row if credentials insert fails.
    await supabase.from("users").delete().eq("id", userId)

    const msg = String(insertCredError.message || "")
    const hint = /relation .*user_credentials.* does not exist/i.test(msg)
      ? "Missing table `user_credentials`. Create it in Supabase SQL editor."
      : ""

    return NextResponse.json(
      { error: msg || "Failed to store credentials", ...(hint ? { hint } : {}) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
