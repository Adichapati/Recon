import Link from "next/link"
import Image from "next/image"
import { Star, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MainLayout } from "@/components/layouts/main-layout"

export default function LandingPage() {
  return (
    <MainLayout>
      <div className="min-h-screen">
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
              <h1 className="mb-6 text-balance text-4xl font-bold leading-tight text-foreground md:text-6xl">
                Your Personal Movie Companion
              </h1>
              <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
                Discover, track, and enjoy your favorite films with personalized recommendations and a beautiful
                interface designed for movie lovers.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                    Sign in with Google
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
              Everything you need to track movies
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden="true"
                  >
                    <Star className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Personalized Recommendations</h3>
                  <p className="text-muted-foreground">
                    Get movie suggestions tailored to your taste based on your viewing history and ratings.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden="true"
                  >
                    <TrendingUp className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Track Your Watchlist</h3>
                  <p className="text-muted-foreground">
                    Never forget a movie again. Add films to your watchlist and track what you've watched.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full bg-primary/10"
                    aria-hidden="true"
                  >
                    <Users className="size-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Community Reviews</h3>
                  <p className="text-muted-foreground">
                    Read reviews from fellow movie enthusiasts and share your own thoughts on films.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">Ready to start?</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join thousands of movie lovers tracking their favorite films
            </p>
            <Link href="/signup">
              <Button size="lg">Create Your Free Account</Button>
            </Link>
          </div>
        </section>

        <footer className="border-t border-border py-8">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2026 Recon. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </MainLayout>
  )
}
