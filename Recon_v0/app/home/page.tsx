import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getSupabaseAdminClient } from "@/lib/supabase"
import HomeContent from "./home-content"

export default async function HomePage() {
  const session = await auth()

  // Only check preferences for authenticated users
  if (session?.user?.id) {
    let shouldRedirect = false

    try {
      const supabase = getSupabaseAdminClient()

      // Look up user by email first (consistent with other routes)
      let userId = session.user.id
      if (session.user.email) {
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email", session.user.email)
          .maybeSingle()
        if (existing?.id) {
          userId = String(existing.id)
        }
      }

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("completed")
        .eq("user_id", userId)
        .maybeSingle()

      // Check if preferences not completed (or don't exist)
      if (!prefs?.completed) {
        shouldRedirect = true
      }
    } catch (err) {
      // Log but don't block - fail open for auth'd users
      console.error("[home] Failed to check preferences:", err)
    }

    // Redirect outside try-catch (redirect throws internally)
    if (shouldRedirect) {
      redirect("/onboarding/preferences")
    }
  }

  return <HomeContent />
}
