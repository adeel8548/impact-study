export function validateSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error("[v0] NEXT_PUBLIC_SUPABASE_URL is not set")
    return false
  }

  if (!supabaseAnonKey) {
    console.error("[v0] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set")
    return false
  }

  console.log("[v0] Supabase environment variables validated successfully")
  return true
}
