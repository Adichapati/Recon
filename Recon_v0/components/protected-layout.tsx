"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Navbar } from "./navbar"

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  // While checking session
  if (status === "loading") {
    return null
  }

  // Not logged in → go to login
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
