"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MessageInputProps {
  onSend: (text: string) => Promise<void> | void;
  loading?: boolean;
}

export function MessageInput({ onSend, loading }: MessageInputProps) {
  const [text, setText] = useState("");
  const canSend = text.trim().length > 0 && !loading;

  async function handleSend() {
    if (!canSend) return;
    const payload = text.trim();
    setText("");
    await onSend(payload);
  }

  return (
    <div className="flex gap-2 items-center">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        onKeyDown={async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await handleSend();
          }
        }}
      />
      <Button disabled={!canSend} onClick={handleSend}>
        {loading ? "Sending..." : "Send"}
      </Button>
    </div>
  );
}
