/**
 * Recon — Popup Script
 *
 * Reads the detected movie from chrome.storage.local
 * (written by content.js) and renders it in the popup.
 * Action buttons log to console for now (no backend calls).
 */

;(function () {
  "use strict"

  /* ── DOM refs ─────────────────────────────────────── */

  const $status    = document.getElementById("status-line")
  const $detected  = document.getElementById("detected")
  const $title     = document.getElementById("movie-title")
  const $source    = document.getElementById("movie-source")
  const $actions   = document.getElementById("actions")
  const $log       = document.getElementById("log")

  const $btnWatch  = document.getElementById("btn-watchlist")
  const $btnDone   = document.getElementById("btn-completed")
  const $btnIgnore = document.getElementById("btn-ignore")

  /* ── Settings panel refs ──────────────────────────── */

  const $btnSettings  = document.getElementById("btn-settings")
  const $settings     = document.getElementById("settings")
  const $terminal     = document.getElementById("terminal")
  const $tokenInput   = document.getElementById("token-input")
  const $btnSave      = document.getElementById("btn-save-token")
  const $btnBack      = document.getElementById("btn-back")
  const $tokenStatus  = document.getElementById("token-status")

  /** Currently detected movie data */
  let current = null

  /* ── Read detection from storage ──────────────────── */

  function loadDetection() {
    chrome.storage.local.get("recon_detected", (result) => {
      const data = result.recon_detected

      if (!data || !data.title) {
        showEmpty()
        return
      }

      current = data
      showDetected(data)
    })
  }

  /* ── Render states ────────────────────────────────── */

  function showEmpty() {
    $status.innerHTML = "&gt; no playback detected on this tab"
    $detected.classList.add("hidden")
    $actions.classList.add("hidden")
  }

  function showDetected(data) {
    $status.innerHTML = "&gt; playback detected"

    $title.textContent  = data.title
    var sourceLabel = {
      netflix: "Netflix",
      prime: "Prime Video",
    }[data.source] || data.source  // show hostname for generic sites
    $source.textContent = sourceLabel

    $detected.classList.remove("hidden")
    $actions.classList.remove("hidden")
  }

  function showLog(message) {
    $log.textContent = "> " + message
    $log.classList.remove("hidden")

    // Auto-hide after 3 seconds
    setTimeout(() => {
      $log.classList.add("hidden")
    }, 3000)
  }

  /* ── Action handlers ───────────────────────────────── */

  /** Disable all action buttons during a request */
  function setButtonsDisabled(disabled) {
    $btnWatch.disabled  = disabled
    $btnDone.disabled   = disabled
    $btnIgnore.disabled = disabled
  }

  function handleWatchlist() {
    if (!current) return
    setButtonsDisabled(true)
    showLog('Adding to watchlist…')

    chrome.runtime.sendMessage(
      {
        type:   "RECON_ADD",
        title:  current.title,
        source: current.source,
        url:    current.url,
        status: "watchlist",
        year:   current.year || undefined,
      },
      (response) => {
        setButtonsDisabled(false)
        if (chrome.runtime.lastError) {
          showLog("Error: " + chrome.runtime.lastError.message)
          return
        }
        if (!response || !response.ok) {
          showLog("Failed: " + (response?.error || "unknown error"))
          return
        }
        if (response.data?.duplicate) {
          showLog('Already in watchlist: "' + current.title + '"')
        } else {
          showLog('Added to Watchlist: "' + current.title + '"')
        }
      }
    )
  }

  function handleCompleted() {
    if (!current) return
    setButtonsDisabled(true)
    showLog('Marking as completed…')

    chrome.runtime.sendMessage(
      {
        type:   "RECON_ADD",
        title:  current.title,
        source: current.source,
        url:    current.url,
        status: "completed",
        year:   current.year || undefined,
      },
      (response) => {
        setButtonsDisabled(false)
        if (chrome.runtime.lastError) {
          showLog("Error: " + chrome.runtime.lastError.message)
          return
        }
        if (!response || !response.ok) {
          showLog("Failed: " + (response?.error || "unknown error"))
          return
        }
        showLog('Marked as Completed: "' + current.title + '"')
      }
    )
  }

  function handleIgnore() {
    if (!current) return
    // Clear the detection from storage — no backend call needed
    chrome.storage.local.remove("recon_detected")
    current = null
    showEmpty()
    showLog("Ignored — detection cleared")
  }

  /* ── Wire up buttons ──────────────────────────────── */

  $btnWatch.addEventListener("click",  handleWatchlist)
  $btnDone.addEventListener("click",   handleCompleted)
  $btnIgnore.addEventListener("click", handleIgnore)

  /* ── Settings panel ──────────────────────────────── */

  $btnSettings.addEventListener("click", () => {
    $terminal.classList.add("hidden")
    $settings.classList.remove("hidden")
    // Load saved token into input
    chrome.storage.local.get("recon_api_token", (result) => {
      $tokenInput.value = result.recon_api_token || ""
    })
  })

  $btnBack.addEventListener("click", () => {
    $settings.classList.add("hidden")
    $terminal.classList.remove("hidden")
    $tokenStatus.textContent = ""
  })

  $btnSave.addEventListener("click", () => {
    const token = $tokenInput.value.trim()
    if (!token) {
      // Clear token
      chrome.storage.local.remove("recon_api_token")
      $tokenStatus.textContent = "Token cleared"
      $tokenStatus.className = "token-saved"
      return
    }
    if (!token.startsWith("recon_")) {
      $tokenStatus.textContent = "Invalid token (must start with recon_)"
      $tokenStatus.className = "token-error"
      return
    }
    chrome.storage.local.set({ recon_api_token: token }, () => {
      $tokenStatus.textContent = "Token saved ✓"
      $tokenStatus.className = "token-saved"
    })
  })

  /* ── Init ─────────────────────────────────────────── */

  loadDetection()
})()
