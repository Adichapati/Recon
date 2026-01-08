"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Film, Mail, Lock, User, Eye, EyeOff, Loader2, Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState("")

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
  }
  const isPasswordValid = passwordChecks.length && passwordChecks.hasLetter

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isPasswordValid) {
      setError("Please ensure your password meets the requirements.")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create account. Please try again.")
        return
      }

      // Immediately sign in with the new credentials
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (!result?.ok) {
        // Account created but sign-in failed - redirect to login
        toast({
          title: "Account created!",
          description: "Please sign in with your new credentials.",
        })
        router.push("/login")
        return
      }

      toast({
        title: "Welcome to Recon!",
        description: "Your account has been created successfully.",
      })

      router.push("/home")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    await signIn("google", { callbackUrl: "/home" })
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 bg-gradient-to-br from-primary/20 via-background to-background lg:block">
        <div className="absolute inset-0 bg-[url('/cinematic-movie-theater.jpg')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2">
            <Film className="size-10 text-primary" />
            <span className="text-2xl font-bold">Recon</span>
          </Link>
          <div className="max-w-md">
            <h2 className="mb-4 text-4xl font-bold">Start your journey</h2>
            <p className="text-lg text-muted-foreground">
              Create an account to get personalized movie recommendations, build your watchlist, and discover your next favorite film.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Recon. Your personal movie companion.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <Film className="size-10 text-primary" />
              <span className="text-2xl font-bold">Recon</span>
            </Link>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create account</h1>
            <p className="text-muted-foreground">
              Enter your details to get started
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
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
              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordChecks.length ? "text-green-500" : "text-muted-foreground"}`}>
                    {passwordChecks.length ? <Check className="size-3" /> : <X className="size-3" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1 ${passwordChecks.hasLetter ? "text-green-500" : "text-muted-foreground"}`}>
                    {passwordChecks.hasLetter ? <Check className="size-3" /> : <X className="size-3" />}
                    Contains a letter
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !isPasswordValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <svg className="mr-2 size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
