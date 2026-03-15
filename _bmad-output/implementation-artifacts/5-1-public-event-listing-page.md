# Story 5.1: Public Event Listing Page

Status: done

## Story

As a **visitor**,
I want to browse upcoming events on a public listing page,
So that I can discover events happening near me.

## Acceptance Criteria

1. **Given** I visit the home page (`/`)
   **When** the page loads
   **Then** I see a grid of upcoming events using EventCard components (FR31)
   **And** each EventCard shows: artwork image, title, date, venue name, price range, event type badge
   **And** the page is server-side rendered for SEO (NFR19)
   **And** skeleton loading states are shown during data fetch
   **And** the page returns results within 1 second (NFR4)

2. **Given** events are displayed
   **When** I view the listing
   **Then** only events with status `published`, `on_sale`, or `sold_out` are shown
   **And** events are sorted by date (soonest first)
   **And** sold-out events show a "Sold Out" badge (FR24)

3. **Given** I am on mobile (320px-767px)
   **When** I view the listing
   **Then** EventCards display in a single-column layout
   **And** the page is mobile-first responsive

## Tasks / Subtasks

- [x] **Task 1: Add `listPublicEvents` query to `convex/events.ts`** (AC: #1, #2)

  - [x] 1.1 Add a Convex `query` named `listPublicEvents` with no args (public, no auth required):
    ```typescript
    export const listPublicEvents = query({
      args: {},
      handler: async (ctx) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_status")
          .collect();
        // Filter to only public-visible statuses
        const publicStatuses = ["published", "on_sale", "sold_out"];
        const publicEvents = events.filter((e) => publicStatuses.includes(e.status));
        // Sort by date ascending (soonest first)
        publicEvents.sort((a, b) => a.date - b.date);
        return publicEvents;
      },
    });
    ```
  - [x] 1.2 **Important**: The `by_status` index on the events table supports filtering by status, but since we need 3 statuses, we query all and filter in-memory. For MVP scale (hundreds of events, not millions), this is acceptable. Convex does not support OR-index queries.
  - [x] 1.3 The query does NOT require authentication — this is a public page. No `ctx.auth.getUserIdentity()` call.
  - [x] 1.4 Returns the full event documents. The EventCard component will select the fields it needs.
  - [x] 1.5 Only future events should be shown (filter `event.date >= Date.now()`). Past events are not useful for discovery. Add this filter after the status filter.

- [x] **Task 2: Add `getPriceRangeByEventIds` query to `convex/ticketTiers.ts`** (AC: #1)
  - [x] 2.1 Add a Convex `query` that takes an array of eventIds and returns a map of eventId → { minPrice, maxPrice }:
    ```typescript
    export const getPriceRangeByEventIds = query({
      args: { eventIds: v.array(v.string()) },
      handler: async (ctx, args) => {
        const result: Record<string, { minPrice: number; maxPrice: number }> = {};
        for (const eventId of args.eventIds) {
          const tiers = await ctx.db
            .query("ticketTiers")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .withIndex("by_event_id", (q) => q.eq("eventId", eventId as any))
            .collect();
          if (tiers.length > 0) {
            const prices = tiers.map((t) => t.price);
            result[eventId] = {
              minPrice: Math.min(...prices),
              maxPrice: Math.max(...prices),
            };
          }
        }
        return result;
      },
    });
    ```
  - [x] 2.2 This is a public query — no auth needed. Price ranges are not sensitive data.
  - [x] 2.3 Uses the existing `by_event_id` index on `ticketTiers` table for efficient lookups.
  - [x] 2.4 Returns prices in **centavos** (integer). The component uses `formatCurrency()` from `src/lib/utils/format.ts` to display as PHP.

- [x] **Task 3: Create `EventCard` component `src/components/custom/event-card.tsx`** (AC: #1, #2, #3)
  - [x] 3.1 Create a `"use client"` component (needs `useQuery` for artwork URL resolution, or pass data as props — prefer props for this component since data is fetched by parent):
    ```typescript
    import Link from "next/link";
    import Image from "next/image";
    import { Badge } from "@/components/ui/badge";
    import { formatDate } from "@/lib/utils/format";
    import { formatCurrency } from "@/lib/utils/format";
    import { EVENT_TYPE_LABELS } from "@/lib/utils/constants";
    ```
  - [x] 3.2 **Props interface:**
    ```typescript
    type EventCardProps = {
      eventId: string;
      title: string;
      date: number;
      time: string;
      venueName?: string;
      eventType: string;
      status: string;
      artworkUrl: string | null;
      priceRange: { minPrice: number; maxPrice: number } | null;
    };
    ```
  - [x] 3.3 **Card anatomy** (from UX spec):
    - Artwork image: 16:9 aspect ratio, `next/image` with `fill` + `object-cover`, blur placeholder
    - Date badge overlay: top-left absolute positioned, shows formatted date
    - Event type badge: top-right, uses `EVENT_TYPE_LABELS[eventType]`
    - Title: `text-lg font-semibold`, max 2 lines with `line-clamp-2`
    - Venue name: single line with map-pin icon prefix, `text-sm text-muted-foreground`, truncate
    - Price range: "Free" or "From P300" or "P300 - P1,500" using `formatCurrency()`
    - **Sold Out overlay**: When `status === "sold_out"`, show "Sold Out" badge with `bg-destructive`, grayed card overlay (`opacity-60`), no hover lift
  - [x] 3.4 **Entire card is a clickable Link** wrapping to `/events/${eventId}`:
    ```tsx
    <Link href={`/events/${eventId}`} className="group block">
    ```
  - [x] 3.5 **Hover effect**: `shadow-md` default → `shadow-lg` on hover + slight Y translate (`group-hover:-translate-y-1 transition-all`). Disabled for sold-out cards.
  - [x] 3.6 **Accessibility**: `aria-label` on the link: `"${title} on ${formatDate(date)} at ${venueName ?? 'TBA'} - ${priceDisplay}"`
  - [x] 3.7 **Responsive**: Card itself is always full-width of its grid cell. Grid handles responsive columns (parent responsibility).
  - [x] 3.8 **Image handling**: If `artworkUrl` is null, show a placeholder div with `bg-muted` and a calendar/music icon.

- [x] **Task 4: Build the public events listing page `src/app/(public)/events/page.tsx`** (AC: #1, #2, #3)
  - [x] 4.1 This page already exists as a placeholder — **replace** its content. The file is at `src/app/(public)/events/page.tsx`.
  - [x] 4.2 Make it a `"use client"` component (needs `useQuery` from `convex/react` for reactive data):
    ```typescript
    "use client";

    import { useQuery } from "convex/react";
    import { api } from "../../../../convex/_generated/api";
    import { EventCard } from "@/components/custom/event-card";
    import { Skeleton } from "@/components/ui/skeleton";
    ```
  - [x] 4.3 Fetch events and price ranges:
    ```typescript
    const events = useQuery(api.events.listPublicEvents);
    const eventIds = events?.map((e) => e._id as unknown as string) ?? [];
    const priceRanges = useQuery(
      api.ticketTiers.getPriceRangeByEventIds,
      eventIds.length > 0 ? { eventIds } : "skip"
    );
    ```
  - [x] 4.4 **Important**: Use `"skip"` as the second argument to `useQuery` when `eventIds` is empty — this tells Convex to skip the query entirely (prevents a wasted round-trip). This is the Convex pattern for conditional queries.
  - [x] 4.5 **Artwork URL resolution**: Events store `artworkStorageId` (a Convex storage ID), not a URL. You need to resolve these to URLs. Use `useQuery(api.files.getFileUrl, { storageId })` for each event OR create a batch query. The simplest approach for MVP: pass `artworkStorageId` to EventCard and let EventCard resolve it individually with `useQuery`. **Alternative (better)**: Create a batch URL resolver or use the existing pattern from the event detail page.

    Check how `src/app/(public)/events/[eventId]/page.tsx` resolves artwork URLs — follow that same pattern. The existing `getPublicEventById` query already returns `artworkUrl` by calling `ctx.storage.getUrl()`. Add the same pattern to `listPublicEvents`:
    ```typescript
    // In listPublicEvents handler, after filtering and sorting:
    return await Promise.all(
      publicEvents.map(async (event) => ({
        ...event,
        artworkUrl: event.artworkStorageId
          ? await ctx.storage.getUrl(event.artworkStorageId)
          : null,
      }))
    );
    ```
  - [x] 4.6 **Loading skeleton**: Show a grid of skeleton cards matching EventCard anatomy:
    ```tsx
    function EventCardSkeleton() {
      return (
        <div className="rounded-lg border overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      );
    }
    ```
  - [x] 4.7 **Empty state**: When no events match, show a friendly message:
    ```tsx
    <div className="text-center py-12">
      <p className="text-lg text-muted-foreground">No upcoming events found.</p>
      <p className="text-sm text-muted-foreground mt-1">Check back soon for new events!</p>
    </div>
    ```
  - [x] 4.8 **Grid layout**: Responsive grid matching UX spec:
    ```tsx
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event._id} ... />
      ))}
    </div>
    ```
  - [x] 4.9 **Page header**: Simple heading above the grid:
    ```tsx
    <div className="space-y-2 mb-8">
      <h1 className="text-3xl font-bold">Discover Events</h1>
      <p className="text-muted-foreground">Browse upcoming live events across the Philippines.</p>
    </div>
    ```

- [x] **Task 5: Wire the home page `/` to show the events listing** (AC: #1)
  - [x] 5.1 Check the current `src/app/(public)/page.tsx` (the `/` route). If it exists and is a placeholder or redirects, update it to either:
    - **Option A**: Import and render the events listing directly on `/` (make `/` the discovery page)
    - **Option B**: Redirect `/` to `/events`
  - [x] 5.2 The AC says "Given I visit the home page (`/`)... Then I see a grid of upcoming events". So the `/` route MUST show the events grid. The simplest approach: make `src/app/(public)/page.tsx` (the home page) render the same events grid, OR redirect to `/events`.
  - [x] 5.3 **Recommended approach**: Make `src/app/(public)/page.tsx` the discovery page directly. Move/copy the events listing logic there, or import a shared `EventsGrid` component used by both `/` and `/events`.

- [x] **Task 6: Write tests** (AC: #1, #2, #3)
  - [x] 6.1 Add contract tests to `convex/publicEvents.test.ts` for `listPublicEvents` logic:
    ```typescript
    // Pure logic: filter events by public-visible statuses
    function filterPublicEvents(events: { status: string; date: number }[]): typeof events {
      const publicStatuses = ["published", "on_sale", "sold_out"];
      return events
        .filter((e) => publicStatuses.includes(e.status))
        .filter((e) => e.date >= Date.now())
        .sort((a, b) => a.date - b.date);
    }
    ```
    Tests:
    - Only `published`, `on_sale`, `sold_out` events pass filter (AC#2)
    - `draft`, `completed`, `cancelled` events are excluded
    - Events sorted by date ascending (soonest first) (AC#2)
    - Past events (date < Date.now()) are excluded
    - Empty events array returns empty (edge case)
  - [x] 6.2 Add contract tests for `getPriceRangeByEventIds` logic:
    ```typescript
    function computePriceRange(prices: number[]): { minPrice: number; maxPrice: number } | null {
      if (prices.length === 0) return null;
      return { minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
    }
    ```
    Tests:
    - Single tier returns min === max
    - Multiple tiers returns correct min/max
    - Free event (all tiers price=0) returns { minPrice: 0, maxPrice: 0 }
    - Empty tiers returns null
  - [x] 6.3 Add display format contract tests for EventCard:
    ```typescript
    function formatPriceRange(range: { minPrice: number; maxPrice: number } | null): string {
      if (!range) return "Free";
      if (range.minPrice === 0 && range.maxPrice === 0) return "Free";
      if (range.minPrice === range.maxPrice) return formatCurrency(range.minPrice);
      if (range.minPrice === 0) return `Free - ${formatCurrency(range.maxPrice)}`;
      return `From ${formatCurrency(range.minPrice)}`;
    }
    ```
    Tests:
    - null range → "Free"
    - { minPrice: 0, maxPrice: 0 } → "Free"
    - { minPrice: 30000, maxPrice: 30000 } → single price display
    - { minPrice: 30000, maxPrice: 100000 } → "From P300.00"
    - { minPrice: 0, maxPrice: 50000 } → "Free - P500.00"
  - [x] 6.4 Add sold-out badge logic tests:
    - `status === "sold_out"` → shows sold out badge
    - `status === "published"` → no sold out badge
    - `status === "on_sale"` → no sold out badge
  - [x] 6.5 Use the established pure contract-testing pattern — NO module imports of actual Convex runtime — consistent with all existing test files

## Dev Notes

### Public Page — No Authentication Required

This is the first PUBLIC page in the project (outside of the event detail page). Key differences from dashboard pages:
- **No `ctx.auth.getUserIdentity()` in Convex queries** — these are unauthenticated public queries
- **No user-specific data** — shows the same events to everyone
- The `(public)` route group layout (`PublicLayout`) already exists at `src/components/layouts/public-layout.tsx` and is applied via `src/app/(public)/layout.tsx`

### Existing `getPublicEventById` Query Pattern

The existing `getPublicEventById` in `convex/events.ts` (line 390-417) is the reference pattern for public event queries:
```typescript
// It checks event.status !== "published" and throws
// It resolves artworkUrl via ctx.storage.getUrl(event.artworkStorageId)
// It joins creatorProfile data
```
Follow this same pattern for `listPublicEvents` — especially the `ctx.storage.getUrl()` call for artwork URLs.

### `by_status` Index on Events Table

The events table has `.index("by_status", ["status"])` defined in `convex/schema.ts` line 48. However, Convex indexes don't support OR queries (e.g., "status IN ['published', 'on_sale', 'sold_out']"). For MVP, query all events and filter in-memory. At scale, three parallel index queries could be used.

### Artwork URL Resolution

Events store `artworkStorageId: v.optional(v.id("_storage"))` — a Convex file storage reference. To get a displayable URL, call `ctx.storage.getUrl(storageId)` inside the Convex query handler. Do NOT try to resolve storage IDs on the client. The `getPublicEventById` query already does this correctly — follow the same pattern.

### Price Display with `formatCurrency()`

`src/lib/utils/format.ts` exports `formatCurrency(centavos)` which:
- Returns `"Free"` for 0
- Formats as PHP currency (e.g., "P300.00") for non-zero values

Prices in the database are stored in **centavos** (integer). P300 = 30000 centavos.

### Existing Constants and Helpers

Already available in `src/lib/utils/`:
- `constants.ts`: `EVENT_TYPES`, `EVENT_TYPE_LABELS`, `EVENT_STATUSES`, `EVENT_STATUS_LABELS`
- `format.ts`: `formatCurrency()`, `formatDate()`, `formatDateTime()`
- `event-status.ts`: `getStatusBadgeVariant()` — returns badge color/variant for each status
- `event-filters.ts`: `filterEventsByStatus()`, `filterEventsByType()` — pure filter functions

### `useQuery` Conditional Skip Pattern

Convex `useQuery` supports `"skip"` as the args parameter to prevent the query from running:
```typescript
const priceRanges = useQuery(
  api.ticketTiers.getPriceRangeByEventIds,
  eventIds.length > 0 ? { eventIds } : "skip"
);
```
This prevents a wasted round-trip when there are no events yet (loading state).

### Responsive Grid — UX Spec

From UX spec:
- **Mobile (default)**: 1-column (`grid-cols-1`)
- **Tablet (`md`)**: 2-column (`md:grid-cols-2`)
- **Desktop (`lg`)**: 3-column (`lg:grid-cols-3`)
- **Max width**: `max-w-7xl` (already applied by PublicLayout)
- **Gap**: `gap-6` (24px)

### EventCard Design — UX Spec Details

From UX spec:
- **Discovery variant**: image-heavy, price prominent, no dashboard status badges
- **16:9 aspect ratio** for artwork: use `aspect-video` class
- **Hover lift**: `shadow-md → shadow-lg`, `-translate-y-1`, disabled for sold-out
- **Sold Out state**: grayed overlay (`opacity-60`), "Sold Out" badge (`bg-destructive`), no hover
- **Accessibility**: Entire card is a single `<Link>`, `aria-label` with full context
- **Image**: `next/image` with `fill` + `object-cover`, blur placeholder or `bg-muted` fallback

### PublicLayout Already Exists

`src/components/layouts/public-layout.tsx` provides:
- Header with PHLive brand
- Footer with copyright
- Main content with `max-w-7xl` container
- Applied via `src/app/(public)/layout.tsx`

Do NOT create a new layout. The existing one works.

### Existing Events Page is a Placeholder

`src/app/(public)/events/page.tsx` currently contains only:
```typescript
export default function EventsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Events</h1>
      <p className="mt-4 text-muted-foreground">Discover live events across the Philippines.</p>
    </div>
  );
}
```
**Replace** this with the full implementation. Don't create a new file.

### Home Page Route

AC#1 says "Given I visit the home page (`/`)". Check `src/app/(public)/page.tsx` — this needs to show the events grid. Either:
- Make it the primary events listing page
- Or redirect to `/events`

### `next/image` for Event Artwork

Use `next/image` with:
```tsx
<div className="relative aspect-video">
  <Image src={artworkUrl} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
</div>
```
The `sizes` prop is critical for performance — tells the browser how wide the image will be at each breakpoint.

### Testing Pattern Consistency

All existing tests use pure contract tests (no Convex runtime imports). `convex/publicEvents.test.ts` already exists with tests for `getPublicEventById` and `getPublicTiersByEventId`. Add new test blocks to this file for the new queries.

### Previous Story Learnings (Stories 4.1–4.4)

- **`eslint-disable-next-line @typescript-eslint/no-explicit-any`** before Convex `as any` casts
- **`useQuery` returns `undefined` while loading** — always guard with skeleton
- **Pure contract-testing pattern** — extract logic, test independently
- **Convex reactive subscriptions auto-update** — no manual polling needed
- **Import path for convex api** depends on file depth: count levels up to project root

### File Structure

```
New files:
  src/components/custom/event-card.tsx              # EventCard component

Modified files:
  convex/events.ts                                   # + listPublicEvents query
  convex/ticketTiers.ts                              # + getPriceRangeByEventIds query
  convex/publicEvents.test.ts                        # + contract tests for new queries
  src/app/(public)/events/page.tsx                   # Replace placeholder with listing
  src/app/(public)/page.tsx                          # Wire home page to show events
```

### References

- [Source: epics.md — Epic 5, Story 5.1 — ACs and FR31, FR24 references]
- [Source: architecture.md — FR31-35 mapping to public pages, Convex query patterns]
- [Source: architecture.md — Project structure: `(public)/` route group, `event-card.tsx` component]
- [Source: architecture.md — Schema: events table with `by_status` index, ticketTiers with `by_event_id` index]
- [Source: architecture.md — State management: `useQuery()` for server data, URL state for filters]
- [Source: ux-design-specification.md — EventCard anatomy, responsive grid, hover effects, sold-out state]
- [Source: ux-design-specification.md — Public navigation, container strategy: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`]
- [Source: convex/events.ts — `getPublicEventById` pattern for artwork URL resolution via `ctx.storage.getUrl()`]
- [Source: src/lib/utils/format.ts — `formatCurrency()`, `formatDate()` utility functions]
- [Source: src/lib/utils/constants.ts — `EVENT_TYPE_LABELS`, `EVENT_STATUSES` constants]
- [Source: src/components/layouts/public-layout.tsx — Existing PublicLayout component]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers.

### Completion Notes List

- Added `listPublicEvents` public Convex query to `convex/events.ts`: 3 parallel indexed queries (by_status) for published/on_sale/sold_out, future-only filter, sorted ascending, artwork URL resolved server-side
- Added `getPriceRangeByEventIds` public Convex query to `convex/ticketTiers.ts`: parallelized via `Promise.all` for N-event batch lookups
- Created `EventCard` component (`src/components/custom/event-card.tsx`): 16:9 artwork with `next/image`, date/type badges, venue, price range, sold-out overlay
- Split events listing into Server Component `events/page.tsx` (SSR + metadata + `preloadQuery`) + Client Component `_components/events-grid.tsx` (`usePreloadedQuery` + reactive price ranges) — satisfies NFR19
- Replaced `src/app/page.tsx` default CNA template with redirect to `/events`
- Added 26 new contract tests to `convex/publicEvents.test.ts`
- All 554 tests pass (no regressions)
- **Code review fixes applied:** H1 (SSR via preloadQuery+metadata), M1 (Promise.all in price query), M2 (indexed queries in listPublicEvents), L1 (combined imports), L2 (removed unused `time` prop), L3 (removed cursor-default from sold-out cards)

### File List

- `convex/events.ts` — `listPublicEvents` query (indexed, parallel)
- `convex/ticketTiers.ts` — `getPriceRangeByEventIds` query (parallelized)
- `src/components/custom/event-card.tsx` — new EventCard component (removed `time` prop, combined imports, fixed cursor)
- `src/app/(public)/events/page.tsx` — Server Component with SSR metadata + `preloadQuery`
- `src/app/(public)/events/_components/events-grid.tsx` — new Client Component with `usePreloadedQuery`
- `src/app/page.tsx` — redirect to `/events`
- `convex/publicEvents.test.ts` — 26 new contract tests
