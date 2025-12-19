"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function ensureConversation(adminId: string, teacherId: string) {
  const supabase = await createClient();
  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("id")
    .eq("admin_id", adminId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (selectError) return { error: selectError.message, conversationId: null };
  if (existing?.id) return { conversationId: existing.id, error: null };

  const { data, error } = await supabase
    .from("conversations")
    .insert({ admin_id: adminId, teacher_id: teacherId })
    .select("id")
    .single();

  if (error) return { error: error.message, conversationId: null };
  revalidatePath("/admin");
  revalidatePath("/teacher");
  return { conversationId: data.id, error: null };
}

export async function fetchMessages(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, message, sender_id, is_read, created_at, sender:profiles(name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return { messages: [], error: error.message };
  return {
    messages: (data || []).map((row: any) => ({
      ...row,
      sender_name: row.sender?.name || "",
    })),
    error: null,
  };
}

export async function sendMessageAction(params: {
  conversationId: string;
  senderId: string;
  message: string;
}) {
  const supabase = await createClient();
  const { conversationId, senderId, message } = params;
  const trimmed = message.trim();
  if (!trimmed) return { error: "Message is empty" };

  const { error, data } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, message: trimmed })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/teacher");
  return { message: data, error: null };
}

export async function markConversationRead(conversationId: string, readerId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", readerId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/teacher");
  return { error: null };
}

export async function unreadCountForUser(userId: string) {
  const supabase = await createClient();
  const { data: convs, error: convErr } = await supabase
    .from("conversations")
    .select("id")
    .or(`admin_id.eq.${userId},teacher_id.eq.${userId}`);

  if (convErr) return { count: 0, error: convErr.message };
  const ids = (convs || []).map((c) => c.id);
  if (ids.length === 0) return { count: 0, error: null };

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .neq("sender_id", userId)
    .in("conversation_id", ids);

  if (error) return { count: 0, error: error.message };
  return { count: count || 0, error: null };
}
