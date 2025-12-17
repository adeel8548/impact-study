import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Let the library manage storage/cookies. Avoid custom cookie adapter
  // which cannot access HttpOnly cookies and causes false unauth states.
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export default createClient;
