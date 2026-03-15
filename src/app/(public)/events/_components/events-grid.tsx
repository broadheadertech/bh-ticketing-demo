"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePreloadedQuery, useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EventCard } from "@/components/custom/event-card";
import { EventFilterBar } from "@/components/custom/event-filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterEventsByType,
  filterEventsByDateRange,
} from "@/lib/utils/event-filters";
import type { DateRangeFilter } from "@/lib/utils/event-filters";

function EventCardSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden bg-card">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function EventsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No events match your filters.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Try broadening your search or clearing some filters.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground">No upcoming events found.</p>
      <p className="text-sm text-muted-foreground mt-1">
        Check back soon for new events!
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
      {isInitialLoading ? (
        <EventsGridSkeleton />
      ) : filteredEvents.length === 0 && !isSearchLoading ? (
        <EmptyState hasFilters={!!hasActiveFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const eventIdStr = event._id as any as string;
            const priceRange = activePriceRanges?.[eventIdStr] ?? null;
            return (
              <EventCard
                key={event._id}
                eventId={eventIdStr}
                title={event.title}
                date={event.date}
                venueName={event.venueName}
                eventType={event.eventType}
                status={event.status}
                artworkUrl={event.artworkUrl}
                priceRange={priceRange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
