"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { formatDate } from "@/lib/utils/format";
import { UserPlus, X } from "lucide-react";

interface ManageStaffDialogProps {
  eventId: Id<"events">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageStaffDialog({
  eventId,
  open,
  onOpenChange,
}: ManageStaffDialogProps) {
  const staff = useQuery(api.staff.getEventStaff, open ? { eventId } : "skip");
  const assignStaff = useMutation(api.staff.assignStaff);
  const removeStaff = useMutation(api.staff.removeStaff);
  const [email, setEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!email.trim()) return;
    setIsAdding(true);
    try {
      await assignStaff({ eventId, staffEmail: email.trim() });
      showSuccess("Staff member assigned");
      setEmail("");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(staffUserId: Id<"users">) {
    setRemovingId(staffUserId);
    try {
      await removeStaff({ eventId, staffUserId });
      showSuccess("Staff member removed");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Staff</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Staff email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={isAdding}
            />
            <Button
              onClick={handleAdd}
              disabled={!email.trim() || isAdding}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Assigned Staff ({staff?.length ?? 0})
            </p>

            {staff === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No staff assigned yet.
              </p>
            ) : (
              staff.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between border rounded-md p-2"
                >
                  <div className="text-sm">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {member.email} · Added {formatDate(member.assignedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={removingId === member.userId}
                    onClick={() => handleRemove(member.userId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
