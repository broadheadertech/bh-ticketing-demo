"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
    <div>
      {/* Search / location / date bar */}
      <div className="bro-bar">
        <div className="bro-search">
          <Search size={18} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
          <input
            placeholder="Search events…"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            maxLength={100}
            aria-label="Search events"
          />
          {localQuery && (
            <button
              onClick={() => setLocalQuery("")}
              aria-label="Clear search"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--ink-3)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="bro-search" style={{ flex: "0 1 220px", minWidth: 170 }}>
          <input
            placeholder="Filter by venue…"
            value={localLocation}
            onChange={(e) => setLocalLocation(e.target.value)}
            maxLength={100}
            aria-label="Filter by venue name"
          />
        </div>
        <select
          className="bro-select"
          value={currentDate || "all"}
          onChange={(e) => updateFilter("date", e.target.value)}
          aria-label="Filter by date range"
        >
          {DATE_RANGE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Event type chips */}
      <div className="bro-filters">
        {EVENT_TYPE_FILTERS.map((filter) => {
          const isOn =
            currentType === filter.value ||
            (!currentType && filter.value === "all");
          return (
            <button
              key={filter.value}
              type="button"
              className={"cat" + (isOn ? " on" : "")}
              onClick={() => updateFilter("type", filter.value)}
              aria-pressed={isOn}
            >
              {filter.label}
            </button>
          );
        })}
        {hasActiveFilters && (
          <button
            type="button"
            className="cat"
            style={{ borderStyle: "dashed", color: "var(--coral)" }}
            onClick={clearAllFilters}
          >
            <X size={13} style={{ display: "inline", marginRight: 4 }} />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
