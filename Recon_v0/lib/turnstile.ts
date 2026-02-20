/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Verifies a Turnstile token by calling the siteverify endpoint.
 * Returns `{ success: true }` when the token is valid, or
 * `{ success: false, error: string }` when verification fails.
 *
 * Fails closed: any network / config error is treated as a failure.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

interface TurnstileResult {
  success: boolean
  error?: string
}

export async function verifyTurnstileToken(
  token: string | null | undefined
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not set")
    return { success: false, error: "Server misconfigured" }
  }

  if (!token || typeof token !== "string") {
    return { success: false, error: "Missing captcha token" }
  }

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    })

    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP error", res.status)
      return { success: false, error: "Captcha verification failed" }
    }

    const data = (await res.json()) as { success?: boolean }
    if (!data.success) {
      return { success: false, error: "Captcha verification failed" }
    }

    return { success: true }
  } catch (err) {
    console.error("[turnstile] siteverify network error", err)
    return { success: false, error: "Captcha verification failed" }
  }
}
