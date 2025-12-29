"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Send } from "lucide-react";

interface MessageInputProps {
  onSend: (text: string) => Promise<void> | void;
  loading?: boolean;
}

export function MessageInput({ onSend, loading }: MessageInputProps) {
  const [text, setText] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const canSend = text.trim().length > 0 && !loading;

  useEffect(() => {
    // Check notification permission status
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationEnabled(Notification.permission === "granted");
    }
  }, []);

  async function handleSend() {
    if (!canSend) return;
    const payload = text.trim();
    setText("");
    try {
      await onSend(payload);
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore text if sending failed
      setText(payload);
    }
  }

  async function requestNotificationPermission() {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationEnabled(permission === "granted");
      } catch (error) {
        console.error("Failed to request notification permission:", error);
      }
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {!notificationEnabled && (
        <Button
          size="sm"
          variant="outline"
          onClick={requestNotificationPermission}
          title="Enable notifications"
          className="flex-shrink-0"
        >
          <Bell className="w-4 h-4" />
        </Button>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={loading}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && !e.shiftKey && !loading) {
            e.preventDefault();
            await handleSend();
          }
        }}
      />
      <Button 
        disabled={!canSend} 
        onClick={handleSend}
        size="sm"
        className="flex-shrink-0 gap-2"
      >
        <Send className="w-4 h-4" />
        {loading ? "..." : ""}
      </Button>
    </div>
  );
}
