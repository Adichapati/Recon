"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * CRT-style page transition overlay.
 *
 * On route change:
 *  1. Screen rapidly squishes to a horizontal white line (power-off feel)
 *  2. Line fades out
 *  3. Slight delay, then new page is revealed
 *
 * Purely decorative — sits at z-[9990] with pointer-events: none.
 */
export function CrtTransition() {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [phase, setPhase] = useState<"idle" | "off" | "line" | "on">("idle")

  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname

    // Trigger transition
    setPhase("off")

    const t1 = setTimeout(() => setPhase("line"), 150)
    const t2 = setTimeout(() => setPhase("on"), 350)
    const t3 = setTimeout(() => setPhase("idle"), 550)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  if (phase === "idle") return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9990] flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Darkening overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#0b0b0b",
          opacity: phase === "off" ? 0.95 : phase === "line" ? 0.9 : 0,
          transition:
            phase === "off"
              ? "opacity 0.12s ease-in"
              : phase === "on"
                ? "opacity 0.2s ease-out"
                : "opacity 0.15s ease-out",
        }}
      />

      {/* Horizontal CRT shut-off line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: phase === "line" ? "2px" : phase === "off" ? "100vh" : "0px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(74,191,173,0.3) 20%, rgba(255,255,255,0.8) 50%, rgba(74,191,173,0.3) 80%, transparent 100%)",
          opacity: phase === "on" ? 0 : 1,
          transition:
            phase === "off"
              ? "height 0.15s cubic-bezier(0.4,0,1,1)"
              : phase === "line"
                ? "height 0.01s linear"
                : "opacity 0.2s ease-out, height 0.2s ease-out",
          boxShadow:
            phase === "line"
              ? "0 0 20px 4px rgba(74,191,173,0.5), 0 0 60px 8px rgba(74,191,173,0.2)"
              : "none",
        }}
      />
    </div>
  )
}
