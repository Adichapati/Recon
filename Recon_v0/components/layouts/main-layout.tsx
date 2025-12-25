"use client"

// Layout for public pages (landing page, etc.)
// Simple wrapper that includes just the navbar for unauthenticated users

import type React from "react"
import { Navbar } from "@/components/navbar"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
