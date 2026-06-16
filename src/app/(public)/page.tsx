import type { Metadata } from "next";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { HomeClient } from "./_components/home-client";

export const metadata: Metadata = {
  title: "TIX.PH — Where the whole barangay buys tickets",
  description:
    "Themeable ticketing for live events across the Philippines. Every event its own world — one trustworthy checkout.",
  openGraph: {
    title: "TIX.PH — Where the whole barangay buys tickets",
    description:
      "Themeable ticketing for live events across the Philippines.",
    type: "website",
  },
};

export default async function HomePage() {
  const preloadedEvents = await preloadQuery(api.events.listPublicEvents, {});
  return <HomeClient preloadedEvents={preloadedEvents} />;
}
