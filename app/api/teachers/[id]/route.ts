import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await context.params;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, expected_time, joining_date, class_ids, incharge_class_id, incharge_class_ids")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Gracefully return a success=false payload so the UI can continue without hard failing
      return NextResponse.json({ success: false, error: "Teacher not found" });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching teacher:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch teacher",
        success: false,
      },
      { status: 500 }
    );
  }
}
