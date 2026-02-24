"use client"

import { motion, useReducedMotion } from "framer-motion"

interface RetroLoaderProps {
  /** Text shown next to the cursor */
  label?: string
  className?: string
  /** "inline" = small cursor + label; "block" = centered block with more presence */
  variant?: "inline" | "block"
}

/**
 * Cassette-tape loading indicator.
 * A decorative cassette with spinning reels, plus a dotted progress bar
 * and blinking cursor. Respects prefers-reduced-motion.
 */
export function RetroLoader({
  label = "LOADING",
  className = "",
  variant = "block",
}: RetroLoaderProps) {
  const prefersReduced = useReducedMotion()

  const cursorAnimation = prefersReduced
    ? {}
    : { animate: { opacity: [1, 1, 0, 0] }, transition: { duration: 1, repeat: Infinity, times: [0, 0.49, 0.5, 1], ease: "linear" as const } }

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-retro-accent ${className}`}>
        <span>{label}</span>
        <motion.span className="inline-block h-3.5 w-2 bg-retro-accent" {...cursorAnimation} aria-hidden="true" />
      </span>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 ${className}`}>

      {/* ── Cassette tape visual ── */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 120, height: 68 }}
        aria-hidden="true"
      >
        {/* Tape body */}
        <div
          className="absolute inset-0 rounded-sm border border-border/40 bg-card/60"
          style={{ boxShadow: "inset 0 0 12px rgba(74,191,173,0.05)" }}
        />

        {/* Window (transparent tape window) */}
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-sm border border-border/30 bg-black/40"
          style={{ width: 70, height: 24 }}
        />

        {/* Left reel */}
        <motion.div
          className="absolute rounded-full border border-primary/30"
          style={{
            width: 20, height: 20,
            left: 30, top: 6,
            background: "radial-gradient(circle, rgba(74,191,173,0.2) 0%, transparent 70%)",
          }}
          {...(prefersReduced
            ? {}
            : {
                animate: { rotate: 360 },
                transition: { duration: 2, repeat: Infinity, ease: "linear" },
              })}
        >
          {/* Reel spokes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-primary/20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-primary/20" />
          </div>
          {/* Center dot */}
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30" />
        </motion.div>

        {/* Right reel */}
        <motion.div
          className="absolute rounded-full border border-primary/30"
          style={{
            width: 20, height: 20,
            right: 30, top: 6,
            background: "radial-gradient(circle, rgba(74,191,173,0.2) 0%, transparent 70%)",
          }}
          {...(prefersReduced
            ? {}
            : {
                animate: { rotate: -360 },
                transition: { duration: 3, repeat: Infinity, ease: "linear" },
              })}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px bg-primary/20" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-full bg-primary/20" />
          </div>
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30" />
        </motion.div>

        {/* Tape path line between reels */}
        <div
          className="absolute"
          style={{
            left: 41, right: 41, top: 15, height: 1,
            background: "linear-gradient(90deg, rgba(200,168,50,0.3), rgba(74,191,173,0.3))",
          }}
        />

        {/* Label area */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="font-retro text-[6px] uppercase tracking-[0.15em] text-primary/30">
            RECON MIX
          </div>
        </div>

        {/* Bottom screw holes */}
        <div className="absolute bottom-1.5 left-3 h-1 w-1 rounded-full border border-border/20" />
        <div className="absolute bottom-1.5 right-3 h-1 w-1 rounded-full border border-border/20" />
      </div>

      {/* Dotted progress line */}
      <div className="flex gap-1" role="status" aria-label={label}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1 w-3 bg-retro-accent/30"
            {...(prefersReduced
              ? {}
              : {
                  animate: { opacity: [0.2, 1, 0.2] },
                  transition: {
                    duration: 1.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "linear",
                  },
                })}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-retro-accent/70">
        <span>[ {label} ]</span>
        <motion.span className="inline-block h-3.5 w-2 bg-retro-accent/70" {...cursorAnimation} aria-hidden="true" />
      </div>
    </div>
  )
}
