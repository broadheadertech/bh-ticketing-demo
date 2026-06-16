"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/custom/role-guard";
import { CancelEventDialog } from "@/components/custom/cancel-event-dialog";
import { DeleteDraftDialog } from "@/components/custom/delete-draft-dialog";
import { ManageStaffDialog } from "@/components/custom/manage-staff-dialog";
import { PromoCodeDialog } from "@/components/custom/promo-code-dialog";
import { ParticipantPicker } from "@/components/custom/participant-picker";
import { formatDate } from "@/lib/utils/format";
import { EVENT_TYPE_LABELS, EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { getStatusBadgeVariant } from "@/lib/utils/event-status";
import { canPublishEvent } from "@/lib/validators/event-publish";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { cn } from "@/lib/utils";
import { ArrowLeft, BarChart3, ImagePlus, Settings, ImageOff, Copy, Users, Tag, LineChart, GraduationCap, Flag } from "lucide-react";

function EventLineupCard({
  eventId,
  initial,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventId: any;
  initial: string[];
}) {
  const update = useMutation(api.events.updateEventParticipants);
  const [value, setValue] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await update({ eventId, participantIds: value as any });
      showSuccess("Lineup saved");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div>
          <span className="font-medium text-sm">Lineup</span>
          <p className="text-xs text-muted-foreground mt-1">
            Speakers / artists / racers shown on the event page and calendar — from your roster.
          </p>
        </div>
        <ParticipantPicker value={value} onChange={setValue} />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save lineup"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;

  const event = useQuery(api.events.getEventById, { eventId });
  const tiers = useQuery(api.ticketTiers.getTiersByEventId, { eventId });

  const publishEvent = useMutation(api.events.publishEvent);
  const cloneEventMutation = useMutation(api.events.cloneEvent);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    if (event) {
      document.title = `${event.title} | TIX.PH`;
    }
  }, [event]);

  async function handlePublish() {
    if (!event || !tiers) return;

    const check = canPublishEvent(event, tiers.length);
    if (!check.canPublish) {
      showErrorFromCatch(new Error(check.reason!));
      return;
    }

    setIsPublishing(true);
    try {
      await publishEvent({ eventId });
      showSuccess("Event published");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPublishing(false);
    }
  }

  if (event === undefined || tiers === undefined) {
    return (
      <RoleGuard requiredRoles={["artist", "organization"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </RoleGuard>
    );
  }

  const statusConfig = getStatusBadgeVariant(event.status);
  const isDraft = event.status === "draft";
  const isPublished = event.status === "published";
  const showSalesLink = !isDraft;

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/events">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{event.title}</h1>
          <Badge
            variant={statusConfig.variant}
            className={cn(statusConfig.className)}
          >
            {EVENT_STATUS_LABELS[event.status] ?? event.status}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {event.artworkUrl ? (
              <div className="relative aspect-video max-w-md overflow-hidden rounded-lg">
                <Image
                  src={event.artworkUrl}
                  alt={`${event.title} event artwork`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center aspect-video max-w-md bg-muted rounded-lg">
                <ImageOff className="h-10 w-10 text-muted-foreground" />
              </div>
            )}

            <div className="grid gap-2 text-sm">
              <div>
                <span className="font-medium">Type: </span>
                {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}
              </div>
              <div>
                <span className="font-medium">Date: </span>
                {event.date > 0 ? formatDate(event.date) : <span className="text-muted-foreground italic">Not set</span>}
              </div>
              <div>
                <span className="font-medium">Time: </span>
                {event.time}
              </div>
              {event.venueName && (
                <div>
                  <span className="font-medium">Venue: </span>
                  {event.venueName}
                </div>
              )}
              <div>
                <span className="font-medium">Ticket Tiers: </span>
                {tiers.length}
              </div>
            </div>

            <div>
              <span className="font-medium text-sm">Description</span>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {event.creatorProfile && (
              <div className="flex items-center gap-3 pt-2 border-t">
                {event.creatorProfile.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.creatorProfile.profilePhotoUrl}
                    alt={event.creatorProfile.displayName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      {event.creatorProfile.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium">{event.creatorProfile.displayName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <EventLineupCard
          key={String(eventId)}
          eventId={eventId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initial={((event.participantIds as any[]) ?? []).map(String)}
        />

        <div className="flex gap-2 flex-wrap">
          {isDraft && (
            <>
              <Button onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? "Publishing..." : "Publish Event"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Draft
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/events/${eventId}/artwork`}>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Edit Artwork
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/events/${eventId}/tickets`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Tickets
                </Link>
              </Button>
            </>
          )}

          {showSalesLink && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/events/${eventId}/sales`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Sales
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/dashboard/events/${eventId}/analytics`}>
                  <LineChart className="mr-2 h-4 w-4" />
                  Analytics
                </Link>
              </Button>
              {(event.eventType === "seminar" || event.eventType === "class") && (
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/events/${eventId}/certificates`}>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Certificates
                  </Link>
                </Button>
              )}
            </>
          )}

          {isPublished && (
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Event
            </Button>
          )}

          {event.eventType === "racing" && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/events/${eventId}/race`}>
                <Flag className="mr-2 h-4 w-4" />
                Race Setup
              </Link>
            </Button>
          )}

          {(isDraft || isPublished) && (
            <>
              <Button
                variant="outline"
                onClick={() => setStaffDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage Staff
              </Button>
              <Button
                variant="outline"
                onClick={() => setPromoDialogOpen(true)}
              >
                <Tag className="mr-2 h-4 w-4" />
                Promo Codes
              </Button>
            </>
          )}

          <Button
            variant="outline"
            disabled={isCloning}
            onClick={async () => {
              setIsCloning(true);
              try {
                const newId = await cloneEventMutation({
                  sourceEventId: eventId,
                });
                showSuccess("Event cloned successfully");
                router.push(`/dashboard/events/${newId}`);
              } catch (error) {
                showErrorFromCatch(error);
              } finally {
                setIsCloning(false);
              }
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            {isCloning ? "Cloning..." : "Clone Event"}
          </Button>
        </div>
      </div>

      <CancelEventDialog
        eventId={eventId}
        eventTitle={event.title}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />

      <DeleteDraftDialog
        eventId={eventId}
        eventTitle={event.title}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => router.push("/dashboard/events")}
      />

      <ManageStaffDialog
        eventId={eventId}
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
      />

      <PromoCodeDialog
        eventId={eventId}
        open={promoDialogOpen}
        onOpenChange={setPromoDialogOpen}
      />
    </RoleGuard>
  );
}
