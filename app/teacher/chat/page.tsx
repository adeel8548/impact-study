"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TeacherHeader } from "@/components/teacher-header";
import { db, ensureFirebaseAuth } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ensureConversation, subscribeUnreadCount } from "@/lib/firestore-chat";
import { useChatNotifications } from "@/hooks/useChatNotifications";

interface ConversationRow {
  id: string;
  admin_id: string;
  teacher_id: string;
  admin?: { name?: string | null; email?: string | null } | null;
}

export default function TeacherChatPage() {
  const supabase = useMemo(() => createClient(), []);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selected, setSelected] = useState<ConversationRow | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // Total unread count
  const [conversationUnread, setConversationUnread] = useState(0); // Current conversation unread

  // Enable web push + sound notifications for the active conversation
  useChatNotifications(conversationId, { userId: currentUserId });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user?.id) {
        setCurrentUserId(data.user.id);
        
        // Fetch teacher name
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
      role: "teacher",
    }).catch(err => console.warn("Firebase auth skipped:", err));
    
    setIsLoading(true);
    console.log("Teacher loading conversations for:", currentUserId);
    
    const q = query(
      collection(db, "conversations"),
      where("teacherId", "==", currentUserId),
      orderBy("updatedAt", "desc")
    );
    
    const unsub = onSnapshot(
      q,
      async (snap) => {
        console.log("Firestore conversations loaded:", snap.docs.length);
        // If Firestore has no results, fall back to Supabase and ensure Firestore conversations
        if (snap.docs.length === 0) {
          try {
            const { data: convs, error: convErr } = await supabase
              .from("conversations")
              .select("id, admin_id, teacher_id")
              .eq("teacher_id", currentUserId);
            
            if (convErr) {
              console.error("Supabase fallback error:", convErr);
              setConversations([]);
              setIsLoading(false);
              return;
            }
            
            if (!convs || convs.length === 0) {
              console.log("No conversations found for teacher in Supabase either");
              setConversations([]);
              setIsLoading(false);
              return;
            }
            
            const items: ConversationRow[] = await Promise.all(
              (convs as any[]).map(async (c: any) => {
                const ensured = await ensureConversation(c.admin_id, currentUserId);
                const { data: adminProf } = await supabase
                  .from("profiles")
                  .select("name,email")
                  .eq("id", c.admin_id)
                  .single();
                return {
                  id: ensured.id,
                  admin_id: c.admin_id,
                  teacher_id: c.teacher_id,
                  admin: { name: adminProf?.name ?? null, email: adminProf?.email ?? null },
                } as ConversationRow;
              })
            );
            setConversations(items);
            if (items.length > 0 && !conversationId) {
              setSelected(items[0]);
              setConversationId(items[0].id);
            }
            setIsLoading(false);
          } catch (e) {
            console.error("Teacher Supabase fallback exception:", e);
            setConversations([]);
            setIsLoading(false);
          }
          return;
        }
        const items: ConversationRow[] = [];
        for (const d of snap.docs) {
          const data: any = d.data();
          console.log("Processing conversation:", d.id, data);
          
          // Skip conversations where admin_id equals teacher_id (teacher mistakenly listed as admin)
          if (data.adminId === currentUserId) {
            console.log("Skipping conversation where teacher is listed as admin");
            continue;
          }
          
          // fetch admin profile for display
          const { data: adminProf } = await supabase
            .from("profiles")
            .select("name,email")
            .eq("id", data.adminId)
            .single();
          items.push({
            id: d.id,
            admin_id: data.adminId,
            teacher_id: data.teacherId,
            admin: { name: adminProf?.name ?? null, email: adminProf?.email ?? null },
          });
        }
        console.log("Final conversations:", items);
        setConversations(items);
        if (items.length > 0 && !conversationId) {
          setSelected(items[0]);
          setConversationId(items[0].id);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading conversations:", error);
        // Fallback: load from Supabase conversations table
        (async () => {
          const { data: convs, error: convErr } = await supabase
            .from("conversations")
            .select("id, admin_id, teacher_id")
            .eq("teacher_id", currentUserId);
          
          if (!convErr && convs && convs.length > 0) {
            // Fetch admin profiles for conversation items
            const adminIds = [...new Set(convs.map((c: any) => c.admin_id))];
            const { data: admins } = await supabase
              .from("profiles")
              .select("id, name, email")
              .in("id", adminIds);
            
            const adminMap = Object.fromEntries((admins || []).map((a: any) => [a.id, a]));
            
            // Filter to exclude conversations where teacher is mistakenly admin
            const validConversations = (convs as any[]).filter(c => c.admin_id !== currentUserId);
            
            // Ensure Firestore conversation IDs for each Supabase conversation
            const items: ConversationRow[] = await Promise.all(
              validConversations.map(async (c: any) => {
                const ensured = await ensureConversation(c.admin_id, currentUserId);
                return {
                  id: ensured.id,
                  admin_id: c.admin_id,
                  teacher_id: c.teacher_id,
                  admin: adminMap[c.admin_id] || { name: "Admin", email: "" },
                } as ConversationRow;
              })
            );
            setConversations(items);
            if (items.length > 0 && !conversationId) {
              setSelected(items[0]);
              setConversationId(items[0].id);
            }
          } else {
            setConversations([]);
          }
          setIsLoading(false);
        })();
      }
    );
    return () => unsub();
  }, [currentUserId, supabase, conversationId]);

  // Subscribe to unread count when conversation selected
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    
    const unsub = subscribeUnreadCount(conversationId, currentUserId, (count) => {
      setConversationUnread(count);
    });
    
    return () => unsub();
  }, [conversationId, currentUserId]);

  const openConversation = (row: ConversationRow) => {
    console.log("Teacher opening conversation:", row.id, "with admin:", row.admin_id);
    setSelected(row);
    setConversationId(row.id);
  };

  const isFirebaseConfigured = !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  );

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-background">
        <TeacherHeader />
        <main className="px-4 md:px-6 py-4 md:py-6 space-y-4">
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
            <div className="text-xs font-semibold text-muted-foreground">Admin Conversation</div>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin conversation yet</p>
            ) : (
              (() => {
                // Show only the first (admin) conversation
                const c = conversations[0];
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
                  </button>
                );
              })()
            )}
          </Card>

          <Card className="p-4 md:col-span-2 flex flex-col h-[500px] overflow-hidden">
            {conversationId && selected ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ChatWindow 
                  conversationId={conversationId} 
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  onUnreadChange={setConversationUnread}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                {isLoading ? "Loading..." : "Loading admin conversation..."}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
