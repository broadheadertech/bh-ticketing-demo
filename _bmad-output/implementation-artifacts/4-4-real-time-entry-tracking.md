# Story 4.4: Real-Time Entry Tracking

Status: done

## Story

As a **creator**,
I want to see how many attendees have entered my event in real time,
So that I can monitor attendance during the event.

## Acceptance Criteria

1. **Given** I am viewing my event's scanner page
   **When** tickets are being scanned at the door
   **Then** I see a real-time entry counter showing scanned / total tickets sold (FR29)
   **And** the counter updates automatically (Convex reactive subscription — updates faster than 5s on each scan)

2. **Given** the entry counter is displayed
   **When** a new scan occurs
   **Then** the counter increments on the next subscription push
   **And** the display shows "87 / 105 checked in" format (X scanned / Y total sold)

3. **Given** the event has not started yet (no tickets scanned)
   **When** I view the entry counter
   **Then** it shows "0 / [total sold] checked in"

4. **Given** I am the event creator on the scanner page
   **When** the entry counter loads
   **Then** I am authorized to see entry stats (Clerk auth in Convex query)

## Tasks / Subtasks

- [x] **Task 1: Add `getEntryStats` query to `convex/tickets.ts`** (AC: #1–#4)
  - [x] 1.1 Add a Convex `query` named `getEntryStats`:
    ```typescript
    export const getEntryStats = query({
      args: { eventId: v.string() },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthorized");
        const tickets = await ctx.db
          .query("tickets")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
          .collect();
        const total = tickets.length;
        const scanned = tickets.filter((t) => t.scannedAt !== undefined).length;
        return { scanned, total };
      },
    });
    ```
  - [x] 1.2 This query uses Clerk auth (`ctx.auth.getUserIdentity()`) — no secret arg needed since it's called from an authenticated client component
  - [x] 1.3 Uses the existing `by_event_id` index on the `tickets` table for efficient lookup (no table scan)
  - [x] 1.4 Returns `{ scanned: number, total: number }` — the minimum shape needed for the counter display

- [x] **Task 2: Create `EntryCounter` component `src/components/custom/entry-counter.tsx`** (AC: #1–#3)
  - [x] 2.1 Create a `"use client"` component that subscribes to `getEntryStats` via Convex reactive `useQuery`:
    ```typescript
    "use client";

    import { useQuery } from "convex/react";
    import { api } from "../../../convex/_generated/api";

    type Props = { eventId: string };

    export function EntryCounter({ eventId }: Props) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats = useQuery(api.tickets.getEntryStats, { eventId: eventId as any });

      if (stats === undefined) {
        return (
          <div className="rounded-lg border p-3 max-w-sm w-full text-center">
            <p className="text-muted-foreground text-sm">Loading entry count...</p>
          </div>
        );
      }

      return (
        <div className="rounded-lg border p-3 max-w-sm w-full text-center">
          <p className="text-2xl font-bold">
            {stats.scanned} / {stats.total}
          </p>
          <p className="text-sm text-muted-foreground">checked in</p>
        </div>
      );
    }
    ```
  - [x] 2.2 `useQuery` from `convex/react` provides a **reactive subscription** — the component re-renders automatically whenever ticket scan data changes in Convex (no manual polling / `setInterval` needed)
  - [x] 2.3 `stats === undefined` means the query is still loading — show a loading placeholder
  - [x] 2.4 Display format must be `"{scanned} / {total}"` with `"checked in"` label below (AC#2 format)
  - [x] 2.5 Import depth from `src/components/custom/`: `../../../convex/_generated/api` (3 levels up to project root)

- [x] **Task 3: Add `EntryCounter` to scanner page** (AC: #1)
  - [x] 3.1 Import `EntryCounter` in `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx`:
    ```typescript
    import { EntryCounter } from "@/components/custom/entry-counter";
    ```
  - [x] 3.2 Add `<EntryCounter eventId={eventId} />` to the scanner page layout, positioned below the QrScanner and result card:
    ```tsx
    return (
      <ScannerLayout title={event.title}>
        <div className="flex flex-col items-center gap-4 p-4">
          {/* Back link */}
          <div className="w-full max-w-sm">
            <Link href={`/dashboard/events/${eventId}`} ...>← Back to event</Link>
          </div>

          {/* Scanner */}
          <QrScanner onScan={handleScan} paused={isProcessing} />

          {/* Result overlay */}
          {scanResult && <ScanResultCard result={scanResult} />}

          {isProcessing && !scanResult && (
            <p className="text-sm text-muted-foreground">Verifying ticket...</p>
          )}

          {/* Entry counter — real-time via Convex reactive subscription */}
          <EntryCounter eventId={eventId} />
        </div>
      </ScannerLayout>
    );
    ```
  - [x] 3.3 `EntryCounter` is NOT wrapped in `dynamic(..., { ssr: false })` — it uses `useQuery` (not a browser-only library), so it is SSR-safe (though the parent page is already `"use client"`)

- [x] **Task 4: Write tests** (AC: #1–#3)
  - [x] 4.1 Add contract tests to `convex/tickets.test.ts` for `getEntryStats` logic:
    ```typescript
    // Pure logic: extract and test the stats computation
    function computeEntryStats(tickets: { scannedAt?: number }[]): { scanned: number; total: number } {
      return {
        total: tickets.length,
        scanned: tickets.filter((t) => t.scannedAt !== undefined).length,
      };
    }
    ```
    Tests:
    - `computeEntryStats([])` → `{ scanned: 0, total: 0 }` (empty event)
    - `computeEntryStats([{}, {}])` → `{ scanned: 0, total: 2 }` (no scans yet — AC#3)
    - `computeEntryStats([{ scannedAt: 1 }, {}])` → `{ scanned: 1, total: 2 }` (partial scans)
    - `computeEntryStats([{ scannedAt: 1 }, { scannedAt: 2 }])` → `{ scanned: 2, total: 2 }` (all scanned)
  - [x] 4.2 Add display format contract tests (pure):
    ```typescript
    function formatEntryDisplay(scanned: number, total: number): string {
      return `${scanned} / ${total}`;
    }
    ```
    Tests:
    - `formatEntryDisplay(0, 0)` → `"0 / 0"`
    - `formatEntryDisplay(87, 105)` → `"87 / 105"` (AC#2 example format)
    - `formatEntryDisplay(0, 42)` → `"0 / 42"` (AC#3 not started)
  - [x] 4.3 Auth contract test (existing pattern):
    - `getEntryStats` auth contract: throws `Unauthorized` when `getUserIdentity()` returns null
    - This follows the same pure-contract pattern as all other test files — extract and test a `requireAuth` helper
  - [x] 4.4 Use the established pure contract-testing pattern — NO module imports of actual Convex runtime — consistent with all existing test files

## Dev Notes

### Real-Time via Convex Reactive Subscription (Not Manual Polling)

The epics spec says "polling (5-second interval for MVP)". However, the architecture spec says "Entry counter: Convex reactive subscription (live updates, no polling)". Convex's `useQuery` hook IS a reactive subscription — it automatically re-subscribes and pushes updates when underlying data changes. This approach is strictly better than manual polling (instant updates instead of up to 5s delay) and does NOT require `setInterval`.

**Do NOT implement `setInterval` polling. Use `useQuery` only.**

When a ticket is scanned (`markTicketScanned` mutation runs), Convex automatically notifies all active `getEntryStats` subscriptions for that eventId, and the `EntryCounter` component re-renders with the new counts — no polling needed.

### `getEntryStats` Query: Clerk Auth Pattern

This query is called from a client component using Convex's `useQuery`, which sends the user's Clerk JWT automatically. Use `ctx.auth.getUserIdentity()` for auth — the same pattern as `getMyTickets`:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Unauthorized");
```

This is different from `getTicketByIdForScan` which uses `CONVEX_WEBHOOK_SECRET` (server-to-server). `getEntryStats` is a client-facing query, so Clerk auth applies.

### `by_event_id` Index Exists — Use It

The `tickets` table already has:
```typescript
.index("by_event_id", ["eventId"])
```
Always use `.withIndex("by_event_id", ...)` — never `.collect()` on the full table.

### Import Depth for `EntryCounter`

`src/components/custom/entry-counter.tsx` is 3 levels deep from the project root:
```typescript
import { api } from "../../../convex/_generated/api";
//                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                   3 levels up: custom → components → src → project root
```

### `EntryCounter` SSR Safety

Unlike `QrScanner` (which uses `html5-qrcode`, a browser-only library), `EntryCounter` only uses `useQuery` from `convex/react` — which is SSR-compatible. No `dynamic(..., { ssr: false })` wrapper is needed. However, the parent scanner page is already `"use client"`, so it will only render client-side regardless.

### Scanner Page Already Has `"use client"` and `eventId`

The existing `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx`:
- Already has `const eventId = params.eventId as any;` from `useParams()`
- Already has auth check done via `event.creatorId === currentUser._id`
- Just needs `<EntryCounter eventId={eventId} />` added to the JSX

### Test Pattern Consistency

All existing tests in this project use pure contract tests. For `getEntryStats`:
- Extract `computeEntryStats` as a pure function
- Test it independently — no Convex runtime imports
- Follow the exact style of `convex/tickets.test.ts` (uses `describe`/`it`/`expect` from vitest)

### File Structure

```
New files:
  src/components/custom/entry-counter.tsx              # Entry counter component

Modified files:
  convex/tickets.ts                                    # + getEntryStats query
  convex/tickets.test.ts                               # + contract tests for getEntryStats
  src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx  # + EntryCounter
```

### Previous Story Learnings (Stories 4.1–4.3)

- **All dashboard pages/components are `"use client"`** — `EntryCounter` must be `"use client"`
- **`eslint-disable-next-line @typescript-eslint/no-explicit-any`** before Convex `as any` casts for Id types
- **Convex `useQuery` from `convex/react`** for reactive client-side queries (NOT `convex/browser` ConvexHttpClient — that's for Route Handlers)
- **Pure contract-testing pattern** — extract logic functions, test those, never import actual Convex runtime or Next.js modules in tests
- **`getEntryStats` returns `undefined` while loading** — always guard for this in the component

### References

- [Source: epics.md — Epic 4, Story 4.4 — ACs and "X / Y checked in" format requirement]
- [Source: architecture.md — FR29, real-time entry tracking via Convex reactive subscriptions]
- [Source: architecture.md — line 290: "Entry counter: Convex reactive subscription (live updates, no polling)"]
- [Source: convex/schema.ts — tickets table — by_event_id index, scannedAt field]
- [Source: convex/tickets.ts — getMyTickets — Clerk auth pattern for client-facing queries]
- [Source: convex/tickets.ts — markTicketScanned — confirms scannedAt is set on scan]
- [Source: src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx — existing scanner page for EntryCounter placement]
- [Source: Story 4.3 Dev Notes — Convex auth patterns, dashboard "use client" requirement]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `getEntryStats` query to `convex/tickets.ts` — Clerk auth via `ctx.auth.getUserIdentity()`, queries tickets by `by_event_id` index, returns `{ scanned: number, total: number }`. Reactive Convex subscription automatically pushes updates when `markTicketScanned` runs — no manual polling needed.
- Created `src/components/custom/entry-counter.tsx` — `"use client"` component using `useQuery(api.tickets.getEntryStats)`. Shows "X / Y checked in" format (AC#2). Handles loading state (`stats === undefined`) with placeholder.
- Updated `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` — imported `EntryCounter` and added it below the scan result area in the scanner page layout. No `dynamic(..., { ssr: false })` needed (no browser-only library).
- Added 11 contract tests to `convex/tickets.test.ts`: auth contract (2 tests), `computeEntryStats` (5 tests covering empty/no-scans/partial/full/large-event AC#2 example), display format (4 tests covering all AC-specified formats). Pure contract testing pattern — no Convex runtime imports.
- All 531 tests pass (up from 520 — 11 new tests added).
- No new TypeScript errors introduced (pre-existing errors are from Convex codegen, pre-existing Stripe/Clerk issues).

#### Code Review Fixes (claude-opus-4-6, 2026-03-12)

- **H1 fix**: `getEntryStats` now verifies the caller is the event creator (FR29) — looks up Convex user by Clerk subject, loads event, checks `event.creatorId === user._id`. Previously only checked authentication, not authorization.
- **M1 fix**: Added `aria-live="polite"` to `EntryCounter` data container for screen reader announcements on real-time updates. Matches existing `aria-live` usage in `role-switcher.tsx`.
- **L1 fix**: Removed duplicate `checkScanQuerySecret` function in `convex/tickets.test.ts` — reuses existing `checkQuerySecret` helper.
- **L2 fix**: Extracted repeated container `className` to `containerClass` constant in `entry-counter.tsx`.
- Auth tests expanded: 5 creator-authorization contract tests replace 2 auth-only tests (net +3 tests).
- All 534 tests pass (up from 531).

### File List

- `convex/tickets.ts` (modified — added getEntryStats query; H1 fix: creator authorization)
- `convex/tickets.test.ts` (modified — added 14 contract tests for getEntryStats; L1 fix: removed duplicate helper)
- `src/components/custom/entry-counter.tsx` (created; M1 fix: aria-live; L2 fix: className constant)
- `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` (modified — added EntryCounter import and JSX)
- `_bmad-output/implementation-artifacts/4-4-real-time-entry-tracking.md` (updated — status: done)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — 4-4: review → done)
