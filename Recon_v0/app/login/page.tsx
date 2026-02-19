"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (!result?.ok) {
        setError("Invalid email or password. Please try again.")
        return
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      })

      router.push("/home")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    await signIn("google", { callbackUrl: "/home" })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Left side — Terminal branding panel */}
      <div className="relative hidden w-1/2 border-r border-border lg:flex lg:flex-col lg:justify-between">
        <div className="retro-dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-retro text-lg font-bold uppercase tracking-[0.2em] text-primary">[R]</span>
            <span className="font-retro text-sm uppercase tracking-[0.15em] text-foreground">Recon</span>
          </Link>
          <div className="max-w-md">
            <p className="font-retro mb-3 text-[10px] uppercase tracking-[0.3em] text-primary/60">
              // AUTH_MODULE
            </p>
            <h2 className="font-retro mb-4 text-3xl font-bold uppercase tracking-wider text-foreground">
              Welcome back
            </h2>
            <p className="font-retro text-sm leading-relaxed text-muted-foreground">
              Sign in to access your personalized movie recommendations, watchlist, and more.
            </p>
          </div>
          <p className="font-retro text-[10px] uppercase tracking-wider text-muted-foreground/40">
            &copy; 2025 Recon. Your personal movie companion.
          </p>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-retro text-lg font-bold uppercase tracking-[0.2em] text-primary">[R]</span>
              <span className="font-retro text-sm uppercase tracking-[0.15em] text-foreground">Recon</span>
            </Link>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="font-retro text-2xl font-bold uppercase tracking-wider text-foreground">Sign in</h1>
            <p className="font-retro text-xs text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="font-retro border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
              <span className="mr-2 text-destructive/60">[ERR]</span>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <span className="font-retro text-xs uppercase tracking-wider">AUTHENTICATING...</span>
              ) : (
                <span className="font-retro text-xs uppercase tracking-wider">SIGN IN</span>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="font-retro bg-background px-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <span className="font-retro text-xs uppercase tracking-wider">CONNECTING...</span>
            ) : (
              <>
                <svg className="mr-2 size-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-retro text-xs uppercase tracking-wider">Google</span>
              </>
            )}
          </Button>

          <p className="font-retro text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
