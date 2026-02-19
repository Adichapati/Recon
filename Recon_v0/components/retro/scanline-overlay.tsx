"use client"

import { useReducedMotion } from "framer-motion"

interface ScanlineOverlayProps {
  /** Opacity of the scanline effect (0–1). Keep very low for taste. */
  opacity?: number
  /** Also render a subtle pixel-noise texture */
  noise?: boolean
}

/**
 * Full-screen scanline + optional noise overlay.
 * Purely decorative — sits on top of everything with pointer-events: none.
 * Respects prefers-reduced-motion by not rendering at all.
 */
export function ScanlineOverlay({ opacity = 0.03, noise = true }: ScanlineOverlayProps) {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) return null

  return (
    <>
      {/* Horizontal scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999]"
        aria-hidden="true"
        style={{
          opacity,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Pixel noise — very subtle static grain */}
      {noise && (
        <div
          className="pointer-events-none fixed inset-0 z-[9998] animate-retro-noise"
          aria-hidden="true"
          style={{
            opacity: opacity * 0.7,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />
      )}
    </>
  )
}
