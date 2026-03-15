# Story 5.3: Event Detail Page & Social Sharing

Status: done

## Story

As a **visitor**,
I want to view a detailed event page and share it on social media,
so that I can learn about the event and invite friends.

## Acceptance Criteria

1. **AC1 — Full event details displayed:** Navigating to `/events/[eventId]` renders: artwork image, title, description, formatted date + time, venue name (when present), creator display name (with avatar when available), and ticket tiers with prices and availability.

2. **AC2 — SSR with ISR:** The page is a Server Component using `preloadQuery` for SSR data hydration, with `export const revalidate = 60` for ISR (60-second cache revalidation).

3. **AC3 — Open Graph meta tags:** The page exports `generateMetadata()` that produces: `title` (`{event title} | PHLive`), `description` (first 160 chars of event description), `openGraph.type: "article"`, `openGraph.images` (event artwork URL when available), `twitter.card: "summary_large_image"`. Works on Facebook, Twitter/X, and messaging apps.

4. **AC4 — Ticket tier display:** Each ticket tier shows: tier name, formatted PHP price (via `formatCurrency()`), availability indicator (e.g. "X remaining" or "Sold Out"), and a "Buy Tickets" or "Register" CTA button.

5. **AC5 — Sold-out tier behaviour:** Tiers where `soldCount >= quantity` show a disabled "Sold Out" button with reduced opacity. Free events show "Register" instead of "Buy Tickets". If `creatorStripeAccountId` is absent on a paid event, show "Tickets unavailable" copy (no broken checkout).

6. **AC6 — 404 for non-existent events:** Navigating to a non-existent or non-public `eventId` renders Next.js's `notFound()` page (status 404). Non-public statuses (`draft`, `completed`, `cancelled`) also 404.

## Tasks / Subtasks

- [x] Task 1: Add `getPublicEventDetailPage` Convex query (AC: 1, 2, 3, 6)
  - [x] 1.1 Add `getPublicEventDetailPage` query to `convex/events.ts` — returns `null` (not throws) when event not found or not in public statuses (`published`, `on_sale`, `sold_out`); includes `artworkUrl`, `creatorProfile`, `creatorStripeAccountId`
  - [x] 1.2 Update `getPublicTiersByEventId` in `convex/ticketTiers.ts` to accept `published | on_sale | sold_out` statuses (currently only `published`)
  - [x] 1.3 Write contract tests in `convex/publicEvents.test.ts`: `getPublicEventDetailPage` returns null for draft/cancelled/missing; returns correct shape for public statuses; `getPublicTiersByEventId` works for on_sale/sold_out

- [x] Task 2: Convert page to Server Component with `generateMetadata` and ISR (AC: 2, 3, 6)
  - [x] 2.1 Remove `"use client"` from `src/app/(public)/events/[eventId]/page.tsx`; import `preloadQuery` from `convex/nextjs`, `fetchQuery` for metadata, `notFound` from `next/navigation`
  - [x] 2.2 Add `export const revalidate = 60` for ISR
  - [x] 2.3 Add `export async function generateMetadata({ params })` using `fetchQuery(api.events.getPublicEventDetailPage, ...)` — return full OG + Twitter metadata; return minimal fallback metadata if event not found
  - [x] 2.4 In page body: `preloadQuery` both `getPublicEventDetailPage` and `getPublicTiersByEventId`; call `notFound()` if event is null
  - [x] 2.5 Pass `preloadedEvent` and `preloadedTiers` to a new `<EventDetailClient>` wrapper inside `<Suspense>`

- [x] Task 3: Create `EventDetailClient` component with improved layout (AC: 1, 4, 5)
  - [x] 3.1 Create `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` as `"use client"`; use `usePreloadedQuery` for both event and tiers
  - [x] 3.2 Implement two-column layout: event info column (left, `lg:col-span-2`) and ticket panel column (right, `lg:col-span-1`); single column on mobile
  - [x] 3.3 Event info column: artwork image (Next.js `<Image>` with `fill`/`aspect-video`); title (`text-3xl font-bold`); formatted date+time (`formatDate(event.date) · event.time`); venue name with MapPin icon (when present); creator profile row (avatar with `<Image>` if `profilePhotoUrl`, otherwise initial fallback; display name)
  - [x] 3.4 Ticket panel: section heading "Tickets"; for each tier (sorted by `sortOrder`): tier name, `formatCurrency(tier.price)` or "Free" for price=0, availability (`tier.quantity - tier.soldCount` remaining, or "Sold Out" badge); CTA button per tier (see subtask 3.5)
  - [x] 3.5 CTA button logic per tier: if `soldCount >= quantity` → disabled `<Button disabled>Sold Out</Button>`; else if `tier.price === 0` → `<FreeRegistrationCard>` trigger; else if `creatorStripeAccountId` present → `<TicketPurchaseCard>` trigger; else → `<p>Tickets not yet available</p>`
  - [x] 3.6 Add event description section (`whitespace-pre-wrap`); add share-link affordance (Copy URL button using `navigator.clipboard`)

- [x] Task 4: Write unit tests (AC: all)
  - [x] 4.1 Test OG metadata contract in a new `src/app/(public)/events/[eventId]/__tests__/metadata.test.ts`: pure function tests for tag generation logic (title truncation at 160 chars, image presence/absence, fallback when event null)
  - [x] 4.2 Test ticket tier display logic in `src/app/(public)/events/[eventId]/__tests__/ticket-tiers.test.ts`: sold-out detection (`soldCount >= quantity`), free tier detection (`price === 0`), availability count calculation, price formatting contract

## Dev Notes

### CRITICAL Architecture Change

**The existing `[eventId]/page.tsx` is `"use client"` — this MUST be converted to a Server Component.** `generateMetadata()` only works in Server Components. The current file must be rewritten, not patched.

The pattern to follow is identical to Story 5.1 (`events/page.tsx` → `events-grid.tsx`):
- **Server page** (`page.tsx`): `preloadQuery` + `generateMetadata` + `notFound()`
- **Client wrapper** (`_components/event-detail-client.tsx`): `"use client"` + `usePreloadedQuery`

### New Convex Query — `getPublicEventDetailPage`

```typescript
// convex/events.ts — add BEFORE listPublicEvents
export const getPublicEventDetailPage = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const publicStatuses = ["published", "on_sale", "sold_out"];
    const event = await ctx.db.get(args.eventId);
    if (!event || !publicStatuses.includes(event.status)) return null;
    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
      .unique();
    const creator = await ctx.db.get(event.creatorId);
    return {
      ...event,
      artworkUrl,
      creatorStripeAccountId: creator?.stripeAccountId ?? null,
      creatorProfile: creatorProfile
        ? {
            displayName: creatorProfile.displayName,
            profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null,
          }
        : null,
    };
  },
});
```

**Do NOT modify `getPublicEventById`** — it's used by the existing client component version and tests reference it in `convex/publicEvents.test.ts`. The new query is additive.

### Fix `getPublicTiersByEventId`

Current code gates on `status !== "published"` only — this means sold_out and on_sale events show no tiers. Update to:

```typescript
export const getPublicTiersByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const publicStatuses = ["published", "on_sale", "sold_out"];
    const event = await ctx.db.get(args.eventId);
    if (!event || !publicStatuses.includes(event.status)) return [];
    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});
```

### Server Page Pattern

```typescript
// src/app/(public)/events/[eventId]/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { preloadQuery, fetchQuery } from "convex/nextjs";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { EventDetailClient } from "./_components/event-detail-client";
import { EventDetailSkeleton } from "./_components/event-detail-client";

export const revalidate = 60;

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  try {
    const event = await fetchQuery(api.events.getPublicEventDetailPage, {
      eventId: eventId as Id<"events">,
    });
    if (!event) return { title: "Event Not Found | PHLive" };
    const description = event.description.slice(0, 160);
    return {
      title: `${event.title} | PHLive`,
      description,
      openGraph: {
        title: event.title,
        description,
        type: "article",
        ...(event.artworkUrl && { images: [{ url: event.artworkUrl }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: event.title,
        description,
        ...(event.artworkUrl && { images: [event.artworkUrl] }),
      },
    };
  } catch {
    return { title: "Event | PHLive" };
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const id = eventId as Id<"events">;
  const [preloadedEvent, preloadedTiers] = await Promise.all([
    preloadQuery(api.events.getPublicEventDetailPage, { eventId: id }),
    preloadQuery(api.ticketTiers.getPublicTiersByEventId, { eventId: id }),
  ]);
  // Quick null check to 404 at server level
  // (EventDetailClient will also handle null reactively)
  const initialEvent = /* will be hydrated */ preloadedEvent;
  void initialEvent; // used by Convex hydration
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetailClient
        preloadedEvent={preloadedEvent}
        preloadedTiers={preloadedTiers}
      />
    </Suspense>
  );
}
```

**Important note on `params`**: In Next.js 15 App Router, `params` is a `Promise` — always `await params` before accessing properties.

**`notFound()` pattern**: Call it inside `EventDetailClient` using `useEffect` or inside the render if event is null, OR do a preemptive `fetchQuery` in the server page for the null check. The simplest approach: if the preloaded result resolves to null in `EventDetailClient`, call `notFound()` from `next/navigation` — this works in client components since Next.js 13.4+.

Actually, preferred: do a server-side null check in `generateMetadata` and a second pass in the page body using `fetchQuery`, then call `notFound()` directly:

```typescript
export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const id = eventId as Id<"events">;
  // Fast null check before preloading
  const exists = await fetchQuery(api.events.getPublicEventDetailPage, { eventId: id });
  if (!exists) notFound();
  const [preloadedEvent, preloadedTiers] = await Promise.all([
    preloadQuery(api.events.getPublicEventDetailPage, { eventId: id }),
    preloadQuery(api.ticketTiers.getPublicTiersByEventId, { eventId: id }),
  ]);
  return (
    <Suspense fallback={<EventDetailSkeleton />}>
      <EventDetailClient preloadedEvent={preloadedEvent} preloadedTiers={preloadedTiers} />
    </Suspense>
  );
}
```

### EventDetailClient Layout Reference

```
+------------------------------------------+
| [Artwork — aspect-video, full width]      |
+------------------------+------------------+
| Event Info (2/3)       | Ticket Panel(1/3)|
|                        |                  |
| H1: Title              | "Tickets"        |
| 📅 March 14, 2026 · 8:00 PM              |
| 📍 Araneta Coliseum    | ┌──────────────┐ |
|                        | │ General Adm. │ |
| 🎤 By Creator Name     | │ ₱300.00     │ |
|                        | │ 45 remaining │ |
| [Description text]     | │ [Buy Tickets]│ |
|                        | └──────────────┘ |
| [Share: Copy Link]     | ┌──────────────┐ |
|                        | │ VIP          │ |
|                        | │ ₱800.00     │ |
|                        | │ Sold Out     │ |
|                        | │ [Sold Out ❌]│ |
|                        | └──────────────┘ |
+------------------------+------------------+
```

### Existing Components to Reuse

- `TicketPurchaseCard` (`src/components/custom/ticket-purchase-card.tsx`) — receives `eventId` + `tiers` props; handles Stripe checkout
- `FreeRegistrationCard` (`src/components/custom/free-registration-card.tsx`) — receives `eventId` + `tiers` props; handles free RSVP
- `formatDate(timestamp)` — `src/lib/utils/format.ts`
- `formatCurrency(centavos)` — `src/lib/utils/format.ts`
- `Skeleton` — `src/components/ui/skeleton`
- `Badge` — `src/components/ui/badge`
- `Button` — `src/components/ui/button`
- `MapPin` from `lucide-react` (already used in EventCard)

**Do NOT** reimport `useParams` — the client component receives preloaded data as props. No need for `useParams` in `EventDetailClient`.

### Type Safety for eventId

Convex route params arrive as `string`; Convex queries expect `Id<"events">`. Cast pattern used throughout codebase:
```typescript
import type { Id } from "../../../../../convex/_generated/dataModel";
const id = eventId as Id<"events">;
```

### OG Image Notes

- Use `artworkUrl` directly (Convex storage URL) — no need for a dynamic OG image route
- `artworkUrl` can be `null` — always guard with `event.artworkUrl ? [...] : undefined`
- Twitter card `"summary_large_image"` renders the artwork prominently in link previews
- Facebook Open Graph preview uses `og:image` — covered by `openGraph.images`

### Testing Approach

Tests follow the **pure contract pattern** established in previous stories — no Convex runtime imports.

```typescript
// Ticket tier display logic — pure functions for testing
function isSoldOut(tier: { soldCount: number; quantity: number }): boolean {
  return tier.soldCount >= tier.quantity;
}
function getAvailability(tier: { soldCount: number; quantity: number }): number {
  return Math.max(0, tier.quantity - tier.soldCount);
}
function isFree(tier: { price: number }): boolean {
  return tier.price === 0;
}
```

```typescript
// OG metadata generation — pure function for testing
function buildOgMetadata(event: { title: string; description: string; artworkUrl: string | null }) {
  const description = event.description.slice(0, 160);
  return {
    title: `${event.title} | PHLive`,
    description,
    hasImage: !!event.artworkUrl,
  };
}
```

### File Locations (relative to repo root)

- `convex/events.ts` — add `getPublicEventDetailPage` query
- `convex/ticketTiers.ts` — update `getPublicTiersByEventId` status check
- `convex/publicEvents.test.ts` — add new contract tests
- `src/app/(public)/events/[eventId]/page.tsx` — REWRITE as Server Component
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — NEW client component
- `src/app/(public)/events/[eventId]/__tests__/metadata.test.ts` — NEW test file
- `src/app/(public)/events/[eventId]/__tests__/ticket-tiers.test.ts` — NEW test file

### Project Structure Notes

- `_components/` sub-folder pattern is used by `events/` page (see `events/_components/events-grid.tsx`) — follow same convention for `[eventId]/_components/`
- `__tests__/` co-location for page-level tests — established in other stories
- Convex backend imports: `convex/*.ts` files cannot import from `src/` — no cross-boundary imports

### References

- Server Component SSR pattern: [Source: `src/app/(public)/events/page.tsx`] — `preloadQuery` + `Suspense` fallback
- `generateMetadata` with OG: [Source: `src/app/(public)/events/page.tsx`#metadata export]
- `usePreloadedQuery` client pattern: [Source: `src/app/(public)/events/_components/events-grid.tsx`]
- Convex query returning null: [Source: `convex/events.ts`#getPublicEventDetailPage design above]
- `formatCurrency` + `formatDate`: [Source: `src/lib/utils/format.ts`]
- `Id<"events">` cast: [Source: `src/app/(public)/events/[eventId]/page.tsx` current code — `params.eventId as any`]
- Ticket card components: [Source: `src/components/custom/ticket-purchase-card.tsx`, `src/components/custom/free-registration-card.tsx`]
- OG social sharing pattern from 5-1 story: [Source: `_bmad-output/implementation-artifacts/5-2-event-filtering-search.md`]
- `getPublicTiersByEventId` limitation: [Source: `convex/ticketTiers.ts:95` — only `published` status]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers.

### Completion Notes List

- Added `getPublicEventDetailPage` query to `convex/events.ts`: returns `null` (not throws) for non-public/missing events; supports `published`, `on_sale`, `sold_out` statuses; includes `artworkUrl`, `creatorProfile`, `creatorStripeAccountId`
- Updated `getPublicTiersByEventId` in `convex/ticketTiers.ts`: now accepts all three public statuses instead of only `published` — fixes missing tiers for sold-out/on-sale events
- Rewrote `src/app/(public)/events/[eventId]/page.tsx` as Server Component: removed `"use client"`, added `generateMetadata()` with full OG + Twitter meta tags (title, description truncated to 160 chars, artwork image, `og:type: article`, `twitter:card: summary_large_image`), added `export const revalidate = 60` for ISR, server-side `notFound()` via `fetchQuery` null check, `preloadQuery` for both event and tiers
- Created `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx`: `"use client"` wrapper using `usePreloadedQuery`; two-column layout (event info 2/3 + ticket panel 1/3 on desktop, stacked on mobile); artwork with Next.js `<Image priority>`; date+time with Calendar icon; venue with MapPin icon; creator profile with avatar or User icon fallback; description with `whitespace-pre-wrap`; Share button with clipboard copy + visual feedback; `EventDetailSkeleton` exported for Suspense fallback; `TicketPanel` handles all CTA variants: sold-out, free (FreeRegistrationCard), paid+Stripe (TicketPurchaseCard), paid+no-Stripe (graceful unavailable copy)
- Added 15 contract tests to `convex/publicEvents.test.ts`: `getPublicEventDetailPage` status access control (6 tests) + `getPublicTiersByEventId` updated contract (5 tests)
- Created `src/app/(public)/events/[eventId]/__tests__/metadata.test.ts`: 10 pure tests for OG tag generation logic (title format, 160-char truncation, image presence/absence, og:type, twitter card)
- Created `src/app/(public)/events/[eventId]/__tests__/ticket-tiers.test.ts`: 27 pure tests for sold-out detection, availability calc, free-event detection, allTiersSoldOut, CTA variant routing, price formatting, sort order
- All 646 tests pass (up from 595, +51 new tests, zero regressions)

### File List

- `convex/events.ts` — added `getPublicEventDetailPage` query
- `convex/ticketTiers.ts` — updated `getPublicTiersByEventId` to accept all public statuses
- `convex/publicEvents.test.ts` — added 15 new contract tests (getPublicEventDetailPage + updated getPublicTiersByEventId)
- `src/app/(public)/events/[eventId]/page.tsx` — rewritten as Server Component with generateMetadata, ISR, notFound
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — new client component with full layout
- `src/app/(public)/events/[eventId]/__tests__/metadata.test.ts` — new test file (10 tests)
- `src/app/(public)/events/[eventId]/__tests__/ticket-tiers.test.ts` — new test file (27 tests)
