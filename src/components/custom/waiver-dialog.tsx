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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";

interface WaiverDialogProps {
  ticketId: Id<"tickets">;
  eventTitle: string;
  waiverText: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaiverDialog({
  ticketId,
  eventTitle,
  waiverText,
  open,
  onOpenChange,
}: WaiverDialogProps) {
  const sign = useMutation(api.races.signWaiver);
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSign() {
    setPending(true);
    try {
      await sign({ ticketId, signerName: name });
      showSuccess("Waiver signed");
      onOpenChange(false);
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Liability Waiver</DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>

        <div className="max-h-56 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {waiverText}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="waiver-accept"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="waiver-accept" className="text-sm font-normal leading-snug">
            I have read and agree to the waiver above, and I am signing electronically.
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="waiver-name">Type your full name to sign</Label>
          <Input
            id="waiver-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={pending || !accepted || !name.trim()}>
            {pending ? "Signing…" : "Sign waiver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
