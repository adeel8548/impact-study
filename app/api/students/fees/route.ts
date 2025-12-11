import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get("studentId");
    const yearParam = searchParams.get("year");
    const statusParam = searchParams.get("status");

    let query = supabase
      .from("student_fees")
      .select("id, student_id, amount, status, month, year, paid_date")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (studentId) {
      query = query.eq("student_id", studentId);
    }

    if (yearParam) {
      query = query.eq("year", Number(yearParam));
    }

    if (statusParam === "paid" || statusParam === "unpaid") {
      query = query.eq("status", statusParam);
    }

    const { data: fees, error } = await query;

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
