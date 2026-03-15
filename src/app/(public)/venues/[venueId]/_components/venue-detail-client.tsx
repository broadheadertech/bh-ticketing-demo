"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VenueAvailabilityReadonly } from "@/components/custom/venue-availability-readonly";
import {
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Share2,
  Check,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { FollowButton } from "@/components/custom/follow-button";

export function VenueDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Skeleton className="aspect-video w-full rounded-lg mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
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

function PhotoCarousel({ photoUrls, name }: { photoUrls: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (photoUrls.length === 0) return null;

  return (
    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-8 bg-muted">
      <Image
        src={photoUrls[currentIndex]}
        alt={`${name} — photo ${currentIndex + 1}`}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 896px"
        priority
      />
      {photoUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => (i - 1 + photoUrls.length) % photoUrls.length)
            }
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => (i + 1) % photoUrls.length)
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1.5 hover:bg-background"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photoUrls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`h-2 w-2 rounded-full ${
                  i === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type Props = {
  preloadedVenue: Preloaded<typeof api.venues.getPublicVenueById>;
};

export function VenueDetailClient({ preloadedVenue }: Props) {
  const venue = usePreloadedQuery(preloadedVenue);

  if (!venue) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <p className="text-muted-foreground">Venue not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <PhotoCarousel photoUrls={venue.photoUrls} name={venue.name} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Venue info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold leading-tight">{venue.name}</h1>
            <FollowButton entityType="venue" entityId={venue._id} />
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{venue.location}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>Capacity: {venue.capacity.toLocaleString()}</span>
          </div>

          {venue.amenities.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Amenities
              </h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {venue.description && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                About
              </h2>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {venue.description}
              </p>
            </div>
          )}

          <div className="pt-2">
            <ShareButton />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Availability Calendar */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Availability
            </h2>
            <VenueAvailabilityReadonly venueId={venue._id as string} />
          </div>

          {/* Upcoming Events */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Upcoming Events
            </h2>
            {venue.upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {venue.upcomingEvents.map((event) => (
                  <Link
                    key={event._id}
                    href={`/events/${event._id}`}
                    className="block rounded-md border p-3 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium line-clamp-1">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(event.date)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming events at this venue.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
