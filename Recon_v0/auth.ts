import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

import { getSupabaseAdminClient } from "@/lib/supabase"
import { verifyPassword, type PasswordRecord } from "@/lib/password"

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // In production builds Auth.js is strict about host validation.
  // Local `next build` / `next start` and many deployments (reverse proxies) need this.
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : ""
        const password = typeof credentials?.password === "string" ? credentials.password : ""

        if (!email || !password) return null

        const supabase = getSupabaseAdminClient()

        // Look up the user by email.
        const { data: userRow, error: userErr } = await supabase
          .from("users")
          .select("id,email,name,image")
          .eq("email", email)
          .maybeSingle()

        if (userErr) {
          console.error("[auth][credentials] Supabase user lookup failed", userErr)
          return null
        }
        if (!userRow?.id || !userRow.email) return null

        // Credentials live in a separate table.
        const { data: credRow, error: credErr } = await supabase
          .from("user_credentials")
          .select("algo,params,salt_b64,hash_b64")
          .eq("user_id", String(userRow.id))
          .maybeSingle()

        if (credErr) {
          console.error("[auth][credentials] Supabase credentials lookup failed", credErr)
          return null
        }

        const record: PasswordRecord | null = credRow
          ? {
              algo: credRow.algo,
              params: credRow.params,
              saltB64: credRow.salt_b64,
              hashB64: credRow.hash_b64,
            }
          : null

        if (!record) return null

        const ok = await verifyPassword(password, record)
        if (!ok) return null

        return {
          id: String(userRow.id),
          email: String(userRow.email),
          name: (userRow as any)?.name ?? null,
          image: (userRow as any)?.image ?? null,
        }
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
