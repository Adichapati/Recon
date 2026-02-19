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
 * Machine-like loading indicator.
 * Replaces spinners with a blinking block cursor and a slowly filling
 * dotted progress bar — feels like "system thinking".
 * Respects prefers-reduced-motion.
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
