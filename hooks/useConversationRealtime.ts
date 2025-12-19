import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Handlers<T> {
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
}

export function useConversationRealtime<T = any>(
  conversationId: string,
  handlers: Handlers<T>,
) {
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (payload.eventType === "INSERT") handlers.onInsert?.(payload.new as T);
          if (payload.eventType === "UPDATE") handlers.onUpdate?.(payload.new as T);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, handlers]);
}
