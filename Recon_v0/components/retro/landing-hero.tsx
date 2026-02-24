"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { TypeReveal } from "./type-reveal"

const HeroRobotCanvas = dynamic(
  () => import("./hero-robot-canvas").then((m) => m.HeroRobotCanvas),
  { ssr: false }
)

/**
 * Full-width hero section with a retro-futuristic terminal aesthetic.
 * Uses line-based structure, negative space, and a typewriter heading.
 */
export function LandingHero() {
  const prefersReduced = useReducedMotion()
  const [headingDone, setHeadingDone] = useState(false)

  // Stagger children after typewriter finishes
  const fadeUp = (delay: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: headingDone ? { opacity: 1, y: 0 } : {},
          transition: { duration: 0.5, delay, ease: "easeOut" as const },
        }

  return (
    <section className="relative flex min-h-[85vh] flex-col justify-center overflow-hidden border-b border-border">
      {/* ── Dot grid background ──────────────────────── */}
      <div className="retro-dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* ── Horizontal scan line sweep ───────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="animate-retro-scanline absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        />
      </div>

      {/* ── Frame lines (purely decorative) ──────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* Vertical line — left */}
        <div className="absolute left-[8%] top-0 h-full w-px bg-border/40" />
        {/* Vertical line — right */}
        <div className="absolute right-[8%] top-0 h-full w-px bg-border/40" />
        {/* Horizontal rule — lower third */}
        <div className="absolute bottom-[22%] left-0 w-full h-px bg-border/30" />
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* Left column — text content */}
          <div>
        {/* System label */}
        <motion.p
          className="font-retro mb-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground md:text-xs"
          initial={prefersReduced ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" as const }}
        >
          RECON // MOVIE INTELLIGENCE SYSTEM
        </motion.p>

        {/* Main heading — typewriter reveal */}
        <h1 className="font-retro max-w-3xl text-3xl font-bold uppercase leading-[1.15] tracking-wider text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
          <TypeReveal
            text="DISCOVER WHAT TO WATCH NEXT."
            speed={40}
            delay={400}
            cursor
            onComplete={() => setHeadingDone(true)}
          />
        </h1>

        {/* Subtext — fades in after typing */}
        <motion.p
          className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base"
          {...fadeUp(0.1)}
        >
          An adaptive recommendation engine that learns from every movie you
          watch. Quiz preferences decay. Your taste takes over.
        </motion.p>

        {/* CTA buttons */}
        <motion.div className="mt-10 flex gap-4" {...fadeUp(0.25)}>
          <Link href="/signup">
            <button className="font-retro group relative border border-primary bg-primary px-7 py-3 text-xs uppercase tracking-widest text-primary-foreground transition-colors duration-200 hover:bg-transparent hover:text-primary">
              GET STARTED
              {/* Animated underline on hover */}
              <span className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </button>
          </Link>
          <Link href="/login">
            <button className="font-retro group relative border border-border px-7 py-3 text-xs uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:border-primary hover:text-primary">
              SIGN IN
              <span className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </button>
          </Link>
        </motion.div>
          </div>

          {/* Right column — 3D Robot */}
          <motion.div
            className="hidden h-[420px] lg:block xl:h-[500px]"
            initial={prefersReduced ? undefined : { opacity: 0 }}
            animate={headingDone ? { opacity: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" as const }}
          >
            <HeroRobotCanvas />
          </motion.div>
        </div>

        {/* Bottom metadata strip */}
        <motion.div
          className="font-retro mt-20 flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 md:mt-28"
          {...fadeUp(0.4)}
        >
          <span>TMDB_API</span>
          <span className="text-border">|</span>
          <span>NEXT.JS 16</span>
          <span className="text-border">|</span>
          <span>SUPABASE</span>
          <span className="text-border">|</span>
          <span>ADAPTIVE ENGINE v2</span>
        </motion.div>
      </div>

      {/* ── Scroll indicator ─────────────────────────── */}
      <motion.div
        className="font-retro absolute bottom-6 left-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40"
        {...fadeUp(0.5)}
      >
        <motion.span
          className="inline-block"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
        >
          SCROLL ↓
        </motion.span>
      </motion.div>
    </section>
  )
}
