"use client"

import type { Movie } from "@/lib/mock-api"
import { RecommendationRow } from "./recommendation-row"
import { BlinkingCursor } from "./blinking-cursor"
import { TerminalLine } from "./terminal-line"

interface RecommendationFeedProps {
  /** Section label shown as a system header */
  label: string
  /** Optional secondary tag (e.g. "TMDB_API", "ADAPTIVE_ENGINE") */
  source?: string
  movies: Movie[]
  /** Show recommendation reason on each row */
  showReason?: boolean
  /** Offset the stagger index (for multiple feeds on the same page) */
  staggerOffset?: number
}

/**
 * Terminal-style movie feed.
 * Renders a header line, column labels, and staggered RecommendationRows.
 */
export function RecommendationFeed({
  label,
  source,
  movies,
  showReason = false,
  staggerOffset = 0,
}: RecommendationFeedProps) {
  return (
    <section className="w-full">
      {/* ── Section header ──────────────────────────── */}
      <div className="mb-4 flex items-baseline justify-between gap-4 px-4 sm:px-6">
        <TerminalLine prefix=">" className="text-xs text-foreground">
          <span className="font-retro uppercase tracking-[0.2em]">{label}</span>
          {source && (
            <span className="ml-3 text-muted-foreground/40">// {source}</span>
          )}
        </TerminalLine>
        <span className="font-retro text-[10px] tabular-nums text-muted-foreground/40">
          {movies.length} RESULTS
        </span>
      </div>

      {/* ── Column labels ───────────────────────────── */}
      <div className="flex items-baseline gap-x-4 border-b border-border/30 px-4 pb-1.5 sm:gap-x-6 sm:px-6">
        <span className="hidden font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30 sm:inline sm:w-8">
          ID
        </span>
        <span className="flex-1 font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30">
          TITLE
        </span>
        <span className="font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30">
          MATCH
        </span>
        <span className="font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30">
          RATING
        </span>
        <span className="font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30">
          YEAR
        </span>
        <span className="hidden font-retro text-[9px] uppercase tracking-wider text-muted-foreground/30 md:inline">
          STATUS
        </span>
      </div>

      {/* ── Rows ────────────────────────────────────── */}
      <div>
        {movies.map((movie, i) => (
          <RecommendationRow
            key={movie.id}
            movie={movie}
            index={i + staggerOffset}
            showReason={showReason}
          />
        ))}
      </div>

      {/* ── End marker ──────────────────────────────── */}
      <div className="flex items-center gap-2 border-t border-border/30 px-4 py-2 sm:px-6">
        <span className="font-retro text-[10px] text-muted-foreground/30">
          END OF {label}
        </span>
        <BlinkingCursor className="text-[10px]" />
      </div>
    </section>
  )
}
