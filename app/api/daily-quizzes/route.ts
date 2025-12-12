import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  isTeacherAssignedToSubject,
  getTeacherAssignedSubjects,
} from "@/lib/server/teacher-permissions";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const classId = request.nextUrl.searchParams.get("classId");
  const subject = request.nextUrl.searchParams.get("subject");
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  try {
    let query = supabase
      .from("daily_quizzes")
      .select("*, subjects(id, name)");

    if (classId) query = query.eq("class_id", classId);
    if (teacherId) query = query.eq("teacher_id", teacherId);
    if (subject) query = query.ilike("subject", subject);
    if (startDate && endDate)
      query = query.gte("quiz_date", startDate).lte("quiz_date", endDate);

    const { data, error } = await query.order("quiz_date", { ascending: true });
    if (error) throw error;

    // Note: Filtering by teacher's assigned subjects is handled by the client
    // since daily_quizzes stores subject names (text), not subject_id (UUID)
    // The client should filter quizzes based on assigned_subjects if needed

    return NextResponse.json({ data: data || [], success: true });
  } catch (error) {
    console.error("Error fetching daily_quizzes:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const payload = Array.isArray(body) ? body : [body];
    const teacherId = body.teacherId || (Array.isArray(body) ? null : body.teacher_id);

    // If teacherId is provided and subject_id exists, verify teacher is assigned to the subject
    if (teacherId && !Array.isArray(body)) {
      const subjectId = body.subject_id;
      if (subjectId) {
        const isAssigned = await isTeacherAssignedToSubject(teacherId, subjectId);
        if (!isAssigned) {
          return NextResponse.json(
            {
              error:
                "Unauthorized: Teacher is not assigned to this subject",
              success: false,
            },
            { status: 403 },
          );
        }
      }
      
      // If subject name is provided but subject_id is not, look up the subject_id
      if (!body.subject_id && body.subject) {
        try {
          const { data: subjects, error: subjectError } = await supabase
            .from("subjects")
            .select("id")
            .ilike("name", body.subject)
            .single();
          
          if (subjectError) {
            console.warn("Subject lookup warning:", subjectError);
            // If subject not found, we'll just insert without subject_id
          } else if (subjects?.id) {
            body.subject_id = subjects.id;
          }
        } catch (err) {
          console.warn("Error looking up subject:", err);
          // Continue without subject_id if lookup fails
        }
      }
    }

    const { data, error } = await supabase
      .from("daily_quizzes")
      .insert(payload)
      .select();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error creating daily_quizzes:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("daily_quizzes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error updating daily_quizzes:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update",
        success: false,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "id is required", success: false },
        { status: 400 },
      );
    }
    const { error } = await supabase
      .from("daily_quizzes")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting daily_quizzes:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete",
        success: false,
      },
      { status: 500 },
    );
  }
}
