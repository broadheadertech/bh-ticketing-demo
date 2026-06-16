"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePreloadedQuery, useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PosterCard } from "@/components/custom/poster-card";
import { EventFilterBar } from "@/components/custom/event-filter-bar";
import {
  filterEventsByType,
  filterEventsByDateRange,
} from "@/lib/utils/event-filters";
import type { DateRangeFilter } from "@/lib/utils/event-filters";

export function EventsGridSkeleton() {
  return (
    <div className="bro-grid" style={{ marginTop: 26 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="pskel" key={i} />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bro-empty">
      <div style={{ fontWeight: 800, fontSize: 18, color: "var(--ink)" }}>
        {hasFilters ? "No events match." : "No upcoming events found."}
      </div>
      <p style={{ marginTop: 8 }}>
        {hasFilters
          ? "Try broadening your search or clearing some filters."
          : "Check back soon for new events!"}
      </p>
    </div>
  );
}

type Props = {
  preloadedEvents: Preloaded<typeof api.events.listPublicEvents>;
};

export function EventsGrid({ preloadedEvents }: Props) {
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "all";
  const currentDate = searchParams.get("date") ?? "all";
  const currentQuery = searchParams.get("q") ?? "";
  const currentLocation = searchParams.get("location") ?? "";

  // Preloaded SSR events (no search)
  const events = usePreloadedQuery(preloadedEvents);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventIds = events?.map((e) => e._id as any as string) ?? [];
  const priceRanges = useQuery(
    api.ticketTiers.getPriceRangeByEventIds,
    eventIds.length > 0 ? { eventIds } : "skip"
  );

  // Search results (when query is active, >= 2 chars)
  const isSearching = currentQuery.trim().length >= 2;
  const searchResults = useQuery(
    api.events.searchPublicEvents,
    isSearching
      ? {
          query: currentQuery.trim(),
          eventType: currentType !== "all" ? currentType : undefined,
        }
      : "skip"
  );

  // Price ranges for search results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchEventIds = searchResults?.map((e) => e._id as any as string) ?? [];
  const searchPriceRanges = useQuery(
    api.ticketTiers.getPriceRangeByEventIds,
    isSearching && searchEventIds.length > 0
      ? { eventIds: searchEventIds }
      : "skip"
  );

  const activePriceRanges = isSearching ? searchPriceRanges : priceRanges;

  // Determine base events list
  const baseEvents = isSearching ? (searchResults ?? []) : (events ?? []);

  // Apply client-side filters
  const filteredEvents = useMemo(() => {
    let result = baseEvents;
    // Type filter: skip when searching (search query already filtered at index level)
    if (!isSearching) {
      result = filterEventsByType(result, currentType);
    }
    // Date range filter
    result = filterEventsByDateRange(result, currentDate as DateRangeFilter);
    // Location: case-insensitive partial match on venueName
    if (currentLocation.trim()) {
      const loc = currentLocation.toLowerCase();
      result = result.filter(
        (e) => e.venueName?.toLowerCase().includes(loc) ?? false
      );
    }
    return result;
  }, [baseEvents, isSearching, currentType, currentDate, currentLocation]);

  const hasActiveFilters =
    (currentType && currentType !== "all") ||
    (currentDate && currentDate !== "all") ||
    !!currentQuery ||
    !!currentLocation;

  const isInitialLoading = !events;
  const isSearchLoading = isSearching && searchResults === undefined;

  return (
    <div>
      <EventFilterBar
        currentType={currentType}
        currentDate={currentDate}
        currentQuery={currentQuery}
        currentLocation={currentLocation}
      />
      {isInitialLoading || isSearchLoading ? (
        <EventsGridSkeleton />
      ) : filteredEvents.length === 0 ? (
        <EmptyState hasFilters={!!hasActiveFilters} />
      ) : (
        <>
          <div className="bro-count">
            {filteredEvents.length}{" "}
            {filteredEvents.length === 1 ? "event" : "events"}
            {currentQuery ? ` · “${currentQuery}”` : ""}
          </div>
          <div className="bro-grid">
            {filteredEvents.map((event) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const eventIdStr = event._id as any as string;
              const priceRange = activePriceRanges?.[eventIdStr] ?? null;
              return (
                <PosterCard
                  key={event._id}
                  event={{ ...event, _id: eventIdStr }}
                  priceRange={priceRange}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
