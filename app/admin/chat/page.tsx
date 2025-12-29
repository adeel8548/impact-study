"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
 
import { ensureConversation, sendMessage, subscribeUnreadCount } from "@/lib/firestore-chat";
import { db, ensureFirebaseAuth } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useChatNotifications } from "@/hooks/useChatNotifications";

interface TeacherRow {
  id: string;
  name: string;
  email?: string;
}

interface ConversationItem {
  id: string;
  teacherId: string;
  lastMessage?: string | null;
  updatedAt?: number;
  teacherName?: string;
  teacherEmail?: string;
}

export default function AdminChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const teacherLookup = useMemo(
    () => Object.fromEntries(teachers.map((t) => [t.id, t])),
    [teachers]
  );
  const [filter, setFilter] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherRow | null>(null);
  const selectedTeacherRef = React.useRef<TeacherRow | null>(null);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set()); // Multi-select
  
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
  const [isEnsuringConversation, startEnsure] = useTransition();
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");
  
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({}); // Track unread per conversation

  // Enable web push + sound notifications for the active conversation
  useChatNotifications(conversationId, { userId: currentUserId });

  // Persist selectedTeacher in ref to prevent unwanted clearing
  useEffect(() => {
    if (selectedTeacher) {
      selectedTeacherRef.current = selectedTeacher;
    }
  }, [selectedTeacher]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
        
        // Fetch admin name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user.id)
          .single();
        if (profile?.name) {
          setCurrentUserName(profile.name);
        }
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

  // Load admin conversations directly from Firestore in realtime
  useEffect(() => {
    if (!currentUserId) return;
    
    // Check if Firebase is configured
    const isFirebaseConfigured = !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    if (!isFirebaseConfigured) {
      console.log("Firebase not configured, skipping Firestore query");
      return;
    }

    // Ensure Firebase auth (anonymous) so Firestore writes work and upsert user profile
    ensureFirebaseAuth({
      id: currentUserId,
      name: currentUserName,
      role: "admin",
    }).catch(err => console.warn("Firebase auth skipped:", err));
    
    // Show loading placeholder with teacher names from lookup immediately
    if (teachers.length > 0 && conversations.length === 0) {
      console.log("Pre-populating with teacher lookup");
    }
    
    console.log("Admin loading conversations for:", currentUserId);
    
    const q = query(
      collection(db, "conversations"),
      where("adminId", "==", currentUserId),
      orderBy("updatedAt", "desc")
    );
    
    const unsub = onSnapshot(
      q,
      async (snap) => {
        console.log("Firestore conversations loaded:", snap.docs.length);
        
        // If Firestore has no results, fall back to Supabase
        if (snap.docs.length === 0) {
          console.log("No conversations in Firestore, using Supabase fallback");
          try {
            const { data: convs, error: convErr } = await supabase
              .from("conversations")
              .select("id, teacher_id")
              .eq("admin_id", currentUserId);
            
            console.log("Supabase conversations loaded:", convs?.length, "error:", convErr);
            
            if (convErr) {
              console.error("Error fetching conversations:", convErr);
              setConversations([]);
              return;
            }
            
            if (!convs || convs.length === 0) {
              console.log("No conversations found in Supabase either");
              setConversations([]);
              return;
            }
            
            // Fetch teacher profiles for conversation items
            const teacherIds = [...new Set(convs.map((c: any) => c.teacher_id))];
            console.log("Fetching teacher profiles for IDs:", teacherIds);
            
            const { data: teacherProfiles, error: profileError } = await supabase
              .from("profiles")
              .select("id, name, email")
              .in("id", teacherIds);
            
            console.log("Teacher profiles fetched:", teacherProfiles?.length, "error:", profileError);
            
            const teacherMap = Object.fromEntries((teacherProfiles || []).map((t: any) => [t.id, t]));
            
            const items: ConversationItem[] = await Promise.all(
              (convs as any[]).map(async (c: any) => {
                const ensured = await ensureConversation(currentUserId, c.teacher_id);
                return {
                  id: ensured.id,
                  teacherId: c.teacher_id,
                  lastMessage: null,
                  updatedAt: Date.now(),
                  teacherName:
                    teacherMap[c.teacher_id]?.name ||
                    teacherLookup[c.teacher_id]?.name ||
                    "Teacher",
                  teacherEmail:
                    teacherMap[c.teacher_id]?.email ||
                    teacherLookup[c.teacher_id]?.email ||
                    "",
                } as ConversationItem;
              })
            );
            
            console.log("Final conversation items from Supabase:", items);
            setConversations(items);
          } catch (err) {
            console.error("Exception in Supabase fallback:", err);
            setConversations([]);
          }
          return;
        }
        
        // Process Firestore documents if any exist
        const items: ConversationItem[] = [];
        
        // Collect all teacher IDs that need profile lookup
        const teacherIdsToFetch: string[] = [];
        for (const d of snap.docs) {
          const data: any = d.data();
          console.log("Conversation data:", d.id, data);
          // Use stored name from Firestore or lookup, otherwise mark for batch fetch
          if (!data.teacherName && !teacherLookup[data.teacherId]) {
            teacherIdsToFetch.push(data.teacherId);
          }
        }
        
        console.log("Teacher IDs to fetch:", teacherIdsToFetch);
        console.log("teacherLookup available:", Object.keys(teacherLookup).length, teacherLookup);
        
        // Batch fetch profiles if needed
        let profileMap: Record<string, any> = {};
        if (teacherIdsToFetch.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", teacherIdsToFetch);
          console.log("Batch fetched profiles:", profiles);
          profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        }
        
        // Build items with name priority: Firestore > teacherLookup > profileMap > fallback
        for (const d of snap.docs) {
          const data: any = d.data();
          const teacherName = 
            data.teacherName || 
            teacherLookup[data.teacherId]?.name || 
            profileMap[data.teacherId]?.name || 
            "Teacher";
          const teacherEmail = 
            data.teacherEmail || 
            teacherLookup[data.teacherId]?.email || 
            profileMap[data.teacherId]?.email || 
            "";
          
          console.log("Building item for:", data.teacherId, "name:", teacherName);
          
          items.push({
            id: d.id,
            teacherId: data.teacherId,
            lastMessage: data.lastMessage ?? null,
            updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
            teacherName,
            teacherEmail,
          });
        }
        console.log("Final conversations from Firestore:", items);
        setConversations(items);
      },
      (error) => {
        console.error("Error loading conversations from Firestore:", error);
        // Error callback - fall back to Supabase
        (async () => {
          try {
            const { data: convs, error: convErr } = await supabase
              .from("conversations")
              .select("id, teacher_id")
              .eq("admin_id", currentUserId);
            
            console.log("Supabase conversations loaded (error fallback):", convs?.length, "error:", convErr);
            
            if (convErr) {
              console.error("Error fetching conversations:", convErr);
              setConversations([]);
              return;
            }
            
            if (!convs || convs.length === 0) {
              console.log("No conversations found");
              setConversations([]);
              return;
            }
            
            // Fetch teacher profiles for conversation items
            const teacherIds = [...new Set(convs.map((c: any) => c.teacher_id))];
            console.log("Fetching teacher profiles for IDs:", teacherIds);
            
            const { data: teacherProfiles, error: profileError } = await supabase
              .from("profiles")
              .select("id, name, email")
              .in("id", teacherIds);
            
            console.log("Teacher profiles fetched:", teacherProfiles?.length, "error:", profileError);
            
            const teacherMap = Object.fromEntries((teacherProfiles || []).map((t: any) => [t.id, t]));
            
            const items: ConversationItem[] = await Promise.all(
              (convs as any[]).map(async (c: any) => {
                const ensured = await ensureConversation(currentUserId, c.teacher_id);
                return {
                  id: ensured.id,
                  teacherId: c.teacher_id,
                  lastMessage: null,
                  updatedAt: Date.now(),
                  teacherName:
                    teacherMap[c.teacher_id]?.name ||
                    teacherLookup[c.teacher_id]?.name ||
                    "Teacher",
                  teacherEmail:
                    teacherMap[c.teacher_id]?.email ||
                    teacherLookup[c.teacher_id]?.email ||
                    "",
                } as ConversationItem;
              })
            );
            
            console.log("Final conversation items from Supabase:", items);
            setConversations(items);
          } catch (err) {
            console.error("Exception in fallback:", err);
            setConversations([]);
          }
        })();
      }
    );
    return () => unsub();
  }, [currentUserId, supabase, teacherLookup]);

  const filteredConversations = useMemo(() => {
    const term = filter.toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) =>
      (c.teacherName || "").toLowerCase().includes(term) || (c.teacherEmail || "").toLowerCase().includes(term)
    );
  }, [conversations, filter]);

  // Subscribe to unread counts for each conversation
  useEffect(() => {
    if (conversations.length === 0 || !currentUserId) return;
    
    const unsubscribers: Array<() => void> = [];
    
    conversations.forEach((conv) => {
      const unsub = subscribeUnreadCount(conv.id, currentUserId, (count) => {
        setUnreadCounts((prev) => ({ ...prev, [conv.id]: count }));
      });
      unsubscribers.push(unsub);
    });
    
    return () => unsubscribers.forEach((u) => u());
  }, [conversations, currentUserId]);

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim() || selectedTeachers.size === 0) {
      toast.error("Select teachers and enter a message");
      return;
    }

    setBulkSending(true);
    try {
      const teacherIds = Array.from(selectedTeachers);
      for (const teacherId of teacherIds) {
        const teacher = teachers.find((t) => t.id === teacherId);
        const { id: convId } = await ensureConversation(
          currentUserId,
          teacherId,
          teacher?.name,
          teacher?.email
        );
        await sendMessage(convId, currentUserId, bulkMessage.trim(), currentUserName);
      }
      setBulkMessage("");
      setSelectedTeachers(new Set());
      toast.success(`Message sent to ${teacherIds.length} teacher(s)`);
    } catch (err) {
      console.error("Bulk send error:", err);
      toast.error("Failed to send bulk message");
    } finally {
      setBulkSending(false);
    }
  };

  const ensureConversationOpen = (teacher: TeacherRow) => {
    if (!currentUserId) {
      toast.error("User not signed in");
      return;
    }
    console.log("Selecting teacher:", teacher.name, teacher.id);
    setSelectedTeacher(teacher);
    selectedTeacherRef.current = teacher;
    startEnsure(async () => {
      try {
        const { id } = await ensureConversation(
          currentUserId, 
          teacher.id,
          teacher.name,
          teacher.email
        );
        setConversationId(id);
      } catch (e) {
        console.error(e);
        toast.error("Failed to open chat");
      }
    });
  };

  // Allow starting a new chat by pressing Enter on search input if a teacher matches
  const startChatFromSearch = async () => {
    const term = filter.trim().toLowerCase();
    if (!term) return;
    const match = teachers.find(
      (t) => (t.name || "").toLowerCase().includes(term) || (t.email || "").toLowerCase().includes(term)
    );
    if (match) {
      ensureConversationOpen(match);
    } else {
      toast.error("No matching teacher found");
    }
  };

  const isFirebaseConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-4">
          <Card className="p-6 bg-red-50 border-red-200">
            <h2 className="text-red-900 font-semibold mb-2">⚠️ Firebase Not Configured</h2>
            <p className="text-red-800 text-sm">
              Chat features are not available because Firebase credentials are missing.
            </p>
            <p className="text-red-800 text-sm mt-2">
              Please add Firebase environment variables to <code className="bg-red-100 px-2 py-1 rounded">.env.local</code>
            </p>
            <p className="text-red-800 text-sm mt-2">
              See <code className="bg-red-100 px-2 py-1 rounded">.env.local.example</code> for the required variables.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5" />
            <div>
              <h1 className="text-xl font-semibold">Admin ↔ Teacher Chat</h1>
              <p className="text-sm text-muted-foreground">Select a teacher to start chatting in real time.</p>
            </div>
          </div>
          {/* Bell icon with unread count */}
          <div className="relative">
            <Bell className="w-6 h-6 text-muted-foreground cursor-pointer hover:text-foreground" />
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 99 ? "99+" : Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 space-y-3 overflow-y-auto h-[500px]">
            <div className="space-y-2">
              <Input
                placeholder="Search teacher (Enter to start new chat)"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") startChatFromSearch();
                }}
              />
              {/* Multi-select and bulk message section */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Bulk Message ({selectedTeachers.size} selected)</p>
                <textarea
                  placeholder="Message to send to selected teachers..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  className="w-full p-2 text-xs border rounded resize-none h-20"
                />
                <Button
                  onClick={sendBulkMessage}
                  disabled={bulkSending || selectedTeachers.size === 0 || !bulkMessage.trim()}
                  className="w-full h-8 text-xs"
                >
                  {bulkSending ? "Sending..." : `Send to ${selectedTeachers.size}`}
                </Button>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLoadingTeachers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading teachers...
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              ) : (
                filteredConversations.map((c) => {
                  const active = conversationId === c.id;
                  const isSelected = selectedTeachers.has(c.teacherId);
                  const unreadCount = unreadCounts[c.id] || 0;
                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "w-full p-3 rounded border transition-colors flex items-start gap-3 cursor-pointer hover:bg-muted",
                        active && !selectedTeachers.size ? "bg-primary/10 border-primary" : "bg-background",
                        isSelected ? "bg-blue-50 border-blue-300" : ""
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedTeachers);
                          if (isSelected) {
                            newSelected.delete(c.teacherId);
                          } else {
                            newSelected.add(c.teacherId);
                          }
                          setSelectedTeachers(newSelected);
                        }}
                        className="mt-1 h-4 w-4 cursor-pointer"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setConversationId(c.id);
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">{c.teacherName || "Teacher"}</span>
                          {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.teacherEmail}</div>
                        {c.lastMessage ? (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.lastMessage}</div>
                        ) : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-4 md:col-span-2 flex flex-col h-[500px] overflow-hidden">
            {conversationId ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow 
                  conversationId={conversationId} 
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Select a conversation to open chat
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
