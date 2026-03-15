# Story 12.2: Staff Scanner Page

Status: done

## Story

As a **staff member assigned to an event**,
I want to scan tickets at my assigned event,
so that I can manage entry at my gate.

## Acceptance Criteria

1. **AC1 — Staff assignments page:** Already built in 12.1. Staff sees assigned events with "Open Scanner" link.

2. **AC2 — Scanner authorization:** The scanner page allows both the event creator AND assigned staff to access. Staff cannot access events they're not assigned to.

3. **AC3 — Scan behavior:** The scanner works identically for staff and creators — same QR validation, signature verification, entry tracking.

4. **AC4 — Contract tests:** Validate scanner authorization logic (creator OR staff, not unassigned users).

## Tasks / Subtasks

- [x]Task 1: Scanner authorization query (AC: 2)
  - [x]1.1 Add `canScanEvent` query to `convex/staff.ts`. Takes `eventId`. Returns `{ authorized: true, eventTitle }` if user is creator OR has a staffAssignment for the event. Returns `{ authorized: false }` otherwise.

- [x]Task 2: Update scanner page (AC: 2, 3)
  - [x]2.1 Update scanner page to use `canScanEvent` instead of `getPublicEventById` + creator check. Remove the creator-only authorization logic.

- [x]Task 3: Contract tests (AC: 4)
  - [x]3.1 Append to `convex/staff.test.ts`: scanner authorization tests (creator access, assigned staff access, unassigned user rejected).

## Dev Notes

### References
- Scanner page: [src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx](src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx)
- Scan API: [src/app/api/scan/route.ts](src/app/api/scan/route.ts)
- Staff queries: [convex/staff.ts](convex/staff.ts)

## Dev Agent Record
### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `canScanEvent` query to `convex/staff.ts` — returns authorized + eventTitle if user is creator OR assigned staff.
- Task 2: Updated scanner page to use `canScanEvent` instead of creator-only check. Removed `getPublicEventById` + `getCurrentUser` dependency. Updated unauthorized message.
- Task 3: Added 5 scanner authorization contract tests. Total: 984 tests passing.

### Change Log

- 2026-03-15: Story 12.2 implementation complete — scanner authorization for staff, contract tests

### File List

**Modified files:**
- `convex/staff.ts` — Added `canScanEvent` query
- `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` — Updated authorization to allow staff
- `convex/staff.test.ts` — Added 5 scanner authorization tests
