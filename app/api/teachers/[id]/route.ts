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
      .eq("role", "teacher")
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Teacher not found", success: false },
        { status: 404 }
      );
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
