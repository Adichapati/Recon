"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Film, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

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

type Preferences = {
  genres: string[]
  moods: string[]
  era: string[]
  pacing: string
  popularity: string
}

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferences, setPreferences] = useState<Preferences>({
    genres: [],
    moods: [],
    era: [],
    pacing: "",
    popularity: "",
  })

  const toggleMultiSelect = (
    key: "genres" | "moods" | "era",
    value: string
  ) => {
    setPreferences((prev) => {
      const current = prev[key]
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: updated }
    })
  }

  const setSingleSelect = (key: "pacing" | "popularity", value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const canProceed = () => {
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
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preferences, completed: true }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save preferences")
      }

      toast({
        title: "Preferences saved!",
        description: "Your movie recommendations are ready.",
      })

      router.push("/home")
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Film className="size-12 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Let&apos;s personalize your experience
          </h1>
          <p className="text-muted-foreground">
            Step {step + 1} of 3
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  What genres do you enjoy?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select all that apply
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleMultiSelect("genres", genre)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      preferences.genres.includes(genre)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  What moods are you drawn to?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select all that apply
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => toggleMultiSelect("moods", mood)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      preferences.moods.includes(mood)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold">
                  Tell us about your viewing style
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select one option for each category
                </p>
              </div>

              {/* Era */}
              <div className="space-y-3">
                <h3 className="font-medium">Preferred era</h3>
                <div className="flex flex-wrap gap-3">
                  {ERAS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleMultiSelect("era", value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        preferences.era.includes(value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pacing */}
              <div className="space-y-3">
                <h3 className="font-medium">Preferred pacing</h3>
                <div className="flex flex-wrap gap-3">
                  {PACING.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSingleSelect("pacing", value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        preferences.pacing === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popularity */}
              <div className="space-y-3">
                <h3 className="font-medium">Movie popularity</h3>
                <div className="flex flex-wrap gap-3">
                  {POPULARITY.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSingleSelect("popularity", value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        preferences.popularity === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Finish"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
