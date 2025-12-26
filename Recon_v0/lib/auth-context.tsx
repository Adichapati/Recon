"use client"

import { createContext, useContext, useEffect, useState } from "react"

export interface User {
  id: string
  name: string
  email?: string | null
  picture?: string | null
  role: "user" | "guest"
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean

  // Email + Password
  login: (email: string, password: string) => Promise<void>

  // Google OAuth
  loginWithGoogle: () => void

  // Guest
  loginAsGuest: () => Promise<void>

  // Logout
  logout: () => Promise<void>

  // Internal helper
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ------------------------------------------------
  // Load user from backend session
  // ------------------------------------------------
  const refreshUser = async () => {
    try {
      const res = await fetch("http://localhost:5000/me", {
        credentials: "include",
      })

      if (!res.ok) {
        setUser(null)
        return
      }

      const data = await res.json()
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [])

  // ------------------------------------------------
  // Email + Password login
  // ------------------------------------------------
  const login = async (email: string, password: string) => {
    const res = await fetch("http://localhost:5000/login-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      throw new Error("Invalid credentials")
    }

    await refreshUser()
  }

  // ------------------------------------------------
  // Google OAuth
  // ------------------------------------------------
  const loginWithGoogle = () => {
    window.location.href = "http://localhost:5000/login"
  }

  // ------------------------------------------------
  // ✅ FIXED Guest login (frontend-first)
  // ------------------------------------------------
  const loginAsGuest = async () => {
    // 1️⃣ Immediately authenticate guest (prevents redirect loop)
    setUser({
      id: "guest",
      name: "Guest",
      role: "guest",
    })

    // 2️⃣ Best-effort backend session
    try {
      await fetch("http://localhost:5000/guest-login", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Backend failure does not break guest mode
    }
  }

  // ------------------------------------------------
  // Logout
  // ------------------------------------------------
  const logout = async () => {
    await fetch("http://localhost:5000/logout", {
      method: "POST",
      credentials: "include",
    })
    setUser(null)
  }

  // ------------------------------------------------
  // Derived auth state
  // ------------------------------------------------
  const isAuthenticated = !!user && !loading

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        loginWithGoogle,
        loginAsGuest,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
