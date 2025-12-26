"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "./navbar"
import { useAuth } from "@/lib/auth-context"

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // ✅ Wait until auth check finishes
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  // ⏳ Still checking session
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // 🔒 Not authenticated → redirecting
  if (!user) {
    return null
  }

  // ✅ Authenticated (guest OR full user)
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
