# Story 2.5: Creator Events Dashboard

Status: done

## Story

As a **creator**,
I want to view and manage all my events from a dashboard,
So that I can see my event portfolio at a glance.

## Acceptance Criteria

1. **Given** I am authenticated as a creator **When** I navigate to `/dashboard/events` **Then** I see a list of all my events with title, date, status, and ticket sales summary (FR14) **And** events are sorted by date (upcoming first) **And** skeleton loading states are shown while data loads
2. **Given** I view the dashboard **When** events are displayed **Then** each event shows: title, event type, date, status badge, tickets sold / total capacity **And** I can click an event to navigate to its detail page
3. **Given** I have events in different states **When** I view the dashboard **Then** I can filter events by status (All, Draft, Published, Cancelled)
4. **Given** I view the events dashboard **When** summary metrics are displayed **Then** I see metric cards showing: total events, upcoming events, total tickets sold across all events
5. **Given** I am on the events dashboard **When** I have no events **Then** I see an empty state with "No events yet" heading and a "Create Event" CTA button

## Tasks / Subtasks

- [x] **Task 1: Create Convex query for events with ticket stats** (AC: #1, #2, #4)
  - [x] 1.1 In `convex/events.ts`, create `getMyEventsWithStats` query:
    - Args: none (uses authenticated user)
    - Auth: `getAuthenticatedUser` + `requireAnyRole(user, ["artist", "organization"])`
    - For each event: fetch ticket tiers via `by_event_id` index, compute `totalCapacity` (sum of tier quantities) and `totalSold` (sum of tier soldCounts)
    - Return events with `artworkUrl` (resolve from storage), `totalCapacity`, `totalSold`
    - Sort by date ascending (upcoming first)
  - [x] 1.2 In `convex/events.ts`, create `getMyEventsSummary` query:
    - Returns aggregate stats: `totalEvents`, `upcomingEvents` (events with future date and status not cancelled), `totalTicketsSold` (sum of all soldCounts across all tiers for user's events)
    - Auth: same as above
    - This powers the MetricCard summary section

- [x] **Task 2: Create MetricCard component** (AC: #4)
  - [x] 2.1 Create `src/components/custom/metric-card.tsx`:
    - Props: `icon: React.ReactNode`, `label: string`, `value: string | number`, `subtitle?: string`
    - Uses `Card` from shadcn/ui
    - Layout: icon (top-left, muted color), label below icon, large bold value, optional subtitle
    - Responsive: full card on desktop, compact on mobile
  - [x] 2.2 Create `src/components/custom/__tests__/metric-card.test.tsx`:
    - Renders label and value
    - Renders optional subtitle when provided
    - Does not render subtitle when omitted

- [x] **Task 3: Enhance events list page with ticket stats, filtering, and sorting** (AC: #1, #2, #3, #5)
  - [x] 3.1 Replace `getMyEvents` usage with `getMyEventsWithStats` in `src/app/(dashboard)/dashboard/events/page.tsx`
  - [x] 3.2 Add status filter tabs at top of events list:
    - Use URL searchParams (`?status=draft`) for filter state
    - Tabs: "All", "Draft", "Published", "Cancelled" (only statuses currently reachable)
    - Use `Button` components with `variant="ghost"` for inactive, `variant="secondary"` for active
    - Client-side filtering from full event list (Convex reactive queries keep data fresh)
  - [x] 3.3 Display "tickets sold / total capacity" on each event card:
    - Format: `{totalSold} / {totalCapacity} sold` — or "No tickets configured" if totalCapacity is 0
    - Position: below venue/date info
  - [x] 3.4 Update sort order to "upcoming first":
    - Backend returns events sorted by date ASC (upcoming first)
    - Events with past dates appear after upcoming events
  - [x] 3.5 Add summary MetricCard section above events list:
    - Uses `getMyEventsSummary` query
    - Three MetricCards in a responsive grid: Total Events, Upcoming Events, Total Tickets Sold
    - Icons: CalendarDays, CalendarCheck, Ticket (from lucide-react)
    - Loading: show Skeleton cards while query loads
  - [x] 3.6 Update empty state:
    - Show when filtered list has zero events
    - "No events yet" heading + "Create your first event and start selling tickets" body + "Create Event" primary CTA button
    - When filtering: "No {status} events" with no CTA (events exist but none match filter)

- [x] **Task 4: Update loading skeleton** (AC: #1)
  - [x] 4.1 Update `src/app/(dashboard)/dashboard/events/loading.tsx`:
    - Add skeleton for MetricCard grid (3 skeleton cards)
    - Add skeleton for filter tabs row
    - Keep existing event card skeletons

- [x] **Task 5: Write backend contract tests** (AC: #1, #2, #4)
  - [x] 5.1 Add to `convex/events.test.ts`:
    - `getMyEventsWithStats` contract: requires creator role, returns events with totalCapacity and totalSold fields, sorts by date ascending
    - `getMyEventsSummary` contract: requires creator role, returns totalEvents/upcomingEvents/totalTicketsSold

- [x] **Task 6: Write component and utility tests** (AC: #2, #3, #4)
  - [x] 6.1 Create `src/components/custom/__tests__/metric-card.test.tsx` (from Task 2.2)
  - [x] 6.2 Create `src/lib/utils/__tests__/event-filters.test.ts`:
    - Filter events by status
    - "All" filter returns all events
    - Empty array returns empty

- [x] **Task 7: Final validation**
  - [x] 7.1 Run `pnpm build` — must succeed
  - [x] 7.2 Run `pnpm test:run` — all tests pass
  - [x] 7.3 Run `pnpm lint` — no new errors

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `events` table with `status`, `date` fields and `by_creator_id`, `by_status` indexes. `ticketTiers` table with `by_event_id` index, `quantity`, `soldCount` fields. **REUSE** as-is.
- `convex/events.ts` — Has `createEvent`, `updateEventArtwork`, `removeEventArtwork`, `getMyEvents`, `getEventById`, `publishEvent`, `cancelEvent`, `deleteDraftEvent`. **MODIFY** to add new queries.
- `convex/ticketTiers.ts` — Has `saveTiers`, `getTiersByEventId`. **REUSE** for tier data access pattern.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)`. **REUSE**.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`, `CREATOR_ROLES`. **REUSE**.
- `src/app/(dashboard)/dashboard/events/page.tsx` — Current events list with status badges, artwork thumbnails, action buttons. **MODIFY** to add stats, filtering, metrics.
- `src/app/(dashboard)/dashboard/events/loading.tsx` — Skeleton loading. **MODIFY** to include metric skeletons.
- `src/lib/utils/constants.ts` — Has `EVENT_STATUSES`, `EVENT_STATUS_LABELS`, `EVENT_TYPES`. **REUSE**.
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatDate()`. **REUSE**.
- `src/lib/utils/event-status.ts` — `getStatusBadgeVariant()`. **REUSE**.
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showErrorFromCatch()`. **REUSE**.
- `src/components/custom/role-guard.tsx` — `<RoleGuard>`. **REUSE**.
- `src/components/ui/` — All shadcn components: Card, Badge, Button, Skeleton. **REUSE**.

### Architecture Compliance

**Convex Query Pattern (same as existing queries):**
```typescript
export const getMyEventsWithStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);
    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .order("asc") // upcoming first
      .collect();
    // For each event, get tiers and compute stats
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const tiers = await ctx.db
          .query("ticketTiers")
          .withIndex("by_event_id", (q) => q.eq("eventId", event._id))
          .collect();
        const totalCapacity = tiers.reduce((sum, t) => sum + t.quantity, 0);
        const totalSold = tiers.reduce((sum, t) => sum + t.soldCount, 0);
        const artworkUrl = event.artworkStorageId
          ? await ctx.storage.getUrl(event.artworkStorageId)
          : null;
        return { ...event, artworkUrl, totalCapacity, totalSold };
      })
    );
    return eventsWithStats;
  },
});
```

**Status Filtering Pattern — Client-Side with URL Params:**
- Use `useSearchParams()` from `next/navigation` to read filter state
- Filter the Convex query results in the component (not in the query)
- This avoids multiple Convex subscriptions and keeps the reactive query simple
- Pattern: `const filteredEvents = statusFilter === "all" ? events : events.filter(e => e.status === statusFilter)`

**MetricCard Component Pattern (from UX spec):**
- Compact anatomy: icon + label + value
- Uses shadcn `Card` component as wrapper
- Responsive grid: `grid grid-cols-2 lg:grid-cols-3 gap-4`
- Loading state: `Skeleton` matching card dimensions

**Event Status Values (lowercase, NOT PascalCase):**
The codebase uses: `"draft"`, `"published"`, `"on_sale"`, `"sold_out"`, `"completed"`, `"cancelled"`.
Filter tabs should display labels from `EVENT_STATUS_LABELS` constant.

**Sorting — "Upcoming First":**
The Convex query sorts by the `by_creator_id` index. Since Convex indexes don't support multi-field sorting natively, use `.order("asc")` on the query (sorts by `_creationTime` ASC) and then re-sort in JS:
```typescript
eventsWithStats.sort((a, b) => {
  const now = Date.now();
  const aUpcoming = a.date >= now;
  const bUpcoming = b.date >= now;
  if (aUpcoming && !bUpcoming) return -1;
  if (!aUpcoming && bUpcoming) return 1;
  return aUpcoming ? a.date - b.date : b.date - a.date; // upcoming ASC, past DESC
});
```

### UX Requirements

**MetricCard Grid:**
- 3 cards: Total Events (CalendarDays icon), Upcoming Events (CalendarCheck icon), Tickets Sold (Ticket icon)
- Desktop: 3-col grid
- Mobile: 2-col grid (3rd wraps)
- Skeleton loading: 3 skeleton cards matching metric card dimensions

**Filter Tabs:**
- Horizontal row of buttons: All | Draft | Published | Cancelled
- Active tab: `variant="secondary"`, inactive: `variant="ghost"`
- URL-persisted via `?status=draft` searchParam
- "All" is default when no searchParam

**Event Card Enhancement:**
- Add ticket stats line below existing event info: "{sold} / {capacity} sold" with Ticket icon
- If no tiers configured: show "No tickets configured" in muted text

**Empty States (from UX spec):**
- No events at all: illustration/icon + "No events yet" + "Create your first event and start selling tickets" + "Create Event" CTA
- No events matching filter: "No {status} events found" without CTA

**Loading (from UX spec):**
- Skeleton screens for metric cards, filter tabs, event cards
- Skeletons match exact layout of loaded content

### Key Decisions

- **Client-side filtering** — Filter Convex query results in the component rather than passing status to the query. Simpler and Convex reactive queries auto-update anyway.
- **URL searchParams for filter state** — Persists filter across navigation and enables sharing/bookmarking.
- **MetricCard as reusable component** — Architecture specifies `metric-card.tsx` in `components/custom/`. Will be reused in Story 2.6 (revenue view) and future admin dashboard.
- **No pagination** — Creators typically have <100 events. If performance becomes an issue, pagination can be added later.
- **Separate summary query** — `getMyEventsSummary` as its own query so MetricCards can load independently and don't block the events list.

### Previous Story Learnings

From Story 2.4 (most recent):
- **Convex ID type workaround**: Use `as any` cast for Convex ID arguments from URL params.
- **ConvexError handling**: Convex queries/mutations that throw `ConvexError` are caught by `error.tsx` boundary.
- **Client component metadata**: Use `useEffect(() => { document.title = "..." }, [])` for page titles.
- **Toast helpers**: Use `showSuccess()` and `showErrorFromCatch()`.
- **Dialog test pattern**: Use `fireEvent` + `waitFor` from `@testing-library/react` (NOT `userEvent` which is not installed).
- **Test assertions**: Use `toBeDefined()`/`toBeNull()` instead of `toBeInTheDocument()` (no jest-dom setup).
- **Badge import**: `import { Badge } from "@/components/ui/badge"` with `getStatusBadgeVariant()` for status-aware styling.
- **Code review caught**: AlertDialogAction auto-close issue — always use regular `Button` for async actions in dialogs.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files)
- Utilities: `src/lib/utils/` (kebab-case files)
- Tests co-located: `__tests__/` subdirectory with `.test.tsx`/`.test.ts` suffix
- Route pages: `src/app/(dashboard)/dashboard/events/page.tsx`

### Environment Variables Needed

No new environment variables needed. All existing Convex + Clerk config is sufficient.

### Project Structure Notes

Files to create:
```
src/components/custom/metric-card.tsx                    # CREATE: MetricCard component
src/components/custom/__tests__/metric-card.test.tsx     # CREATE: MetricCard tests
src/lib/utils/__tests__/event-filters.test.ts            # CREATE: Filter utility tests
```

Files to modify:
```
convex/events.ts                                          # MODIFY: Add getMyEventsWithStats, getMyEventsSummary queries
convex/events.test.ts                                     # MODIFY: Add dashboard query contract tests
src/app/(dashboard)/dashboard/events/page.tsx             # MODIFY: Add stats, filtering, metrics
src/app/(dashboard)/dashboard/events/loading.tsx          # MODIFY: Add metric skeletons
```

### Dependencies to Verify

No new dependencies needed. All required shadcn/ui components (Card, Badge, Button, Skeleton) are already installed. Lucide icons (CalendarDays, CalendarCheck, Ticket) are available via lucide-react (already installed).

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.5 - Creator Events Dashboard with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex reactive queries via useQuery() hook for all data fetching]
- [Source: _bmad-output/planning-artifacts/architecture.md - URL searchParams for filters, pagination, sort state management]
- [Source: _bmad-output/planning-artifacts/architecture.md - MetricCard component specified in components/custom/metric-card.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md - event-filter-bar.tsx specified for search/filter controls]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - MetricCard anatomy: icon, label, value, trend, subtitle]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Dashboard layout: 4-col metrics desktop, 2-col mobile]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - EventCard dashboard variant: compact, status badge visible]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Empty states: illustration + heading + action CTA]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Skeleton loading matches exact layout of loaded content]
- [Source: src/lib/utils/constants.ts - EVENT_STATUSES and EVENT_STATUS_LABELS already defined]
- [Source: convex/events.ts - getMyEvents query pattern for reference]
- [Source: convex/ticketTiers.ts - by_event_id index for tier lookups]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No issues encountered — clean implementation

### Completion Notes List

- Created `getMyEventsWithStats` Convex query: joins events with ticket tiers to compute totalCapacity and totalSold per event, sorts upcoming first, returns summary alongside events
- Created reusable `MetricCard` component with icon, label, value, optional subtitle
- Created `filterEventsByStatus` utility for client-side event filtering
- Enhanced events list page: MetricCard grid, status filter tabs (URL searchParams), ticket stats per event card, empty states
- Updated loading skeleton with metric card and filter tab placeholders
- All 260 tests pass (31 test files), build succeeds, lint clean

### Change Log

- 2026-03-07: Story 2.5 implementation complete — creator events dashboard with metrics, filtering, ticket stats
- 2026-03-07: Code review fixes — H1: merged summary into getMyEventsWithStats (eliminated duplicate N+1 query), M1: removed dead getMyEvents query, M2: replaced tautological contract tests, L1: added React import to metric-card.tsx

### File List

**New files:**
- src/components/custom/metric-card.tsx — MetricCard reusable component
- src/components/custom/__tests__/metric-card.test.tsx — MetricCard tests (5)
- src/lib/utils/event-filters.ts — filterEventsByStatus utility
- src/lib/utils/__tests__/event-filters.test.ts — Filter utility tests (7)

**Modified files:**
- convex/events.ts — Added getMyEventsWithStats query (returns events + summary); removed dead getMyEvents query
- convex/events.test.ts — Added dashboard query contract tests; removed dead getMyEvents tests; replaced tautological tests
- src/app/(dashboard)/dashboard/events/page.tsx — Added metrics, filtering, ticket stats, empty states; uses single query for events + summary
- src/app/(dashboard)/dashboard/events/loading.tsx — Added metric and filter skeletons
