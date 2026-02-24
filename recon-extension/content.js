/**
 * Recon — Content Script
 *
 * Injected into Netflix and Prime Video pages.
 * Detects active playback, extracts the movie/show title,
 * and stores it so the popup can read it on demand.
 *
 * ── Platform notes ────────────────────────────────────────
 * Netflix:     URL changes to /watch/<id>. document.title is reliable.
 * Prime Video: URL does NOT change to a /watch/ path. The player is an
 *              overlay rendered via JS. We detect playback by watching
 *              for a <video> element via MutationObserver and extract
 *              the title from player-overlay DOM nodes with retries.
 * Generic:     Any other site — watches for <video> elements and
 *              extracts title from document.title / headings / aria.
 *              Works on pstream, 123movies, etc.
 */

;(function () {
  "use strict"

  /* ── Extension context guard ──────────────────────────── */

  /**
   * After the extension is reloaded in chrome://extensions, old content
   * scripts on already-open tabs lose their connection. Any call to
   * chrome.* APIs throws "Extension context invalidated".
   *
   * We wrap every chrome.* call and, if the context is dead, stop all
   * intervals/observers so the orphaned script goes quiet.
   */
  let contextValid = true
  let cleanupFns = [] // functions to call when context dies

  function safeStorageSet(obj) {
    if (!contextValid) return
    try {
      chrome.storage.local.set(obj)
    } catch (e) {
      if (/context invalidated/i.test(e.message)) {
        contextValid = false
        teardown()
      }
    }
  }

  function teardown() {
    console.warn("[Recon] Extension context invalidated — stopping.")
    cleanupFns.forEach(function (fn) { fn() })
    cleanupFns = []
  }

  /* ── Helpers ──────────────────────────────────────────── */

  function getSource() {
    var host = location.hostname
    if (host.includes("netflix.com")) return "netflix"
    if (host.includes("primevideo.com")) return "prime"
    // Return cleaned hostname for any other site ("generic" mode)
    return host.replace(/^www\./, "")
  }

  /* ── Shared state ─────────────────────────────────────── */

  var lastTitle = null

  /**
   * Try to find a 4-digit year on the page (from meta tags, nearby text, etc.)
   * to help TMDB disambiguate movies with the same name.
   */
  function extractYear() {
    // 1. <meta> tags (common on streaming sites)
    var metaSelectors = [
      'meta[property="og:release_date"]',
      'meta[name="release_date"]',
      'meta[property="video:release_date"]',
      'meta[name="year"]',
    ]
    for (var i = 0; i < metaSelectors.length; i++) {
      var meta = document.querySelector(metaSelectors[i])
      if (meta) {
        var match = (meta.getAttribute("content") || "").match(/((?:19|20)\d{2})/)
        if (match) return parseInt(match[1], 10)
      }
    }

    // 2. Look for year in page text near the title / player
    var yearCandidates = document.querySelectorAll(
      "[class*='year'], [class*='release'], [class*='date'], [data-testid*='year'], .subtitle, .metadata, .info, .details"
    )
    for (var j = 0; j < yearCandidates.length; j++) {
      var text = (yearCandidates[j].textContent || "").trim()
      var ym = text.match(/\b((?:19|20)\d{2})\b/)
      if (ym) return parseInt(ym[1], 10)
    }

    // 3. document.title sometimes has the year: "Greenland (2020)"
    var titleYear = (document.title || "").match(/\(?((?:19|20)\d{2})\)?/)
    if (titleYear) return parseInt(titleYear[1], 10)

    return null
  }

  function publish(title, source) {
    if (!title || title === lastTitle) return
    lastTitle = title
    var year = extractYear()
    var payload = {
      title: title,
      source: source,
      url: location.href,
      detectedAt: Date.now(),
    }
    if (year) payload.year = year
    safeStorageSet({ recon_detected: payload })
    console.log("[Recon] Detected:", payload)
  }

  function clearDetection() {
    if (lastTitle !== null) {
      lastTitle = null
      safeStorageSet({ recon_detected: null })
    }
  }

  /* ════════════════════════════════════════════════════════
   *  NETFLIX — URL-based detection (unchanged)
   * ════════════════════════════════════════════════════════ */

  function netflixIsPlaying() {
    return /^\/watch\//.test(location.pathname)
  }

  function netflixExtractTitle() {
    var title = ""
    var raw = document.title || ""
    title = raw.replace(/\s*\|\s*Netflix.*$/i, "").trim()

    if (!title || title.length < 2) {
      var el =
        document.querySelector("[data-uia='video-title']") ||
        document.querySelector(".ellipsize-text") ||
        document.querySelector(".title-logo")
      if (el) title = (el.textContent || el.getAttribute("alt") || "").trim()
    }
    return title || null
  }

  function detectNetflix() {
    if (!contextValid) return
    if (!netflixIsPlaying()) {
      clearDetection()
      return
    }
    var title = netflixExtractTitle()
    if (title) publish(title, "netflix")
  }

  /* ════════════════════════════════════════════════════════
   *  PRIME VIDEO — <video>-element + MutationObserver
   * ════════════════════════════════════════════════════════ */

  /**
   * Expanded selector list for Prime Video title.
   * Prime's DOM varies by region, device, and A/B test group.
   */
  var PRIME_TITLE_SELECTORS = [
    // Player SDK title (most common)
    '[data-testid="atvwebplayersdk-title-text"]',
    ".atvwebplayersdk-title-text",
    // X-Ray panel
    '[data-testid="xray-title"]',
    // Player overlay container headings
    ".atvwebplayersdk-overlays-container h1",
    ".atvwebplayersdk-overlays-container [class*='title']",
    // Detail page title (visible when player opens from detail page)
    "[data-automation-id='title']",
    ".dv-node-dp-title",
    'h1[data-automation-id="title"]',
    // Generic: any visible h1 in the player root
    "#dv-web-player h1",
    ".dv-player-fullscreen h1",
  ]

  function primeExtractTitle() {
    // ── DOM selectors (primary) ─────────────────────────
    for (var i = 0; i < PRIME_TITLE_SELECTORS.length; i++) {
      var el = document.querySelector(PRIME_TITLE_SELECTORS[i])
      if (el) {
        var text = (el.textContent || "").trim()
        if (text.length >= 2) {
          console.log("[Recon][Prime] Title found via selector:", PRIME_TITLE_SELECTORS[i], "→", text)
          return text
        }
      }
    }

    // ── aria-label on video or player container ─────────
    var videos = document.querySelectorAll("video")
    for (var v = 0; v < videos.length; v++) {
      var label = videos[v].getAttribute("aria-label") || ""
      if (label.length >= 2) {
        console.log("[Recon][Prime] Title found via video aria-label:", label)
        return label
      }
    }

    // ── document.title fallback (last resort) ───────────
    var raw = (document.title || "")
      .replace(/^Watch\s+/i, "")
      .replace(/\s*[\|–\-]\s*Prime Video.*$/i, "")
      .replace(/\s*[\|–\-]\s*Amazon\.com.*$/i, "")
      .replace(/\s*-\s*Amazon\.com.*$/i, "")
      .trim()

    if (raw.length >= 2) {
      console.log("[Recon][Prime] Title found via document.title:", raw)
      return raw
    }

    return null
  }

  var primeSessionUrl = null
  var primeRetryTimer = null
  var primeRetriesLeft = 0

  function primeAttemptExtraction() {
    if (!contextValid) return

    var title = primeExtractTitle()

    if (title) {
      var sessionKey = title + "|" + location.href
      if (sessionKey !== primeSessionUrl) {
        primeSessionUrl = sessionKey
        publish(title, "prime")
      }
      primeRetriesLeft = 0
      if (primeRetryTimer) { clearInterval(primeRetryTimer); primeRetryTimer = null }
      return
    }

    if (primeRetriesLeft <= 0) {
      console.log("[Recon][Prime] Title extraction failed after retries.")
      if (primeRetryTimer) { clearInterval(primeRetryTimer); primeRetryTimer = null }
    }
  }

  function primeStartExtraction() {
    if (primeRetryTimer) return

    // 10 retries × 500ms = 5 seconds (Prime can be slow to render overlays)
    primeRetriesLeft = 10
    primeRetryTimer = setInterval(function () {
      primeRetriesLeft--
      primeAttemptExtraction()
    }, 500)

    // Also try immediately
    primeAttemptExtraction()
  }

  function primeHasActiveVideo() {
    var videos = document.querySelectorAll("video")
    if (videos.length === 0) return false

    for (var i = 0; i < videos.length; i++) {
      var v = videos[i]
      // A video with any sign of life counts
      if (v.readyState >= 1 || v.currentTime > 0 || !v.paused || v.src) {
        return true
      }
    }
    // Even a bare <video> with no src yet counts — Prime creates
    // the element before assigning the stream
    return videos.length > 0
  }

  var primeWasPlaying = false

  function primeCheckPlayback() {
    if (!contextValid) return
    var playing = primeHasActiveVideo()

    if (playing && !primeWasPlaying) {
      console.log("[Recon][Prime] Video element detected — starting title extraction.")
      primeWasPlaying = true
      primeStartExtraction()
    } else if (playing && primeWasPlaying && !primeRetryTimer && !lastTitle) {
      // Video is still there but we never got a title — retry
      console.log("[Recon][Prime] Video still present, no title yet — retrying.")
      primeStartExtraction()
    } else if (!playing && primeWasPlaying) {
      console.log("[Recon][Prime] Video element gone — clearing detection.")
      primeWasPlaying = false
      primeSessionUrl = null
      clearDetection()
      if (primeRetryTimer) { clearInterval(primeRetryTimer); primeRetryTimer = null }
    }
  }

  /* ════════════════════════════════════════════════════════
   *  GENERIC — works on ANY site with a <video> element
   * ════════════════════════════════════════════════════════ */

  /**
   * For unknown streaming sites we:
   * 1. Watch for <video> elements (MutationObserver)
   * 2. Once a video is playing, extract title from:
   *    - <title> tag (cleaned)
   *    - any nearby <h1> / <h2>
   *    - video aria-label
   */

  /**
   * Clean a raw extracted title:
   * - Remove common streaming-site noise (quality tags, "Watch", etc.)
   * - Remove year in parentheses (we extract year separately)
   * - Strip trailing punctuation artifacts
   */
  function cleanTitle(raw) {
    if (!raw) return null
    var t = raw
      // Remove quality tags: 1080p, 720p, HD, CAM, etc.
      .replace(/\b(1080p|720p|480p|2160p|4k|hd|cam|ts|hdrip|brrip|bluray|webrip|web-dl)\b/gi, "")
      // Remove "Watch … Online", "Watch … Free", "Watch … Streaming"
      .replace(/^Watch\s+/i, "")
      .replace(/\s+(Online|Free|Streaming|Full\s+Movie|HD).*$/i, "")
      // Remove site name suffixes: " - PStream", " | 123Movies", " - Fmovies" etc.
      .replace(/\s*[\|–\-—]\s*(pstream|123movies|fmovies|putlocker|gomovies|solarmovie|yesmovies|primewire|flixtor|bflix|soap2day|hdtoday|myflixer|lookmovie|cineb)[^a-z]*$/i, "")
      // Generic suffix strip: " - SiteName" or " | SiteName"
      .replace(/\s*[\|–\-—]\s*[^\|–\-—]*$/i, "")
      // Remove year in parens since we extract it separately
      .replace(/\s*\((?:19|20)\d{2}\)\s*/g, " ")
      // Remove "Season X", "S01E02", episode info
      .replace(/\s*[\-–—]\s*Season\s+\d+.*/i, "")
      .replace(/\s*S\d{1,2}E\d{1,2}.*/i, "")
      // Clean up extra whitespace
      .replace(/\s+/g, " ")
      .trim()
    return t.length >= 2 ? t : null
  }

  function genericExtractTitle() {
    // ── aria-label on the video itself ──────────────────
    var videos = document.querySelectorAll("video")
    for (var v = 0; v < videos.length; v++) {
      var label = (videos[v].getAttribute("aria-label") || "").trim()
      if (label.length >= 2) {
        console.log("[Recon][Generic] Title via video aria-label:", label)
        return cleanTitle(label)
      }
    }

    // ── Closest heading to the video player ─────────────
    for (var v2 = 0; v2 < videos.length; v2++) {
      var parent = videos[v2].parentElement
      // Walk up a few levels looking for headings
      for (var depth = 0; depth < 6 && parent; depth++) {
        var heading = parent.querySelector("h1, h2, [class*='title' i]")
        if (heading) {
          var text = (heading.textContent || "").trim()
          if (text.length >= 2 && text.length < 200) {
            console.log("[Recon][Generic] Title via nearby heading:", text)
            return cleanTitle(text)
          }
        }
        parent = parent.parentElement
      }
    }

    // ── Page-level headings ─────────────────────────────
    var h1 = document.querySelector("h1")
    if (h1) {
      var h1Text = (h1.textContent || "").trim()
      if (h1Text.length >= 2 && h1Text.length < 200) {
        console.log("[Recon][Generic] Title via page h1:", h1Text)
        return cleanTitle(h1Text)
      }
    }

    // ── document.title fallback ─────────────────────────
    var raw = (document.title || "")
    var cleaned = cleanTitle(raw)
    if (cleaned) {
      console.log("[Recon][Generic] Title via document.title:", cleaned)
      return cleaned
    }

    return null
  }

  var genericSessionUrl = null
  var genericRetryTimer = null
  var genericRetriesLeft = 0

  function genericAttemptExtraction() {
    if (!contextValid) return

    var title = genericExtractTitle()

    if (title) {
      var sessionKey = title + "|" + location.href
      if (sessionKey !== genericSessionUrl) {
        genericSessionUrl = sessionKey
        publish(title, getSource())
      }
      genericRetriesLeft = 0
      if (genericRetryTimer) { clearInterval(genericRetryTimer); genericRetryTimer = null }
      return
    }

    if (genericRetriesLeft <= 0) {
      console.log("[Recon][Generic] Title extraction failed after retries.")
      if (genericRetryTimer) { clearInterval(genericRetryTimer); genericRetryTimer = null }
    }
  }

  function genericStartExtraction() {
    if (genericRetryTimer) return

    // 15 retries × 500ms = 7.5 seconds
    genericRetriesLeft = 15
    genericRetryTimer = setInterval(function () {
      genericRetriesLeft--
      genericAttemptExtraction()
    }, 500)

    genericAttemptExtraction()
  }

  function genericHasActiveVideo() {
    var videos = document.querySelectorAll("video")
    if (videos.length === 0) return false

    for (var i = 0; i < videos.length; i++) {
      var vid = videos[i]
      // Check if the video has meaningful dimensions (not hidden/tiny ad)
      var rect = vid.getBoundingClientRect()
      if (rect.width < 100 || rect.height < 60) continue

      if (vid.readyState >= 1 || vid.currentTime > 0 || !vid.paused || vid.src || vid.querySelector("source")) {
        return true
      }
    }
    return false
  }

  var genericWasPlaying = false

  function genericCheckPlayback() {
    if (!contextValid) return
    var playing = genericHasActiveVideo()

    if (playing && !genericWasPlaying) {
      console.log("[Recon][Generic] Video element detected on", location.hostname)
      genericWasPlaying = true
      genericStartExtraction()
    } else if (playing && genericWasPlaying && !genericRetryTimer && !lastTitle) {
      console.log("[Recon][Generic] Video still present, no title yet — retrying.")
      genericStartExtraction()
    } else if (!playing && genericWasPlaying) {
      console.log("[Recon][Generic] Video gone — clearing detection.")
      genericWasPlaying = false
      genericSessionUrl = null
      clearDetection()
      if (genericRetryTimer) { clearInterval(genericRetryTimer); genericRetryTimer = null }
    }
  }

  /* ── Bootstrap per-platform ───────────────────────────── */

  var source = getSource()

  if (source === "netflix") {
    /* ── Netflix ──────────────────────────────────────── */
    detectNetflix()
    var nfInterval = setInterval(detectNetflix, 2000)
    cleanupFns.push(function () { clearInterval(nfInterval) })
    console.log("[Recon][Netflix] Content script loaded.")

  } else if (source === "prime") {
    /* ── Prime Video ──────────────────────────────────── */
    var primeObserver = new MutationObserver(function () {
      primeCheckPlayback()
    })
    primeObserver.observe(document.body, { childList: true, subtree: true })
    cleanupFns.push(function () { primeObserver.disconnect() })

    var primeInterval = setInterval(primeCheckPlayback, 3000)
    cleanupFns.push(function () { clearInterval(primeInterval) })

    primeCheckPlayback()
    console.log("[Recon][Prime] Content script loaded on", location.href)

  } else {
    /* ── Generic (any other site with <video>) ────────── */
    // Only activate if a <video> exists or gets added
    var genericObserver = new MutationObserver(function () {
      genericCheckPlayback()
    })
    genericObserver.observe(document.body, { childList: true, subtree: true })
    cleanupFns.push(function () { genericObserver.disconnect() })

    var genericInterval = setInterval(genericCheckPlayback, 3000)
    cleanupFns.push(function () { clearInterval(genericInterval) })

    genericCheckPlayback()
    console.log("[Recon][Generic] Content script loaded on", location.hostname)
  }

  /* ── Message listener (popup can request a fresh scan) ── */

  try {
    chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
      if (!contextValid) return
      if (msg.type === "RECON_PING") {
        if (source === "netflix") detectNetflix()
        else if (source === "prime") primeCheckPlayback()
        else genericCheckPlayback()
        sendResponse({ title: lastTitle, source: getSource() })
      }
    })
  } catch (e) {
    // Context already dead at load time — nothing to do
  }
})()
