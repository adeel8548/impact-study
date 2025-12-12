import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getTeacherAssignedSubjects } from "@/lib/server/teacher-permissions";

/**
 * GET /api/quiz-results
 * Fetch quiz results with filtering options
 * Query params:
 *   - studentId: filter by student
 *   - teacherId: filter by teacher
 *   - classId: filter by class
 *   - filterTeacherOnly: if true, only return quizzes for subjects the teacher is assigned to
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const teacherId = searchParams.get("teacherId");
    const classId = searchParams.get("classId");
    const quizId = searchParams.get("quizId");
    const quizName = searchParams.get("quizName");
    const quizDate = searchParams.get("quizDate");
    const filterTeacherOnly = searchParams.get("filterTeacherOnly") === "true";

    // Start with the base query including related data
    let query = supabase.from("quiz_results").select(
      `
        id,
        student_id,
        teacher_id,
        quiz_id,
        quiz_name,
        obtained_marks,
        total_marks,
        quiz_date,
        quiz_duration,
        created_at,
        updated_at,
        student:students(id, name, class_id),
        teacher:profiles(id, name)
      `
    );

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    // If quizId/quizName/quizDate are provided, filter on them server-side.
    // Prefer quizId (exact match) when provided.
    if (quizId) {
      query = query.eq("quiz_id", quizId);
    } else {
      // Use case-insensitive matching for quiz_name (trim input) and exact match for quiz_date.
      const quizNameParam = quizName ? quizName.trim() : null;
      if (quizNameParam) {
        // Use ilike for case-insensitive comparison. This will match regardless of capitalization.
        // We do not add wildcards because we want an exact text match but case-insensitive.
        query = query.ilike("quiz_name", quizNameParam);
      }
      if (quizDate) {
        // quiz_date is stored in YYYY-MM-DD format; match exactly
        query = query.eq("quiz_date", quizDate);
      }
    }

    const { data, error } = await query.order("quiz_date", {
      ascending: false,
    });

    if (error) throw error;

    // If filterTeacherOnly is true, only return quizzes for subjects the teacher is assigned to
    // Note: This requires subject_id field in quiz_results or a proper relationship to daily_quizzes
    // For now, filtering is handled client-side or teacher can only see their own results
    let filteredData = data || [];
    // Teacher-specific filtering would go here if needed
    // if (filterTeacherOnly && teacherId && filteredData.length > 0) { ... }

    // If the filtered query returned nothing but the client asked for a specific quiz,
    // run a fallback query (no quizName/quizDate filters) to help debug what rows exist.
    let fallbackData: any[] = [];
    if ((quizName || quizDate) && Array.isArray(filteredData) && filteredData.length === 0) {
      try {
        console.log(
          `No rows matched quizName=${quizName} quizDate=${quizDate}. Running fallback query for debug.`
        );
        const { data: fb, error: fbErr } = await supabase
          .from("quiz_results")
          .select(
            `
               id,
    student_id,
    teacher_id,
    quiz_name,
    obtained_marks,
    total_marks,
    quiz_date,
    quiz_duration,
    created_at,
    updated_at,
    student:students(id, name, class_id),
    teacher:profiles(id, name)
            `
          )
          .order("created_at", { ascending: false })
          .limit(100);
        if (fbErr) {
          console.warn("Fallback query error:", fbErr);
        } else {
          fallbackData = fb || [];
        }
      } catch (e) {
        console.warn("Fallback query exception:", e);
      }
    }

    // Filter by classId on the server side if provided
    let results = data || [];
    if (classId && results.length > 0) {
      results = results.filter(
        (result: any) => result.student?.class_id === classId
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      fallbackData,
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch quiz results",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quiz-results
 * Create quiz result
 * Body: { studentId, teacherId, quizName, obtainedMarks, totalMarks, quizDate, quizDuration }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      studentId,
      teacherId,
      quizId,
      quizName,
      obtainedMarks,
      totalMarks,
      quizDate,
      quizDuration,
    } = body;

    // Validate required fields
    if (
      !studentId ||
      !quizName ||
      obtainedMarks === undefined ||
      !totalMarks ||
      !quizDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Get current user if teacherId not provided
    let finalTeacherId = teacherId;
    if (!finalTeacherId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      finalTeacherId = user?.id || "";
    }

    // Check if quiz result already exists for this student and quiz.
    // If quizId is provided prefer matching by quiz_id, otherwise fall back to name+date.
    let existingResult: any = null;
    if (quizId) {
      const { data } = await supabase
        .from("quiz_results")
        .select("id")
        .eq("student_id", studentId)
        .eq("quiz_id", quizId)
        .single();
      existingResult = data;
    } else {
      const { data } = await supabase
        .from("quiz_results")
        .select("id")
        .eq("student_id", studentId)
        .eq("quiz_name", quizName)
        .eq("quiz_date", quizDate)
        .single();
      existingResult = data;
    }

    if (existingResult) {
      // Update existing record
      const updatePayload: any = {
        obtained_marks: obtainedMarks,
        total_marks: totalMarks,
        quiz_duration: quizDuration || 0,
        updated_at: new Date().toISOString(),
      };
      if (quizId) updatePayload.quiz_id = quizId;

      const { data, error } = await supabase
        .from("quiz_results")
        .update(updatePayload)
        .eq("id", existingResult.id)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data?.[0],
        message: "Quiz result updated successfully",
      });
    } else {
      // Create new record
      const insertPayload: any = {
        student_id: studentId,
        teacher_id: finalTeacherId,
        quiz_name: quizName,
        obtained_marks: obtainedMarks,
        total_marks: totalMarks,
        quiz_date: quizDate,
        quiz_duration: quizDuration || 0,
        created_at: new Date().toISOString(),
      };
      if (quizId) insertPayload.quiz_id = quizId;

      const { data, error } = await supabase
        .from("quiz_results")
        .insert(insertPayload)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: data?.[0],
        message: "Quiz result created successfully",
      });
    }
  } catch (error) {
    console.error("Error saving quiz result:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save quiz result",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/quiz-results
 * Update quiz result by ID
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, quizName, obtainedMarks, totalMarks, quizDate, quizDuration } =
      body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz result ID is required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("quiz_results")
      .update({
        ...(quizName && { quiz_name: quizName }),
        ...(obtainedMarks !== undefined && { obtained_marks: obtainedMarks }),
        ...(totalMarks && { total_marks: totalMarks }),
        ...(quizDate && { quiz_date: quizDate }),
        ...(quizDuration && { quiz_duration: quizDuration }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data?.[0],
      message: "Quiz result updated successfully",
    });
  } catch (error) {
    console.error("Error updating quiz result:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update quiz result",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quiz-results
 * Delete quiz result by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Quiz result ID is required",
        },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("quiz_results").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Quiz result deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz result:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete quiz result",
      },
      { status: 500 }
    );
  }
}
