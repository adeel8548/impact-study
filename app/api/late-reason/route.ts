import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();
    const { recordId, table, reason } = body;

    if (!recordId || !table || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: recordId, table, reason", success: false },
        { status: 400 },
      );
    }

    // Validate table name
    if (!["student_attendance", "teacher_attendance"].includes(table)) {
      return NextResponse.json(
        { error: "Invalid table name", success: false },
        { status: 400 },
      );
    }

    // Update the late_reason field
    const { data, error } = await supabase
      .from(table)
      .update({ late_reason: reason })
      .eq("id", recordId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error("Error saving late reason:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save late reason",
        success: false,
      },
      { status: 500 },
    );
  }
}
