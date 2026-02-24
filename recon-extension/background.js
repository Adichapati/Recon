/**
 * Recon — Background Service Worker (Manifest V3)
 *
 * Listens for movie detections written to chrome.storage.local
 * by the content script.  On first detection of a new title,
 * silently POSTs it to the Recon backend so it appears in the
 * user's watchlist.
 *
 * ── Flow ──────────────────────────────────────────────────
 * content.js  →  chrome.storage.local { recon_detected }
 *             →  background.js (this file) listens via onChanged
 *             →  POST /api/extension/watchlist
 *             →  if 401 → chrome.notifications "Sign in"
 */

;(function () {
  "use strict"

  /* ── Config ───────────────────────────────────────────── */

  /**
   * Base URL of the Recon Next.js app (Vercel deployment).
   */
  const API_BASE = "https://www.sprake.lol"
  const ENDPOINT = API_BASE + "/api/extension/watchlist"

  /**
   * Key used in chrome.storage.local to track the last title we
   * already synced, so we only call the backend once per detection.
   */
  const SYNCED_KEY = "recon_last_synced"

  /* ── Storage listener ─────────────────────────────────── */

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return
    if (!changes.recon_detected) return

    const detection = changes.recon_detected.newValue
    if (!detection || !detection.title) return

    // Build a stable fingerprint so we don't re-sync the same movie
    const fingerprint = detection.title + "|" + detection.source

    chrome.storage.local.get(SYNCED_KEY, (result) => {
      if (result[SYNCED_KEY] === fingerprint) {
        // Already synced this detection — skip
        return
      }

      // Mark as synced immediately (optimistic) to prevent duplicate calls
      chrome.storage.local.set({ [SYNCED_KEY]: fingerprint })

      syncToBackend(detection)
    })
  })

  /* ── Backend sync ─────────────────────────────────────── */

  /**
   * Reads the saved API token from chrome.storage.local.
   * Returns a promise that resolves to the token string or "".
   */
  function getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get("recon_api_token", (result) => {
        resolve(result.recon_api_token || "")
      })
    })
  }

  /**
   * POST the detected movie to the Recon backend.
   * Uses a Bearer token for auth (cross-origin, no cookies).
   *
   * Retries up to 2 times on network failures (server may be starting).
   */
  async function syncToBackend(detection, attempt) {
    attempt = attempt || 1
    const MAX_ATTEMPTS = 3

    const token = await getToken()
    if (!token) {
      console.warn("[Recon][BG] No API token configured — skipping sync")
      showSignInNotification()
      chrome.storage.local.remove(SYNCED_KEY)
      return
    }

    try {
      console.log("[Recon][BG] Syncing to", ENDPOINT, "attempt", attempt)

      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({
          title: detection.title,
          source: detection.source,
          url: detection.url,
          year: detection.year || undefined,
        }),
      })

      if (res.status === 401) {
        showSignInNotification()
        // Clear synced key so it retries after user signs in
        chrome.storage.local.remove(SYNCED_KEY)
        return
      }

      if (!res.ok) {
        const text = await res.text().catch(function () { return "" })
        console.warn("[Recon][BG] Backend returned", res.status, text)
        return
      }

      const data = await res.json()
      console.log("[Recon][BG] Synced to watchlist:", data)
    } catch (err) {
      console.error("[Recon][BG] Sync failed (attempt " + attempt + "):", err.message || err)

      // Retry on network errors (server might not be up yet)
      if (attempt < MAX_ATTEMPTS) {
        var delay = attempt * 2000 // 2s, 4s
        console.log("[Recon][BG] Retrying in", delay, "ms…")
        setTimeout(function () {
          syncToBackend(detection, attempt + 1)
        }, delay)
        return
      }

      // All retries exhausted — clear synced key so next detection retries
      chrome.storage.local.remove(SYNCED_KEY)
    }
  }

  /* ── Notification (401 → sign in) ─────────────────────── */

  /** Debounce flag — don't spam notifications. */
  let notifiedRecently = false

  function showSignInNotification() {
    if (notifiedRecently) return
    notifiedRecently = true

    chrome.notifications.create("recon-signin", {
      type: "basic",
      iconUrl: "icon-128.png",
      title: "Recon",
      message: "Sign in to sync your watchlist",
      priority: 1,
    })

    // Allow another notification after 5 minutes
    setTimeout(() => {
      notifiedRecently = false
    }, 5 * 60 * 1000)
  }

  /* ── Message handler (popup → background) ─────────── */

  /**
   * The popup sends { type: "RECON_ADD", ... } and we make the
   * API call here (single place for fetch + retry logic).
   *
   * Supported messages:
   *   { type: "RECON_ADD", title, source, url, status }
   *     status: "watchlist" | "completed"
   */
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== "RECON_ADD") return false

    const title = msg.title
    const status = msg.status || "watchlist"

    if (!title) {
      sendResponse({ ok: false, error: "No title" })
      return false
    }

    // Make the API call asynchronously and send response when done
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) {
          sendResponse({ ok: false, error: "No API token configured. Open extension settings (⚙) and paste your token." })
          return
        }

        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
          },
          body: JSON.stringify({
            title: title,
            source: msg.source || "unknown",
            url: msg.url || "",
            status: status,
            year: msg.year || undefined,
          }),
        })

        if (res.status === 401) {
          sendResponse({ ok: false, error: "Not signed in" })
          return
        }

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          sendResponse({ ok: false, error: text || "Server error " + res.status })
          return
        }

        const data = await res.json()
        sendResponse({ ok: true, data: data })
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Network error" })
      }
    })()

    // Return true to indicate we'll call sendResponse asynchronously
    return true
  })
})()
