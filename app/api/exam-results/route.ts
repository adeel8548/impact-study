import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Fetch exam results
 * Query params:
 * - studentId: Filter results by student
 * - chapterId: Filter results by chapter
 * - classId: Filter results by class
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const studentId = request.nextUrl.searchParams.get("studentId");
  const chapterId = request.nextUrl.searchParams.get("chapterId");
  const classId = request.nextUrl.searchParams.get("classId");

  try {
    let query = supabase.from("exam_results").select(`
        *,
        student:students(id, name),
        chapter:exam_chapters(id, chapter_name, max_marks)
      `);

    if (studentId) query = query.eq("student_id", studentId);
    if (chapterId) query = query.eq("chapter_id", chapterId);
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch results",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Create or update exam results (upsert)
 * Body:
 * - student_id: UUID of the student
 * - chapter_id: UUID of the chapter
 * - class_id: UUID of the class
 * - marks: Marks obtained (decimal)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { student_id, chapter_id, class_id, marks } = body;

    if (!student_id || !chapter_id || !class_id) {
      return NextResponse.json(
        {
          error: "student_id, chapter_id, and class_id are required",
          success: false,
        },
        { status: 400 },
      );
    }

    // Upsert: try to update first, if not found, insert
    const { data: existingResult, error: fetchError } = await supabase
      .from("exam_results")
      .select("id")
      .eq("student_id", student_id)
      .eq("chapter_id", chapter_id)
      .eq("class_id", class_id)
      .single();

    let result;
    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found
      throw fetchError;
    }

    if (existingResult) {
      // Update existing record
      const { data, error } = await supabase
        .from("exam_results")
        .update({ marks, updated_at: new Date().toISOString() })
        .eq("id", existingResult.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from("exam_results")
        .insert({
          student_id,
          chapter_id,
          class_id,
          marks,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ data: result, success: true });
  } catch (error) {
    console.error("Error saving exam result:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save result",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Delete an exam result
 * Query params:
 * - id: UUID of the result to delete
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Result ID is required", success: false },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("exam_results").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting exam result:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete result",
        success: false,
      },
      { status: 500 },
    );
  }
}
