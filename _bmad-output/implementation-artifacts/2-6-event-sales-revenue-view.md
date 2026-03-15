# Story 2.6: Event Sales & Revenue View

Status: done

## Story

As a **creator**,
I want to view real-time sales and revenue data for each of my events,
So that I can track how my event is performing financially.

## Acceptance Criteria

1. **Given** I am viewing an event I created **When** I navigate to the event sales page **Then** I see MetricCard components displaying: total tickets sold, total revenue (PHP), tickets remaining, and per-tier breakdown (FR15) **And** the page is accessible from the event detail page
2. **Given** ticket sales data exists **When** revenue is displayed **Then** amounts are formatted using `formatCurrency` (PHP centavos -> display format) **And** per-tier data shows: tier name, price, sold count, remaining count, tier revenue
3. **Given** no ticket sales exist yet **When** I view the sales page **Then** metrics show zero values with appropriate empty state messaging
4. **Given** I am on the dashboard **When** I click "Revenue" in the sidebar nav **Then** I see an aggregate revenue overview across all my events with per-event revenue breakdown

## Tasks / Subtasks

- [x] **Task 1: Create Convex query for single-event sales data** (AC: #1, #2, #3)
  - [x] 1.1 In `convex/events.ts`, create `getEventSalesData` query
  - [x] 1.2 In `convex/events.ts`, create `getMyEventsRevenue` query

- [x] **Task 2: Create per-event sales page** (AC: #1, #2, #3)
  - [x] 2.1 Create `src/app/(dashboard)/dashboard/events/[eventId]/sales/page.tsx`
  - [x] 2.2 Per-tier breakdown table below metrics
  - [x] 2.3 Empty state when no tiers configured
  - [x] 2.4 Zero-sales state

- [x] **Task 3: Create revenue overview page** (AC: #4)
  - [x] 3.1 Create `src/app/(dashboard)/dashboard/revenue/page.tsx`
  - [x] 3.2 Per-event revenue table below metrics
  - [x] 3.3 Empty state when no events exist
  - [x] 3.4 Create `src/app/(dashboard)/dashboard/revenue/loading.tsx`

- [x] **Task 4: Add "View Sales" link to event detail page** (AC: #1)
  - [x] 4.1 In event detail page, added "View Sales" button with BarChart3 icon for all non-draft events (published, on_sale, sold_out, completed, cancelled)

- [x] **Task 5: Create loading skeleton for sales page** (AC: #1)
  - [x] 5.1 Create `src/app/(dashboard)/dashboard/events/[eventId]/sales/loading.tsx`

- [x] **Task 6: Write backend contract tests** (AC: #1, #2)
  - [x] 6.1 Added `getEventSalesData` and `getMyEventsRevenue` contract tests to `convex/events.test.ts`

- [x] **Task 7: Write component tests** (AC: #1, #2, #3)
  - [x] 7.1 Added revenue-specific formatting tests to `src/lib/utils/format.test.ts`

- [x] **Task 8: Final validation**
  - [x] 8.1 `pnpm build` — succeeds (new routes visible in build output)
  - [x] 8.2 `pnpm test:run` — 271 tests pass (31 test files)
  - [x] 8.3 `pnpm lint` — no new errors (only pre-existing warnings)

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `events` table with `by_creator_id`, `by_status` indexes. `ticketTiers` table with `by_event_id` index, `quantity`, `soldCount`, `price` (integer centavos) fields. **REUSE** as-is. **No orders/tickets table exists yet** — revenue is computed from tier data only.
- `convex/events.ts` — Has `createEvent`, `updateEventArtwork`, `removeEventArtwork`, `getMyEventsWithStats` (returns `{ events, summary }`), `getEventById`, `publishEvent`, `cancelEvent`, `deleteDraftEvent`. **MODIFY** to add new revenue queries.
- `convex/ticketTiers.ts` — Has `saveTiers`, `getTiersByEventId`. **REUSE** for tier data access pattern.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)`. **REUSE**.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`, `CREATOR_ROLES`. **REUSE**.
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Event detail page with publish/cancel/delete actions. **MODIFY** to add "View Sales" link.
- `src/components/custom/metric-card.tsx` — Reusable MetricCard with `icon`, `label`, `value`, `subtitle?`. **REUSE**.
- `src/lib/utils/format.ts` — `formatCurrency(centavos)` converts integer centavos to `"PHP 300.00"` or `"Free"` for 0. `formatDate()`, `formatDateTime()`. **REUSE**.
- `src/lib/utils/constants.ts` — Has `EVENT_STATUS_LABELS`, `EVENT_TYPE_LABELS`. **REUSE**.
- `src/lib/utils/event-status.ts` — `getStatusBadgeVariant()`. **REUSE** for status badges in revenue table.
- `src/lib/utils/event-filters.ts` — `filterEventsByStatus()`. **REUSE** if filtering needed.
- `src/components/custom/role-guard.tsx` — `<RoleGuard>`. **REUSE**.
- `src/components/custom/sidebar-nav.tsx` — Already has "Revenue" nav item at `/dashboard/revenue` for artist and organization roles. **NO CHANGE NEEDED**.
- `src/components/ui/table.tsx` — Shadcn Table component. **REUSE** for tier breakdown and event revenue tables.

### Architecture Compliance

**Revenue Calculation Pattern (centavos arithmetic):**
```typescript
// Prices stored as integer centavos in DB (PHP 300 = 30000 centavos)
// Revenue = price * soldCount (both integers, result is centavos)
const tierRevenue = tier.price * tier.soldCount;
// Display with formatCurrency: formatCurrency(tierRevenue) → "PHP 300.00"
// Free tiers: formatCurrency(0) → "Free"
```

**Convex Query Pattern (same as getMyEventsWithStats):**
```typescript
export const getEventSalesData = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && user.activeRole !== "admin")
      throw new ConvexError("You do not have access to this event");

    const tiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Compute per-tier stats
    const tierData = tiers.map((tier) => ({
      ...tier,
      tierRevenue: tier.price * tier.soldCount,
      remaining: tier.quantity - tier.soldCount,
    }));

    // Compute totals
    const totalTicketsSold = tierData.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = tierData.reduce((sum, t) => sum + t.tierRevenue, 0);
    const totalCapacity = tierData.reduce((sum, t) => sum + t.quantity, 0);

    return {
      event: { title: event.title, status: event.status, date: event.date, eventType: event.eventType },
      tiers: tierData,
      totals: {
        totalTicketsSold,
        totalRevenue,
        totalCapacity,
        totalRemaining: totalCapacity - totalTicketsSold,
      },
    };
  },
});
```

**React Compiler Purity Rule:**
Do NOT call `Date.now()` inside component render or `useMemo`. If timestamp needed, compute in the Convex query (server-side) or use a ref/effect.

**Page Structure Pattern (from existing pages):**
```typescript
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api"; // Adjust depth per route level
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";

export default function EventSalesPage() {
  const params = useParams();
  const eventId = params.eventId as any; // Convex ID workaround
  const data = useQuery(api.events.getEventSalesData, { eventId });

  useEffect(() => {
    if (data) document.title = `${data.event.title} - Sales | PHLive`;
  }, [data]);
  // ...
}
```

**Table Component Pattern (shadcn/ui):**
```tsx
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
```

### UX Requirements

**Per-Event Sales Page Layout:**
- Back button → event detail page
- Page heading: "{Event Title} — Sales" with status badge
- MetricCard grid: 4 cards in responsive grid (`grid grid-cols-2 lg:grid-cols-4 gap-4`)
  - Total Tickets Sold (Ticket icon, number value)
  - Total Revenue (DollarSign icon, formatted PHP currency)
  - Total Capacity (Users icon, number value)
  - Tickets Remaining (Package icon, number value, subtitle: "across all tiers")
- Per-tier breakdown table below metrics
- Skeleton loading states matching layout

**Revenue Overview Page Layout (`/dashboard/revenue`):**
- Page heading: "Revenue"
- MetricCard grid: 3 cards (`grid grid-cols-2 lg:grid-cols-3 gap-4`)
  - Total Revenue (DollarSign icon, formatted PHP currency)
  - Total Tickets Sold (Ticket icon, number value)
  - Events with Sales (CalendarCheck icon, count of events with >0 sold)
- Per-event revenue table: Event Title (clickable), Status Badge, Tickets Sold, Revenue (formatted)
- Empty state: "No events yet" with "Create Event" CTA

**Currency Display Rules (from architecture):**
- All prices stored in integer centavos (PHP 300 = 30000)
- Display: `formatCurrency(centavos)` → `"PHP 300.00"` or `"Free"` for 0
- Revenue sums: sum centavos first, then format for display (avoid floating-point errors)

**Empty / Zero States:**
- No tiers configured: "No ticket tiers configured yet" + CTA for draft events
- Tiers exist but zero sales: show table with all 0s, metrics show 0 — no special empty state
- No events: "No events yet" + CTA

### Key Decisions

- **Revenue from tier data only** — No orders/transactions table exists yet (that's Epic 3). Revenue is computed as `tier.price * tier.soldCount`. This is accurate for current scope since soldCount is the source of truth.
- **Two pages, two queries** — Per-event sales (`getEventSalesData`) for detailed tier breakdown, aggregate revenue (`getMyEventsRevenue`) for the dashboard overview. Different access patterns justify separate queries.
- **Event detail links to sales** — "View Sales" button on event detail page for non-draft events. Draft events have "Configure Tickets" instead.
- **Sidebar nav already wired** — `/dashboard/revenue` route is already in sidebar-nav.tsx for artist and organization roles. Just need to create the page.
- **Table component for tier breakdown** — Not a custom component; use shadcn Table directly. Simple, tabular data display.

### Previous Story Learnings

From Story 2.5 (most recent — code review applied):
- **Combined query pattern**: `getMyEventsWithStats` returns `{ events, summary }` in a single query to avoid duplicate N+1 fetching. Apply same pattern for `getMyEventsRevenue`.
- **Dead code cleanup**: Story 2.5 review removed unused `getMyEvents` query. Don't create queries that duplicate existing ones.
- **React Compiler purity**: `Date.now()` in render/useMemo triggers lint error. Compute timestamps server-side in Convex or avoid in render path.
- **MetricCard reuse**: Import from `@/components/custom/metric-card` — already has icon, label, value, subtitle props.
- **Status filter pattern**: Client-side filtering with URL searchParams if filtering needed on revenue page.
- **Test patterns**: Use `fireEvent` + `waitFor` (NOT `userEvent`). Use `toBeDefined()`/`toBeNull()` (no jest-dom). Contract tests should test business invariants, not JS stdlib.
- **Convex ID workaround**: `params.eventId as any` for Convex ID arguments from URL.
- **getEventById access pattern**: Already checks `event.creatorId !== user._id && user.activeRole !== "admin"`. Reuse same pattern for `getEventSalesData`.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files)
- Utilities: `src/lib/utils/` (kebab-case files)
- Tests co-located: `__tests__/` subdirectory with `.test.tsx`/`.test.ts` suffix
- Route pages: `src/app/(dashboard)/dashboard/...`

### Environment Variables Needed

No new environment variables needed.

### Project Structure Notes

Files to create:
```
src/app/(dashboard)/dashboard/events/[eventId]/sales/page.tsx     # CREATE: Per-event sales page
src/app/(dashboard)/dashboard/events/[eventId]/sales/loading.tsx  # CREATE: Sales page skeleton
src/app/(dashboard)/dashboard/revenue/page.tsx                     # CREATE: Revenue overview page
src/app/(dashboard)/dashboard/revenue/loading.tsx                  # CREATE: Revenue page skeleton
```

Files to modify:
```
convex/events.ts                                                    # MODIFY: Add getEventSalesData, getMyEventsRevenue queries
convex/events.test.ts                                               # MODIFY: Add revenue query contract tests
src/app/(dashboard)/dashboard/events/[eventId]/page.tsx            # MODIFY: Add "View Sales" button
```

### Dependencies to Verify

No new dependencies needed. Shadcn Table component should already be available (`src/components/ui/table.tsx`). If not installed, run: `pnpm dlx shadcn@latest add table`. All lucide icons (DollarSign, Ticket, Users, Package, BarChart3, CalendarCheck) are available via lucide-react (already installed).

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.6 - Event Sales & Revenue View with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md - Currency stored as integer centavos, displayed via Intl.NumberFormat('en-PH')]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex function-level authorization: creators only see their own events/revenue (NFR14)]
- [Source: _bmad-output/planning-artifacts/architecture.md - MetricCard component in components/custom/metric-card.tsx]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Creator confidence: real-time sales data, clear revenue breakdowns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Trust through transparency: show the math (revenue breakdowns, fees)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Shopify dashboard pattern: today's sales, total revenue, upcoming events immediately]
- [Source: src/lib/utils/format.ts - formatCurrency(centavos) already implemented for PHP currency]
- [Source: src/components/custom/sidebar-nav.tsx - Revenue nav item at /dashboard/revenue already defined]
- [Source: convex/events.ts - getMyEventsWithStats combined query pattern (returns { events, summary })]
- [Source: convex/ticketTiers.ts - by_event_id index for tier lookups, price/soldCount/quantity fields]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 8 tasks completed successfully
- Two new Convex queries: `getEventSalesData` (per-event tier breakdown + totals) and `getMyEventsRevenue` (aggregate across all creator events)
- Per-event sales page at `/dashboard/events/[eventId]/sales` with MetricCard grid + tier breakdown table
- Revenue overview page at `/dashboard/revenue` with MetricCard grid + per-event revenue table
- "View Sales" button added to event detail page for published events (BarChart3 icon)
- Loading skeletons for both new pages
- 12 new contract tests for revenue queries (access control, revenue computation, sorting, edge cases)
- 2 new format tests for large revenue amounts
- Final validation: build succeeds, 271 tests pass, 0 lint errors

### Senior Developer Review (AI) — ringmaster, 2026-03-11

**Outcome: APPROVED (with fixes applied)**

Issues found and fixed in this review:

- **[HIGH] View Sales button only showed for `published` status** — Story Task 4.1 specified all non-draft statuses (on_sale, sold_out, completed, cancelled). Fixed by switching to `showSalesLink = !isDraft` condition in `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx`.
- **[HIGH] Tiers not sorted by `sortOrder` in `getEventSalesData`** — Tier display order was insertion-order only. Fixed by adding `.sort((a, b) => a.sortOrder - b.sortOrder)` before `.map()` in `convex/events.ts`.
- **[MEDIUM] `getStatusBadgeVariant` called twice per render in sales page** — Refactored sales page to use early-return pattern for loading state, enabling a single `const statusConfig = ...` before the JSX.
- **[MEDIUM] Cancelled events not visually differentiated in revenue table** — Added `opacity-50` Tailwind class to `<TableRow>` for cancelled events in `src/app/(dashboard)/dashboard/revenue/page.tsx`.

Post-fix validation: 271 tests pass, 0 lint errors, clean Next.js build.

### Change Log

- `convex/events.ts` — Added `getEventSalesData` and `getMyEventsRevenue` queries; fixed tier sort order
- `convex/events.test.ts` — Added contract tests for both new queries (12 tests)
- `src/app/(dashboard)/dashboard/events/[eventId]/sales/page.tsx` — Created per-event sales page; refactored to early-return loading pattern
- `src/app/(dashboard)/dashboard/events/[eventId]/sales/loading.tsx` — Created sales page skeleton
- `src/app/(dashboard)/dashboard/revenue/page.tsx` — Created revenue overview page; added cancelled event visual differentiation
- `src/app/(dashboard)/dashboard/revenue/loading.tsx` — Created revenue page skeleton
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Added "View Sales" button for all non-draft events
- `src/lib/utils/format.test.ts` — Added revenue formatting tests

### File List

Created:
- `src/app/(dashboard)/dashboard/events/[eventId]/sales/page.tsx`
- `src/app/(dashboard)/dashboard/events/[eventId]/sales/loading.tsx`
- `src/app/(dashboard)/dashboard/revenue/page.tsx`
- `src/app/(dashboard)/dashboard/revenue/loading.tsx`

Modified:
- `convex/events.ts`
- `convex/events.test.ts`
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx`
- `src/lib/utils/format.test.ts`
