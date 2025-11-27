import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.from("classes").select("*");

    if (error) throw error;

    return NextResponse.json({ classes: data || [], success: true });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch classes",
        success: false,
      },
      { status: 500 },
    );
  }
}
