import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Avoid initializing the browser client during server-side prerender/build.
  if (typeof window === "undefined") {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[v0] Missing Supabase environment variables in browser client",
    );
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
