"use client"

import { type ReactNode } from "react"

interface TerminalLineProps {
  /** Prefix character: ">" for system, "$" for user, none for raw output */
  prefix?: ">" | "$" | ""
  children: ReactNode
  className?: string
  /** Dim the line (used for past/completed lines) */
  dim?: boolean
}

/**
 * A single line in the terminal output.
 * Renders with an optional prefix glyph and monospace styling.
 */
export function TerminalLine({
  prefix = ">",
  children,
  className = "",
  dim = false,
}: TerminalLineProps) {
  return (
    <div
      className={`flex gap-2 font-retro text-sm leading-relaxed ${
        dim ? "text-muted-foreground/50" : "text-foreground"
      } ${className}`}
    >
      {prefix !== "" && (
        <span
          className={`shrink-0 select-none ${
            prefix === ">"
              ? "text-primary"
              : prefix === "$"
                ? "text-muted-foreground"
                : ""
          }`}
          aria-hidden="true"
        >
          {prefix}
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </div>
  )
}
