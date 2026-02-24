"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { clearWatchlistCache, getWatchlist } from "@/lib/watchlist"
import type { WatchlistItem } from "@/lib/watchlist"
import { signOut, useSession } from "next-auth/react"
import { extractGenreNames } from "@/lib/genres"

type GenreStats = { name: string; count: number }

const TMDB_POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500"
const TMDB_BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"

function toTmdbUrl(path: unknown, kind: "poster" | "backdrop") {
  if (!path || typeof path !== "string") return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${kind === "backdrop" ? TMDB_BACKDROP_BASE_URL : TMDB_POSTER_BASE_URL}${normalized}`
}

function safeDate(value: string | undefined) {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

async function fetchMovieDetails(movieId: number): Promise<Movie | null> {
  try {
    const response = await fetch(`/api/movies/${encodeURIComponent(String(movieId))}`, {
      cache: "no-store",
    })

    if (!response.ok) return null

    const raw = (await response.json()) as any
    const normalized: Movie = {
      id: Number(raw?.id),
      title: String(raw?.title ?? "Untitled"),
      overview: String(raw?.overview ?? ""),
      poster_path: toTmdbUrl(raw?.poster_path, "poster"),
      backdrop_path: toTmdbUrl(raw?.backdrop_path, "backdrop"),
      release_date: String(raw?.release_date ?? "1970-01-01"),
      vote_average: typeof raw?.vote_average === "number" ? raw.vote_average : Number(raw?.vote_average ?? 0) || 0,
      // TMDB details returns `genres: [{ id, name }]`; avoid "[object Object]" by extracting names.
      genres: extractGenreNames(raw?.genres),
    }

    if (!Number.isFinite(normalized.id)) return null
    return normalized
  } catch {
    return null
  }
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (idx < items.length) {
      const current = idx++
      results[current] = await fn(items[current])
    }
  })

  await Promise.all(workers)
  return results
}

export default function ProfilePage() {
  const { data: session } = useSession()

  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([])
  const [watchlistMovies, setWatchlistMovies] = useState<Movie[]>([])
  const [topGenres, setTopGenres] = useState<GenreStats[]>([])
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true)

  // Extension token state
  const [extToken, setExtToken] = useState<string | null>(null)
  const [hasExtToken, setHasExtToken] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  // Viewing Insights state
  const [completedCount, setCompletedCount] = useState(0)
  const [completedTopGenres, setCompletedTopGenres] = useState<GenreStats[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setIsLoadingWatchlist(true)

        const items = await getWatchlist(true)
        if (cancelled) return

        setWatchlistItems(items)
        setWatchlistMovies(items.map(({ addedAt: _addedAt, ...movie }) => movie))

        // Derive top genres client-side by fetching a small sample of movie details.
        const sample = items.slice(0, 20)
        const details = await mapWithConcurrency(sample, 4, async (it) => fetchMovieDetails(it.id))
        if (cancelled) return

        const counts = new Map<string, number>()
        for (const m of details) {
          for (const g of m?.genres ?? []) {
            const name = typeof g === "string" ? g.trim() : ""
            if (!name) continue
            counts.set(name, (counts.get(name) ?? 0) + 1)
          }
        }

        const stats = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))

        setTopGenres(stats)

        // --- Viewing Insights: fetch completed movies & derive genres ---
        try {
          setIsLoadingInsights(true)
          const completed = await getWatchlist(true, "completed")
          if (cancelled) return

          setCompletedCount(completed.length)

          const completedSample = completed.slice(0, 20)
          const completedDetails = await mapWithConcurrency(
            completedSample,
            4,
            async (it) => fetchMovieDetails(it.id)
          )
          if (cancelled) return

          const cCounts = new Map<string, number>()
          for (const m of completedDetails) {
            for (const g of m?.genres ?? []) {
              const name = typeof g === "string" ? g.trim() : ""
              if (!name) continue
              cCounts.set(name, (cCounts.get(name) ?? 0) + 1)
            }
          }

          const cStats = [...cCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }))

          setCompletedTopGenres(cStats)
        } catch (err) {
          console.error("[Profile] Failed to load viewing insights", err)
        } finally {
          if (!cancelled) setIsLoadingInsights(false)
        }
      } catch (error) {
        console.error("[Profile] Failed to load watchlist", error)
        toast({
          title: "Error",
          description: "Failed to load your profile data.",
          variant: "destructive",
        })
      } finally {
        if (!cancelled) setIsLoadingWatchlist(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Check if extension token exists
  useEffect(() => {
    fetch("/api/extension/token")
      .then((r) => r.json())
      .then((d) => setHasExtToken(!!d?.hasToken))
      .catch(() => {})
  }, [])

  const handleGenerateToken = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/extension/token", { method: "POST" })
      const data = await res.json()
      if (data.token) {
        setExtToken(data.token)
        setHasExtToken(true)
        toast({ title: "Token generated", description: "Copy it and paste it into the Recon extension." })
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate token.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate token.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeToken = async () => {
    try {
      await fetch("/api/extension/token", { method: "DELETE" })
      setExtToken(null)
      setHasExtToken(false)
      toast({ title: "Token revoked", description: "The extension will no longer sync." })
    } catch {
      toast({ title: "Error", description: "Failed to revoke token.", variant: "destructive" })
    }
  }

  const handleCopyToken = () => {
    if (extToken) {
      navigator.clipboard.writeText(extToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const recentItems = useMemo(() => {
    return [...watchlistItems]
      .sort((a, b) => {
        const da = safeDate(a.addedAt)?.getTime() ?? 0
        const db = safeDate(b.addedAt)?.getTime() ?? 0
        return db - da
      })
      .slice(0, 5)
  }, [watchlistItems])

  // Adaptive weighting — mirrors the formula used in recommendation routes.
  // quizWeight = max(0.30, 1 − n / (n + 10))
  const quizWeight = useMemo(() => {
    const FLOOR = 0.30
    const K = 10
    return Math.max(FLOOR, 1 - completedCount / (completedCount + K))
  }, [completedCount])
  const completedWeight = 1 - quizWeight
  const quizPct = Math.round(quizWeight * 100)
  const completedPct = Math.round(completedWeight * 100)

  const user = session?.user

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">

          {/* ── User header ─────────────────────────────── */}
          <div className="mb-8 flex items-start justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              {/* Text-based avatar */}
              <div className="flex size-14 items-center justify-center border border-primary bg-primary/10">
                <span className="font-retro text-xl font-bold text-primary">
                  {user?.name?.[0]?.toUpperCase() ?? "U"}
                </span>
              </div>
              <div>
                <h1 className="font-retro text-xl font-bold uppercase tracking-wider text-foreground">
                  {user?.name ?? "Profile"}
                </h1>
                <p className="font-retro mt-1 text-xs text-muted-foreground">{user?.email ?? ""}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                clearWatchlistCache()
                signOut()
              }}
            >
              <span className="font-retro text-xs uppercase tracking-wider">LOGOUT</span>
            </Button>
          </div>

          {/* ── Stats grid ──────────────────────────────── */}
          <div className="mb-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-background p-4">
              <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="font-retro mt-1 truncate text-sm text-foreground">{user?.email ?? ""}</p>
            </div>
            <div className="bg-background p-4">
              <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Queue</p>
              <p className="font-retro mt-1 text-sm tabular-nums text-foreground">{watchlistItems.length}</p>
            </div>
            <div className="bg-background p-4">
              <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Top Genres</p>
              <p className="font-retro mt-1 text-sm tabular-nums text-foreground">{topGenres.length}</p>
            </div>
            <div className="bg-background p-4">
              <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Completed</p>
              <p className="font-retro mt-1 text-sm tabular-nums text-foreground">{completedCount}</p>
            </div>
          </div>

          {/* ── Top Genres ──────────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-retro mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Top Genres</h2>
            {isLoadingWatchlist ? (
              <p className="font-retro text-xs text-muted-foreground">Loading...</p>
            ) : topGenres.length === 0 ? (
              <p className="font-retro text-xs text-muted-foreground">Add more movies to your queue to see genre insights.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topGenres.map((g) => (
                  <Badge key={g.name} variant="secondary">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <div className="my-6 border-t border-border/20" />

          {/* ── Viewing Insights ────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-retro mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Viewing Insights</h2>

            {isLoadingInsights ? (
              <p className="font-retro text-xs text-muted-foreground">Analyzing your viewing history...</p>
            ) : completedCount === 0 ? (
              <p className="font-retro text-xs text-muted-foreground">
                Mark movies as watched to unlock personalised insights.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Completed genres */}
                <div className="space-y-2">
                  <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Top Genres You Watch</p>
                  {completedTopGenres.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {completedTopGenres.map((g) => (
                        <Badge key={g.name} variant="outline">
                          {g.name} ({g.count})
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="font-retro text-xs text-muted-foreground">Not enough data yet.</p>
                  )}
                </div>

                {/* Weight comparison */}
                <div className="space-y-2">
                  <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground">Recommendation Influence</p>
                  <div className="flex gap-px border border-border bg-border">
                    <div className="flex-1 bg-background p-3">
                      <p className="font-retro text-[10px] text-muted-foreground">QUIZ PREF</p>
                      <p className="font-retro text-lg font-semibold tabular-nums text-foreground">{quizPct}%</p>
                    </div>
                    <div className="flex-1 bg-background p-3">
                      <p className="font-retro text-[10px] text-muted-foreground">WATCH HIST</p>
                      <p className="font-retro text-lg font-semibold tabular-nums text-foreground">{completedPct}%</p>
                    </div>
                  </div>
                  {/* Visual weight bar — square */}
                  <div className="flex h-1.5 w-full overflow-hidden bg-muted">
                    <div
                      className="bg-primary transition-all duration-500"
                      style={{ width: `${quizPct}%` }}
                    />
                    <div
                      className="bg-primary/40 transition-all duration-500"
                      style={{ width: `${completedPct}%` }}
                    />
                  </div>
                </div>

                {/* Insight message */}
                <p className="font-retro text-xs text-muted-foreground">
                  {completedWeight > quizWeight
                    ? "> Recommendations now mostly driven by watch history."
                    : "> Initial preferences still guide recommendations."}
                </p>
              </div>
            )}
          </section>

          <div className="my-6 border-t border-border/20" />

          {/* ── Chrome Extension ────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-retro mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Recon Chrome Extension</h2>
            <p className="font-retro mb-4 text-xs text-muted-foreground">
              The Recon extension automatically detects movies you watch on Netflix, Prime Video, and other streaming sites — then syncs them to your watchlist here.
            </p>

            {/* How it works */}
            <div className="mb-5 border border-border bg-card/30 p-4 space-y-2">
              <p className="font-retro text-[10px] font-semibold uppercase tracking-wider text-primary/80">How it works</p>
              <ul className="font-retro list-none space-y-1 text-xs text-muted-foreground">
                <li>▸ Detects video playback on any streaming site</li>
                <li>▸ Extracts the movie title from the page</li>
                <li>▸ Matches it against TMDB and adds it to your Recon queue</li>
                <li>▸ Mark movies as &quot;Watchlist&quot;, &quot;Completed&quot;, or &quot;Ignore&quot; from the popup</li>
              </ul>
            </div>

            {/* Install steps */}
            <div className="mb-5 border border-border bg-card/30 p-4 space-y-2">
              <p className="font-retro text-[10px] font-semibold uppercase tracking-wider text-primary/80">Install</p>
              <ol className="font-retro list-none space-y-1.5 text-xs text-muted-foreground">
                <li><span className="text-primary/60 mr-1.5">1.</span>Download or clone the <code className="bg-muted px-1 py-0.5 text-foreground">recon-extension</code> folder — <a href="https://github.com/Adichapati/Recon_ext" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">click here</a> to open the GitHub repo</li>
                <li><span className="text-primary/60 mr-1.5">2.</span>Open <code className="bg-muted px-1 py-0.5 text-foreground">chrome://extensions</code> in Chrome</li>
                <li><span className="text-primary/60 mr-1.5">3.</span>Enable <strong className="text-foreground">Developer mode</strong> (top-right toggle)</li>
                <li><span className="text-primary/60 mr-1.5">4.</span>Click <strong className="text-foreground">Load unpacked</strong> and select the <code className="bg-muted px-1 py-0.5 text-foreground">recon-extension</code> folder</li>
              </ol>
            </div>

            {/* Setup / connect steps */}
            <div className="mb-5 border border-border bg-card/30 p-4 space-y-2">
              <p className="font-retro text-[10px] font-semibold uppercase tracking-wider text-primary/80">Connect</p>
              <ol className="font-retro list-none space-y-1.5 text-xs text-muted-foreground">
                <li><span className="text-primary/60 mr-1.5">1.</span>Generate an API token below</li>
                <li><span className="text-primary/60 mr-1.5">2.</span>Click the Recon extension icon in your toolbar</li>
                <li><span className="text-primary/60 mr-1.5">3.</span>Click the <strong className="text-foreground">⚙</strong> gear icon in the popup header</li>
                <li><span className="text-primary/60 mr-1.5">4.</span>Paste your token and hit <strong className="text-foreground">Save</strong></li>
                <li><span className="text-primary/60 mr-1.5">5.</span>Start watching — detections sync automatically</li>
              </ol>
            </div>

            {/* Token management */}
            <div className="border border-border bg-card/30 p-4 space-y-3">
              <p className="font-retro text-[10px] font-semibold uppercase tracking-wider text-primary/80">API Token</p>

              {extToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border border-border bg-background p-3">
                    <code className="font-retro flex-1 truncate text-xs text-foreground select-all">{extToken}</code>
                    <Button variant="outline" size="sm" onClick={handleCopyToken}>
                      <span className="font-retro text-[10px] uppercase tracking-wider">
                        {tokenCopied ? "COPIED!" : "COPY"}
                      </span>
                    </Button>
                  </div>
                  <p className="font-retro text-[10px] text-muted-foreground/60">
                    ⚠ This token is shown only once. Copy it now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleGenerateToken} disabled={isGenerating}>
                      <span className="font-retro text-[10px] uppercase tracking-wider">
                        {isGenerating ? "GENERATING..." : hasExtToken ? "REGENERATE TOKEN" : "GENERATE TOKEN"}
                      </span>
                    </Button>
                    {hasExtToken && (
                      <Button variant="outline" onClick={handleRevokeToken}>
                        <span className="font-retro text-[10px] uppercase tracking-wider text-red-400">REVOKE</span>
                      </Button>
                    )}
                  </div>
                  {hasExtToken && (
                    <p className="font-retro text-[10px] text-muted-foreground/60">
                      A token is active. Regenerate to get a new one (the old token will stop working).
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="my-6 border-t border-border/20" />

          {/* ── Recently Added ──────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-retro mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Recently Added</h2>
            {isLoadingWatchlist ? (
              <p className="font-retro text-xs text-muted-foreground">Loading...</p>
            ) : recentItems.length === 0 ? (
              <p className="font-retro text-xs text-muted-foreground">No queue activity yet.</p>
            ) : (
              <div className="space-y-0 border border-border">
                {recentItems.map((item, i) => {
                  const d = safeDate(item.addedAt)
                  const when = d ? d.toLocaleString() : ""
                  return (
                    <div key={item.id} className={`flex items-center justify-between gap-4 p-3 ${i > 0 ? "border-t border-border/30" : ""}`}>
                      <div className="min-w-0">
                        <p className="font-retro truncate text-sm text-foreground">{item.title}</p>
                        <p className="font-retro text-[10px] text-muted-foreground/50">Added {when}</p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <a href={`/movie/${item.id}`}>
                          <span className="font-retro text-[10px] uppercase tracking-wider">VIEW</span>
                        </a>
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="my-6 border-t border-border/20" />

          {/* ── Your Watchlist ──────────────────────────── */}
          <section className="mb-8">
            <h2 className="font-retro mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">&gt; Your Queue</h2>
            {isLoadingWatchlist ? (
              <MovieGridSkeleton count={8} />
            ) : watchlistMovies.length === 0 ? (
              <p className="font-retro text-xs text-muted-foreground">Your queue is empty.</p>
            ) : (
              <MovieGrid movies={watchlistMovies} showReason={false} />
            )}
          </section>

        </div>
      </div>
    </ProtectedLayout>
  )
}
