import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (missing.length > 0) {
    const msg = `Missing Supabase environment variables: ${missing.join(', ')}. ` +
      "Set them in your environment or create a `.env.local` file (do not commit secrets)."
    throw new Error(msg)
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component
          // This can be ignored if you have middleware refreshing user sessions
        }
      },
    },
  })
}

export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    const msg = `Missing Supabase environment variables: ${missing.join(', ')}. ` +
      "Add them to your deployment (Vercel Environment Variables) or create a local `.env.local`."
    throw new Error(msg)
  }

  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}
