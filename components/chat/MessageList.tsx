"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: Array<{
    id: string;
    sender_id: string;
    sender_name?: string;
    message: string;
    created_at: string;
  }>;
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="space-y-3 pr-2 pb-2">
      {messages.map((m) => {
        const mine = m.sender_id === currentUserId;
        return (
          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}> 
            <div
              className={cn(
                "rounded-lg px-3 py-2 max-w-[70%] shadow-sm break-all",
                mine ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <div className="text-xs opacity-80 mb-1">
                {m.sender_name || (mine ? "You" : "" )}
              </div>
              <div className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{m.message}</div>
              <div className="text-[10px] opacity-70 mt-1 text-right">
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
      <div className="fixed" ref={bottomRef} />
    </div>
  );
}
