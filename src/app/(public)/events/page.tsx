import type { Metadata } from "next";
import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { EventsGrid, EventsGridSkeleton } from "./_components/events-grid";

export const metadata: Metadata = {
  title: "Discover Events | TIX.PH",
  description:
    "Browse upcoming live events across the Philippines — concerts, racing, seminars, and more.",
  openGraph: {
    title: "Discover Events | TIX.PH",
    description: "Browse upcoming live events across the Philippines.",
    type: "website",
  },
};

export default async function EventsPage() {
  const preloadedEvents = await preloadQuery(api.events.listPublicEvents, {});

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <div className="bro-head">
        <div className="eyebrow">Discover</div>
        <h1>Browse events</h1>
      </div>
      <Suspense fallback={<EventsGridSkeleton />}>
        <EventsGrid preloadedEvents={preloadedEvents} />
      </Suspense>
    </div>
  );
}
