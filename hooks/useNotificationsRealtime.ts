import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Handlers<T> {
  onInsert?: (row: T) => void;
}

export function useNotificationsRealtime<T = any>(
  userId: string,
  handlers: Handlers<T>,
) {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => handlers.onInsert?.(payload.new as T),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handlers]);
}
