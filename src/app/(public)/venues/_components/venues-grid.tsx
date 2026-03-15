"use client";

import { useState, useMemo } from "react";
import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  PublicVenueCard,
  PublicVenueCardSkeleton,
} from "@/components/custom/public-venue-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export function VenuesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <PublicVenueCardSkeleton key={i} />
      ))}
    </div>
  );
}

const CAPACITY_RANGES = [
  { label: "All Capacities", value: "all" },
  { label: "Up to 100", value: "0-100" },
  { label: "100 – 500", value: "100-500" },
  { label: "500 – 1,000", value: "500-1000" },
  { label: "1,000+", value: "1000-999999" },
];

type Props = {
  preloadedVenues: Preloaded<typeof api.venues.listPublicVenues>;
};

export function VenuesGrid({ preloadedVenues }: Props) {
  const venues = usePreloadedQuery(preloadedVenues);
  const [search, setSearch] = useState("");
  const [capacityRange, setCapacityRange] = useState("all");

  const filtered = useMemo(() => {
    if (!venues) return [];
    let result = [...venues];

    // Text search on name + location
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q)
      );
    }

    // Capacity filter
    if (capacityRange !== "all") {
      const [minStr, maxStr] = capacityRange.split("-");
      const min = Number(minStr);
      const max = Number(maxStr);
      result = result.filter((v) => v.capacity >= min && v.capacity <= max);
    }

    return result;
  }, [venues, search, capacityRange]);

  const hasFilters = search.trim() !== "" || capacityRange !== "all";

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={capacityRange} onValueChange={setCapacityRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAPACITY_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {!venues ? (
        <VenuesGridSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            {hasFilters
              ? "No venues match your filters."
              : "No venues available yet."}
          </p>
          {hasFilters && (
            <p className="text-sm text-muted-foreground mt-1">
              Try broadening your search or clearing filters.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((venue) => (
            <PublicVenueCard
              key={venue._id}
              venueId={venue._id as string}
              name={venue.name}
              location={venue.location}
              capacity={venue.capacity}
              amenities={venue.amenities}
              firstPhotoUrl={venue.firstPhotoUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
