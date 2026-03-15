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
    <div>
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Discover Venues</h1>
        <p className="text-muted-foreground">
          Browse venue spaces across the Philippines.
        </p>
      </div>
      <Suspense fallback={<VenuesGridSkeleton />}>
        <VenuesGrid preloadedVenues={preloadedVenues} />
      </Suspense>
    </div>
  );
}
