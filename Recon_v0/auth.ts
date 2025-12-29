import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

import { getSupabaseAdminClient } from "@/lib/supabase"

export const { handlers, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  // In production builds Auth.js is strict about host validation.
  // Local `next build` / `next start` and many deployments (reverse proxies) need this.
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  events: {
    async signIn({ user }) {
      try {
        if (!user?.id) return
        if (!user.email) return

        const supabase = getSupabaseAdminClient()
        const payload = {
          id: String(user.id),
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        }

        const { error } = await supabase
          .from("users")
          .upsert(payload, { onConflict: "id" })

        if (error) {
          console.error("[auth] Supabase user upsert failed", error)
        }
      } catch {
        console.error("[auth] Supabase user upsert failed")
      }
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.id = user.id
      if (!token.id && token.sub) token.id = token.sub
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        const id = token.id ?? token.sub
        if (id) session.user.id = String(id)
      }
      return session
    },
  },
})
