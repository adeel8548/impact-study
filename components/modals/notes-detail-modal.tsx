import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NotesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  notes: string | null | undefined;
}

export function NotesDetailModal({
  open,
  onOpenChange,
  title,
  notes,
}: NotesDetailModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title} - Notes</AlertDialogTitle>
          <AlertDialogDescription className="pt-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
            {notes || "No notes"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogAction>Close</AlertDialogAction>
      </AlertDialogContent>
    </AlertDialog>
  );
}
