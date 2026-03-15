"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Star } from "lucide-react";

interface ReviewDialogProps {
  eventId: Id<"events">;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

const MAX_TEXT_LENGTH = 500;

export function ReviewDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  onSubmitted,
}: ReviewDialogProps) {
  const submitReview = useMutation(api.reviews.submitReview);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [text, setText] = useState("");
  const [isPending, setIsPending] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setRating(0);
    setHoveredRating(0);
    setText("");
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setIsPending(true);
    try {
      await submitReview({
        eventId,
        rating,
        text: text.trim() || undefined,
      });
      showSuccess("Review submitted!");
      handleClose();
      onSubmitted?.();
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
    }
  }

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review: {eventTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">
              Review{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </p>
            <Textarea
              placeholder="Share your experience..."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {text.length}/{MAX_TEXT_LENGTH}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isPending}
          >
            {isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
