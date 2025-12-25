"use client"

// Layout for authentication pages (login, signup)
// Provides centered layout with minimal UI for auth forms

import type React from "react"
import Link from "next/link"
import { Film } from "lucide-react"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for auth pages */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <Film className="size-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-foreground">Recon</span>
          </Link>
        </div>
      </header>
      <main className="flex items-center justify-center p-4">{children}</main>
    </div>
  )
}
