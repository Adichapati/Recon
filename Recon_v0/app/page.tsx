"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Star, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MainLayout } from "@/components/layouts/main-layout"

type User = {
  name: string
  email: string
  picture: string
}

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check login status from backend
  useEffect(() => {
    fetch("http://localhost:5000/me", {
      credentials: "include", // VERY IMPORTANT
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/login"
  }

  const handleLogout = async () => {
    await fetch("http://localhost:5000/logout", {
      credentials: "include",
    })
    window.location.reload()
  }

  return (
    <MainLayout>
      <div className="min-h-screen">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/cinematic-movie-theater.jpg"
              alt="Hero background"
              fill
              className="object-cover opacity-20"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
          </div>

          <div className="container mx-auto px-4 py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-balance text-4xl font-bold md:text-6xl">
                Your Personal Movie Companion
              </h1>

              <p className="mb-8 text-lg text-muted-foreground md:text-xl">
                Discover, track, and enjoy your favorite films with personalized recommendations.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                {loading ? null : user ? (
                  <>
                    <p className="text-muted-foreground">
                      Welcome, <strong>{user.name}</strong>
                    </p>
                    <Button size="lg" variant="outline" onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/signup">
                      <Button size="lg">Get Started Free</Button>
                    </Link>

                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent"
                      onClick={handleLogin}
                    >
                      Sign in with Google
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t bg-card/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to track movies
            </h2>

            <div className="grid gap-8 md:grid-cols-3">
              <Card>
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Star className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Personalized Recommendations</h3>
                  <p className="text-muted-foreground">
                    Get movie suggestions tailored to your taste.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Track Your Watchlist</h3>
                  <p className="text-muted-foreground">
                    Add films and track what you’ve watched.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <Users className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Community Reviews</h3>
                  <p className="text-muted-foreground">
                    Read and share reviews with other movie lovers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2025 Recon. Built with v0 by Vercel.</p>
          </div>
        </footer>
      </div>
    </MainLayout>
  )
}
