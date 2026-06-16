import type { MetadataRoute } from "next";

// Web App Manifest — makes the Plaza consumer site installable ("Add to Home Screen")
// and launch in standalone app chrome, matching the TIX.PH Mobile design.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PHLive — Universal Ticketing",
    short_name: "PHLive",
    description: "Discover and book tickets for live events across the Philippines",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF6EC",
    theme_color: "#FBF6EC",
    categories: ["events", "entertainment", "shopping"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
