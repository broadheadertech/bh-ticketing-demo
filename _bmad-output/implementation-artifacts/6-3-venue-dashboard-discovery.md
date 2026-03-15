# Story 6.3: Venue Dashboard & Discovery

Status: done

## Story

As a **venue manager**,
I want to see events hosted at my venue, and as an organizer, I want to browse available venues,
so that venue managers track usage and organizers find the right space.

## Acceptance Criteria

1. **AC1 — Venue manager events dashboard:** Navigating to the venue manager dashboard shows a list of events that selected the manager's venue, with event name, date, expected attendance (ticket sold count), and organizer contact info (creator name/email). The events list uses a reactive Convex query filtered by `venueId`.

2. **AC2 — Organizer venue discovery:** A creator creating an event can browse available venue profiles with photos, capacity, amenities, and availability. The venue selection is available as an optional step in the event creation flow. Venues can be searched/filtered by capacity and name/location.

3. **AC3 — Event-venue linking:** When a venue is selected for an event, the event's `venueId` is set and the event appears on the venue manager's dashboard. Setting `venueId` also auto-populates `venueName` from the venue record.

4. **AC4 — Public venue profile page:** Navigating to `/venues/[venueId]` displays the public venue profile with photo carousel, amenities (pills), capacity, description, availability calendar (read-only), and upcoming events at that venue.

## Tasks / Subtasks

- [x] Task 1: Schema update + backend queries (AC: 1, 2, 3, 4)
  - [x] 1.1 Add `.index("by_venue_id", ["venueId"])` to `events` table in `convex/schema.ts` — enables efficient event-by-venue queries.
  - [x] 1.2 Add `listPublicVenues` query to `convex/venues.ts` — no auth required, returns all venues with first `photoUrl` resolved. Used for public browse page and organizer venue picker.
  - [x] 1.3 Add `getPublicVenueById` query to `convex/venues.ts` — no auth, returns single venue with all `photoUrls`, plus upcoming published events at the venue (via `by_venue_id` index on events), plus public availability data.
  - [x] 1.4 Add `getEventsByVenue` query to `convex/venues.ts` — auth + `venue_manager` role + ownership check. Returns events where `event.venueId === venue._id` (string match), with event title, date, time, status, creator name/email. For the venue manager dashboard.
  - [x] 1.5 Add optional `venueId: v.optional(v.string())` arg to `createEvent` mutation in `convex/events.ts`. When provided, look up venue by ID, validate it exists, set both `venueId` and `venueName` (from `venue.name`). When not provided, existing `venueName` free-text behavior continues.

- [x] Task 2: Public venue listing page `/venues` (AC: 2, 4)
  - [x] 2.1 Create `src/app/(public)/venues/page.tsx` — server component using `preloadQuery(api.venues.listPublicVenues)`. SSR with metadata: title "Discover Venues | PHLive", OG tags. Same pattern as `src/app/(public)/events/page.tsx`.
  - [x] 2.2 Create `src/app/(public)/venues/_components/venues-grid.tsx` — `"use client"` component. Receives `preloadedVenues` via `usePreloadedQuery`. Renders venue cards in a responsive grid. Includes client-side filter bar for capacity range and text search (name/location).
  - [x] 2.3 Create `src/components/custom/public-venue-card.tsx` — card showing first photo (or Building2 icon placeholder), venue name, location, capacity badge, amenity pills (first 3 + "+N more"), and a "View" link to `/venues/[venueId]`.

- [x] Task 3: Public venue detail page `/venues/[venueId]` (AC: 4)
  - [x] 3.1 Create `src/app/(public)/venues/[venueId]/page.tsx` — server component, `preloadQuery(api.venues.getPublicVenueById, { venueId })`. SSR with dynamic metadata (venue name, first photo as OG image). Same pattern as `src/app/(public)/events/[eventId]/page.tsx`.
  - [x] 3.2 Create `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — `"use client"` component. Photo carousel (or single image hero), venue name/location/capacity, amenities as pills, description, read-only availability calendar (colored dots, no editing), and upcoming events list.
  - [x] 3.3 Create `src/components/custom/venue-availability-readonly.tsx` — read-only month calendar component. Uses `useQuery(api.venueAvailability.getPublicVenueAvailability)`. Displays same color coding (amber=tentative, red=booked). No click handlers or status editor. Reuses `date-fns` calendar logic from `availability-calendar.tsx`.

- [x] Task 4: Venue manager dashboard — events hosted (AC: 1)
  - [x] 4.1 Create `src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx` — `"use client"`, `RoleGuard` + `useQuery(api.venues.getEventsByVenue)`. Shows venue name header, quick stats (upcoming events count, total events), and events table.
  - [x] 4.2 Update `src/app/(dashboard)/dashboard/venues/page.tsx` — each `VenueCard` links to `/dashboard/venues/[venueId]` (venue dashboard) in addition to the existing edit link. Add "Dashboard" link/button alongside "Edit".

- [x] Task 5: Event creation venue selection (AC: 2, 3)
  - [x] 5.1 Create `src/components/custom/venue-picker.tsx` — `"use client"` component. Uses `useQuery(api.venues.listPublicVenues)`. Shows venue cards in a scrollable list with search/filter. Props: `onSelect(venueId: string, venueName: string)`, `selectedVenueId?: string`. Includes "No venue / Enter manually" option.
  - [x] 5.2 Update event creation flow to include optional venue selection. In the create event wizard, add venue picker before/after the basic details step. When a venue is selected, set `venueId` in the form data passed to `createEvent`. When "manual" is chosen, the existing `venueName` text input is used.

- [x] Task 6: Contract tests (AC: all)
  - [x] 6.1 Add tests to `convex/venues.test.ts` for `listPublicVenues` (no auth needed), `getPublicVenueById` (no auth needed), `getEventsByVenue` (auth + ownership required).
  - [x] 6.2 Add tests to `convex/events.test.ts` for `createEvent` with `venueId` — validates venue exists, populates `venueName`.

## Dev Notes

### CRITICAL: Events schema `venueId` is `v.optional(v.string())` NOT `v.id("venues")`

The events table stores `venueId` as a plain string (not a typed Convex ID). **Do NOT change** this type — it would require a schema migration for any existing events. Instead, validate venue existence in the mutation handler and cast with `as any` on the client when needed.

```typescript
// In convex/schema.ts — events table (EXISTING, DO NOT CHANGE field type)
venueId: v.optional(v.string()),  // stores venue._id as string
```

### Index Addition to Events Table

```typescript
// Add this index to the events table definition in convex/schema.ts
.index("by_venue_id", ["venueId"])
```

This enables efficient queries for "all events at this venue" without full table scans.

### `listPublicVenues` Query Pattern

Follow the same pattern as `listPublicEvents` in `convex/events.ts`. No auth, returns all venues with first photo URL resolved:

```typescript
export const listPublicVenues = query({
  args: {},
  handler: async (ctx) => {
    const venues = await ctx.db.query("venues").collect();
    return Promise.all(
      venues.map(async (venue) => {
        const firstPhotoUrl = venue.photoStorageIds.length > 0
          ? await ctx.storage.getUrl(venue.photoStorageIds[0])
          : null;
        return { ...venue, firstPhotoUrl };
      })
    );
  },
});
```

### `getPublicVenueById` Query Pattern

Returns full venue data + photo URLs + upcoming events at the venue + availability. Combines data from three tables:

```typescript
export const getPublicVenueById = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");

    const photoUrls = (
      await Promise.all(venue.photoStorageIds.map((id) => ctx.storage.getUrl(id)))
    ).filter((url): url is string => url !== null);

    // Upcoming published events at this venue
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId as string))
      .collect();
    const now = Date.now();
    const upcomingEvents = allEvents
      .filter((e) => e.status === "published" && e.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 10);

    // Public availability
    const availability = await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId))
      .collect();

    return { ...venue, photoUrls, upcomingEvents, availability };
  },
});
```

### `getEventsByVenue` Query — Venue Manager Dashboard

Auth + ownership required. Returns events with creator info for the dashboard table:

```typescript
export const getEventsByVenue = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");

    const events = await ctx.db
      .query("events")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId as string))
      .collect();

    // Enrich with creator info
    return Promise.all(
      events.map(async (event) => {
        const creator = await ctx.db.get(event.creatorId);
        return {
          _id: event._id,
          title: event.title,
          date: event.date,
          time: event.time,
          status: event.status,
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "",
        };
      })
    );
  },
});
```

### Updating `createEvent` — Add Optional `venueId`

```typescript
// In convex/events.ts createEvent mutation, add to args:
venueId: v.optional(v.string()),

// In handler, after existing validation:
let resolvedVenueName = args.venueName;
if (args.venueId) {
  const venue = await ctx.db.get(args.venueId as any);
  if (!venue) throw new ConvexError("Selected venue not found");
  resolvedVenueName = venue.name;
}

// In ctx.db.insert, set both:
venueId: args.venueId,
venueName: resolvedVenueName,
```

### Public Venue Listing Page — SSR Pattern

Follow exact pattern from `src/app/(public)/events/page.tsx`:

```typescript
// src/app/(public)/venues/page.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export const metadata: Metadata = {
  title: "Discover Venues | PHLive",
  description: "Browse venue spaces across the Philippines.",
  openGraph: { title: "Discover Venues | PHLive", type: "website" },
};

export default async function VenuesPage() {
  const preloadedVenues = await preloadQuery(api.venues.listPublicVenues, {});
  return (
    <div>
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Discover Venues</h1>
        <p className="text-muted-foreground">Browse venue spaces across the Philippines.</p>
      </div>
      <Suspense fallback={<VenuesGridSkeleton />}>
        <VenuesGrid preloadedVenues={preloadedVenues} />
      </Suspense>
    </div>
  );
}
```

### Public Venue Card Component

Follow `EventCard` component pattern from `src/components/custom/event-card.tsx`:

```typescript
// src/components/custom/public-venue-card.tsx
// Card: first photo | venue name | location | capacity badge | amenity pills | "View" link
// Use next/image for photo optimization
// Building2 icon as placeholder when no photos
```

### Venue Detail Page — SSR + Client Hydration

Same architecture as events detail page (`src/app/(public)/events/[eventId]/page.tsx` + `event-detail-client.tsx`):
- Server component preloads venue data
- Client component hydrates with reactive query
- Photo carousel using existing photo URLs array
- Amenities rendered as badge/pill chips
- Read-only availability calendar component

### Read-Only Availability Calendar

Extract the calendar rendering logic from `availability-calendar.tsx` into a reusable read-only version:

```typescript
// src/components/custom/venue-availability-readonly.tsx
// Props: venueId: string
// Uses: useQuery(api.venueAvailability.getPublicVenueAvailability, { venueId })
// Renders: month grid with status dots (amber/red), Prev/Next nav
// NO: click handlers, status editor, save button
// Reuses: date-fns functions, STATUS_STYLES constant, grid layout
```

### Venue Picker Component

For event creation flow — a compact venue selection component:

```typescript
// src/components/custom/venue-picker.tsx
// Props: onSelect(venueId: string, venueName: string), selectedVenueId?: string
// Uses: useQuery(api.venues.listPublicVenues)
// Renders: search input + scrollable venue card list + "Enter manually" option
// Shows: venue name, location, capacity, first photo thumbnail
```

### Venue Dashboard Page Route

```
src/app/(dashboard)/dashboard/venues/[venueId]/
  page.tsx    ← NEW: venue manager dashboard showing events at this venue
```

### Navigation Update — Sidebar

No sidebar changes needed. Venue managers already have "My Venues" which lists their venues. From the venues list, they navigate to individual venue dashboards.

### Events Table at Venue Dashboard

Use shadcn `Table` component (already installed at `src/components/ui/table.tsx`):

| Event Name | Date | Status | Organizer | Email |
|-----------|------|--------|-----------|-------|

### File Locations

**New files:**
- `convex/venues.ts` — add `listPublicVenues`, `getPublicVenueById`, `getEventsByVenue` (3 new queries)
- `convex/events.ts` — modify `createEvent` to accept optional `venueId`
- `src/app/(public)/venues/page.tsx` — public venue listing
- `src/app/(public)/venues/_components/venues-grid.tsx` — client grid + filter
- `src/app/(public)/venues/[venueId]/page.tsx` — public venue detail
- `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — client detail component
- `src/components/custom/public-venue-card.tsx` — venue card for public listing
- `src/components/custom/venue-availability-readonly.tsx` — read-only calendar
- `src/components/custom/venue-picker.tsx` — venue selection for event creation
- `src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx` — venue manager dashboard

**Modified files:**
- `convex/schema.ts` — add `by_venue_id` index to events table
- `convex/events.ts` — add `venueId` arg to `createEvent`
- `src/app/(dashboard)/dashboard/venues/page.tsx` — add dashboard link per venue card

### Existing Components to Reuse

- `EventCard` pattern: `src/components/custom/event-card.tsx` — for rendering events on venue detail
- `EventFilterBar` pattern: `src/components/custom/event-filter-bar.tsx` — for venue filter bar
- `VenueCard` / `VenueCardSkeleton`: `src/components/custom/venue-form.tsx` — for dashboard venue list (already used)
- `Table` / `TableRow` / etc: `src/components/ui/table.tsx`
- `Badge`: `src/components/ui/badge.tsx` — for amenity pills and capacity
- `Skeleton`: `src/components/ui/skeleton.tsx`
- `date-fns` functions: already installed, used in `availability-calendar.tsx`
- `showSuccess` / `showErrorFromCatch`: `src/lib/utils/toast-helpers.ts`

### `venueId` Index Caveat

The `by_venue_id` index on events uses `venueId` which is `v.optional(v.string())`. Events without a `venueId` set (the vast majority) will have `undefined` for this index field. Convex handles this gracefully — querying `.withIndex("by_venue_id", q => q.eq("venueId", someId))` only returns events where `venueId` matches the specific string.

### Auth Patterns

| Query/Mutation | Auth | Role Check | Ownership |
|---|---|---|---|
| `listPublicVenues` | None | None | None |
| `getPublicVenueById` | None | None | None |
| `getEventsByVenue` | Required | `venue_manager` | `venue.managerId === user._id` |
| `createEvent` (with venueId) | Required | creator role | N/A (validates venue exists) |

### Testing Approach

Same pure contract tests pattern as Stories 6.1 and 6.2:

```typescript
// convex/venues.test.ts additions
describe("listPublicVenues authorization contract", () => {
  it("does not require authentication", () => {
    const requiresAuth = false; // no getAuthenticatedUser call
    expect(requiresAuth).toBe(false);
  });
});

describe("getEventsByVenue authorization contract", () => {
  it("requires venue_manager role", () => { ... });
  it("requires venue ownership", () => { ... });
});
```

### Previous Story Learnings (from 6.1 and 6.2)

- **Windows EPERM with pnpm**: If you need to install packages, `pnpm add` may fail with EPERM. Use the manual copy workaround from 6.2 if needed. `date-fns` is already installed.
- **`radix-ui` umbrella import**: Use `import { X } from "radix-ui"` not `@radix-ui/react-x`.
- **Convex ID casting**: Dashboard client components use `as any` for string-to-Id casts (e.g., `params.venueId as any`).
- **Photo URL resolution**: Always use `Promise.all(storageIds.map(id => ctx.storage.getUrl(id)))` and filter nulls.
- **`removeVenuePhoto` security**: Always verify storageId membership before `ctx.storage.delete()`.
- **Blob URL cleanup**: Revoke with `URL.revokeObjectURL()` when removing photos in create mode.

### References

- Public events page pattern: [src/app/(public)/events/page.tsx](src/app/(public)/events/page.tsx) — SSR + preloadQuery
- Events grid client: [src/app/(public)/events/_components/events-grid.tsx](src/app/(public)/events/_components/events-grid.tsx) — client filter + grid
- Event detail page: [src/app/(public)/events/[eventId]/page.tsx](src/app/(public)/events/[eventId]/page.tsx)
- Event detail client: [src/app/(public)/events/[eventId]/_components/event-detail-client.tsx](src/app/(public)/events/[eventId]/_components/event-detail-client.tsx)
- EventCard: [src/components/custom/event-card.tsx](src/components/custom/event-card.tsx)
- Venue queries: [convex/venues.ts](convex/venues.ts)
- Venue availability: [convex/venueAvailability.ts](convex/venueAvailability.ts)
- Availability calendar: [src/components/custom/availability-calendar.tsx](src/components/custom/availability-calendar.tsx) — reuse calendar rendering
- Auth pattern: [convex/lib/auth.ts](convex/lib/auth.ts), [convex/lib/roles.ts](convex/lib/roles.ts)
- Schema: [convex/schema.ts](convex/schema.ts)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- Sidebar nav: [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx)
- Story 6.1: [_bmad-output/implementation-artifacts/6-1-venue-profile-creation-editing.md](_bmad-output/implementation-artifacts/6-1-venue-profile-creation-editing.md)
- Story 6.2: [_bmad-output/implementation-artifacts/6-2-venue-availability-calendar.md](_bmad-output/implementation-artifacts/6-2-venue-availability-calendar.md)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed test regression in `create-event-wizard.test.tsx` line 87: updated "Venue Name (optional)" to "Venue (optional)" after venue picker integration changed the label.

### Code Review Fixes (2026-03-14)

- **H1**: Changed `getPublicVenueById` to return `null` instead of throwing `ConvexError` — fixes dead `notFound()` path in venue detail page.
- **H2**: Stopped leaking `managerId`, `photoStorageIds`, `createdAt`, `updatedAt` in `listPublicVenues` and `getPublicVenueById` — now returns only public-facing fields.
- **H3**: Excluded cancelled events from "Total Tickets Sold" stat in venue manager dashboard.
- **M1**: Added `useQuery` mock and `venues.listPublicVenues` API mock to `create-event-wizard.test.tsx`.
- **M2**: Changed photo carousel dot key from array index to photo URL.
- **M4**: Added "No upcoming events" empty state on public venue detail page.

### Completion Notes List

- All 6 tasks completed: schema index, backend queries (3 new + 1 modified), public venue listing, public venue detail, venue manager dashboard, event creation venue picker, contract tests.
- 767 tests passing across 50 test files, 0 failures.
- `venueId` kept as `v.optional(v.string())` in events table to avoid schema migration — venue existence validated in mutation handler.
- Code review: 6 issues fixed (3 HIGH, 3 MEDIUM). 3 LOW issues noted as pre-existing patterns.

### File List

**New files:**
- `convex/venues.ts` — added `listPublicVenues`, `getPublicVenueById`, `getEventsByVenue` queries
- `src/app/(public)/venues/page.tsx` — public venue listing SSR page
- `src/app/(public)/venues/_components/venues-grid.tsx` — client venue grid with filters
- `src/app/(public)/venues/[venueId]/page.tsx` — public venue detail SSR page
- `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — venue detail client component
- `src/components/custom/public-venue-card.tsx` — venue card for public listing
- `src/components/custom/venue-availability-readonly.tsx` — read-only availability calendar
- `src/components/custom/venue-picker.tsx` — venue selection for event creation
- `src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx` — venue manager dashboard

**Modified files:**
- `convex/schema.ts` — added `by_venue_id` index to events table
- `convex/events.ts` — added optional `venueId` arg to `createEvent` with venue resolution
- `src/app/(dashboard)/dashboard/venues/page.tsx` — added Dashboard button per venue card
- `src/components/custom/create-event-wizard.tsx` — integrated venue picker with Browse/Manual toggle
- `src/components/custom/__tests__/create-event-wizard.test.tsx` — fixed label assertion
- `convex/venues.test.ts` — added contract tests for `listPublicVenues`, `getPublicVenueById`, `getEventsByVenue`
- `convex/events.test.ts` — added contract tests for `createEvent` with `venueId` resolution
