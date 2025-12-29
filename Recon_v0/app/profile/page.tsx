"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedLayout } from "@/components/protected-layout"
import { MovieGrid } from "@/components/movie-grid"
import { MovieGridSkeleton } from "@/components/movie-skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import type { Movie } from "@/lib/mock-api"
import { clearWatchlistCache, getWatchlist } from "@/lib/watchlist"
import type { WatchlistItem } from "@/lib/watchlist"
import { Calendar, Film, Mail, Tag } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

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
      genres: Array.isArray(raw?.genres) ? raw.genres.map((g: any) => String(g)).filter(Boolean) : [],
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

  const recentItems = useMemo(() => {
    return [...watchlistItems]
      .sort((a, b) => {
        const da = safeDate(a.addedAt)?.getTime() ?? 0
        const db = safeDate(b.addedAt)?.getTime() ?? 0
        return db - da
      })
      .slice(0, 5)
  }, [watchlistItems])

  const user = session?.user

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="size-20">
                    <AvatarImage src={user?.image ?? "/placeholder.svg"} alt={user?.name ?? "User"} />
                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                      {user?.name?.[0] ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{user?.name ?? "Profile"}</CardTitle>
                    <CardDescription className="mt-1">{user?.email ?? ""}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    clearWatchlistCache()
                    signOut()
                  }}
                >
                  Logout
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Mail className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email ?? ""}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Film className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Watchlist</p>
                    <p className="font-medium">{watchlistItems.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Tag className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Top Genres</p>
                    <p className="font-medium">{topGenres.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Calendar className="size-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recently Added</p>
                    <p className="font-medium">{recentItems.length}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Top Genres</h3>
                {isLoadingWatchlist ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : topGenres.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add more movies to your watchlist to see genre insights.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {topGenres.map((g) => (
                      <Badge key={g.name} variant="secondary">
                        {g.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Recently Added</h3>
                {isLoadingWatchlist ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : recentItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No watchlist activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentItems.map((item) => {
                      const d = safeDate(item.addedAt)
                      const when = d ? d.toLocaleString() : ""
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">Added {when}</p>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <a href={`/movie/${item.id}`}>View</a>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Your Watchlist</h3>
                {isLoadingWatchlist ? (
                  <MovieGridSkeleton count={8} />
                ) : watchlistMovies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Your watchlist is empty.</p>
                ) : (
                  <MovieGrid movies={watchlistMovies} showReason={false} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
