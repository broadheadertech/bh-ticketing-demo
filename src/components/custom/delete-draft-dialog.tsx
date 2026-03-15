"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";

interface DeleteDraftDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function DeleteDraftDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  onDeleted,
}: DeleteDraftDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const deleteDraft = useMutation(api.events.deleteDraftEvent);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await deleteDraft({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
      });
      showSuccess("Draft deleted");
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Draft</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{eventTitle}&rdquo;? This
            will permanently remove the event and all its ticket tiers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Draft</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
