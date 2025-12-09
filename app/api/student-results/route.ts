import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET - Fetch student results
 * Query params:
 * - studentId: Filter results by student
 * - seriesExamId: Filter results by series exam
 * - classId: Filter results by class
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const studentId = request.nextUrl.searchParams.get("studentId");
  const seriesExamId = request.nextUrl.searchParams.get("seriesExamId");
  const classId = request.nextUrl.searchParams.get("classId");

  try {
    let query = supabase.from("student_results").select(`
        *,
        student:students(id, name),
        chapter:exam_chapters(id, chapter_name, max_marks)
      `);

    if (studentId) query = query.eq("student_id", studentId);
    if (seriesExamId) query = query.eq("series_exam_id", seriesExamId);
    if (classId) query = query.eq("class_id", classId);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error fetching student results:", error);
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
 * POST - Create or update student results
 * Body:
 * {
 *   student_id: string,
 *   series_exam_id: string,
 *   class_id: string,
 *   chapter_results: [{ chapter_id: string, marks: number }]
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { student_id, series_exam_id, class_id, chapter_results } = body;

    if (!student_id || !series_exam_id || !class_id || !chapter_results) {
      return NextResponse.json(
        {
          error:
            "student_id, series_exam_id, class_id, and chapter_results are required",
          success: false,
        },
        { status: 400 },
      );
    }

    // Check if all marks are valid (0 or positive numbers)
    const allValid = chapter_results.every(
      (result: any) =>
        result.chapter_id &&
        result.marks !== undefined &&
        !isNaN(parseFloat(result.marks)) &&
        parseFloat(result.marks) >= 0,
    );

    if (!allValid) {
      return NextResponse.json(
        {
          error: "Invalid marks - must be non-negative numbers",
          success: false,
        },
        { status: 400 },
      );
    }

    // Process each chapter result (upsert)
    const results = [];
    for (const chapterResult of chapter_results) {
      const { chapter_id, marks } = chapterResult;

      // Check if record exists
      const { data: existing, error: fetchError } = await supabase
        .from("student_results")
        .select("id")
        .eq("student_id", student_id)
        .eq("chapter_id", chapter_id)
        .eq("series_exam_id", series_exam_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows found
        throw fetchError;
      }

      let result;
      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from("student_results")
          .update({
            marks: parseFloat(marks),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from("student_results")
          .insert({
            student_id,
            chapter_id,
            series_exam_id,
            class_id,
            marks: parseFloat(marks),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      results.push(result);
    }

    return NextResponse.json({ data: results, success: true });
  } catch (error) {
    console.error("Error saving student results:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save results",
        success: false,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update student result marks
 * Body:
 * {
 *   id: string,
 *   marks: number
 * }
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, marks } = body;

    if (!id || marks === undefined) {
      return NextResponse.json(
        { error: "id and marks are required", success: false },
        { status: 400 },
      );
    }

    if (isNaN(parseFloat(marks)) || parseFloat(marks) < 0) {
      return NextResponse.json(
        { error: "Marks must be a non-negative number", success: false },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("student_results")
      .update({
        marks: parseFloat(marks),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating student results:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update results",
        success: false,
      },
      { status: 500 },
    );
  }
}
