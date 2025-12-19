"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useConversationRealtime } from "@/hooks/useConversationRealtime";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
}

export function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // initial load
  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, message, is_read, created_at, sender:profiles(name)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const normalized = (data || []).map((row: any) => ({
          ...row,
          sender_name: row.sender?.name || "",
        }));
        setMessages(normalized);
      });
  }, [conversationId, supabase]);

  // realtime
  useConversationRealtime(conversationId, {
    onInsert: async (row: any) => {
      // Fetch sender name for realtime insert
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", row.sender_id)
        .single();
      const enriched = { ...row, sender_name: profile?.name || "" };
      setMessages((prev) => [...prev, enriched]);
    },
  });

  // mark read when opened
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const markRead = async () => {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUserId);
    };
    markRead();
  }, [conversationId, currentUserId, supabase]);

  const handleSend = useCallback(
    async (text: string) => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            message: text,
          })
          .select("id, conversation_id, sender_id, message, is_read, created_at")
          .single();
        
        if (data) {
          // Optimistic update with sender name
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", currentUserId)
            .single();
          const enriched = { ...data, sender_name: profile?.name || "" };
          setMessages((prev) => {
            // Avoid duplicate if realtime already added it
            const exists = prev.some((m) => m.id === enriched.id);
            return exists ? prev : [...prev, enriched];
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, currentUserId, supabase],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2">
        <MessageList messages={messages} currentUserId={currentUserId} />
      </div>
      <div className="mt-2 border-t pt-3 px-2 bg-background">
        <MessageInput onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
}
