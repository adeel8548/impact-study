import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  const month = request.nextUrl.searchParams.get("month"); // Format: YYYY-MM

  try {
    let query = supabase.from("teacher_attendance").select("*");

    if (teacherId) {
      query = query.eq("teacher_id", teacherId);
    }

    // If month is provided, calculate start and end dates for that month
    if (month && !startDate && !endDate) {
      const [year, monthNum] = month.split("-");
      const monthStart = `${year}-${monthNum}-01`;
      const lastDay = new Date(Number(year), Number(monthNum), 0).getDate();
      const monthEnd = `${year}-${monthNum}-${lastDay}`;

      query = query.gte("date", monthStart).lte("date", monthEnd);
    } else if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query.order("date", { ascending: false });

    if (error) throw error;

    // Return actual out_time column; do not map from updated_at
    return NextResponse.json({ attendance: data || [], success: true });
  } catch (error) {
    console.error("Error fetching teacher attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch attendance",
        success: false,
      },
      { status: 500 },
    );
  }
}

// export async function POST(request: NextRequest) {
//   const supabase = await createClient()

//   try {
//     const body = await request.json()
//     const { records } = body

//     if (!records || !Array.isArray(records)) {
//       return NextResponse.json(
//         { error: "Invalid request body. Expected 'records' array.", success: false },
//         { status: 400 },
//       )
//     }

//     // Insert or update attendance records
//     const { data, error } = await supabase
//       .from("teacher_attendance")
//       .upsert(records, { onConflict: "teacher_id,date" })
//       .select()

//     if (error) throw error

//     return NextResponse.json({ attendance: data, success: true })
//   } catch (error) {
//     console.error("Error creating teacher attendance:", error)
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Failed to create attendance", success: false },
//       { status: 500 },
//     )
//   }
// }
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();

    // If body is a single object, wrap it in an array
    const records = Array.isArray(body) ? body : [body];

    const { data, error } = await supabase
      .from("teacher_attendance")
      .upsert(records, { onConflict: ["teacher_id", "date"] }) // onConflict must be array of columns
      .select();

    if (error) throw error;

    // Return records as-is; out_time is an explicit column
    return NextResponse.json({ attendance: data || [], success: true });
  } catch (error) {
    console.error("Error creating teacher attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create attendance",
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
        { error: "Attendance ID is required", success: false },
        { status: 400 },
      );
    }

    // Accept out_time as a direct column update
    const normalizedUpdates: any = { ...updates };

    const { data, error } = await supabase
      .from("teacher_attendance")
      .update(normalizedUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ attendance: data, success: true });
  } catch (error) {
    console.error("Error updating teacher attendance:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update attendance",
        success: false,
      },
      { status: 500 },
    );
  }
}
