"use client"

/**
 * Client-side hook for invisible Cloudflare Turnstile.
 *
 * Usage:
 *   const { getToken } = useTurnstile()
 *   const token = await getToken()        // resolves with a token string
 *   // attach token to your request body or header
 *
 * The Turnstile script must be loaded globally (see layout.tsx).
 * This hook renders nothing visible — the widget is invisible / managed mode.
 */

import { useCallback } from "react"
import { getTurnstileToken } from "@/lib/turnstile-client"

export function useTurnstile() {
  const getToken = useCallback((): Promise<string> => {
    return getTurnstileToken()
  }, [])

  return { getToken }
}
