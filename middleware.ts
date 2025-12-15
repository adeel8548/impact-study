import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Allow cron endpoints to bypass auth redirects
  if (request.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg).*)"],
};
