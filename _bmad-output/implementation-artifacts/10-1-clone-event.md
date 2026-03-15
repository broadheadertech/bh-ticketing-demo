# Story 10.1: Clone Event

Status: done

## Story

As a **creator**,
I want to clone an existing event,
so that I can quickly create similar events without re-entering all details.

## Acceptance Criteria

1. **AC1 — Clone mutation:** A `cloneEvent` mutation accepts `sourceEventId`. It creates a new event in `draft` status with the same title (appended " (Copy)"), description, eventType, time, venueName, venueId — but with a blank date (0) and no artwork. The creator must own the source event. Works regardless of source event status (including cancelled).

2. **AC2 — Ticket tier duplication:** All ticket tiers from the source event are duplicated to the cloned event with the same name, price, quantity, description, sortOrder — but with `soldCount: 0`.

3. **AC3 — Clone button on event detail page:** The creator event detail page shows a "Clone Event" button for all event statuses. Clicking it calls the mutation and navigates to the new cloned event's detail page. A success toast confirms the clone.

4. **AC4 — Independent behavior:** The cloned event has no link to the original. Editing or publishing the clone does not affect the original.

5. **AC5 — Contract tests:** Pure contract tests validate clone field mapping, tier duplication with reset soldCount, title suffix, date reset, and status override to draft.

## Tasks / Subtasks

- [x] Task 1: Backend cloneEvent mutation (AC: 1, 2, 4)
  - [x]1.1 Add `cloneEvent` mutation to `convex/events.ts`. Args: `sourceEventId: v.id("events")`. Auth: `getAuthenticatedUser` + `requireAnyRole(user, CREATOR_ROLES)`. Verify user owns source event (`event.creatorId === user._id`). Create new event with: `title: event.title + " (Copy)"`, `description`, `eventType`, `time`, `venueName`, `venueId` copied from source. Set `date: 0`, `status: "draft"`, `artworkStorageId: undefined`, `createdAt: Date.now()`, `updatedAt: Date.now()`. Return new event ID.
  - [x]1.2 In the same mutation handler, after inserting the event, query all ticket tiers for source event using `by_event_id` index. For each tier, insert a new tier for the cloned event with: `name`, `price`, `quantity`, `description`, `sortOrder` copied, `soldCount: 0`, `createdAt: Date.now()`, `updatedAt: Date.now()`.

- [x]Task 2: Clone button on event detail page (AC: 3)
  - [x]2.1 Add a "Clone Event" button to `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx`. Show for all event statuses. Use `Copy` icon from lucide-react. Call `cloneEvent` mutation. On success, navigate to `/dashboard/events/${newEventId}` and show success toast. Show loading state while cloning.

- [x]Task 3: Contract tests (AC: 5)
  - [x]3.1 Create `convex/cloneEvent.test.ts` with tests: cloned event copies title with " (Copy)" suffix, copies description/eventType/time/venueName/venueId, resets date to 0, sets status to "draft", does not copy artworkStorageId.
  - [x]3.2 Test tier duplication: copies name/price/quantity/description/sortOrder, resets soldCount to 0, creates new timestamps.
  - [x]3.3 Test authorization: requires creator role, requires ownership of source event.
  - [x]3.4 Test cancelled event cloning: clone of cancelled event has status "draft".

## Dev Notes

### cloneEvent Mutation Pattern

Add to `convex/events.ts` alongside existing mutations:

```typescript
export const cloneEvent = mutation({
  args: { sourceEventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const source = await ctx.db.get(args.sourceEventId);
    if (!source) throw new ConvexError("Event not found");
    if (source.creatorId !== user._id) {
      throw new ConvexError("You can only clone your own events");
    }

    const now = Date.now();

    // Create cloned event
    const newEventId = await ctx.db.insert("events", {
      creatorId: user._id,
      eventType: source.eventType,
      title: source.title + " (Copy)",
      description: source.description,
      date: 0, // Must be set by creator before publishing
      time: source.time,
      venueName: source.venueName,
      venueId: source.venueId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate ticket tiers
    const sourceTiers = await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.sourceEventId))
      .collect();

    for (const tier of sourceTiers) {
      await ctx.db.insert("ticketTiers", {
        eventId: newEventId,
        name: tier.name,
        price: tier.price,
        quantity: tier.quantity,
        description: tier.description,
        sortOrder: tier.sortOrder,
        soldCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return newEventId;
  },
});
```

### UI Pattern — Clone Button

Add to the event detail page alongside existing action buttons. Use `useRouter` for navigation:

```tsx
const cloneEvent = useMutation(api.events.cloneEvent);
const router = useRouter();

async function handleClone() {
  try {
    const newId = await cloneEvent({ sourceEventId: event._id });
    showSuccess("Event cloned successfully");
    router.push(`/dashboard/events/${newId}`);
  } catch (error) {
    showErrorFromCatch(error);
  }
}
```

### Key Constraints

- **No artwork cloning:** Storage IDs are not duplicated (creator re-uploads for new event)
- **Date reset to 0:** Forces creator to set a new date (publish validation requires future date)
- **No link to original:** No `clonedFrom` field — events are fully independent
- **Creator roles only:** `CREATOR_ROLES = ["artist", "organization"]`
- **Works on any status:** draft, published, cancelled — all clonable

### Auth Pattern

| Mutation | Auth | Role Check | Ownership |
|---|---|---|---|
| `cloneEvent` | Required | `CREATOR_ROLES` | `event.creatorId === user._id` |

### References

- Events mutations: [convex/events.ts](convex/events.ts)
- Ticket tiers: [convex/ticketTiers.ts](convex/ticketTiers.ts)
- Event detail page: [src/app/(dashboard)/dashboard/events/[eventId]/page.tsx](src/app/(dashboard)/dashboard/events/[eventId]/page.tsx)
- Auth utilities: [convex/lib/auth.ts](convex/lib/auth.ts)
- Role utilities: [convex/lib/roles.ts](convex/lib/roles.ts)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)

### File Locations

**New files:**
- `convex/cloneEvent.test.ts` — Contract tests

**Modified files:**
- `convex/events.ts` — Add `cloneEvent` mutation
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Add "Clone Event" button

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `cloneEvent` mutation to `convex/events.ts`. Copies title+" (Copy)", description, eventType, time, venueName, venueId. Resets date to 0, status to "draft", no artwork. Duplicates all ticket tiers with soldCount: 0. Requires creator role + ownership.
- Task 2: Added "Clone Event" button to event detail page with Copy icon, loading state, navigation to cloned event on success, error toast on failure. Available for all event statuses.
- Task 3: Created `convex/cloneEvent.test.ts` with 23 contract tests: field mapping (10), cancelled event cloning (2), tier duplication (4), authorization (7). Total: 928 tests passing.

### Change Log

- 2026-03-15: Story 10.1 implementation complete — clone mutation, UI button, contract tests
- 2026-03-15: Code review — fixed 2 issues (2M). M1: strip existing " (Copy)" suffix before appending to prevent stacking. M2: show "Not set" instead of epoch date for cloned events with date=0.

### File List

**New files:**
- `convex/cloneEvent.test.ts` — 23 contract tests

**Modified files:**
- `convex/events.ts` — Added `cloneEvent` mutation
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Added "Clone Event" button
