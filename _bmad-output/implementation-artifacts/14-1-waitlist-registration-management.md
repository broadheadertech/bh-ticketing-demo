# Story 14.1: Waitlist Registration & Management

Status: done

## Dev Agent Record
### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- Schema: Added `waitlistEntries` table with `by_event_id` and `by_event_email` indexes.
- Backend: Created `convex/waitlist.ts` with `joinWaitlist`, `leaveWaitlist`, `getWaitlistCount`, `isOnWaitlist` (public), `getEventWaitlist`, `notifyWaitlist` (creator). Sold-out validation, duplicate prevention, FIFO notification.
- UI: Added `SoldOutWithWaitlist` component to event detail page — shows waitlist join/leave when sold out, waitlist count badge, email input for unauthenticated users.
- Tests: 16 contract tests covering sold-out detection, duplicates, position, FIFO notification, status transitions, authorization. Total: 1039 tests.

### File List
**New files:**
- `convex/waitlist.ts`, `convex/waitlist.test.ts`

**Modified files:**
- `convex/schema.ts` — Added `waitlistEntries` table
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — Added waitlist UI for sold-out events
