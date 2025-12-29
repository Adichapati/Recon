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
        if (!user.email) return

        const supabase = getSupabaseAdminClient()

        // `user.id` may change between sign-ins when using JWT strategy with no adapter.
        // We treat Supabase `users.email` as the stable identity anchor and re-use the
        // existing `users.id` when present.
        const { data: existing, error: findError } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle()

        if (findError) {
          console.error("[auth] Supabase user lookup failed", findError)
          return
        }

        if (existing?.id) {
          const { error: updateError } = await supabase
            .from("users")
            .update({
              name: user.name ?? null,
              image: user.image ?? null,
            })
            .eq("id", existing.id)

          if (updateError) {
            console.error("[auth] Supabase user update failed", updateError)
          }
          return
        }

        if (!user?.id) return

        const { error: insertError } = await supabase.from("users").insert({
          id: String(user.id),
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        })

        if (insertError) {
          console.error("[auth] Supabase user insert failed", insertError)
        }
      } catch {
        console.error("[auth] Supabase user upsert failed")
      }
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, prefer the stable Supabase `users.id` tied to the email.
      // Without an adapter, Auth.js may generate a new user.id per login.
      if (user?.email) {
        try {
          const supabase = getSupabaseAdminClient()
          const { data: existing, error } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .maybeSingle()

          if (error) {
            console.error("[auth] Supabase user lookup failed", error)
          } else if (existing?.id) {
            token.id = String(existing.id)
          }
        } catch (err) {
          console.error("[auth] Supabase user lookup failed", err)
        }
      }

      if (!token.id && user?.id) token.id = String(user.id)
      if (!token.id && token.sub) token.id = String(token.sub)
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
