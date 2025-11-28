import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  try {
    const { count, error } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({ success: true, count: count ?? 0 });
  } catch (error) {
    console.error("Failed to fetch students count:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch count",
      },
      { status: 500 },
    );
  }
}

