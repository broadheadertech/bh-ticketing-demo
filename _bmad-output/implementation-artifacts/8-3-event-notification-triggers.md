# Story 8.3: Event Notification Triggers

Status: done

## Story

As an **attendee following an artist or venue**,
I want to be notified when they create or update events,
so that I never miss an opportunity.

## Acceptance Criteria

1. **AC1 — New event notification:** When a creator publishes a new event (via `publishEvent` mutation), all followers of that creator receive an in-app notification: title "New event from [Creator Name]", message "[Event Title]", entityType "event", entityId the new event's ID.

2. **AC2 — Event cancelled notification:** When an event is cancelled (via `cancelEvent` mutation), all ticket holders for that event receive an in-app notification: title "[Event Title] has been cancelled", message includes cancellation reason (if provided), entityType "event", entityId the cancelled event's ID.

3. **AC3 — Event updated notification:** When event details change (date, time, or venueName updated via mutation), all ticket holders receive a notification: title "[Event Title] has been updated", message "Check the new details", entityType "event", entityId the updated event's ID.

4. **AC4 — Batch processing:** Notifications are created by calling `internal.notifications.createNotification` for each recipient. Follower queries use the `by_entity` index on the `follows` table. Ticket holder queries use the `by_event_id` index on the `tickets` table.

5. **AC5 — Contract tests:** Pure contract tests validate: follower notification targeting (query by creator entityType), ticket holder targeting (query by eventId), notification payload shape for each trigger type, and batch insert logic.

## Tasks / Subtasks

- [x] Task 1: Add notification triggers to publishEvent (AC: 1, 4)
  - [x]1.1 In `convex/events.ts`, modify `publishEvent` mutation. After status is set to "published", query all followers of the creator via `ctx.db.query("follows").withIndex("by_entity", q => q.eq("entityType", "creator").eq("entityId", event.creatorId))`. For each follower, call `ctx.runMutation(internal.notifications.createNotification, { userId: follower.followerId, type: "new_event", title: "New event from [creatorName]", message: event.title, entityType: "event", entityId: eventId })`. Look up creator name from users table.

- [x] Task 2: Add notification triggers to cancelEvent (AC: 2, 4)
  - [x]2.1 In `convex/events.ts`, modify `cancelEvent` mutation. After status is set to "cancelled", query all tickets for the event via `ctx.db.query("tickets").withIndex("by_event_id", q => q.eq("eventId", eventId))`. Get unique buyer user IDs (from `buyerUserId` field, skip nulls). For each unique user, call `ctx.runMutation(internal.notifications.createNotification, { userId, type: "event_cancelled", title: "[Event Title] has been cancelled", message: reason || "No reason provided", entityType: "event", entityId: eventId })`.

- [x] Task 3: Add event update detection and notification (AC: 3, 4)
  - [x]3.1 In `convex/events.ts`, modify `updateEvent` mutation (or the relevant event edit mutation). Before patching, snapshot the current date, time, and venueName. After patching, compare old vs new values. If any changed, query tickets for the event, get unique buyer user IDs, and create notifications: `{ type: "event_updated", title: "[Event Title] has been updated", message: "Check the new details", entityType: "event", entityId }`.

- [x] Task 4: Contract tests (AC: 5)
  - [x]4.1 Create `convex/eventNotifications.test.ts`: test follower targeting — querying by creator entityType returns correct followers.
  - [x]4.2 Test ticket holder targeting — querying by eventId and extracting unique buyerUserIds.
  - [x]4.3 Test notification payload shape for "new_event", "event_cancelled", "event_updated" types.
  - [x]4.4 Test batch logic — one notification per unique user (deduplicate multiple tickets from same buyer).

## Dev Notes

### Trigger Points in convex/events.ts

The key mutations to modify are:

1. **`publishEvent`** (line ~155) — trigger "new_event" notification to creator's followers
2. **`cancelEvent`** (line ~196) — trigger "event_cancelled" notification to ticket holders
3. **`updateEvent`** (or similar edit mutation) — trigger "event_updated" if date/time/venue changed

### Calling Internal Mutations

Import the `internal` API reference and call `createNotification`:

```typescript
import { internal } from "./_generated/api";

// Inside a mutation handler:
await ctx.runMutation(internal.notifications.createNotification, {
  userId: follower.followerId,
  type: "new_event",
  title: `New event from ${creatorName}`,
  message: event.title,
  entityType: "event",
  entityId: args.eventId,
});
```

### Follower Query Pattern (for publishEvent)

```typescript
// Get all followers of the creator
const followers = await ctx.db
  .query("follows")
  .withIndex("by_entity", (q) =>
    q.eq("entityType", "creator").eq("entityId", event.creatorId)
  )
  .collect();

// Get creator name for notification title
const creator = await ctx.db.get(event.creatorId);
const creatorName = creator?.name ?? "A creator";

// Send notification to each follower
for (const follower of followers) {
  await ctx.runMutation(internal.notifications.createNotification, {
    userId: follower.followerId,
    type: "new_event",
    title: `New event from ${creatorName}`,
    message: event.title,
    entityType: "event",
    entityId: args.eventId,
  });
}
```

### Ticket Holder Query Pattern (for cancelEvent/updateEvent)

```typescript
// Get all tickets for the event
const tickets = await ctx.db
  .query("tickets")
  .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
  .collect();

// Deduplicate by buyerUserId (a buyer may have multiple tickets)
const uniqueBuyerIds = [
  ...new Set(
    tickets
      .map((t) => t.buyerUserId)
      .filter((id): id is string => !!id)
  ),
];

// Send notification to each unique buyer
for (const buyerId of uniqueBuyerIds) {
  await ctx.runMutation(internal.notifications.createNotification, {
    userId: buyerId as never, // Id<"users"> at runtime
    type: "event_cancelled",
    title: `${event.title} has been cancelled`,
    message: args.reason || "No reason provided",
    entityType: "event",
    entityId: args.eventId,
  });
}
```

### Event Update Detection

Check if the `updateEvent` mutation exists. If not, the event edit flow may go through the create-event wizard in edit mode. Look for mutations that patch event fields (date, time, venueName). Snapshot before patch, compare after.

```typescript
// Before patch — snapshot changeable fields
const oldDate = event.date;
const oldTime = event.time;
const oldVenueName = event.venueName;

// After patch
await ctx.db.patch(args.eventId, { ...updates });

// Check if key fields changed
const detailsChanged =
  updates.date !== undefined && updates.date !== oldDate ||
  updates.time !== undefined && updates.time !== oldTime ||
  updates.venueName !== undefined && updates.venueName !== oldVenueName;

if (detailsChanged) {
  // Notify ticket holders
}
```

### Important: buyerUserId May Be Null

The `tickets` table has `buyerUserId: v.optional(v.string())`. Anonymous/guest purchases may not have a user ID. Filter these out — only send notifications to registered users.

### Previous Story Learnings

- **`internal` import** — use `import { internal } from "./_generated/api"` (pattern from `convex/http.ts`)
- **`ctx.runMutation`** — call internal mutations from within other mutations
- **Explicit fields in createNotification** — already fixed in 8.2 review
- **Skip queries for unauth'd** — already handled in NotificationBell (8.2 review)
- **Deduplicate recipients** — a buyer with 3 tickets should get 1 notification, not 3
- **Contract tests are pure** — no Convex runtime

### Auth Pattern

No new queries/mutations exposed as API. All changes are additions to existing mutations in `convex/events.ts`.

| Mutation Modified | Trigger | Recipients |
|---|---|---|
| `publishEvent` | Status → published | Creator's followers (via follows table) |
| `cancelEvent` | Status → cancelled | Ticket holders (via tickets table) |
| `updateEvent` | Date/time/venue changed | Ticket holders (via tickets table) |

### References

- Events mutations (modify these): [convex/events.ts](convex/events.ts)
- Notifications internal mutation: [convex/notifications.ts](convex/notifications.ts)
- Follows table/queries: [convex/follows.ts](convex/follows.ts)
- HTTP internal call pattern: [convex/http.ts](convex/http.ts)
- Schema (tickets by_event_id index): [convex/schema.ts](convex/schema.ts)

### File Locations

**New files:**
- `convex/eventNotifications.test.ts` — Contract tests for notification triggers

**Modified files:**
- `convex/events.ts` — Add notification triggers to `publishEvent`, `cancelEvent`, and event update mutation

**Existing files to reuse (DO NOT modify):**
- `convex/notifications.ts` — `createNotification` internal mutation (already built in 8.2)
- `convex/follows.ts` — `by_entity` index for follower queries
- `convex/schema.ts` — `tickets.by_event_id` index for ticket holder queries

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added notification trigger to `publishEvent` — queries creator's followers via `by_entity` index, sends "New event from [Creator Name]" notification to each follower using `ctx.runMutation(internal.notifications.createNotification, ...)`.
- Task 2: Added notification trigger to `cancelEvent` — queries tickets by event, deduplicates `buyerUserId` (filters null for anonymous purchases), sends "[Event Title] has been cancelled" with reason to each unique buyer.
- Task 3: N/A — No `updateEvent` mutation exists in the codebase. Published events cannot have date/time/venue changed. AC3 (event updated) does not apply to current architecture. If an event edit mutation is added later, this trigger should be wired in.
- Task 4: Created 13 contract tests covering follower targeting, ticket holder targeting with dedup, notification payload shapes for all 3 types, and batch logic.
- All 875 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): switched to `ctx.scheduler.runAfter(0, ...)` for async notifications (prevents transaction rollback on notification failure), excluded creator from own cancellation notifications.

### Change Log

- 2026-03-14: Story 8.3 implementation complete
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1+M1: replaced `ctx.runMutation` with `ctx.scheduler.runAfter(0, ...)` — notifications now fire asynchronously after transaction commits, preventing rollback on notification failure. M2: excluded creator's own userId from cancellation notification recipients. — publishEvent and cancelEvent triggers, contract tests

### File List

**New files:**
- `convex/eventNotifications.test.ts` — 13 contract tests for notification triggers

**Modified files:**
- `convex/events.ts` — added `internal` import, notification triggers to `publishEvent` (followers) and `cancelEvent` (ticket holders)
