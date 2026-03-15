"use client";

import { useState } from "react";
import Image from "next/image";
import { usePreloadedQuery, useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import type { Preloaded } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketPurchaseCard } from "@/components/custom/ticket-purchase-card";
import { FreeRegistrationCard } from "@/components/custom/free-registration-card";
import { Input } from "@/components/ui/input";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { MapPin, Calendar, User, Share2, Check, Star, Bell } from "lucide-react";
import { FollowButton } from "@/components/custom/follow-button";

// ---------------------------------------------------------------------------
// Skeleton export — used by server page as Suspense fallback
// ---------------------------------------------------------------------------

export function EventDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Skeleton className="aspect-video w-full rounded-lg mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share button
// ---------------------------------------------------------------------------

function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available (e.g. non-HTTPS) — silently ignore
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Share
        </>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Ticket panel
// ---------------------------------------------------------------------------

type Tier = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  description?: string;
  sortOrder: number;
};

function TierAvailability({ tier }: { tier: Tier }) {
  const available = tier.quantity - tier.soldCount;
  if (available <= 0) {
    return <Badge variant="destructive" className="text-xs">Sold Out</Badge>;
  }
  return (
    <span className="text-xs text-muted-foreground">
      {available} remaining
    </span>
  );
}

function SoldOutWithWaitlist({
  eventId,
  tiers,
}: {
  eventId: string;
  tiers: Tier[];
}) {
  const { user } = useUser();
  const waitlistCount = useQuery(api.waitlist.getWaitlistCount, {
    eventId: eventId as Id<"events">,
  });
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? "";
  const isOnWaitlist = useQuery(
    api.waitlist.isOnWaitlist,
    userEmail
      ? { eventId: eventId as Id<"events">, email: userEmail }
      : "skip"
  );
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);
  const leaveWaitlist = useMutation(api.waitlist.leaveWaitlist);

  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleJoin() {
    const submitEmail = userEmail || email.trim();
    if (!submitEmail) return;
    setIsPending(true);
    try {
      await joinWaitlist({
        eventId: eventId as Id<"events">,
        email: submitEmail,
      });
      showSuccess("You've been added to the waitlist!");
      setEmail("");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
    }
  }

  async function handleLeave() {
    if (!userEmail) return;
    setIsPending(true);
    try {
      await leaveWaitlist({
        eventId: eventId as Id<"events">,
        email: userEmail,
      });
      showSuccess("You've been removed from the waitlist");
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-semibold text-lg">Tickets</h2>
      {tiers.map((tier) => (
        <div key={tier._id} className="border rounded-md p-3 space-y-1 opacity-60">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{tier.name}</span>
            <span className="text-sm text-muted-foreground">
              {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
            </span>
          </div>
          <TierAvailability tier={tier} />
        </div>
      ))}
      <Button className="w-full" disabled>
        Sold Out
      </Button>

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Join Waitlist</p>
          {waitlistCount !== undefined && waitlistCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {waitlistCount} waiting
            </Badge>
          )}
        </div>

        {isOnWaitlist ? (
          <div className="space-y-2">
            <p className="text-sm text-green-600">You&apos;re on the waitlist!</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              disabled={isPending}
            >
              Leave Waitlist
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Get notified if tickets become available.
            </p>
            {!userEmail && (
              <Input
                placeholder="Your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            )}
            <Button
              className="w-full"
              variant="outline"
              onClick={handleJoin}
              disabled={isPending || (!userEmail && !email.trim())}
            >
              <Bell className="h-4 w-4 mr-2" />
              {isPending ? "Joining..." : "Join Waitlist"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketPanel({
  event,
  tiers,
}: {
  event: { _id: string; creatorStripeAccountId: string | null };
  tiers: Tier[];
}) {
  if (tiers.length === 0) {
    return (
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          No tickets available yet.
        </p>
      </div>
    );
  }

  const eventId = event._id as string;
  const isFreeEvent = tiers.every((t) => t.price === 0);
  const hasPaidTiers = tiers.some((t) => t.price > 0);
  const allSoldOut = tiers.every((t) => t.soldCount >= t.quantity);

  if (allSoldOut) {
    return <SoldOutWithWaitlist eventId={eventId} tiers={tiers} />;
  }

  if (isFreeEvent) {
    return <FreeRegistrationCard eventId={eventId} tiers={tiers} />;
  }

  if (hasPaidTiers && event.creatorStripeAccountId) {
    return <TicketPurchaseCard eventId={eventId} tiers={tiers} />;
  }

  // Paid tiers but no Stripe account connected
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="font-semibold text-lg">Tickets</h2>
      {tiers.map((tier) => (
        <div key={tier._id} className="border rounded-md p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{tier.name}</span>
            <span className="text-sm font-medium">
              {formatCurrency(tier.price)}
            </span>
          </div>
          <TierAvailability tier={tier} />
        </div>
      ))}
      <p className="text-sm text-muted-foreground">
        Tickets not yet available for purchase.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star display
// ---------------------------------------------------------------------------

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sizeClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator aggregate rating
// ---------------------------------------------------------------------------

function CreatorRating({ creatorId }: { creatorId: Id<"users"> }) {
  const aggregate = useQuery(api.reviews.getCreatorAggregateRating, { creatorId });
  if (!aggregate || aggregate.totalReviews === 0) return null;

  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1">
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      {aggregate.averageRating} ({aggregate.totalReviews})
    </span>
  );
}

// ---------------------------------------------------------------------------
// Reviews section
// ---------------------------------------------------------------------------

function ReviewsSection({ eventId }: { eventId: Id<"events"> }) {
  const data = useQuery(api.reviews.getEventReviews, { eventId });

  if (data === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (data.totalReviews === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <div className="flex items-center gap-2">
          <StarRating rating={data.averageRating} size="md" />
          <span className="text-sm text-muted-foreground">
            {data.averageRating} ({data.totalReviews} review{data.totalReviews !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {data.reviews.map((review) => (
          <div key={`${review.createdAt}-${review.reviewerName}`} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{review.reviewerName}</span>
                {review.isVerified && (
                  <Badge variant="outline" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Verified Attendee
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(review.createdAt)}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.text && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {review.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

type Props = {
  preloadedEvent: Preloaded<typeof api.events.getPublicEventDetailPage>;
  preloadedTiers: Preloaded<typeof api.ticketTiers.getPublicTiersByEventId>;
};

export function EventDetailClient({ preloadedEvent, preloadedTiers }: Props) {
  const event = usePreloadedQuery(preloadedEvent);
  const tiers = usePreloadedQuery(preloadedTiers);

  if (!event) {
    // Should not normally reach here (server page calls notFound()),
    // but guard defensively for client-side stale cache cases.
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <p className="text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  const sortedTiers = [...(tiers ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Artwork */}
      {event.artworkUrl && (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-8 bg-muted">
          <Image
            src={event.artworkUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event info column */}
        <div className="lg:col-span-2 space-y-5">
          <h1 className="text-3xl font-bold leading-tight">{event.title}</h1>

          {/* Date & time */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {formatDate(event.date)} · {event.time}
            </span>
          </div>

          {/* Venue */}
          {event.venueName && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>{event.venueName}</span>
            </div>
          )}

          {/* Creator profile */}
          {event.creatorProfile && (
            <div className="flex items-center gap-3">
              {event.creatorProfile.profilePhotoUrl ? (
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                  <Image
                    src={event.creatorProfile.profilePhotoUrl}
                    alt={event.creatorProfile.displayName}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                By{" "}
                <span className="font-medium text-foreground">
                  {event.creatorProfile.displayName}
                </span>
              </span>
              <CreatorRating creatorId={event.creatorId} />
              <FollowButton entityType="creator" entityId={event.creatorId} />
            </div>
          )}

          {/* Description */}
          <p className="whitespace-pre-wrap text-foreground leading-relaxed">
            {event.description}
          </p>

          {/* Share */}
          <div className="pt-2">
            <ShareButton />
          </div>

          {/* Reviews section */}
          <div className="pt-4 border-t">
            <ReviewsSection eventId={event._id as Id<"events">} />
          </div>
        </div>

        {/* Ticket panel column */}
        <div>
          <TicketPanel
            event={{
              _id: event._id,
              creatorStripeAccountId: event.creatorStripeAccountId,
            }}
            tiers={sortedTiers}
          />
        </div>
      </div>
    </div>
  );
}
