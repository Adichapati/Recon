"use client"

import { motion, useReducedMotion } from "framer-motion"

interface BlinkingCursorProps {
  className?: string
}

/**
 * A block-style blinking cursor (▊).
 * Uses stepped animation for a hard on/off blink — no fade.
 * Returns a static block for prefers-reduced-motion.
 */
export function BlinkingCursor({ className = "" }: BlinkingCursorProps) {
  const prefersReduced = useReducedMotion()

  if (prefersReduced) {
    return (
      <span className={`inline-block font-retro text-primary ${className}`} aria-hidden="true">
        ▊
      </span>
    )
  }

  return (
    <motion.span
      className={`inline-block font-retro text-primary ${className}`}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, times: [0, 0.49, 0.5, 1], ease: "linear" }}
      aria-hidden="true"
    >
      ▊
    </motion.span>
  )
}
