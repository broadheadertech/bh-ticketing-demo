import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { preloadQuery, fetchQuery } from "convex/nextjs";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import {
  EventDetailClient,
  EventDetailSkeleton,
} from "./_components/event-detail-client";

export const revalidate = 60;

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const event = await fetchQuery(api.events.getPublicEventDetailPage, {
      eventId: eventId as Id<"events">,
    });
    if (!event) return { title: "Event Not Found | PHLive" };
    const description = event.description.slice(0, 160);
    return {
      title: `${event.title} | PHLive`,
      description,
      openGraph: {
        title: event.title,
        description,
        type: "article",
        ...(event.artworkUrl && { images: [{ url: event.artworkUrl }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: event.title,
        description,
        ...(event.artworkUrl && { images: [event.artworkUrl] }),
      },
    };
  } catch {
    return { title: "Event | PHLive" };
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const id = eventId as Id<"events">;

  const [exists, preloadedEvent, preloadedTiers] = await Promise.all([
    fetchQuery(api.events.getPublicEventDetailPage, { eventId: id }),
    preloadQuery(api.events.getPublicEventDetailPage, { eventId: id }),
    preloadQuery(api.ticketTiers.getPublicTiersByEventId, { eventId: id }),
  ]);
  if (!exists) notFound();

  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetailClient
        preloadedEvent={preloadedEvent}
        preloadedTiers={preloadedTiers}
      />
    </Suspense>
  );
}
