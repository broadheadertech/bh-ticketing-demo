# Story 2.7: Organization Multi-Event Management

Status: done

## Story

As an **organization** account,
I want to manage multiple events under my organization profile,
So that I can run a series of events (like a racing league) from one account.

## Acceptance Criteria

1. **Given** I am authenticated with `organization` active role **When** I view my events dashboard **Then** I see all events created under my organization profile **And** events are filterable by type/category (racing, concert, seminar, class, other)

2. **Given** I create a new event as an organization **When** I view the event detail page **Then** it shows my organization profile display name and logo **And** the event is properly associated with my organization profile

3. **Given** I am an organization with multiple events **When** I view my dashboard **Then** I see aggregate metrics across all events (total tickets sold, total revenue) via the Revenue page (already implemented in Story 2.6) accessible from the sidebar

## Tasks / Subtasks

- [x] **Task 1: Add event-type/category filter to events dashboard** (AC: #1)
  - [x] 1.1 Add `filterEventsByType` function to `src/lib/utils/event-filters.ts`
  - [x] 1.2 Add `EVENT_TYPE_FILTERS` array constant to `src/lib/utils/constants.ts`
  - [x] 1.3 Add `?type=` URL param handling to `src/app/(dashboard)/dashboard/events/page.tsx`
  - [x] 1.4 Add type filter UI (buttons, same pattern as status filter) to events page
  - [x] 1.5 Apply both status AND type filters to the displayed events list

- [x] **Task 2: Show creator profile on event detail page** (AC: #2)
  - [x] 2.1 Modify `getEventById` in `convex/events.ts` to also look up and return the creator's `creatorProfile` (displayName, profilePhotoUrl) via existing `by_user_id` index
  - [x] 2.2 Update `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` to display creator profile section (avatar/logo + display name) in the event detail card

- [x] **Task 3: Write tests** (AC: #1, #2)
  - [x] 3.1 Add `filterEventsByType` unit tests to `src/lib/utils/__tests__/event-filters.test.ts`
  - [x] 3.2 Add contract test for modified `getEventById` (returns creatorProfile) to `convex/events.test.ts`

- [x] **Task 4: Final validation**
  - [x] 4.1 `pnpm build` — succeeds
  - [x] 4.2 `pnpm test:run` — all tests pass (283 passed)
  - [x] 4.3 `pnpm lint` — no new errors (pre-existing warnings only)

## Dev Notes

### What Story 2.7 Is and Is NOT

**IS:**
- Adding a second filter dimension (event type/category) to the existing events list page
- Displaying creator profile info (org name + logo) on the event detail dashboard page
- AC3 (aggregate metrics) is already satisfied by Story 2.6's Revenue page — no new code needed

**IS NOT:**
- A new "Organization" dashboard route or separate page
- A new "series" schema field (eventType = "racing" serves as the "racing series" category)
- A new Convex query for aggregates (Revenue page already handles this)
- Organization-specific nav items (current nav identical for `artist` + `organization` — this is correct, both use the same creator dashboard)

### Critical: What Previous Stories Already Built

These files exist — **REUSE, do NOT recreate:**

**Convex backend:**
- `convex/schema.ts` — `events` table has `eventType: v.string()`, `creatorId: v.id("users")`. `creatorProfiles` table has `by_user_id` index, `displayName`, `profilePhotoUrl`. **NO SCHEMA CHANGES NEEDED.**
- `convex/events.ts` — Has `getEventById`, `getMyEventsWithStats` (returns `{ events, summary }`). **MODIFY `getEventById`** to add profile join.
- `convex/creatorProfiles.ts` — Has `getProfileByUserId(userId)` query with `by_user_id` index. **DO NOT use this client-side** — join in `getEventById` server-side to avoid N+1.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)`. **REUSE**.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`. **REUSE**.

**Frontend:**
- `src/app/(dashboard)/dashboard/events/page.tsx` — Has status filter via URL `?status=`, calls `getMyEventsWithStats`, uses `filterEventsByStatus`. **MODIFY** to add type filter.
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Event detail page. **MODIFY** to show creator profile.
- `src/lib/utils/event-filters.ts` — Has `filterEventsByStatus<T>`. **ADD** `filterEventsByType<T>` using same generic pattern.
- `src/lib/utils/constants.ts` — Has `EVENT_TYPES`, `EVENT_TYPE_LABELS`, `EVENT_STATUS_LABELS`. **ADD** `EVENT_TYPE_FILTERS` array constant.
- `src/components/custom/metric-card.tsx` — **REUSE** for any metrics if needed.
- `src/components/custom/role-guard.tsx` — `<RoleGuard requiredRoles={["artist", "organization"]}>`. **REUSE**.

**Tests:**
- `src/lib/utils/__tests__/event-filters.test.ts` — Has `filterEventsByStatus` tests. **ADD** `filterEventsByType` tests.
- `convex/events.test.ts` — Has existing contract tests. **ADD** `getEventById` profile-join tests.

### Task 1: Event-Type Filter Implementation

**Pattern — same as status filter, add `?type=` param:**

```typescript
// src/lib/utils/constants.ts — ADD:
export const EVENT_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "concert", label: "Concert" },
  { value: "racing", label: "Racing" },
  { value: "seminar", label: "Seminar" },
  { value: "class", label: "Class" },
  { value: "other", label: "Other" },
];
```

```typescript
// src/lib/utils/event-filters.ts — ADD:
export function filterEventsByType<T extends { eventType: string }>(
  events: T[],
  type: string | null
): T[] {
  if (!type || type === "all") return events;
  return events.filter((e) => e.eventType === type);
}
```

**In events/page.tsx:**
```typescript
const typeFilter = searchParams.get("type") ?? "all";

// Apply BOTH filters:
const filteredEvents = events
  ? filterEventsByType(filterEventsByStatus(events, statusFilter), typeFilter)
  : undefined;

// Add type filter URL param handling:
function handleTypeFilterChange(type: string) {
  const params = new URLSearchParams(searchParams.toString());
  if (type === "all") {
    params.delete("type");
  } else {
    params.set("type", type);
  }
  router.push(`/dashboard/events${params.toString() ? `?${params.toString()}` : ""}`);
}
```

**Type filter UI pattern (below status filter, same button style):**
```tsx
<div className="flex gap-2 flex-wrap">
  {EVENT_TYPE_FILTERS.map((filter) => (
    <Button
      key={filter.value}
      variant={typeFilter === filter.value ? "secondary" : "ghost"}
      size="sm"
      onClick={() => handleTypeFilterChange(filter.value)}
    >
      {filter.label}
    </Button>
  ))}
</div>
```

**Important**: Import `filterEventsByType` from `@/lib/utils/event-filters` and `EVENT_TYPE_FILTERS` from `@/lib/utils/constants`. Add to existing import lines — do NOT create new utility files.

### Task 2: Creator Profile on Event Detail — getEventById Modification

**Pattern — join creatorProfile in the existing query handler:**

```typescript
// convex/events.ts — MODIFY getEventById handler:
export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && user.activeRole !== "admin")
      throw new ConvexError("You do not have access to this event");

    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;

    // ADD: Look up creator profile for display on event detail page
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
      .unique();

    return {
      ...event,
      artworkUrl,
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

**In event detail page — show creator profile:**
```tsx
// After the event info grid (date, time, venue, etc.) in CardContent:
{event.creatorProfile && (
  <div className="flex items-center gap-3 pt-2 border-t">
    {event.creatorProfile.profilePhotoUrl ? (
      <Image
        src={event.creatorProfile.profilePhotoUrl}
        alt={event.creatorProfile.displayName}
        width={32}
        height={32}
        className="rounded-full object-cover"
      />
    ) : (
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {event.creatorProfile.displayName.charAt(0).toUpperCase()}
        </span>
      </div>
    )}
    <span className="text-sm font-medium">{event.creatorProfile.displayName}</span>
  </div>
)}
```

**Key: Use `next/image` for the profile photo** (already imported in page.tsx for artwork).

### Task 3: Test Patterns

**filterEventsByType tests** (follow same pattern as existing filterEventsByStatus tests):
```typescript
describe("filterEventsByType", () => {
  it("returns all events when type is 'all'", () => { ... });
  it("returns all events when type is null", () => { ... });
  it("filters by exact eventType match", () => { ... });
  it("returns empty array when no events match type", () => { ... });
});
```

**getEventById contract tests** (add to convex/events.test.ts):
```typescript
describe("getEventById with creatorProfile", () => {
  it("returns creatorProfile with displayName when profile exists", () => {
    // Test that displayName and profilePhotoUrl are included in response
  });
  it("returns creatorProfile as null when no profile exists", () => {
    // Test null handling
  });
});
```

### Architecture Compliance

**Currency:** Not applicable to this story (no financial data).

**Authorization pattern:** Same as all Epic 2 stories — `getAuthenticatedUser(ctx)` + check `event.creatorId !== user._id && user.activeRole !== "admin"`.

**Convex query pattern:** JOIN via index within the same query handler (server-side join), NOT client-side by calling `getProfileByUserId` separately. This avoids N+1 and extra network round-trips.

**React component pattern:**
- `"use client"` — events page and event detail page are already client components
- Early-return for loading state (see Story 2.6 review learnings — preferred pattern)
- No new `useEffect` for data fetching — Convex reactive queries handle this

**URL state management:** Use `searchParams` + `router.push` for filter state — consistent with existing status filter in events page.

**Test standards:**
- Co-located tests: `*.test.ts` next to source OR in `__tests__/` subdirectory
- Use `describe` + `it` blocks
- Use `expect().toBe()`, `expect().toContain()`, `expect().toEqual()`
- Contract tests: test business logic/invariants in pure functions, not Convex runtime

### UX Requirements

**Events Dashboard (`/dashboard/events`) with type filter:**
- Status filter row: `[All] [Draft] [Published] [Cancelled]` (existing)
- Type filter row below: `[All Types] [Concert] [Racing] [Seminar] [Class] [Other]`
- Both filters apply simultaneously (AND logic)
- URL params: `?status=published&type=racing`
- Empty state: "No [status] [type] events found" (combine both labels if both filtered)

**Event Detail Page (`/dashboard/events/[eventId]`) creator profile section:**
- Show at the bottom of the event info card (inside `CardContent`, after the description)
- Small row: avatar (32x32 circle, fallback initial letter) + display name text
- Separated from event info by a `border-t`
- Only shown if `event.creatorProfile` is not null (guard with `&&`)

### Key Decisions

- **Client-side type filtering** — Consistent with status filter. `getMyEventsWithStats` returns all creator events; type filter is applied client-side. No new Convex query needed.
- **Server-side profile join in getEventById** — Profile fetched in same Convex query to avoid N+1 and extra roundtrip. Pattern follows `getEventSalesData` approach.
- **AC3 already done** — Revenue page (Story 2.6) already provides aggregate metrics for org accounts. Story 2.7 does NOT need to re-implement this. The sidebar nav already links to `/dashboard/revenue` for org role.
- **No schema changes** — `eventType` serves as the "series/category" concept. A racing league org creates events with `eventType: "racing"` — they filter by that type to see their "racing series."
- **No separate org dashboard** — Organization accounts use the same dashboard routes as artists. The filtering and profile display makes the experience organization-appropriate.

### Previous Story Learnings

From Story 2.6 (most recent code review — applied fixes):
- **Early-return loading pattern**: Use early return for `data === undefined` rather than inline ternary — cleaner, allows `const statusConfig = ...` before JSX.
- **Store function results in const**: Call `getStatusBadgeVariant()` once, store in `const`, use `statusConfig.variant` + `statusConfig.className`.
- **Tier sort order**: When returning ordered collections from Convex queries, sort by `sortOrder` field.
- **Test `filterEventsByStatus` already has tests** at `src/lib/utils/__tests__/event-filters.test.ts` — add `filterEventsByType` tests to same file.
- **Both status AND type filters**: When filtering with two dimensions, chain the calls: `filterEventsByType(filterEventsByStatus(events, statusFilter), typeFilter)`.
- **Contract tests test invariants**, not Convex runtime. Write pure function tests that test the business logic, not database calls.

From Story 2.5 (creator events dashboard):
- **URL params for filters**: `searchParams.get("status") ?? "all"` pattern — reuse for `?type=` param.
- **`router.push` for filter navigation**: Pattern established in events page — reuse exactly.
- **`getMyEventsWithStats` combined query** already returns all creator events with summary — no need to create separate queries for org.
- **Import `filterEventsByType` from `@/lib/utils/event-filters`** — not inline in the page component.

### File Naming Conventions

- Utilities: `src/lib/utils/` (kebab-case files, already in place)
- Tests: `src/lib/utils/__tests__/*.test.ts` (co-located in `__tests__/` subfolder)
- Convex: `convex/events.ts`, `convex/events.test.ts`
- No new component files needed for this story

### Project Structure Notes

**Files to modify:**
```
convex/events.ts                                        # MODIFY: Add creatorProfile join to getEventById
convex/events.test.ts                                   # MODIFY: Add getEventById profile-join tests
src/lib/utils/constants.ts                              # MODIFY: Add EVENT_TYPE_FILTERS
src/lib/utils/event-filters.ts                          # MODIFY: Add filterEventsByType
src/lib/utils/__tests__/event-filters.test.ts           # MODIFY: Add filterEventsByType tests
src/app/(dashboard)/dashboard/events/page.tsx           # MODIFY: Add type filter UI + logic
src/app/(dashboard)/dashboard/events/[eventId]/page.tsx # MODIFY: Show creatorProfile section
```

**No new files to create** — all changes are modifications to existing files.

### Environment Variables Needed

None — no new external services or API keys required.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.7 - Organization Multi-Event Management with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics.md - FR16: Organization accounts can manage multiple events under a single organization profile]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex function-level authorization: creators only see their own events/revenue (NFR14)]
- [Source: _bmad-output/planning-artifacts/architecture.md - URL state for filters: searchParams for filters, pagination, sort]
- [Source: convex/schema.ts - events.eventType (string), creatorProfiles.by_user_id index, profilePhotoUrl optional field]
- [Source: convex/creatorProfiles.ts - getProfileByUserId uses by_user_id index — same pattern for inline join]
- [Source: src/app/(dashboard)/dashboard/events/page.tsx - filterEventsByStatus + status filter URL param pattern to reuse]
- [Source: src/lib/utils/event-filters.ts - filterEventsByStatus generic pattern to clone for filterEventsByType]
- [Source: src/lib/utils/constants.ts - EVENT_TYPES, EVENT_TYPE_LABELS already defined — use for filter array]
- [Source: src/components/custom/sidebar-nav.tsx - organization role has Revenue nav item — AC3 already satisfied]
- [Source: _bmad-output/implementation-artifacts/2-6-event-sales-revenue-view.md - Revenue page already provides aggregate metrics for org, early-return loading pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- AC3 (aggregate metrics) confirmed satisfied by Story 2.6 Revenue page — no new code added.
- `filterEventsByType` tests added as part of Task 1 RED phase (before implementation), satisfying Task 3.1 simultaneously.
- `pnpm build` succeeded with 0 errors; 5 pre-existing warnings from generated Convex files and React Hook Form incompatibility in create-event-wizard.tsx (not introduced by this story).
- All 283 tests pass.

### Senior Developer Review

**Reviewer:** Claude Sonnet 4.6 (Adversarial Code Review)

**Issues Found:** 1 High, 3 Medium, 1 Low — All HIGH/MEDIUM fixed automatically.

- **H1 FIXED:** `<Image>` → `<img>` for `profilePhotoUrl` in `[eventId]/page.tsx` — external URLs not in `remotePatterns` (`**.convex.cloud` only); profile photos are arbitrary user-supplied URLs, not Convex storage.
- **M1 FIXED:** Early return now guards `tiers === undefined` alongside `event === undefined` — removed inline `tiers === undefined ? "Loading..." : tiers.length` ternary per Story 2.6 early-return pattern.
- **M2 FIXED:** Empty state message now uses `EVENT_TYPE_FILTERS` labels (short form: "Concert") instead of `EVENT_TYPE_LABELS` (verbose: "Concert / Gig"), avoiding awkward "No concert / gig events found" text.
- **M3 FIXED:** Non-null assertions (`!`) in contract tests replaced with optional chaining (`?.`) for safer failure messages.
- **L1 (deferred):** No `onError` image fallback for profile photo — acceptable given the `<img>` tag will gracefully collapse without breaking layout.

### File List

- `src/lib/utils/event-filters.ts` — Added `filterEventsByType` function
- `src/lib/utils/constants.ts` — Added `EVENT_TYPE_FILTERS` constant
- `src/lib/utils/__tests__/event-filters.test.ts` — Added 8 `filterEventsByType` tests + chaining test
- `src/app/(dashboard)/dashboard/events/page.tsx` — Added type filter UI, URL param handling, dual-filter logic; fixed empty state label (uses `EVENT_TYPE_FILTERS` labels)
- `convex/events.ts` — Modified `getEventById` to join `creatorProfiles` via `by_user_id` index
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Added creator profile section; fixed early return to include `tiers`; switched profile photo to `<img>` tag
- `convex/events.test.ts` — Added 4 `getEventById with creatorProfile` contract tests; fixed non-null assertions to optional chaining
