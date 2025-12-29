"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { sendMessage, subscribeMessages, markConversationAsRead } from "@/lib/firestore-chat";
import { ensureFirebaseAuth } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  currentUserName?: string;
  onUnreadChange?: (count: number) => void;
}

export function ChatWindow({
  conversationId,
  currentUserId,
  currentUserName = "You",
  onUnreadChange,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Array<{ id: string; senderId: string; text: string; createdAt: Date; senderName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingTextRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880; // A5 note
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.warn("Notification sound failed:", err);
    }
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeMessages(conversationId, (msgs) => {
      // Play sound ONLY if page is not focused (user on different tab/page)
      if (msgs.length > lastMessageCountRef.current) {
        const newMessages = msgs.slice(lastMessageCountRef.current);
        const hasMessageFromOther = newMessages.some(m => m.senderId !== currentUserId);
        // Only play sound if browser tab is NOT visible
        if (hasMessageFromOther && !document.hidden) {
          // User is on this page but conversation open, don't play sound
        } else if (hasMessageFromOther && document.hidden) {
          // User is on different tab, play sound
          playNotificationSound();
        }
      }
      lastMessageCountRef.current = msgs.length;

      setMessages(msgs);
      setLoading(false);
      
      // Report unread count to parent
      if (onUnreadChange) {
        const unreadCount = msgs.filter(m => m.senderId !== currentUserId).length;
        onUnreadChange(unreadCount);
      }

      // Stop spinner once our pending message appears
      if (pendingTextRef.current) {
        const delivered = msgs.some(
          (m) => m.senderId === currentUserId && m.text === pendingTextRef.current
        );
        if (delivered) {
          setSending(false);
          pendingTextRef.current = null;
        }
      }

      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    // Mark conversation as read when opened
    markConversationAsRead(conversationId, currentUserId).catch(console.error);

    return () => unsubscribe();
  }, [conversationId, currentUserId, playNotificationSound]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput(""); // Clear input immediately for better UX
    setSending(true);
    
    console.log("handleSend started, conversationId:", conversationId);
    
    try {
      // Try to ensure Firebase auth, but continue even if it fails
      try {
        await ensureFirebaseAuth({
          id: currentUserId,
          name: currentUserName,
        });
        console.log("Firebase auth ensured");
      } catch (authError) {
        console.warn("Firebase auth skipped:", authError);
      }
      
      console.log("Sending message to conversation:", conversationId, "text:", messageText);
      // Mark this text pending so we can stop spinner once it appears via subscription
      pendingTextRef.current = messageText;

      const msgId = await sendMessage(conversationId, currentUserId, messageText, currentUserName);
      console.log("Message sent successfully, ID:", msgId);
      // Do not setSending(false) here; we'll stop when it appears in the stream
      
    } catch (error) {
      console.error("Error sending message:", error);
      setSending(false); // Reset on error
      pendingTextRef.current = null;
      
      toast.error("Failed to send message: " + (error instanceof Error ? error.message : "Unknown error"));
      // Restore message text on error
      setInput(messageText);
    }
  }, [conversationId, currentUserId, currentUserName, input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.createdAt instanceof Date 
                        ? msg.createdAt.toLocaleTimeString()
                        : "sending..."}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Container */}
      <div className="border-t p-4 bg-card space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            size="icon"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
