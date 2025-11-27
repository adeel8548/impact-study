import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  const teacherId = request.nextUrl.searchParams.get("teacherId");

  try {
    if (!teacherId) {
      return NextResponse.json(
        { error: "teacherId is required", success: false },
        { status: 400 },
      );
    }

    console.log("Fetching classes for teacher:", teacherId);

    // Try junction table first
    const { data: teacherClasses, error: tcError } = await supabase
      .from("teacher_classes")
      .select("class_id, classes(id, name)")
      .eq("teacher_id", teacherId);

    if (tcError) {
      console.error("Error fetching teacher_classes (anon):", tcError);
    }

    let classes = teacherClasses?.map((tc: any) => tc.classes) || [];

    // If no classes from junction table, try reading `profiles.class_ids` and fetch classes by id
    if (!classes || classes.length === 0) {
      try {
        const { data: profileData, error: profileErr } = await adminClient
          .from("profiles")
          .select("class_ids")
          .eq("id", teacherId)
          .single();

        console.log("Profile data:", profileData, "Error:", profileErr);

        if (profileErr) {
          console.error(
            "Error fetching profile.class_ids via admin client:",
            profileErr,
          );
        } else {
          const classIds: string[] = (profileData as any)?.class_ids || [];
          console.log("Class IDs from profile:", classIds);

          if (classIds.length > 0) {
            const { data: classesData, error: classesErr } = await supabase
              .from("classes")
              .select("id, name")
              .in("id", classIds);

            console.log("Classes fetched:", classesData, "Error:", classesErr);

            if (classesErr) {
              console.error("Error fetching classes by ids:", classesErr);
            } else {
              classes = classesData || [];
            }
          }
        }
      } catch (err) {
        console.error(
          "Fallback error while fetching classes for teacher:",
          err,
        );
      }
    }

    console.log("Final classes returned:", classes);
    return NextResponse.json({ classes, success: true });
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
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
