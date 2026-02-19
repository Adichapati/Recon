"use client"

import type React from "react"
import { motion, useReducedMotion } from "framer-motion"

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  /** Delay in seconds before the animation starts */
  delay?: number
  /** How far the element travels (px) */
  distance?: number
  /** Direction of travel */
  direction?: "up" | "down" | "left" | "right"
  /** Once animated, don't re-animate */
  once?: boolean
}

/**
 * Wraps children in a motion.div that fades + slides in when scrolled into view.
 * Respects prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  distance = 24,
  direction = "up",
  once = true,
}: ScrollRevealProps) {
  const prefersReduced = useReducedMotion()

  const axis = direction === "up" || direction === "down" ? "y" : "x"
  const sign = direction === "down" || direction === "right" ? -1 : 1

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, [axis]: distance * sign }}
      whileInView={{ opacity: 1, [axis]: 0 }}
      viewport={{ once, amount: 0.12 }}
      transition={{ duration: 0.55, delay, ease: "easeOut" as const }}
    >
      {children}
    </motion.div>
  )
}
