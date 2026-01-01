"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncAllTeachersToFirebase } from "@/lib/actions/sync-teachers-to-firebase";

export function SyncTeachersButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await syncAllTeachersToFirebase();

      if (result.error) {
        setMessage(`❌ Error: ${result.error}`);
      } else {
        setMessage(
          `✅ ${result.message || `Synced ${result.synced} teachers to Firebase`}`
        );
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage("❌ Failed to sync teachers");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync to Firebase"}
      </Button>
      {message && (
        <span className="text-sm font-medium">{message}</span>
      )}
    </div>
  );
}
