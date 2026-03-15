"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/custom/review-dialog";
import { formatDate } from "@/lib/utils/format";
import { Ticket, AlertCircle, Star } from "lucide-react";

// Dynamic import with ssr:false — qrcode library uses canvas (browser-only)
const TicketQrDisplay = dynamic(
  () =>
    import("@/components/custom/ticket-qr-display").then(
      (m) => ({ default: m.TicketQrDisplay })
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-[200px]" />,
  }
);

function getRefundBadge(eventStatus: string, refundStatus?: string) {
  if (eventStatus !== "cancelled") return null;

  switch (refundStatus) {
    case "refunded":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Refunded</Badge>;
    case "failed":
      return <Badge variant="destructive">Refund Failed</Badge>;
    case "not_applicable":
      return <Badge variant="outline">Free Event</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Processing</Badge>;
  }
}

export default function MyTicketsPage() {
  const tickets = useQuery(api.tickets.getMyTickets);
  const reviewedEventIds = useQuery(api.reviews.getMyReviewedEventIds);
  const [reviewTarget, setReviewTarget] = useState<{
    eventId: Id<"events">;
    eventTitle: string;
  } | null>(null);

  const now = Date.now();
  const reviewedSet = new Set(reviewedEventIds ?? []);

  if (tickets === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Tickets</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-[200px]" />
                <Skeleton className="h-3 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Tickets</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <Ticket className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No tickets yet</h2>
          <p className="text-muted-foreground max-w-sm">
            You have not purchased or registered for any events. Browse upcoming
            events to get your tickets.
          </p>
          <Button asChild>
            <Link href="/">Discover Events</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <Badge variant="secondary">{tickets.length}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => {
          const isPast = ticket.eventDate > 0 && ticket.eventDate < now;
          const canReview =
            isPast &&
            !!ticket.scannedAt &&
            ticket.eventStatus !== "cancelled" &&
            !reviewedSet.has(ticket.eventId);
          const alreadyReviewed = reviewedSet.has(ticket.eventId);

          return (
            <Card key={ticket._id}>
              <CardHeader>
                <CardTitle className="text-base leading-snug">
                  {ticket.eventTitle}
                </CardTitle>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>{formatDate(ticket.eventDate)}</p>
                  {ticket.eventTime && <p>{ticket.eventTime}</p>}
                  {ticket.venueName && <p>{ticket.venueName}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {ticket.tierName}
                  </Badge>
                  {ticket.eventStatus === "cancelled" && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Cancelled
                    </Badge>
                  )}
                  {getRefundBadge(ticket.eventStatus, ticket.refundStatus)}
                  {alreadyReviewed && isPast && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Reviewed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.eventStatus === "cancelled" ? (
                  <div className="h-[200px] w-[200px] flex items-center justify-center bg-muted/50 rounded-lg border border-dashed">
                    <p className="text-xs text-muted-foreground text-center px-4">
                      Event cancelled — ticket no longer valid
                    </p>
                  </div>
                ) : ticket.qrCode ? (
                  <TicketQrDisplay
                    qrCode={ticket.qrCode}
                    ticketId={ticket._id}
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="h-[200px] w-[200px] flex items-center justify-center bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground text-center px-4">
                        QR code pending — check back shortly
                      </p>
                    </div>
                  </div>
                )}

                {canReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setReviewTarget({
                        eventId: ticket.eventId,
                        eventTitle: ticket.eventTitle,
                      })
                    }
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Leave a Review
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {reviewTarget && (
        <ReviewDialog
          eventId={reviewTarget.eventId}
          eventTitle={reviewTarget.eventTitle}
          open={!!reviewTarget}
          onOpenChange={(open) => !open && setReviewTarget(null)}
        />
      )}
    </div>
  );
}
