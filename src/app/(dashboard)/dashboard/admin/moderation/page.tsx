"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/utils/constants";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils/format";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";

export default function AdminModerationPage() {
  return (
    <RoleGuard requiredRoles={["admin"]}>
      <AdminModerationContent />
    </RoleGuard>
  );
}

type EventRow = {
  _id: string;
  title: string;
  description: string;
  eventType: string;
  date: number;
  time: string;
  venueName?: string;
  status: string;
  moderationStatus?: string;
  moderationReason?: string;
  createdAt: number;
  creatorName: string;
  creatorEmail: string;
};

function moderationBadge(status: string | undefined) {
  if (!status) return <Badge variant="outline">Unreviewed</Badge>;
  if (status === "approved") return <Badge>Approved</Badge>;
  if (status === "flagged") return <Badge variant="destructive">Flagged</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function statusBadge(status: string) {
  if (status === "published") return <Badge>Published</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="outline">{EVENT_STATUS_LABELS[status] ?? status}</Badge>;
}

function RefundSummarySection({ eventId }: { eventId: Id<"events"> }) {
  const summary = useQuery(api.admin.getEventRefundSummary, { eventId });

  if (summary === undefined) {
    return <Skeleton className="h-24" />;
  }

  if (summary.totalTickets === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tickets for this event.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-muted-foreground text-xs">Total Tickets</p>
        <p className="font-semibold">{summary.totalTickets.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Refunded</p>
        <p className="font-semibold text-green-600">
          {summary.refundedCount.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Failed</p>
        <p className="font-semibold text-red-600">
          {summary.failedCount.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">Skipped (Free)</p>
        <p className="font-semibold">{summary.skippedCount.toLocaleString()}</p>
      </div>
      <div className="col-span-2">
        <p className="text-muted-foreground text-xs">Total Refund Amount</p>
        <p className="font-semibold text-lg">
          {formatCurrency(summary.totalRefundAmount)}
        </p>
      </div>
    </div>
  );
}

function AdminModerationContent() {
  const events = useQuery(api.admin.listEventsForModeration);
  const unpublishEvent = useMutation(api.admin.adminUnpublishEvent);
  const approveEvent = useMutation(api.admin.adminApproveEvent);

  const [statusFilter, setStatusFilter] = useState("all");
  const [modFilter, setModFilter] = useState("all");
  const [detailEvent, setDetailEvent] = useState<EventRow | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<EventRow | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (events === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const filtered = events
    .filter((e) => statusFilter === "all" || e.status === statusFilter)
    .filter((e) => {
      if (modFilter === "all") return true;
      if (modFilter === "unreviewed") return !e.moderationStatus;
      return e.moderationStatus === modFilter;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  async function handleUnpublish() {
    if (!unpublishTarget || !unpublishReason.trim()) return;
    setPendingId(unpublishTarget._id);
    try {
      await unpublishEvent({
        eventId: unpublishTarget._id as never,
        reason: unpublishReason.trim(),
      });
      showSuccess(`"${unpublishTarget.title}" has been unpublished`);
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setPendingId(null);
      setUnpublishTarget(null);
      setUnpublishReason("");
    }
  }

  async function handleApprove(event: EventRow) {
    setPendingId(event._id);
    try {
      await approveEvent({ eventId: event._id as never });
      showSuccess(`"${event.title}" has been approved`);
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Moderation</h1>

      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Event Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={modFilter} onValueChange={setModFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Moderation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Moderation</SelectItem>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Moderation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No events match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {event.title}
                  </TableCell>
                  <TableCell>{event.creatorName}</TableCell>
                  <TableCell>
                    {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
                  </TableCell>
                  <TableCell>{statusBadge(event.status)}</TableCell>
                  <TableCell>{moderationBadge(event.moderationStatus)}</TableCell>
                  <TableCell>{formatDate(event.date)}</TableCell>
                  <TableCell>{formatDate(event.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailEvent(event)}
                      >
                        Details
                      </Button>
                      {event.status === "published" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pendingId === event._id}
                          onClick={() => setUnpublishTarget(event)}
                        >
                          Unpublish
                        </Button>
                      )}
                      {event.status === "published" &&
                        event.moderationStatus !== "approved" && (
                          <Button
                            size="sm"
                            disabled={pendingId === event._id}
                            onClick={() => handleApprove(event)}
                          >
                            {pendingId === event._id ? "Approving..." : "Approve"}
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Event Details Dialog */}
      <Dialog
        open={!!detailEvent}
        onOpenChange={(open) => !open && setDetailEvent(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailEvent?.title}</DialogTitle>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>
                    {EVENT_TYPE_LABELS[detailEvent.eventType] ??
                      detailEvent.eventType}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{statusBadge(detailEvent.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Moderation</p>
                  <p>{moderationBadge(detailEvent.moderationStatus)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Event Date</p>
                  <p>
                    {formatDate(detailEvent.date)} at {detailEvent.time}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p>{detailEvent.venueName ?? "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDateTime(detailEvent.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Creator</p>
                <p>
                  {detailEvent.creatorName} ({detailEvent.creatorEmail})
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{detailEvent.description}</p>
              </div>

              {detailEvent.moderationReason && (
                <div>
                  <p className="text-muted-foreground">Moderation Reason</p>
                  <p className="text-destructive">
                    {detailEvent.moderationReason}
                  </p>
                </div>
              )}

              {detailEvent.status === "cancelled" && (
                <div>
                  <p className="text-muted-foreground font-medium mb-2">
                    Refund Summary
                  </p>
                  <RefundSummarySection
                    eventId={detailEvent._id as Id<"events">}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog
        open={!!unpublishTarget}
        onOpenChange={(open) => {
          if (!open) {
            setUnpublishTarget(null);
            setUnpublishReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Event</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to unpublish{" "}
              <strong>{unpublishTarget?.title}</strong>. This will set the event
              back to draft status. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for unpublishing..."
            value={unpublishReason}
            onChange={(e) => setUnpublishReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnpublish}
              disabled={!unpublishReason.trim() || !!pendingId}
            >
              {pendingId ? "Unpublishing..." : "Unpublish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
