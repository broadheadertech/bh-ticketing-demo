import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { preloadQuery, fetchQuery } from "convex/nextjs";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  VenueDetailClient,
  VenueDetailSkeleton,
} from "./_components/venue-detail-client";

export const revalidate = 60;

type Props = { params: Promise<{ venueId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { venueId } = await params;
  try {
    const venue = await fetchQuery(api.venues.getPublicVenueById, {
      venueId: venueId as Id<"venues">,
    });
    if (!venue) return { title: "Venue Not Found | TIX.PH" };
    const description = `${venue.name} — ${venue.location}. Capacity: ${venue.capacity}. ${venue.amenities.slice(0, 5).join(", ")}`;
    return {
      title: `${venue.name} | TIX.PH`,
      description,
      openGraph: {
        title: venue.name,
        description,
        type: "article",
        ...(venue.photoUrls[0] && { images: [{ url: venue.photoUrls[0] }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: venue.name,
        description,
        ...(venue.photoUrls[0] && { images: [venue.photoUrls[0]] }),
      },
    };
  } catch {
    return { title: "Venue | TIX.PH" };
  }
}

export default async function VenueDetailPage({ params }: Props) {
  const { venueId } = await params;
  const id = venueId as Id<"venues">;

  const [exists, preloadedVenue] = await Promise.all([
    fetchQuery(api.venues.getPublicVenueById, { venueId: id }),
    preloadQuery(api.venues.getPublicVenueById, { venueId: id }),
  ]);
  if (!exists) notFound();

  return (
    <Suspense fallback={<VenueDetailSkeleton />}>
      <VenueDetailClient preloadedVenue={preloadedVenue} />
    </Suspense>
  );
}
