"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TeacherHeader } from "@/components/teacher-header";

interface ConversationRow {
  id: string;
  admin_id: string;
  teacher_id: string;
  admin?: { name?: string | null; email?: string | null } | null;
}

export default function TeacherChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnsuring, startEnsure] = useTransition();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [supabase]);

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) return;
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("conversations")
          .select("id, admin_id, teacher_id, admin:profiles!conversations_admin_id_fkey(name,email)")
          .eq("teacher_id", currentUserId);
        if (error) throw error;
        const list = (data || []).map((row: any) => ({
          ...row,
          admin: row.admin || null,
        }));
        setConversations(list);
        if (list.length > 0 && !selected) {
          setSelected(list[0]);
          setConversationId(list[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load chats");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUserId, supabase, selected]);

  const openConversation = (row: ConversationRow) => {
    setSelected(row);
    setConversationId(row.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader />
      <main className="px-4 md:px-6 py-4 md:py-6 space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <div>
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-sm text-muted-foreground">Chat with admin in real time.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 space-y-3 overflow-y-auto h-[500px]">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading chats...
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chats yet.</p>
            ) : (
              conversations.map((c) => {
                const active = selected?.id === c.id;
                const adminName = c.admin?.name || "Admin";
                return (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c)}
                    className={cn(
                      "w-full text-left p-3 rounded border transition-colors",
                      active ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted",
                    )}
                  >
                    <div className="font-semibold text-foreground">{adminName}</div>
                    <div className="text-xs text-muted-foreground">{c.admin?.email}</div>
                  </button>
                );
              })
            )}
          </Card>

          <Card className="p-4 md:col-span-2 flex flex-col h-[500px] overflow-hidden">
            {conversationId && selected ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow conversationId={conversationId} currentUserId={currentUserId} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a chat to view messages
              </div>
            )}
            {isEnsuring && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Preparing chat...
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
