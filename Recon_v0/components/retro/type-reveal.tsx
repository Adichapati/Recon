"use client"

import { useEffect, useState, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"

interface TypeRevealProps {
  text: string
  /** Delay in ms before typing starts */
  delay?: number
  /** Time per character in ms */
  speed?: number
  /** CSS class for the text */
  className?: string
  /** Show a blinking cursor at the end */
  cursor?: boolean
  /** HTML tag to render */
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div"
  /** Called when the reveal finishes */
  onComplete?: () => void
}

/**
 * Typewriter / stepped text reveal.
 * Characters appear one-by-one with a stepped, mechanical cadence.
 * Respects prefers-reduced-motion — renders full text instantly.
 */
export function TypeReveal({
  text,
  delay = 0,
  speed = 45,
  className = "",
  cursor = true,
  as: Tag = "span",
  onComplete,
}: TypeRevealProps) {
  const prefersReduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(prefersReduced ? text : "")
  const [showCursor, setShowCursor] = useState(cursor)
  const completedRef = useRef(false)

  useEffect(() => {
    if (prefersReduced) {
      onComplete?.()
      return
    }

    setDisplayed("")
    completedRef.current = false

    const timeout = setTimeout(() => {
      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          completedRef.current = true
          onComplete?.()
        }
      }, speed)

      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, speed, prefersReduced])

  return (
    <Tag className={className}>
      {displayed}
      {showCursor && (
        <motion.span
          className="inline-block w-[0.55em] translate-y-[0.05em] border-b-2 border-current"
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, times: [0, 0.49, 0.5, 1], ease: "linear" }}
          aria-hidden="true"
        >
          &nbsp;
        </motion.span>
      )}
    </Tag>
  )
}
