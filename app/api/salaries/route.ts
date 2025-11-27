import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.from("teacher_salary").select("*")

    if (error) throw error

    return NextResponse.json({ salaries: data || [], success: true })
  } catch (error) {
    console.error("Error fetching salaries:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch salaries", success: false },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const { id, ...body } = await request.json()
    const { data, error } = await supabase.from("teacher_salary").update(body).eq("id", id).select()

    if (error) throw error

    return NextResponse.json({ salary: data?.[0], success: true })
  } catch (error) {
    console.error("Error updating salary:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update salary", success: false },
      { status: 500 },
    )
  }
}
