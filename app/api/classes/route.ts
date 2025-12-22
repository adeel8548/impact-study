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

    // If teacherId is provided, fetch class_ids from profiles, then fetch classes
    if (teacherId) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("class_ids")
        .eq("id", teacherId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const classIds: string[] = (profile?.class_ids as string[]) || [];
      if (classIds.length === 0) {
        return NextResponse.json({ classes: [], success: true });
      }

      const { data: classesData, error: classesErr } = await supabase
        .from("classes")
        .select("*")
        .in("id", classIds);

      if (classesErr) throw classesErr;

      return NextResponse.json({ classes: classesData || [], success: true });
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
