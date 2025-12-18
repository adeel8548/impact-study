import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacher_id");

    let query = supabase
      .from("teacher_timetable")
      .select(`
        *,
        teacher:profiles!teacher_timetable_teacher_id_fkey(name),
        class:classes(name)
      `);

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    query = query.order("day_of_week").order("start_time");

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pass through subjects array and basic names; subject names will be resolved client-side from the subjects list
    const formatted = data.map((entry: any) => ({
      ...entry,
      teacher_name: entry.teacher?.name,
      class_name: entry.class?.name,
    }));

    return NextResponse.json({ timetable: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      teacher_id,
      class_id,
      subject_id,
      subjects,
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = body;

    if (!teacher_id || !class_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Determine incoming subjects as an array (merge subject_id if provided)
    const incomingSubjects: string[] = Array.isArray(subjects)
      ? subjects.filter(Boolean)
      : (subject_id ? [subject_id] : []);

    if (incomingSubjects.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one subject (subjects[] or subject_id)" },
        { status: 400 }
      );
    }

    // Check if a slot already exists for this teacher/class/day/time
    const { data: existing } = await supabase
      .from("teacher_timetable")
      .select("id, subjects")
      .eq("teacher_id", teacher_id)
      .eq("class_id", class_id)
      .eq("day_of_week", day_of_week)
      .eq("start_time", start_time)
      .eq("end_time", end_time)
      .limit(1);

    if (existing && existing.length > 0) {
      // Merge unique subjects and update
      const current = Array.isArray(existing[0].subjects) ? existing[0].subjects : [];
      const merged = Array.from(new Set([...current, ...incomingSubjects]));

      const { data: updated, error: upErr } = await supabase
        .from("teacher_timetable")
        .update({ subjects: merged, room_number })
        .eq("id", existing[0].id)
        .select()
        .single();

      if (upErr) {
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
      return NextResponse.json({ entry: updated });
    }

    // Insert new slot with subjects array
    const { data: entry, error: insErr } = await supabase
      .from("teacher_timetable")
      .insert({
        teacher_id,
        class_id,
        subjects: incomingSubjects,
        day_of_week,
        start_time,
        end_time,
        room_number,
      })
      .select()
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      teacher_id,
      class_id,
      subjects,
      subject_id,
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = body;

    if (!id || !teacher_id || !class_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Coalesce subjects: prefer array, else wrap single subject_id if given
    const updatedSubjects: string[] | null = Array.isArray(subjects)
      ? subjects.filter(Boolean)
      : (subject_id ? [subject_id] : null);

    const { data: entry, error } = await supabase
      .from("teacher_timetable")
      .update({
        teacher_id,
        class_id,
        subjects: updatedSubjects ?? undefined,
        day_of_week,
        start_time,
        end_time,
        room_number,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("teacher_timetable")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
