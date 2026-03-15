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
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { sendEventCancellation } from "@/lib/actions/events";
import { processEventRefunds } from "@/lib/actions/refunds";

interface CancelEventDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelEventDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
}: CancelEventDialogProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const cancelEvent = useMutation(api.events.cancelEvent);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const trimmedReason = reason.trim() || undefined;
      await cancelEvent({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        reason: trimmedReason,
      });
      // Fire-and-forget cancellation emails — failures must not block UX
      sendEventCancellation({
        eventId,
        cancellationReason: trimmedReason,
      }).catch((err) => console.error("Cancellation email failed:", err));
      // Process refunds — fire-and-forget, event is already cancelled
      processEventRefunds(eventId, eventTitle)
        .then((result) => {
          if (result.success && result.data) {
            const { refunded, failed, skipped } = result.data;
            if (refunded > 0) showSuccess(`${refunded} ticket(s) refunded`);
            if (failed > 0) showError(`${failed} refund(s) failed — check manually`);
          }
        })
        .catch((err) => console.error("Refund processing failed:", err));
      showSuccess("Event cancelled");
      onOpenChange(false);
      setReason("");
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
          <AlertDialogTitle>Cancel Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel &ldquo;{eventTitle}&rdquo;? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Textarea
            placeholder="Cancellation reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Keep Event</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? "Cancelling..." : "Cancel Event"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
