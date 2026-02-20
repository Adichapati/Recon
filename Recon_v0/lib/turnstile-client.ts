/**
 * Client-side Cloudflare Turnstile token acquisition.
 *
 * This is a standalone function (no React dependency) so it can be called
 * from plain utility modules like `lib/watchlist.ts`.
 *
 * The Turnstile script must be loaded globally via `<Script>` in layout.tsx.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""

/** Lazily create a hidden container for Turnstile widgets */
function getContainer(): HTMLDivElement {
  let el = document.getElementById(
    "__turnstile_container"
  ) as HTMLDivElement | null
  if (!el) {
    el = document.createElement("div")
    el.id = "__turnstile_container"
    el.style.position = "fixed"
    el.style.left = "-9999px"
    el.style.top = "-9999px"
    el.style.width = "0"
    el.style.height = "0"
    el.style.overflow = "hidden"
    document.body.appendChild(el)
  }
  return el
}

/**
 * Obtain a Turnstile token invisibly.
 * Resolves with the token string, or rejects on failure.
 */
export function getTurnstileToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.turnstile) {
      reject(new Error("Turnstile not loaded"))
      return
    }

    if (!SITE_KEY) {
      reject(new Error("Turnstile site key not configured"))
      return
    }

    const container = getContainer()
    const child = document.createElement("div")
    container.appendChild(child)

    try {
      const widgetId = window.turnstile.render(child, {
        sitekey: SITE_KEY,
        size: "invisible",
        callback: (token: string) => {
          resolve(token)
          try {
            window.turnstile?.remove(widgetId)
          } catch {
            /* ignore */
          }
          child.remove()
        },
        "error-callback": () => {
          reject(new Error("Captcha challenge failed"))
          try {
            window.turnstile?.remove(widgetId)
          } catch {
            /* ignore */
          }
          child.remove()
        },
        "expired-callback": () => {
          reject(new Error("Captcha token expired"))
          try {
            window.turnstile?.remove(widgetId)
          } catch {
            /* ignore */
          }
          child.remove()
        },
      })
    } catch (err) {
      child.remove()
      reject(err)
    }
  })
}
