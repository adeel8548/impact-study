import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function parseDateTime(date?: string | null, time?: string | null) {
  if (!date || !time) return null;
  const normalized = time.length === 5 ? `${time}:00` : time;
  const dt = new Date(`${date}T${normalized}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function computeStatusByTiming(entry: {
  status: "Pending" | "In Progress" | "Completed";
  schedule_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  const now = Date.now();
  const startAt = parseDateTime(entry.schedule_date, entry.start_time);
  const endAt = parseDateTime(entry.schedule_date, entry.end_time);
  if (!startAt || !endAt) return entry.status;
  if (now < startAt.getTime()) return "Pending" as const;
  if (now >= startAt.getTime() && now < endAt.getTime()) return "In Progress" as const;
  return "Completed" as const;
}

export async function GET(req: NextRequest) {
  const adminClient = await createAdminClient();
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const subjectId = searchParams.get("subjectId");
  const seriesName = searchParams.get("seriesName");
  const teacherId = searchParams.get("teacherId");

  try {
    let query = adminClient
      .from("study_schedule")
      .select(
        `
        id,
        day,
        class_id,
        subject_id,
        subject,
        chapter,
        max_marks,
        description,
        status,
        teacher_id,
        series_name,
        schedule_date,
        start_time,
        end_time,
        created_at,
        updated_at
      `
      )
      .order("day", { ascending: true });

    if (classId) query = query.eq("class_id", classId);
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (seriesName) query = query.eq("series_name", seriesName);
    if (teacherId) query = query.eq("teacher_id", teacherId);

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data || []).map((entry) => {
      const nextStatus = computeStatusByTiming(entry as any);
      return { ...entry, status: nextStatus };
    });

    const changedRows = rows.filter(
      (entry, index) => entry.status !== data?.[index]?.status,
    );
    const changedIds = changedRows.map((entry) => entry.id);

    if (changedIds.length > 0) {
      for (const row of changedRows) {
        const { error: updateError } = await adminClient
          .from("study_schedule")
          .update({ status: row.status })
          .eq("id", row.id);

        if (updateError) {
          console.error("Status auto-update failed:", updateError);
        }
      }
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching study schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch study schedule" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const adminClient = await createAdminClient();

  try {
    const body = await req.json();
    const {
      day,
      class_id,
      subject_id,
      subject,
      chapter,
      max_marks,
      description,
      status = "Pending",
      teacher_id,
      series_name,
      schedule_date,
      start_time,
      end_time,
    } = body;

    if (!class_id || !subject_id || !subject || !chapter || !series_name || !schedule_date || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("study_schedule")
      .insert({
        day,
        class_id,
        subject_id,
        subject,
        chapter,
        max_marks: typeof max_marks === "number" ? max_marks : 100,
        description: description || null,
        status,
        teacher_id: teacher_id || null,
        series_name,
        schedule_date,
        start_time,
        end_time,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error creating study schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create schedule entry" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const adminClient = await createAdminClient();

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from("study_schedule")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error updating study schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update schedule entry" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const adminClient = await createAdminClient();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id" },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("study_schedule")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting study schedule:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete schedule entry" },
      { status: 500 }
    );
  }
}
