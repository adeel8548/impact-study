import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("created_at", { ascending: false, nullsLast: true });

    if (error) {
      console.error("Supabase select error (anon):", error);
    }

    // If anon client returned no rows (or RLS blocked), try service role client
    if (!data || (Array.isArray(data) && data.length === 0)) {
      try {
        const { data: adminData, error: adminErr } = await adminClient
          .from("profiles")
          .select("*")
          .eq("role", "teacher")
          .order("created_at", { ascending: false, nullsLast: true });

        if (adminErr) {
          console.error("Admin client error fetching teachers:", adminErr);
          throw adminErr;
        }

        return NextResponse.json({ teachers: adminData || [], success: true });
      } catch (adminFetchErr) {
        console.error(
          "Failed to fetch teachers with admin client:",
          adminFetchErr,
        );
        return NextResponse.json({ teachers: [], success: true });
      }
    }

    return NextResponse.json({ teachers: data || [], success: true });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch teachers",
        success: false,
      },
      { status: 500 },
    );
  }
}
