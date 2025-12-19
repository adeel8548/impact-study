"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface TeacherRow {
  id: string;
  name: string;
  email?: string;
}

export default function AdminChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isEnsuringConversation, startEnsure] = useTransition();
  const [teacherUnreadCounts, setTeacherUnreadCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
      }
    });
  }, [supabase]);

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        setIsLoadingTeachers(true);
        const res = await fetch("/api/teachers");
        if (!res.ok) throw new Error("Failed to load teachers");
        const body = await res.json();
        const list = Array.isArray(body.teachers) ? body.teachers : body;
        setTeachers(list);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load teachers");
      } finally {
        setIsLoadingTeachers(false);
      }
    };
    loadTeachers();
  }, []);

  // load unread counts for each teacher
  useEffect(() => {
    if (!currentUserId) return;
    const loadUnreadCounts = async () => {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, teacher_id")
        .eq("admin_id", currentUserId);
      if (!conversations) return;

      const counts = new Map<string, number>();
      for (const conv of conversations) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_read", false)
          .neq("sender_id", currentUserId);
        if (count && count > 0) {
          counts.set(conv.teacher_id, count);
        }
      }
      setTeacherUnreadCounts(counts);
    };
    loadUnreadCounts();

    // subscribe to realtime updates
    const channel = supabase
      .channel("admin-unread-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadUnreadCounts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  const filteredTeachers = useMemo(() => {
    const term = filter.toLowerCase();
    if (!term) return teachers;
    return teachers.filter((t) =>
      (t.name || "").toLowerCase().includes(term) || (t.email || "").toLowerCase().includes(term),
    );
  }, [teachers, filter]);

  const ensureConversation = (teacher: TeacherRow) => {
    if (!currentUserId) {
      toast.error("User not signed in");
      return;
    }
    setSelectedTeacher(teacher);
    startEnsure(async () => {
      const { data, error } = await supabase
        .from("conversations")
        .upsert(
          { admin_id: currentUserId, teacher_id: teacher.id },
          { onConflict: "admin_id,teacher_id" },
        )
        .select("id")
        .single();

      if (error) {
        console.error(error);
        toast.error("Failed to open chat");
        return;
      }
      setConversationId(data.id);
});
  };

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  const sendBroadcast = async (message: string) => {
    if (!currentUserId || selectedTeachers.size === 0) return;
    try {
      for (const teacherId of selectedTeachers) {
        const { data: conv } = await supabase
          .from("conversations")
          .upsert(
            { admin_id: currentUserId, teacher_id: teacherId },
            { onConflict: "admin_id,teacher_id" },
          )
          .select("id")
          .single();
        if (conv?.id) {
          await supabase.from("messages").insert({
            conversation_id: conv.id,
            sender_id: currentUserId,
            message,
          });
        }
      }
      toast.success(`Message sent to ${selectedTeachers.size} teacher(s)`);
      setSelectedTeachers(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to send broadcast");
    }
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <div>
            <h1 className="text-xl font-semibold">Admin ↔ Teacher Chat</h1>
            <p className="text-sm text-muted-foreground">Select a teacher to start chatting in real time.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 space-y-3 overflow-y-auto h-[500px]">
            <div className="flex items-center justify-between">
              <Input
                placeholder="Search teacher..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (selectedTeachers.size > 0) {
                    setSelectedTeachers(new Set());
                  }
                }}
                className="ml-2 whitespace-nowrap"
              >
                {selectedTeachers.size > 0 ? `Clear (${selectedTeachers.size})` : "Multi"}
              </Button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLoadingTeachers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading teachers...
                </div>
              ) : filteredTeachers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No teachers found</p>
              ) : (
                filteredTeachers.map((t) => {
                  const active = selectedTeacher?.id === t.id;
                  const checked = selectedTeachers.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "w-full text-left p-3 rounded border transition-colors flex items-center gap-2",
                        active ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacherSelection(t.id)}
                        className="w-4 h-4"
                      />
                      <button
                        onClick={() => ensureConversation(t)}
                        className="flex-1 text-left flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.email}</div>
                        </div>
                        {teacherUnreadCounts.has(t.id) && teacherUnreadCounts.get(t.id)! > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {teacherUnreadCounts.get(t.id)}
                          </Badge>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-4 md:col-span-2 flex flex-col h-[500px] overflow-hidden">
            {selectedTeachers.size > 0 ? (
              <div className="flex-1 flex flex-col gap-3">
                <div className="text-sm font-semibold">
                  Send to {selectedTeachers.size} teacher(s)
                </div>
                <div className="flex-1" />
                <div className="flex gap-2">
                  <Input
                    placeholder="Type broadcast message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        sendBroadcast(e.currentTarget.value.trim());
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                      if (input?.value.trim()) {
                        sendBroadcast(input.value.trim());
                        input.value = "";
                      }
                    }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            ) : conversationId && selectedTeacher ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow conversationId={conversationId} currentUserId={currentUserId} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a teacher to open chat
              </div>
            )}
            {isEnsuringConversation && (
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
