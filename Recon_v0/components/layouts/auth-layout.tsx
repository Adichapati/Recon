"use client"

// Layout for authentication pages (login, signup)
// Provides centered layout with minimal UI for auth forms

import type React from "react"
import Link from "next/link"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple header for auth pages */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-retro text-lg font-bold uppercase tracking-[0.2em] text-primary" aria-hidden="true">[R]</span>
            <span className="font-retro text-sm uppercase tracking-[0.15em] text-foreground">Recon</span>
          </Link>
        </div>
      </header>
      <main className="flex items-center justify-center p-4">{children}</main>
    </div>
  )
}
