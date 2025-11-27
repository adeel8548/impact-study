import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { id: classId } = await params;

  try {
    console.log("Fetching students for class:", classId);

    const { data: students, error } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .order("roll_number", { ascending: true });

    console.log("Students fetched:", students, "Error:", error);

    if (error) throw error;

    return NextResponse.json({ students: students || [], success: true });
  } catch (error) {
    console.error("Error fetching class students:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch students",
        success: false,
      },
      { status: 500 },
    );
  }
}
