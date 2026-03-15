# Story 11.1: Post-Event Review Submission

Status: done

## Story

As an **attendee who attended an event**,
I want to leave a rating and review,
so that I can share my experience with others.

## Acceptance Criteria

1. **AC1 — Review button:** On the "My Tickets" page, past events with a scanned ticket (verified attendance) show a "Leave a Review" button. The button does not appear if the user has already reviewed the event.

2. **AC2 — Review dialog:** Clicking "Leave a Review" opens a dialog with: star rating selector (1-5, required), optional review text (max 500 chars with counter), and submit button.

3. **AC3 — Submit review mutation:** The `submitReview` mutation verifies the user has a scanned ticket for the event, stores `eventId`, `reviewerId`, `rating` (1-5), `text`, `isVerified: true`, `createdAt`. Rejects duplicate reviews from the same user for the same event.

4. **AC4 — Attendance verification:** Users without a scanned ticket for the event cannot submit a review. The mutation throws "Only verified attendees can leave reviews".

5. **AC5 — Contract tests:** Pure contract tests validate attendance verification logic, duplicate rejection, rating validation (1-5), text length validation, and review return shape.

## Tasks / Subtasks

- [x]Task 1: Schema update — add reviews table (AC: 3)
  - [x]1.1 Add `reviews` table to `convex/schema.ts` with fields: `eventId` (v.id("events")), `reviewerId` (v.id("users")), `rating` (v.number()), `text` (v.optional(v.string())), `isVerified` (v.boolean()), `createdAt` (v.number()). Indexes: `by_event_id` on `[eventId]`, `by_event_reviewer` on `[eventId, reviewerId]`.

- [x]Task 2: Backend mutations and queries (AC: 3, 4)
  - [x]2.1 Create `convex/reviews.ts` with `submitReview` mutation. Args: `eventId: v.id("events")`, `rating: v.number()`, `text: v.optional(v.string())`. Auth: `getAuthenticatedUser`. Validate: rating 1-5 integer, text max 500 chars. Verify attendance: query tickets by `eventId` + buyer email, check at least one has `scannedAt`. Check duplicate: query reviews `by_event_reviewer`. Insert review with `isVerified: true`.
  - [x]2.2 Add `getMyReviewedEventIds` query to `convex/reviews.ts`. Auth required. Returns array of eventIds the user has reviewed (for "already reviewed" check on tickets page).

- [x]Task 3: Update tickets page + review dialog (AC: 1, 2)
  - [x]3.1 Update `getMyTickets` in `convex/tickets.ts` to also return `scannedAt` field (needed to determine review eligibility).
  - [x]3.2 Create `src/components/custom/review-dialog.tsx` with star rating selector (1-5 clickable stars using Star icon), optional text area with character counter, submit button with loading state.
  - [x]3.3 Update tickets page to show "Leave a Review" button on ticket cards where: event date is in the past, ticket has scannedAt, event is not in user's reviewed list. Use `getMyReviewedEventIds` query.

- [x]Task 4: Contract tests (AC: 5)
  - [x]4.1 Create `convex/reviews.test.ts`: attendance verification (scannedAt required), duplicate rejection, rating validation (1-5 integer, rejects 0/6/fractional), text length validation (max 500), review shape.

## Dev Notes

### Schema

```typescript
reviews: defineTable({
  eventId: v.id("events"),
  reviewerId: v.id("users"),
  rating: v.number(),
  text: v.optional(v.string()),
  isVerified: v.boolean(),
  createdAt: v.number(),
})
  .index("by_event_id", ["eventId"])
  .index("by_event_reviewer", ["eventId", "reviewerId"]),
```

### Attendance Verification

Tickets are linked by `buyerEmail`, not `buyerUserId`. To verify attendance:
1. Get user's email from auth identity
2. Query tickets by `by_event_id` for the target event
3. Filter to tickets matching user's email AND having `scannedAt` defined

### References

- Schema: [convex/schema.ts](convex/schema.ts)
- Tickets queries: [convex/tickets.ts](convex/tickets.ts)
- Auth: [convex/lib/auth.ts](convex/lib/auth.ts)
- Tickets page: [src/app/(dashboard)/dashboard/tickets/page.tsx](src/app/(dashboard)/dashboard/tickets/page.tsx)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `reviews` table to schema with `by_event_id` and `by_event_reviewer` indexes.
- Task 2: Created `convex/reviews.ts` with `submitReview` mutation (validates rating 1-5, text max 500, attendance via scanned ticket, duplicate prevention) and `getMyReviewedEventIds` query.
- Task 3: Updated `getMyTickets` to include `scannedAt` and `eventId`. Created `ReviewDialog` component with star rating selector and text area. Updated tickets page with "Leave a Review" button (past events + scanned + not reviewed) and "Reviewed" badge.
- Task 4: Created 24 contract tests in `convex/reviews.test.ts`. Total: 952 tests passing.

### Change Log

- 2026-03-15: Story 11.1 implementation complete — reviews schema, mutation, dialog, contract tests
- 2026-03-15: Code review — fixed 1 issue (1H). H1: added `by_reviewer_id` index and used it in `getMyReviewedEventIds` instead of full table scan.

### File List

**New files:**
- `convex/reviews.ts` — submitReview mutation + getMyReviewedEventIds query
- `src/components/custom/review-dialog.tsx` — Star rating dialog
- `convex/reviews.test.ts` — 24 contract tests

**Modified files:**
- `convex/schema.ts` — Added `reviews` table
- `convex/tickets.ts` — Added `scannedAt` and `eventId` to getMyTickets return
- `src/app/(dashboard)/dashboard/tickets/page.tsx` — Added review button, reviewed badge, review dialog
