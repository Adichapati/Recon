import Link from "next/link"
import { MainLayout } from "@/components/layouts/main-layout"
import { LandingHero } from "@/components/retro/landing-hero"
import { FocusFrame } from "@/components/retro/focus-frame"
import { ScrollReveal } from "@/components/retro/scroll-reveal"

const features = [
  {
    label: "01",
    title: "ADAPTIVE RECOMMENDATIONS",
    description:
      "The engine learns from every movie you complete. Quiz preferences decay, watch history takes over.",
  },
  {
    label: "02",
    title: "WATCHLIST & TRACKING",
    description:
      "Save films. Mark them watched. Your completed list becomes a permanent taste signal.",
  },
  {
    label: "03",
    title: "VIEWING INSIGHTS",
    description:
      "See exactly how much weight comes from your quiz versus your watch history. Full transparency.",
  },
]

export default function LandingPage() {
  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* ── Hero ──────────────────────────────────────── */}
        <LandingHero />

        {/* ── Features grid ────────────────────────────── */}
        <section className="relative border-t border-border">
          {/* Grid dot background */}
          <div className="retro-dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />

          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <ScrollReveal>
              <p className="font-retro mb-12 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                // SYSTEM CAPABILITIES
              </p>
            </ScrollReveal>

            <div className="grid gap-px border border-border md:grid-cols-3">
              {features.map((f, i) => (
                <ScrollReveal key={f.label} delay={i * 0.12}>
                  <FocusFrame className="group border border-border p-8 transition-colors duration-200 hover:bg-card">
                    <span className="font-retro text-xs text-primary">{f.label}</span>
                    <h3 className="font-retro mt-3 text-sm font-semibold tracking-wider text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </FocusFrame>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────── */}
        <section className="border-t border-border">
          <ScrollReveal className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
            <p className="font-retro text-xs uppercase tracking-[0.3em] text-muted-foreground">
              // READY
            </p>
            <h2 className="font-retro text-2xl font-semibold tracking-wide text-foreground md:text-3xl">
              START BUILDING YOUR TASTE PROFILE
            </h2>
            <div className="mt-2 flex gap-4">
              <Link
                href="/signup"
                className="font-retro border border-primary bg-primary px-6 py-2.5 text-xs uppercase tracking-widest text-primary-foreground transition-colors duration-200 hover:bg-primary/80"
              >
                CREATE ACCOUNT
              </Link>
              <Link
                href="/login"
                className="font-retro border border-border px-6 py-2.5 text-xs uppercase tracking-widest text-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
              >
                SIGN IN
              </Link>
            </div>
          </ScrollReveal>
        </section>

        {/* ── Footer ───────────────────────────────────── */}
        <footer className="border-t border-border py-8">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <p className="font-retro text-xs tracking-widest text-muted-foreground">
              &copy; 2026 RECON &mdash; ALL RIGHTS RESERVED
            </p>
          </div>
        </footer>
      </div>
    </MainLayout>
  )
}
