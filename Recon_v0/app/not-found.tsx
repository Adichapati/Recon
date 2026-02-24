"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

/* ── Glitch text animation ── */
function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?"

  useEffect(() => {
    let frame: number
    let iteration = 0

    const scramble = () => {
      const now = text
        .split("")
        .map((ch, i) => {
          if (i < iteration) return text[i]
          return chars[Math.floor(Math.random() * chars.length)]
        })
        .join("")
      setDisplay(now)
      iteration += 0.4
      if (iteration < text.length) {
        frame = requestAnimationFrame(scramble)
      } else {
        setDisplay(text)
      }
    }

    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(scramble)
    }, 600)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(frame)
    }
  }, [text])

  return <span className={className}>{display}</span>
}

/* ── CRT noise canvas ── */
function StaticNoise() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    const w = 256
    const h = 256
    canvas.width = w
    canvas.height = h

    const imageData = ctx.createImageData(w, h)
    const data = imageData.data

    const draw = () => {
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 40
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 255
      }
      ctx.putImageData(imageData, 0, 0)
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        opacity: 0.08,
        imageRendering: "pixelated",
        mixBlendMode: "screen",
      }}
    />
  )
}

export default function NotFound() {
  const [flicker, setFlicker] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFlicker(true)
      setTimeout(() => setFlicker(false), 80 + Math.random() * 120)
    }, 3000 + Math.random() * 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b0b0b] p-4">
      {/* CRT static noise */}
      <StaticNoise />

      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,191,173,0.03) 2px, rgba(74,191,173,0.03) 4px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Screen flicker */}
      <div
        className="pointer-events-none absolute inset-0 bg-white/[0.02] transition-opacity duration-75"
        style={{ opacity: flicker ? 1 : 0 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Status badge */}
        <div className="font-retro mb-6 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-primary">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
            style={{
              animation: "pulse 1.5s ease-in-out infinite",
              boxShadow: "0 0 6px 1px rgba(239,68,68,0.5)",
            }}
          />
          SIGNAL LOST
        </div>

        {/* Big 404 */}
        <h1 className="font-retro relative mb-3 text-8xl font-bold tabular-nums text-foreground sm:text-9xl">
          <GlitchText text="404" />
          {/* Shadow layer for depth */}
          <span
            className="pointer-events-none absolute inset-0 text-8xl font-bold tabular-nums text-primary/10 sm:text-9xl"
            style={{ transform: "translate(3px, 3px)" }}
            aria-hidden="true"
          >
            404
          </span>
        </h1>

        {/* Subtitle */}
        <h2 className="font-retro mb-2 text-sm uppercase tracking-[0.25em] text-muted-foreground">
          <GlitchText text="TARGET NOT FOUND" />
        </h2>

        {/* Decorative separator */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
          <div className="h-1 w-1 rotate-45 bg-primary/60" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
        </div>

        {/* Message */}
        <p className="font-retro mb-8 max-w-sm text-xs leading-relaxed text-muted-foreground">
          The requested resource could not be located.
          <br />
          Connection to target path has been severed.
        </p>

        {/* Terminal-style error log */}
        <div className="font-retro mb-8 w-full max-w-xs border border-border/30 bg-black/40 px-4 py-3 text-left text-[10px] leading-relaxed tracking-wider text-muted-foreground/60">
          <div>
            <span className="text-primary/60">$</span> locate resource
          </div>
          <div className="text-red-400/60">ERR: path_not_found</div>
          <div>
            <span className="text-primary/60">$</span> status
          </div>
          <div className="text-primary/40">DISCONNECTED</div>
          <div className="mt-1 animate-pulse text-primary/40">{">"} _</div>
        </div>

        {/* CTA */}
        <Link href="/">
          <Button
            variant="outline"
            className="font-retro group border-primary/30 bg-transparent text-xs uppercase tracking-[0.2em] text-primary transition-all hover:border-primary hover:bg-primary/10"
          >
            <span className="mr-2 inline-block transition-transform group-hover:-translate-x-0.5">
              {"<"}
            </span>
            RETURN TO BASE
          </Button>
        </Link>
      </div>

      {/* Corner bracket decorations */}
      <div className="pointer-events-none absolute left-6 top-6 h-12 w-12 border-l border-t border-primary/20" />
      <div className="pointer-events-none absolute right-6 top-6 h-12 w-12 border-r border-t border-primary/20" />
      <div className="pointer-events-none absolute bottom-6 left-6 h-12 w-12 border-l border-b border-primary/20" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-12 w-12 border-r border-b border-primary/20" />
    </div>
  )
}
