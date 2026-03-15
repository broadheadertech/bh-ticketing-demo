# Story 11.2: Review Display & Creator Ratings

Status: done

## Story

As a **user browsing events**,
I want to see ratings and reviews,
so that I can make informed decisions about attending.

## Acceptance Criteria

1. **AC1 — Event reviews section:** On the public event detail page for past events, show: average rating (stars), review count, and a list of reviews sorted by most recent. Each review shows: reviewer name, rating (stars), text, date, and "Verified Attendee" badge.

2. **AC2 — Creator aggregate rating:** On the public event detail page, the creator section shows their aggregate rating (average across all events) and total review count.

3. **AC3 — Review data privacy:** Public review queries return only `reviewerName`, `rating`, `text`, `createdAt`, `isVerified` — no internal IDs or emails leaked.

4. **AC4 — Contract tests:** Pure contract tests validate review return shape, average computation, privacy (no leaked fields), and empty state handling.

## Tasks / Subtasks

- [x]Task 1: Backend queries (AC: 1, 2, 3)
  - [x]1.1 Add `getEventReviews` query to `convex/reviews.ts` — public (no auth). Takes `eventId`. Returns reviews joined with user name, sorted desc by createdAt. Explicit fields: reviewerName, rating, text, createdAt, isVerified.
  - [x]1.2 Add `getCreatorAggregateRating` query to `convex/reviews.ts` — public. Takes `creatorId: v.id("users")`. Queries all events by creator, then all reviews for those events. Returns `{ averageRating, totalReviews }`.

- [x]Task 2: Event detail page review section (AC: 1)
  - [x]2.1 Update `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` to add a "Reviews" section below the ticket panel. Only show for past events or events with reviews. Use `getEventReviews` query. Show average stars, count, and review list.

- [x]Task 3: Creator aggregate rating on event detail (AC: 2)
  - [x]3.1 In the same event detail client component, show creator's aggregate rating next to their name using `getCreatorAggregateRating`.

- [x]Task 4: Contract tests (AC: 4)
  - [x]4.1 Append to `convex/reviews.test.ts`: public review return shape (no IDs/emails), average rating computation, empty state returns, creator aggregate across multiple events.

## Dev Notes

### References

- Reviews backend: [convex/reviews.ts](convex/reviews.ts)
- Event detail client: [src/app/(public)/events/[eventId]/_components/event-detail-client.tsx](src/app/(public)/events/[eventId]/_components/event-detail-client.tsx)
- Schema: [convex/schema.ts](convex/schema.ts)

## Dev Agent Record
### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `getEventReviews` (public, no auth, returns explicit safe fields) and `getCreatorAggregateRating` (public, aggregates across all creator events) to `convex/reviews.ts`.
- Task 2: Added ReviewsSection component to event detail page showing average stars, review count, and review list with "Verified Attendee" badges.
- Task 3: Added CreatorRating component showing aggregate stars next to creator name.
- Task 4: Added 10 contract tests for public return shape, average computation, creator aggregate, empty states.
- Code review: fixed M2 (array index as key → composite key).

### Change Log

- 2026-03-15: Story 11.2 implementation complete — review display, creator rating, contract tests
- 2026-03-15: Code review — fixed 1 issue (1M). M2: replaced array index key with composite key.

### File List

**New files:**
(none)

**Modified files:**
- `convex/reviews.ts` — Added `getEventReviews` and `getCreatorAggregateRating` queries
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — Added ReviewsSection, CreatorRating, StarRating components
- `convex/reviews.test.ts` — Added 10 contract tests for review display
