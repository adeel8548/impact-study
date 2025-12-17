import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Allow cron endpoints to bypass auth redirects
  if (request.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next({ request });
  }

  // Only refresh Supabase session; do not force redirect here.
  // Page-level guards (SSR or client) will handle access control.
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
