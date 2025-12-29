import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST() {
  try {
    const supabase = await createAdminClient();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id,name,email,role")
      .in("role", ["admin", "teacher"]);
    if (error) throw error;

    const db = adminDb();
    const batch = db.batch();
    profiles?.forEach((p: any) => {
      const ref = db.collection("users").doc(p.id);
      batch.set(ref, {
        userId: p.id,
        name: p.name || null,
        email: p.email || null,
        role: p.role || null,
        migratedAt: new Date(),
      }, { merge: true });
    });
    await batch.commit();
    return NextResponse.json({ ok: true, count: profiles?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
