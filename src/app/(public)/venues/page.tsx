import type { Metadata } from "next";
import { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import {
  VenuesGrid,
  VenuesGridSkeleton,
} from "./_components/venues-grid";

export const metadata: Metadata = {
  title: "Discover Venues | PHLive",
  description:
    "Browse venue spaces across the Philippines — concert halls, event spaces, and more.",
  openGraph: {
    title: "Discover Venues | PHLive",
    description: "Browse venue spaces across the Philippines.",
    type: "website",
  },
};

export default async function VenuesPage() {
  const preloadedVenues = await preloadQuery(
    api.venues.listPublicVenues,
    {}
  );

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <div className="bro-head" style={{ marginBottom: 28 }}>
        <div className="eyebrow">Spaces</div>
        <h1>Browse venues</h1>
      </div>
      <Suspense fallback={<VenuesGridSkeleton />}>
        <VenuesGrid preloadedVenues={preloadedVenues} />
      </Suspense>
    </div>
  );
}
