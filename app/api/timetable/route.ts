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
        class:classes(name),
        subject:subjects(name)
      `);

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    query = query.order("day_of_week").order("start_time");

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the data with names
    const formatted = data.map((entry: any) => ({
      ...entry,
      teacher_name: entry.teacher?.name,
      class_name: entry.class?.name,
      subject_name: entry.subject?.name,
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
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = body;

    if (!teacher_id || !class_id || !subject_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for time conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from("teacher_timetable")
      .select("*, class:classes(name)")
      .eq("teacher_id", teacher_id)
      .eq("day_of_week", day_of_week)
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`);

    if (conflicts && conflicts.length > 0) {
      const conflict = conflicts[0];
      return NextResponse.json(
        {
          error: `This teacher already has a lecture at ${conflict.start_time} in ${conflict.class?.name || "another class"}`,
        },
        { status: 409 }
      );
    }

    const { data: entry, error } = await supabase
      .from("teacher_timetable")
      .insert({
        teacher_id,
        class_id,
        subject_id,
        day_of_week,
        start_time,
        end_time,
        room_number,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate time slot error from the trigger
      if (error.message.includes("already has a lecture")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      subject_id,
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = body;

    if (!id || !teacher_id || !class_id || !subject_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for time conflicts (excluding current entry)
    const { data: conflicts } = await supabase
      .from("teacher_timetable")
      .select("*, class:classes(name)")
      .eq("teacher_id", teacher_id)
      .eq("day_of_week", day_of_week)
      .neq("id", id)
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`);

    if (conflicts && conflicts.length > 0) {
      const conflict = conflicts[0];
      return NextResponse.json(
        {
          error: `This teacher already has a lecture at ${conflict.start_time} in ${conflict.class?.name || "another class"}`,
        },
        { status: 409 }
      );
    }

    const { data: entry, error } = await supabase
      .from("teacher_timetable")
      .update({
        teacher_id,
        class_id,
        subject_id,
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
      if (error.message.includes("already has a lecture")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
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
