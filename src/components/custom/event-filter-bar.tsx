"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { EVENT_TYPE_FILTERS } from "@/lib/utils/constants";

const DATE_RANGE_FILTERS = [
  { value: "all", label: "All Dates" },
  { value: "today", label: "Today" },
  { value: "this_weekend", label: "This Weekend" },
  { value: "this_month", label: "This Month" },
] as const;

type EventFilterBarProps = {
  currentType: string;
  currentDate: string;
  currentQuery: string;
  currentLocation: string;
};

export function EventFilterBar({
  currentType,
  currentDate,
  currentQuery,
  currentLocation,
}: EventFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localQuery, setLocalQuery] = useState(currentQuery);
  const [localLocation, setLocalLocation] = useState(currentLocation);

  // Sync local state if URL params change externally
  useEffect(() => {
    setLocalQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setLocalLocation(currentLocation);
  }, [currentLocation]);

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      return params.toString();
    },
    [searchParams]
  );

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const qs = createQueryString({ [key]: value });
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, createQueryString]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== currentQuery) {
        updateFilter("q", localQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce location input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localLocation !== currentLocation) {
        updateFilter("location", localLocation);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters =
    (currentType && currentType !== "all") ||
    (currentDate && currentDate !== "all") ||
    !!currentQuery ||
    !!currentLocation;

  const clearAllFilters = () => {
    setLocalQuery("");
    setLocalLocation("");
    router.push(pathname);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="pl-9 pr-9"
            maxLength={100}
            aria-label="Search events"
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Location filter */}
        <Input
          placeholder="Filter by venue..."
          value={localLocation}
          onChange={(e) => setLocalLocation(e.target.value)}
          className="max-w-45"
          maxLength={100}
          aria-label="Filter by venue name"
        />
      </div>

      {/* Event type pills */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPE_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={currentType === filter.value || (!currentType && filter.value === "all") ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("type", filter.value)}
            aria-pressed={
              currentType === filter.value ||
              (!currentType && filter.value === "all")
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Date range pills */}
      <div className="flex flex-wrap gap-2">
        {DATE_RANGE_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={currentDate === filter.value || (!currentDate && filter.value === "all") ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("date", filter.value)}
            aria-pressed={
              currentDate === filter.value ||
              (!currentDate && filter.value === "all")
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Active filter indicator + Clear all */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filters active</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
