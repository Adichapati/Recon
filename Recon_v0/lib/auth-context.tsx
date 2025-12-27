"use client"

// TODO: Connect to real authentication provider (Google OAuth, backend API)
// This is a mock authentication context for UI demonstration only

import { createContext, useContext, useState, type ReactNode } from "react"

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = async (email: string, password: string) => {
    // TODO: Implement real authentication logic
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setUser({
      id: "1",
      name: "Movie Lover",
      email,
      avatar: "/diverse-user-avatars.png",
    })
  }

  const signup = async (email: string, password: string, name: string) => {
    // TODO: Implement real signup logic
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setUser({
      id: "1",
      name,
      email,
      avatar: "/diverse-user-avatars.png",
    })
  }

  const loginWithGoogle = async () => {
    // TODO: Implement Google OAuth
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setUser({
      id: "1",
      name: "Google User",
      email: "user@gmail.com",
      avatar: "/google-user-avatar.png",
    })
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
