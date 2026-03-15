import type { Metadata } from "next";
import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { EventsGrid, EventsGridSkeleton } from "./_components/events-grid";

export const metadata: Metadata = {
  title: "Discover Events | PHLive",
  description:
    "Browse upcoming live events across the Philippines — concerts, racing, seminars, and more.",
  openGraph: {
    title: "Discover Events | PHLive",
    description: "Browse upcoming live events across the Philippines.",
    type: "website",
  },
};

export default async function EventsPage() {
  const preloadedEvents = await preloadQuery(api.events.listPublicEvents, {});

  return (
    <div>
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Discover Events</h1>
        <p className="text-muted-foreground">
          Browse upcoming live events across the Philippines.
        </p>
      </div>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsGrid preloadedEvents={preloadedEvents} />
      </Suspense>
    </div>
  );
}
