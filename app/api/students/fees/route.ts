import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Fetch all student fees (not filtered by month/year for the modal)
    const { data: fees, error } = await supabase
      .from("student_fees")
      .select("id, student_id, amount, status, month, year, paid_date")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message, fees: [] },
        { status: 400 },
      );
    }

    return NextResponse.json({ fees: fees || [], error: null });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student fees", fees: [] },
      { status: 500 },
    );
  }
}
