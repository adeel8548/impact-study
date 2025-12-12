import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");
  const ids = searchParams.get("ids");

  try {
    // If specific ids are provided, fetch those classes
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      if (idArray.length > 0) {
        const { data, error } = await supabase
          .from("classes")
          .select("*")
          .in("id", idArray);

        if (error) throw error;
        return NextResponse.json({ classes: data || [], success: true });
      }
    }

    // If teacherId is provided, use the junction table `teacher_classes` to fetch assigned classes
    if (teacherId) {
      const { data: tcData, error: tcErr } = await supabase
        .from("teacher_classes")
        .select("classes(*)")
        .eq("teacher_id", teacherId);

      if (tcErr) throw tcErr;

      // Flatten to classes array
      const classes = (tcData || [])
        .map((row: any) => row.classes)
        .filter(Boolean);

      return NextResponse.json({ classes: classes || [], success: true });
    }

    // Otherwise return all classes
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", {
        ascending: false,
        nullsLast: true,
      });

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
