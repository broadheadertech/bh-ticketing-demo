# Story 5.2: Event Filtering & Search

Status: done

## Story

As a **visitor**,
I want to filter events by type, date range, and location, and search by text,
So that I can find events that interest me quickly.

## Acceptance Criteria

1. **Given** I am on the event listing page (`/events`)
   **When** I use the `EventFilterBar` component
   **Then** I can filter by event type (concert, racing, seminar, class, other) (FR32)
   **And** I can filter by date range (Today, This Weekend, This Month) (FR32)
   **And** I can filter by location/venue name (FR32)
   **And** all filters update the URL query parameters (e.g., `?type=concert&date=today`) for shareable filtered views

2. **Given** I type in the search bar
   **When** I enter a search query
   **Then** events are searched using Convex search indexes (FR33)
   **And** results match against event title (primary) and description (secondary)
   **And** results are displayed within 1 second (NFR4)
   **And** the search query is reflected in the URL (`?q=jazz+concert`)

3. **Given** no events match my active filters or search query
   **When** results are empty
   **Then** I see a friendly empty state message suggesting the user broaden their filters
   **And** a "Clear Filters" button is shown to reset all active filters

4. **Given** I apply filters or perform a search
   **When** I copy the URL and open it in a new tab
   **Then** the same filters and search query are applied (URL state is shareable)

## Tasks / Subtasks

- [x] **Task 1: Add Convex search index to `convex/schema.ts`** (AC: #2)
  - [x] 1.1 Add a `searchIndex` on the `events` table named `"search_events"`:
    ```typescript
    .searchIndex("search_events", {
      searchField: "title",
      filterFields: ["status", "eventType"],
    })
    ```
  - [x] 1.2 This enables full-text search on the `title` field with indexed filtering on `status` and `eventType`. Convex search indexes support a single `searchField` — for MVP, title-based search is sufficient.
  - [x] 1.3 No data migration needed — Convex automatically backfills search indexes on the next `convex dev` run.
  - [x] 1.4 The `filterFields` allow using `.eq("status", ...)` and `.eq("eventType", ...)` inside the search index query builder — this is more efficient than a post-collection filter.

- [x] **Task 2: Add `searchPublicEvents` query to `convex/events.ts`** (AC: #2)
  - [x] 2.1 Add a new `query` named `searchPublicEvents` with args `{ query: v.string(), eventType: v.optional(v.string()) }`:
    ```typescript
    export const searchPublicEvents = query({
      args: {
        query: v.string(),
        eventType: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        const now = Date.now();
        const publicStatuses = ["published", "on_sale", "sold_out"];

        // Use Convex search index for full-text title matching
        const results = await ctx.db
          .query("events")
          .withSearchIndex("search_events", (q) => {
            const base = q.search("title", args.query);
            // Optionally narrow by event type at index level
            if (args.eventType && args.eventType !== "all") {
              return base.eq("eventType", args.eventType);
            }
            return base;
          })
          .collect();

        // Post-filter: public statuses + future dates only
        const filtered = results.filter(
          (e) => publicStatuses.includes(e.status) && e.date >= now
        );

        // Resolve artwork URLs
        return await Promise.all(
          filtered.map(async (event) => ({
            ...event,
            artworkUrl: event.artworkStorageId
              ? await ctx.storage.getUrl(event.artworkStorageId)
              : null,
          }))
        );
      },
    });
    ```
  - [x] 2.2 This is a **public query** — no `ctx.auth.getUserIdentity()` call. Search results are public.
  - [x] 2.3 The query does NOT filter by status inside the `withSearchIndex` builder because Convex search index `filterFields` with `status` would require specifying a single value. Instead, post-filter in memory after `.collect()`. This is acceptable for MVP since search results are naturally limited.
  - [x] 2.4 Convex search index `.collect()` returns up to **1,000 results** by default. For MVP event counts, this is sufficient. If needed, use `.take(50)` to limit results.

- [x] **Task 3: Add `filterEventsByDateRange()` to `src/lib/utils/event-filters.ts`** (AC: #1)
  - [x] 3.1 Add a date range filter utility function:
    ```typescript
    export type DateRangeFilter = "all" | "today" | "this_weekend" | "this_month";

    export function filterEventsByDateRange<T extends { date: number }>(
      events: T[],
      range: DateRangeFilter | null
    ): T[] {
      if (!range || range === "all") return events;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

      if (range === "today") {
        return events.filter((e) => e.date >= startOfDay && e.date <= endOfDay);
      }

      if (range === "this_weekend") {
        const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
        const daysUntilFri = dayOfWeek <= 5 ? 5 - dayOfWeek : 6; // next Friday (or today if Fri-Sun)
        const daysUntilSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const fridayStart = startOfDay + daysUntilFri * 24 * 60 * 60 * 1000;
        const sundayEnd = startOfDay + daysUntilSun * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 - 1;
        return events.filter((e) => e.date >= fridayStart && e.date <= sundayEnd);
      }

      if (range === "this_month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        return events.filter((e) => e.date >= monthStart && e.date <= monthEnd);
      }

      return events;
    }
    ```
  - [x] 3.2 Keep this as a pure function — no side effects, no imports of Next.js or Convex. Consistent with the established contract-testing pattern.

- [x] **Task 4: Create `EventFilterBar` component at `src/components/custom/event-filter-bar.tsx`** (AC: #1, #2, #3, #4)
  - [x] 4.1 Create a `"use client"` component with these imports:
    ```typescript
    "use client";
    import { useRouter, usePathname, useSearchParams } from "next/navigation";
    import { useCallback } from "react";
    import { Input } from "@/components/ui/input";
    import { Button } from "@/components/ui/button";
    import { Search, X } from "lucide-react";
    import { EVENT_TYPE_FILTERS } from "@/lib/utils/constants";
    ```
  - [x] 4.2 **Props interface:**
    ```typescript
    type EventFilterBarProps = {
      currentType: string;       // from URL param "type", default "all"
      currentDate: string;       // from URL param "date", default "all"
      currentQuery: string;      // from URL param "q", default ""
      currentLocation: string;   // from URL param "location", default ""
    };
    ```
  - [x] 4.3 **URL param management pattern** — use `useRouter` + `useSearchParams` to update params without full page reload:
    ```typescript
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    const updateFilter = (key: string, value: string) => {
      router.push(`${pathname}?${createQueryString({ [key]: value })}`);
    };
    ```
  - [x] 4.4 **Component layout** (vertical stack on mobile, horizontal row on desktop):
    ```tsx
    <div className="space-y-3 mb-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={currentQuery}
          onChange={(e) => updateFilter("q", e.target.value)}
          className="pl-9"
          aria-label="Search events"
        />
        {currentQuery && (
          <button
            onClick={() => updateFilter("q", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        {/* Event type pills */}
        {EVENT_TYPE_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={currentType === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("type", filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Date range row */}
      <div className="flex flex-wrap gap-2">
        {DATE_RANGE_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={currentDate === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("date", filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Active filter summary + Clear button */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filters active</span>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
    ```
  - [x] 4.5 **`DATE_RANGE_FILTERS` constant** — define locally in the component (not in constants.ts since it's only used here):
    ```typescript
    const DATE_RANGE_FILTERS = [
      { value: "all", label: "All Dates" },
      { value: "today", label: "Today" },
      { value: "this_weekend", label: "This Weekend" },
      { value: "this_month", label: "This Month" },
    ] as const;
    ```
  - [x] 4.6 **`hasActiveFilters`** — computed from current filter state:
    ```typescript
    const hasActiveFilters =
      (currentType && currentType !== "all") ||
      (currentDate && currentDate !== "all") ||
      !!currentQuery ||
      !!currentLocation;
    ```
  - [x] 4.7 **`clearAllFilters`** — pushes to pathname with no params:
    ```typescript
    const clearAllFilters = () => router.push(pathname);
    ```
  - [x] 4.8 **Location filter**: The `events` table has `venueName` (string) and `venueId` (optional string) but NO structured city/region field. For MVP, location filtering is a simple `venueName` text match. Add a compact text input for location filtered client-side:
    ```tsx
    <Input
      placeholder="Filter by venue..."
      value={currentLocation}
      onChange={(e) => updateFilter("location", e.target.value)}
      className="max-w-[200px]"
      aria-label="Filter by venue name"
    />
    ```
  - [x] 4.9 **Debouncing**: For the search input and location input, add debouncing to avoid excessive URL updates on every keypress. Use a simple `useState` + `useEffect` debounce pattern (300ms delay) rather than installing a new debounce library:
    ```typescript
    const [localQuery, setLocalQuery] = useState(currentQuery);
    useEffect(() => {
      const timer = setTimeout(() => {
        updateFilter("q", localQuery);
      }, 300);
      return () => clearTimeout(timer);
    }, [localQuery]);
    ```
    Apply the same pattern for `currentLocation`.
  - [x] 4.10 **Accessibility**: Each filter button should have clear `aria-pressed` state. The search input has `aria-label="Search events"`. The X clear button has `aria-label="Clear search"`. All buttons are keyboard accessible (native `<button>`/`<Button>` components handle this automatically).

- [x] **Task 5: Update `EventsGrid` to read URL params and apply filters** (AC: #1, #2, #3, #4)
  - [x] 5.1 Update `src/app/(public)/events/_components/events-grid.tsx` to read search params and render the filter bar:
    ```typescript
    "use client";
    import { useSearchParams } from "next/navigation";
    import { usePreloadedQuery, useQuery } from "convex/react";
    import type { Preloaded } from "convex/react";
    import { api } from "../../../../../convex/_generated/api";
    import { EventCard } from "@/components/custom/event-card";
    import { EventFilterBar } from "@/components/custom/event-filter-bar";
    import { Skeleton } from "@/components/ui/skeleton";
    import { filterEventsByType, filterEventsByDateRange } from "@/lib/utils/event-filters";
    import type { DateRangeFilter } from "@/lib/utils/event-filters";
    ```
  - [x] 5.2 Read current filter values from URL search params:
    ```typescript
    const searchParams = useSearchParams();
    const currentType = searchParams.get("type") ?? "all";
    const currentDate = searchParams.get("date") ?? "all";
    const currentQuery = searchParams.get("q") ?? "";
    const currentLocation = searchParams.get("location") ?? "";
    ```
  - [x] 5.3 Preloaded events for initial display (no search):
    ```typescript
    const events = usePreloadedQuery(preloadedEvents);
    const eventIds = events?.map((e) => e._id as any as string) ?? [];
    const priceRanges = useQuery(
      api.ticketTiers.getPriceRangeByEventIds,
      eventIds.length > 0 ? { eventIds } : "skip"
    );
    ```
  - [x] 5.4 **Search query integration** — when `currentQuery` is present, use `searchPublicEvents`:
    ```typescript
    const searchResults = useQuery(
      api.events.searchPublicEvents,
      currentQuery.trim().length >= 2
        ? { query: currentQuery.trim(), eventType: currentType !== "all" ? currentType : undefined }
        : "skip"
    );
    ```
    - Only trigger search when query is ≥ 2 characters (avoids empty/single-char searches)
    - When search is active, `searchResults` replaces the preloaded events for display
  - [x] 5.5 **Determine which events list to use**:
    ```typescript
    const isSearching = currentQuery.trim().length >= 2;
    const baseEvents = isSearching ? (searchResults ?? []) : (events ?? []);
    ```
  - [x] 5.6 **Apply client-side filters** to the base events list:
    ```typescript
    const filteredEvents = useMemo(() => {
      let result = baseEvents;
      // Type filter (skip if search already filtered by type at query level)
      if (!isSearching) {
        result = filterEventsByType(result, currentType);
      }
      // Date range filter
      result = filterEventsByDateRange(result, currentDate as DateRangeFilter);
      // Location filter (venueName partial match, case-insensitive)
      if (currentLocation.trim()) {
        const loc = currentLocation.toLowerCase();
        result = result.filter(
          (e) => e.venueName?.toLowerCase().includes(loc) ?? false
        );
      }
      return result;
    }, [baseEvents, isSearching, currentType, currentDate, currentLocation]);
    ```
  - [x] 5.7 **Skeleton loading** for initial load AND search results loading:
    ```typescript
    const isLoading = !events || (isSearching && searchResults === undefined);
    ```
  - [x] 5.8 **Price ranges for search results** — when in search mode, also fetch price ranges for found events:
    ```typescript
    const searchEventIds = searchResults?.map((e) => e._id as any as string) ?? [];
    const searchPriceRanges = useQuery(
      api.ticketTiers.getPriceRangeByEventIds,
      isSearching && searchEventIds.length > 0 ? { eventIds: searchEventIds } : "skip"
    );
    const activePriceRanges = isSearching ? searchPriceRanges : priceRanges;
    ```
  - [x] 5.9 **Render structure** — render filter bar above the grid:
    ```tsx
    return (
      <div>
        <EventFilterBar
          currentType={currentType}
          currentDate={currentDate}
          currentQuery={currentQuery}
          currentLocation={currentLocation}
        />
        {isLoading ? (
          <SkeletonGrid />
        ) : filteredEvents.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
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
    ```
  - [x] 5.10 **Empty state** — differentiate between "no events at all" vs "no matches for filter":
    ```tsx
    function EmptyState({ hasFilters }: { hasFilters: boolean }) {
      if (hasFilters) {
        return (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No events match your filters.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try broadening your search or clearing some filters.
            </p>
          </div>
        );
      }
      return (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No upcoming events found.</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new events!</p>
        </div>
      );
    }
    ```
  - [x] 5.11 **`hasActiveFilters`** computed in the grid component too:
    ```typescript
    const hasActiveFilters =
      (currentType && currentType !== "all") ||
      (currentDate && currentDate !== "all") ||
      !!currentQuery ||
      !!currentLocation;
    ```
  - [x] 5.12 **`useMemo`** — import from `react`. This is the correct optimization for the derived `filteredEvents` array since filters run on every render.

- [x] **Task 6: Write tests** (AC: #1, #2, #3)
  - [x] 6.1 Add `filterEventsByDateRange` tests to `convex/publicEvents.test.ts` (or a new `src/lib/utils/event-filters.test.ts`):
    - **Recommended**: create `src/lib/utils/event-filters.test.ts` (co-located, matches existing pattern)
    - Tests:
      - `"all"` → returns all events unchanged
      - `null` → returns all events unchanged
      - `"today"` → returns only events with date in today's range
      - `"today"` → excludes events in other days
      - `"this_weekend"` → returns events Friday-Sunday of current week
      - `"this_month"` → returns events in current calendar month
      - `"this_month"` → excludes events in prior months
      - Empty array → returns empty
  - [x] 6.2 Add `filterEventsByType` tests (already tested? check existing tests — if not present, add):
    - `"all"` → returns all events
    - specific type → filters correctly
    - non-matching type → returns empty
  - [x] 6.3 Add URL-filter contract tests for `searchPublicEvents` logic:
    - Add to `convex/publicEvents.test.ts`:
      ```typescript
      // Pure logic tests: Convex query post-filter logic
      function filterSearchResults(
        events: { status: string; date: number; title: string }[],
        publicStatuses: string[],
        now: number
      ) {
        return events.filter(
          (e) => publicStatuses.includes(e.status) && e.date >= now
        );
      }
      ```
      Tests:
      - Draft events excluded from search results
      - Past events excluded from search results
      - Published/on_sale/sold_out with future dates included
  - [x] 6.4 Add `EventFilterBar` contract tests for pure filter logic (location partial match):
    ```typescript
    function filterEventsByLocation<T extends { venueName?: string }>(
      events: T[],
      location: string
    ): T[] {
      if (!location.trim()) return events;
      const loc = location.toLowerCase();
      return events.filter((e) => e.venueName?.toLowerCase().includes(loc) ?? false);
    }
    ```
    Tests:
    - Empty location string → all events returned
    - Exact match → event returned
    - Partial match (case-insensitive) → event returned
    - No match → empty array
    - Event with no `venueName` → excluded when location filter active

## Dev Notes

### Existing Architecture — Important Context

**State Management for Filters**: The architecture explicitly specifies URL search params for filter state (not Zustand, not React Context). This is the correct approach for:
- SSR compatibility
- Shareable/bookmarkable filtered views
- Browser back button support
- SEO (Google can index filtered views)

**Existing Filter Utilities** (`src/lib/utils/event-filters.ts`):
- `filterEventsByStatus(events, status)` — already exists, reuse
- `filterEventsByType(events, type)` — already exists, reuse
- Add `filterEventsByDateRange(events, range)` — new, to be added in Task 3

**Existing Constants** (`src/lib/utils/constants.ts`):
- `EVENT_TYPE_FILTERS` — array of `{value, label}` objects ready for filter UI, includes "all" option
  ```typescript
  export const EVENT_TYPE_FILTERS = [
    { value: "all", label: "All Types" },
    { value: "concert", label: "Concert" },
    { value: "racing", label: "Racing" },
    { value: "seminar", label: "Seminar" },
    { value: "class", label: "Class" },
    { value: "other", label: "Other" },
  ] as const;
  ```
- `EVENT_TYPES`, `EVENT_TYPE_LABELS` — also available if needed

### Convex Search Index API

Convex search is **different from database queries**. Key rules:
- `searchIndex` is defined in `schema.ts` alongside regular indexes
- Only ONE `searchField` per index (we use `"title"`)
- `filterFields` enable `.eq()` chaining in the index query builder
- After `.withSearchIndex().collect()`, additional `.filter()` chains are NOT supported (unlike regular queries). Post-filter in handler code instead.
- Search index is NOT available for testing with `vitest` directly — use pure contract tests for post-filter logic

**Schema Addition Required** (`convex/schema.ts` line ~49 after `.index("by_status", ["status"])`):
```typescript
.searchIndex("search_events", {
  searchField: "title",
  filterFields: ["status", "eventType"],
})
```

### Server Component / Client Component Split

The existing structure (established in Story 5.1) is:
- `src/app/(public)/events/page.tsx` → **Server Component** with `preloadQuery` + `metadata` export
- `src/app/(public)/events/_components/events-grid.tsx` → **Client Component** with `usePreloadedQuery`

For Story 5.2:
- The **Server Component** (`page.tsx`) does NOT need changes — filter state lives in the Client Component
- The **Client Component** (`events-grid.tsx`) reads URL params via `useSearchParams()` (works in Client Components)
- The `EventFilterBar` is a Client Component (uses `useRouter`, `useSearchParams`)

Do NOT add server-side filter logic to `page.tsx` — this would break the preloaded query approach and require passing filter params as props through the component tree.

### `useSearchParams` in Next.js App Router

In Next.js App Router, `useSearchParams()` works in Client Components. It returns a read-only `URLSearchParams` object. To update URL params without a full page navigation, use `router.push()` or `router.replace()`.

```typescript
import { useSearchParams, useRouter, usePathname } from "next/navigation";

const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

// Read: searchParams.get("type") ?? "all"
// Write: router.push(`${pathname}?type=concert`)
```

**Note**: `useSearchParams()` requires the component to be wrapped in a `<Suspense>` boundary if you use static rendering. Since `EventsGrid` is already a Client Component inside a Server Component with `preloadQuery`, this is handled correctly.

### Convex `useQuery` with Dynamic Args

The search query is conditional on user input:
```typescript
const searchResults = useQuery(
  api.events.searchPublicEvents,
  currentQuery.trim().length >= 2
    ? { query: currentQuery.trim(), eventType: currentType !== "all" ? currentType : undefined }
    : "skip"  // "skip" prevents the query from running
);
```
- `"skip"` is the Convex pattern for conditional queries — consistent with Story 5.1's price range pattern
- When `currentQuery` changes, Convex reactively re-runs the query automatically
- `searchResults === undefined` while loading (same as any `useQuery` result)

### Location Filter Implementation Note

The `events` table schema has:
- `venueName: v.optional(v.string())` — human-readable venue name
- `venueId: v.optional(v.string())` — reference to a platform venue (optional)

There is NO structured city/region field in the current schema. For MVP:
- Location filtering is implemented as a **case-insensitive partial match on `venueName`**
- This is client-side (no additional Convex query needed)
- When Epic 6 (Venue Management) is complete and venues have structured location data, this can be upgraded to a proper location filter

### `useMemo` for Filter Performance

Client-side filtering on every render is cheap for MVP event counts, but wrapping in `useMemo` is good practice:
```typescript
import { useMemo } from "react";

const filteredEvents = useMemo(() => {
  // ... filter logic
}, [baseEvents, isSearching, currentType, currentDate, currentLocation]);
```

### EventCard Component — Unchanged

The `EventCard` component (`src/components/custom/event-card.tsx`) from Story 5.1 requires **no changes**. It accepts:
- `eventId: string`
- `title: string`
- `date: number`
- `venueName?: string`
- `eventType: string`
- `status: string`
- `artworkUrl: string | null`
- `priceRange: { minPrice: number; maxPrice: number } | null`

**No `time` prop** (was removed in Story 5.1 code review).

### Import Depth for Convex API

The `events-grid.tsx` is at `src/app/(public)/events/_components/events-grid.tsx`. The Convex API import is:
```typescript
import { api } from "../../../../../convex/_generated/api";
```
(5 levels up: `_components` → `events` → `(public)` → `app` → `src` → project root → `convex/`)

### Price Ranges for Search Results

When switching between browsed events and search results, price ranges need to be fetched for the right set of event IDs. The `activePriceRanges` pattern handles this:
```typescript
const activePriceRanges = isSearching ? searchPriceRanges : priceRanges;
```

### Testing Pattern

All tests follow the **pure contract-testing pattern** — no Convex runtime imports, no Next.js imports. Test files:
- `src/lib/utils/event-filters.test.ts` — new file, co-located with the module
- `convex/publicEvents.test.ts` — existing file, append new test blocks

The `filterEventsByDateRange` function uses `new Date()` internally. For deterministic tests, either:
- Pass a `now` timestamp as a parameter (preferred for testability)
- Or test relative to actual current dates (less brittle for date arithmetic but harder to assert exact results)

**Preferred approach**: Update `filterEventsByDateRange` signature to accept optional `now` parameter:
```typescript
export function filterEventsByDateRange<T extends { date: number }>(
  events: T[],
  range: DateRangeFilter | null,
  now = Date.now()
): T[]
```
This makes tests fully deterministic without mocking `Date.now()`.

### File Structure

```
New files:
  src/components/custom/event-filter-bar.tsx    # New EventFilterBar component
  src/lib/utils/event-filters.test.ts           # Tests for filter utilities

Modified files:
  convex/schema.ts                               # + searchIndex("search_events")
  convex/events.ts                               # + searchPublicEvents query
  src/lib/utils/event-filters.ts                 # + filterEventsByDateRange + DateRangeFilter type
  src/app/(public)/events/_components/events-grid.tsx  # + filter integration
  convex/publicEvents.test.ts                    # + search result filter contract tests
```

### References

- [Source: epics.md — Epic 5, Story 5.2 — ACs and FR32, FR33 references]
- [Source: architecture.md — State management: URL state for filters, no Zustand for filter state]
- [Source: architecture.md — Convex reactive queries, search index pattern]
- [Source: src/lib/utils/event-filters.ts — Existing filterEventsByType, filterEventsByStatus]
- [Source: src/lib/utils/constants.ts — EVENT_TYPE_FILTERS constant (ready-to-use filter options)]
- [Source: src/app/(public)/events/_components/events-grid.tsx — Existing EventsGrid to modify]
- [Source: src/components/custom/event-card.tsx — EventCard props interface (no time prop)]
- [Source: convex/schema.ts — events table indexes, fields available for searchIndex filterFields]
- [Source: 5-1-public-event-listing-page.md — Server/Client split, preloadQuery pattern, "skip" pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers.

### Completion Notes List

- Added `searchIndex("search_events")` to `convex/schema.ts` events table with `searchField: "title"` and `filterFields: ["status", "eventType"]` — enables FR33 full-text search on event titles
- Added `searchPublicEvents` public Convex query to `convex/events.ts`: uses `withSearchIndex`, post-filters for public statuses + future dates, resolves artwork URLs via `ctx.storage.getUrl()`
- Added `filterEventsByDateRange()` + `DateRangeFilter` type to `src/lib/utils/event-filters.ts`: supports "today", "this_weekend", "this_month" with optional `now` parameter for deterministic testing
- Created `EventFilterBar` component (`src/components/custom/event-filter-bar.tsx`): search input with 300ms debounce, venue text filter with 300ms debounce, event type pills, date range pills — all updating URL search params via `useRouter.push()`
- Updated `events-grid.tsx`: reads `useSearchParams()` for filter state, hybrid approach (preloaded events when no search query, `searchPublicEvents` when query ≥ 2 chars), client-side type/date/location filters via `useMemo`, dual price range tracking for both browse and search modes, differentiated empty states
- Created `src/lib/utils/event-filters.test.ts`: 34 deterministic tests for `filterEventsByDateRange`, `filterEventsByType`, `filterEventsByStatus`, and location filter contract
- Added 7 `searchPublicEvents post-filter contract` tests to `convex/publicEvents.test.ts`
- All 595 tests pass (up from 554, +41 new tests, no regressions)

### Code Review Fixes Applied

**H1** — Added `<Suspense fallback={<EventsGridSkeleton />}>` around `<EventsGrid>` in `events/page.tsx`; exported `EventsGridSkeleton` from `events-grid.tsx` to satisfy Next.js App Router `useSearchParams()` requirement.

**M1** — Added early return guard in `searchPublicEvents`: `if (!args.query.trim() || args.query.trim().length < 2) return [];` — prevents empty/trivial search index queries.

**M2** — Split `isLoading` into `isInitialLoading` (skeleton on first load) and `isSearchLoading` (non-blocking during search transitions); grid now keeps displaying previous events while search resolves instead of flashing skeleton.

**L1** — Removed dead `daysUntilFri = -1` variable in Sunday branch of `filterEventsByDateRange`; inlined logic directly into `fridayStart` expression preserving identical behaviour.

**L2** — Added `maxLength={100}` to both search and venue inputs in `EventFilterBar`.

### File List

- `convex/schema.ts` — added `searchIndex("search_events")` to events table
- `convex/events.ts` — added `searchPublicEvents` query; added min-length guard (M1)
- `src/lib/utils/event-filters.ts` — added `filterEventsByDateRange()` + `DateRangeFilter` type; removed dead variable (L1)
- `src/components/custom/event-filter-bar.tsx` — new EventFilterBar component; added maxLength (L2)
- `src/app/(public)/events/_components/events-grid.tsx` — updated with filter integration; exported `EventsGridSkeleton`; fixed loading states (M2)
- `src/app/(public)/events/page.tsx` — wrapped EventsGrid in Suspense boundary (H1)
- `src/lib/utils/event-filters.test.ts` — new co-located test file (34 tests)
- `convex/publicEvents.test.ts` — added 7 search contract tests
