"use client"

import type React from "react"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"

interface FocusFrameProps {
  children: React.ReactNode
  className?: string
  /** Padding between the content and the drawn frame */
  inset?: number
  /** Frame color — defaults to the CSS accent variable */
  color?: string
  /** Enable/disable the frame draw animation */
  enabled?: boolean
}

/**
 * Draws a rectangular focus frame around its children on hover.
 * Four corner lines expand outward like a machine's selection reticle.
 * Respects prefers-reduced-motion — falls back to a simple border.
 */
export function FocusFrame({
  children,
  className = "",
  inset = 0,
  color = "var(--retro-accent)",
  enabled = true,
}: FocusFrameProps) {
  const [hovered, setHovered] = useState(false)
  const prefersReduced = useReducedMotion()

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  // Corner size as fraction of full edge
  const cornerLen = "35%"
  const thickness = "1px"

  const cornerVariants = {
    rest: { scaleX: 0, scaleY: 0 },
    hover: { scaleX: 1, scaleY: 1 },
  }

  const transition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.25, ease: "linear" as const }

  // Shared corner line styles
  const Corner = ({
    style,
    originX,
    originY,
  }: {
    style: React.CSSProperties
    originX: string
    originY: string
  }) => (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        ...style,
        borderColor: color,
        transformOrigin: `${originX} ${originY}`,
      }}
      variants={cornerVariants}
      transition={transition}
    />
  )

  return (
    <motion.div
      className={`relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial="rest"
      animate={hovered ? "hover" : "rest"}
    >
      {children}

      {/* Top-left corner */}
      <Corner
        style={{
          top: -inset,
          left: -inset,
          width: cornerLen,
          height: cornerLen,
          borderTop: thickness,
          borderLeft: thickness,
        }}
        originX="0%"
        originY="0%"
      />

      {/* Top-right corner */}
      <Corner
        style={{
          top: -inset,
          right: -inset,
          width: cornerLen,
          height: cornerLen,
          borderTop: thickness,
          borderRight: thickness,
        }}
        originX="100%"
        originY="0%"
      />

      {/* Bottom-left corner */}
      <Corner
        style={{
          bottom: -inset,
          left: -inset,
          width: cornerLen,
          height: cornerLen,
          borderBottom: thickness,
          borderLeft: thickness,
        }}
        originX="0%"
        originY="100%"
      />

      {/* Bottom-right corner */}
      <Corner
        style={{
          bottom: -inset,
          right: -inset,
          width: cornerLen,
          height: cornerLen,
          borderBottom: thickness,
          borderRight: thickness,
        }}
        originX="100%"
        originY="100%"
      />
    </motion.div>
  )
}
