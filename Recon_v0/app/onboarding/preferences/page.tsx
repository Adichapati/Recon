"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

import { toast } from "@/hooks/use-toast"
import { useTurnstile } from "@/hooks/use-turnstile"
import { TypeReveal } from "@/components/retro/type-reveal"
import { TerminalLine } from "@/components/retro/terminal-line"
import { TerminalOptionGroup } from "@/components/retro/terminal-option"
import { BlinkingCursor } from "@/components/retro/blinking-cursor"
import { ScanlineOverlay } from "@/components/retro/scanline-overlay"

/* ── Quiz data (unchanged) ─────────────────────────────── */

const GENRES = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
]

const MOODS = [
  "Feel-good",
  "Thought-provoking",
  "Intense",
  "Relaxing",
  "Exciting",
  "Emotional",
  "Dark",
  "Lighthearted",
  "Suspenseful",
  "Inspiring",
]

const ERAS = [
  { value: "classic", label: "Classic (pre-1980)" },
  { value: "retro", label: "Retro (1980–1999)" },
  { value: "modern", label: "Modern (2000–2015)" },
  { value: "recent", label: "Recent (2016+)" },
  { value: "any", label: "No preference" },
]

const PACING = [
  { value: "slow", label: "Slow burn" },
  { value: "medium", label: "Balanced" },
  { value: "fast", label: "Fast-paced" },
]

const POPULARITY = [
  { value: "blockbuster", label: "Blockbusters" },
  { value: "mainstream", label: "Mainstream" },
  { value: "hidden", label: "Hidden gems" },
  { value: "any", label: "No preference" },
]

/* ── Types (unchanged) ─────────────────────────────────── */

type Preferences = {
  genres: string[]
  moods: string[]
  era: string[]
  pacing: string
  popularity: string
}

/* ── Hotkey generators ─────────────────────────────────── */

function genreHotkeys() {
  return GENRES.map((g, i) => ({
    value: g,
    label: g.toUpperCase(),
    hotkey: String.fromCharCode(97 + i),
  }))
}

function moodHotkeys() {
  return MOODS.map((m, i) => ({
    value: m,
    label: m.toUpperCase(),
    hotkey: String(i),
  }))
}

function eraHotkeys() {
  return ERAS.map((e, i) => ({
    value: e.value,
    label: e.label.toUpperCase(),
    hotkey: String(i + 1),
  }))
}

function pacingHotkeys() {
  return PACING.map((p, i) => ({
    value: p.value,
    label: p.label.toUpperCase(),
    hotkey: String(i + 1),
  }))
}

function popularityHotkeys() {
  return POPULARITY.map((p, i) => ({
    value: p.value,
    label: p.label.toUpperCase(),
    hotkey: String(i + 1),
  }))
}

/* ── Terminal quiz steps ───────────────────────────────── */

interface StepConfig {
  prompt: string
  subPrompt?: string
}

const STEPS: StepConfig[] = [
  {
    prompt: "QUERY: SELECT YOUR PREFERRED GENRES.",
    subPrompt: "Toggle options below. Press ENTER or click CONTINUE when done.",
  },
  {
    prompt: "QUERY: WHAT MOODS ARE YOU DRAWN TO?",
    subPrompt: "Toggle options below. Press ENTER or click CONTINUE when done.",
  },
  {
    prompt: "QUERY: DEFINE YOUR VIEWING PARAMETERS.",
    subPrompt: "Configure era, pacing, and popularity preferences.",
  },
]

/* ── Main component ────────────────────────────────────── */

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const { getToken } = useTurnstile()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] = useState<Preferences>({
    genres: [],
    moods: [],
    era: [],
    pacing: "",
    popularity: "",
  })

  // Terminal history: completed steps shown above
  const [history, setHistory] = useState<
    { prompt: string; response: string }[]
  >([])

  // Controls: show prompt typed → then show options
  const [promptDone, setPromptDone] = useState(false)
  // "Processing..." transitional state between steps
  const [processing, setProcessing] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [step, promptDone, processing, history, preferences])

  /* ── Quiz logic (unchanged) ──────────────────────────── */

  const toggleMultiSelect = useCallback(
    (key: "genres" | "moods" | "era", value: string) => {
      setPreferences((prev) => {
        const current = prev[key]
        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [key]: updated }
      })
    },
    []
  )

  const setSingleSelect = useCallback(
    (key: "pacing" | "popularity", value: string) => {
      setPreferences((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return preferences.genres.length > 0
      case 1:
        return preferences.moods.length > 0
      case 2:
        return (
          preferences.era.length > 0 &&
          preferences.pacing !== "" &&
          preferences.popularity !== ""
        )
      default:
        return false
    }
  }, [step, preferences])

  const handleFinish = useCallback(async () => {
    setIsSubmitting(true)
    setProcessing(true)
    try {
      const turnstileToken = await getToken().catch(() => "")
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, completed: true, turnstileToken }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save preferences")
      }

      setHistory((h) => [
        ...h,
        {
          prompt: STEPS[2].prompt,
          response: `ERA=${preferences.era.join(",")} PACING=${preferences.pacing} POP=${preferences.popularity}`,
        },
      ])

      toast({
        title: "Preferences saved!",
        description: "Your movie recommendations are ready.",
      })

      await new Promise((r) => setTimeout(r, 800))
      router.push("/home")
    } catch (err) {
      setProcessing(false)
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [preferences, router])

  /* ── Step transition ──────────────────────────────────── */

  const advanceStep = useCallback(() => {
    if (!canProceed()) return

    let response = ""
    if (step === 0) response = preferences.genres.join(", ")
    if (step === 1) response = preferences.moods.join(", ")

    setProcessing(true)
    setHistory((h) => [
      ...h,
      { prompt: STEPS[step].prompt, response },
    ])

    setTimeout(() => {
      setProcessing(false)
      setPromptDone(false)
      setStep((s) => s + 1)
    }, 600)
  }, [step, preferences, canProceed])

  // Enter key to advance, Escape to go back
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && promptDone && !processing) {
        if (step < 2 && canProceed()) {
          advanceStep()
        } else if (step === 2 && canProceed()) {
          handleFinish()
        }
      }
      if (e.key === "Escape" && step > 0 && !processing) {
        setHistory((h) => h.slice(0, -1))
        setPromptDone(false)
        setStep((s) => s - 1)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [promptDone, processing, step, canProceed, advanceStep, handleFinish])

  /* ── Render helpers ──────────────────────────────────── */

  const renderStepOptions = () => {
    if (step === 0) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-x-8 sm:grid-cols-3">
          <TerminalOptionGroup
            options={genreHotkeys().slice(0, 6)}
            selected={preferences.genres}
            onSelect={(v) => toggleMultiSelect("genres", v)}
          />
          <TerminalOptionGroup
            options={genreHotkeys().slice(6, 12)}
            selected={preferences.genres}
            onSelect={(v) => toggleMultiSelect("genres", v)}
          />
          <TerminalOptionGroup
            options={genreHotkeys().slice(12)}
            selected={preferences.genres}
            onSelect={(v) => toggleMultiSelect("genres", v)}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      )
    }

    if (step === 1) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-x-8">
          <TerminalOptionGroup
            options={moodHotkeys().slice(0, 5)}
            selected={preferences.moods}
            onSelect={(v) => toggleMultiSelect("moods", v)}
          />
          <TerminalOptionGroup
            options={moodHotkeys().slice(5)}
            selected={preferences.moods}
            onSelect={(v) => toggleMultiSelect("moods", v)}
          />
        </div>
      )
    }

    if (step === 2) {
      return (
        <div className="mt-3 space-y-5">
          <div>
            <TerminalLine prefix=">" className="mb-1 text-xs text-muted-foreground">
              SET era (toggle multiple):
            </TerminalLine>
            <TerminalOptionGroup
              options={eraHotkeys()}
              selected={preferences.era}
              onSelect={(v) => toggleMultiSelect("era", v)}
              enableKeyboard={false}
            />
          </div>

          <div>
            <TerminalLine prefix=">" className="mb-1 text-xs text-muted-foreground">
              SET pacing (select one):
            </TerminalLine>
            <TerminalOptionGroup
              options={pacingHotkeys()}
              selected={preferences.pacing ? [preferences.pacing] : []}
              onSelect={(v) => setSingleSelect("pacing", v)}
              enableKeyboard={false}
            />
          </div>

          <div>
            <TerminalLine prefix=">" className="mb-1 text-xs text-muted-foreground">
              SET popularity (select one):
            </TerminalLine>
            <TerminalOptionGroup
              options={popularityHotkeys()}
              selected={
                preferences.popularity ? [preferences.popularity] : []
              }
              onSelect={(v) => setSingleSelect("popularity", v)}
              enableKeyboard={false}
            />
          </div>
        </div>
      )
    }
  }

  /* ── Main render ─────────────────────────────────────── */

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a]">
      <ScanlineOverlay opacity={0.03} noise />

      {/* Terminal chrome: top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-[#0a0a0a]/95 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-muted-foreground/20" />
              <span className="inline-block size-2.5 rounded-full bg-muted-foreground/20" />
              <span className="inline-block size-2.5 rounded-full bg-muted-foreground/20" />
            </div>
            <span className="font-retro text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              RECON // PREFERENCE ENGINE v2.0
            </span>
          </div>
          <span className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">
            STEP {step + 1}/3
          </span>
        </div>
      </div>

      {/* Terminal output area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Boot sequence */}
          <TerminalLine prefix=">" dim>
            INITIALIZING PREFERENCE ENGINE...
          </TerminalLine>
          <TerminalLine prefix=">" dim>
            USER SESSION AUTHENTICATED. READY.
          </TerminalLine>

          <div className="my-4 border-t border-border/30" />

          {/* History: completed steps */}
          {history.map((entry, i) => (
            <div key={i} className="space-y-1">
              <TerminalLine prefix=">" dim>
                {entry.prompt}
              </TerminalLine>
              <TerminalLine prefix="$" dim>
                {entry.response}
              </TerminalLine>
              <TerminalLine prefix="" dim>
                <span className="text-xs text-primary/60">✓ ACCEPTED</span>
              </TerminalLine>
              <div className="my-3 border-t border-border/20" />
            </div>
          ))}

          {/* Processing state */}
          {processing && (
            <div className="space-y-1">
              <TerminalLine prefix="">
                <span className="text-muted-foreground">
                  Processing
                  <span className="animate-retro-blink">...</span>
                </span>
              </TerminalLine>
            </div>
          )}

          {/* Current step */}
          {!processing && (
            <div>
              <TerminalLine prefix=">" className="text-foreground">
                <TypeReveal
                  text={STEPS[step].prompt}
                  speed={30}
                  delay={step === 0 && history.length === 0 ? 400 : 100}
                  cursor={!promptDone}
                  onComplete={() => setPromptDone(true)}
                />
              </TerminalLine>

              {promptDone && (
                <>
                  {STEPS[step].subPrompt && (
                    <TerminalLine
                      prefix=">"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {STEPS[step].subPrompt}
                    </TerminalLine>
                  )}

                  {renderStepOptions()}

                  {/* Selection summary */}
                  {step === 0 && preferences.genres.length > 0 && (
                    <div className="mt-4 border-t border-border/20 pt-3">
                      <TerminalLine prefix="$" className="text-xs">
                        SELECTED: {preferences.genres.join(", ")}
                      </TerminalLine>
                    </div>
                  )}
                  {step === 1 && preferences.moods.length > 0 && (
                    <div className="mt-4 border-t border-border/20 pt-3">
                      <TerminalLine prefix="$" className="text-xs">
                        SELECTED: {preferences.moods.join(", ")}
                      </TerminalLine>
                    </div>
                  )}

                  {/* Continue / Finish control */}
                  <div className="mt-6 flex items-center gap-4">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistory((h) => h.slice(0, -1))
                          setPromptDone(false)
                          setStep((s) => s - 1)
                        }}
                        className="font-retro text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                      >
                        [ESC] BACK
                      </button>
                    )}

                    {step < 2 ? (
                      <button
                        type="button"
                        onClick={advanceStep}
                        disabled={!canProceed()}
                        className={`font-retro text-xs uppercase tracking-wider transition-colors ${
                          canProceed()
                            ? "text-primary hover:text-primary/80"
                            : "cursor-not-allowed text-muted-foreground/30"
                        }`}
                      >
                        [ENTER] CONTINUE <BlinkingCursor className="text-xs" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinish}
                        disabled={!canProceed() || isSubmitting}
                        className={`font-retro text-xs uppercase tracking-wider transition-colors ${
                          canProceed() && !isSubmitting
                            ? "text-primary hover:text-primary/80"
                            : "cursor-not-allowed text-muted-foreground/30"
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            SAVING
                            <span className="animate-retro-blink">...</span>
                          </>
                        ) : (
                          <>
                            [ENTER] FINALIZE PROFILE{" "}
                            <BlinkingCursor className="text-xs" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Terminal status bar */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-[#0a0a0a]/95 px-6 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground/50">
            {preferences.genres.length > 0 &&
              `GENRES:${preferences.genres.length}`}
            {preferences.moods.length > 0 &&
              ` | MOODS:${preferences.moods.length}`}
            {preferences.era.length > 0 &&
              ` | ERA:${preferences.era.length}`}
            {preferences.pacing && ` | PACE:${preferences.pacing}`}
            {preferences.popularity && ` | POP:${preferences.popularity}`}
          </span>
          <span className="font-retro text-[10px] text-muted-foreground/30">
            KEYBOARD ENABLED
          </span>
        </div>
      </div>
    </div>
  )
}
