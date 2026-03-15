# Story 9.1: Stripe Refund on Event Cancellation

Status: done

## Story

As a **ticket holder**,
I want to automatically receive a refund when an event is cancelled,
so that I don't have to request it manually.

## Acceptance Criteria

1. **AC1 — Automatic refund initiation:** When a creator cancels a published event with ticket sales, the system retrieves all tickets for the event, groups them by `stripeSessionId`, and initiates a Stripe refund for each unique paid session via a server action.

2. **AC2 — Refund status tracking:** When a Stripe refund succeeds, the ticket records are updated with `refundStatus: "refunded"` and `refundedAt: Date.now()`. The `stripeRefundId` is stored for idempotency.

3. **AC3 — Refund failure handling:** When a Stripe refund fails (e.g., charge already refunded), the tickets are marked `refundStatus: "failed"` with the error message stored. Processing continues for remaining sessions (no halt on single failure).

4. **AC4 — Free ticket handling:** Free tickets (from tiers with `price === 0`) are marked `refundStatus: "not_applicable"` without calling Stripe.

5. **AC5 — Contract tests:** Pure contract tests validate: ticket grouping by stripeSessionId, free vs paid ticket detection, refund status state transitions, unique session deduplication, and error handling continuation.

## Tasks / Subtasks

- [x] Task 1: Schema update — add refund fields to tickets table (AC: 2, 3, 4)
  - [x]1.1 Add `refundStatus` (`v.optional(v.string())`) and `refundedAt` (`v.optional(v.number())`) and `stripeRefundId` (`v.optional(v.string())`) to `tickets` table in `convex/schema.ts`.

- [x] Task 2: Backend mutations for refund status (AC: 2, 3, 4)
  - [x]2.1 Add `updateTicketRefundStatus` internal mutation to `convex/tickets.ts` — takes `ticketId: v.id("tickets")`, `refundStatus: v.string()`, optional `refundedAt`, `stripeRefundId`. Patches the ticket record. Internal only (not API-exposed).
  - [x]2.2 Add `getTicketsByEventForRefund` internal query to `convex/tickets.ts` — takes `eventId: v.id("events")`. Returns all tickets with their tier price info (join with ticketTiers table). Returns `{ _id, stripeSessionId, tierId, tierPrice, buyerEmail, refundStatus }[]`.

- [x] Task 3: Stripe refund server action (AC: 1, 2, 3, 4)
  - [x]3.1 Create `src/lib/actions/refunds.ts` — export `processEventRefunds(eventId: string)` server action. Uses Stripe SDK from `src/lib/stripe/config.ts`.
  - [x]3.2 Fetch tickets for the event via Convex `fetchQuery`. Group by `stripeSessionId`. For each unique session:
    - Check if all tickets in the session are free (`tierPrice === 0`) → mark as `"not_applicable"`, skip Stripe call.
    - Otherwise, retrieve the Checkout Session from Stripe (`stripe.checkout.sessions.retrieve(sessionId)`) → get `payment_intent` ID → create refund (`stripe.refunds.create({ payment_intent })`).
    - On success: update all tickets in the session to `refundStatus: "refunded"`, `refundedAt: Date.now()`, `stripeRefundId`.
    - On failure: update tickets to `refundStatus: "failed"`. Log error. Continue to next session.
  - [x]3.3 Return `{ success: true, data: { refunded: number, failed: number, skipped: number } }` following the ActionResult pattern.

- [x] Task 4: Integrate refund into cancel event UI flow (AC: 1)
  - [x]4.1 In the cancel event dialog component, after `cancelEvent` mutation succeeds, call `processEventRefunds(eventId)` server action. Show toast with refund results. Handle errors gracefully (event is already cancelled even if refunds fail).

- [x] Task 5: Contract tests (AC: 5)
  - [x]5.1 Create `convex/refunds.test.ts`: test ticket grouping by stripeSessionId.
  - [x]5.2 Test free vs paid detection (tierPrice === 0 → not_applicable).
  - [x]5.3 Test refund status transitions: null → refunded, null → failed, null → not_applicable.
  - [x]5.4 Test unique session deduplication (multiple tickets per session → one refund call).
  - [x]5.5 Test error handling: failure on one session doesn't stop processing others.

## Dev Notes

### Schema Change — Add refund fields to tickets

```typescript
tickets: defineTable({
  // ... existing fields ...
  refundStatus: v.optional(v.string()),    // "refunded" | "failed" | "not_applicable"
  refundedAt: v.optional(v.number()),
  stripeRefundId: v.optional(v.string()),
  // ... existing fields ...
})
```

Do NOT add new indexes — refund queries use existing `by_event_id` index.

### Server Action Pattern — src/lib/actions/refunds.ts

Follow the same pattern as `stripe-checkout.ts` and `stripe-connect.ts`:

```typescript
"use server";

import { stripe } from "@/lib/stripe/config";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api, internal } from "../../convex/_generated/api";

export async function processEventRefunds(eventId: string): Promise<{
  success: boolean;
  data?: { refunded: number; failed: number; skipped: number };
  error?: string;
}> {
  try {
    // 1. Fetch tickets with tier prices
    const tickets = await fetchQuery(internal.tickets.getTicketsByEventForRefund, {
      eventId: eventId as any,
    });

    // 2. Group by stripeSessionId
    const sessionGroups = new Map<string, typeof tickets>();
    for (const ticket of tickets) {
      const group = sessionGroups.get(ticket.stripeSessionId) ?? [];
      group.push(ticket);
      sessionGroups.set(ticket.stripeSessionId, group);
    }

    let refunded = 0, failed = 0, skipped = 0;

    // 3. Process each session
    for (const [sessionId, sessionTickets] of sessionGroups) {
      const allFree = sessionTickets.every((t) => t.tierPrice === 0);

      if (allFree) {
        // Mark free tickets as not_applicable
        for (const ticket of sessionTickets) {
          await fetchMutation(internal.tickets.updateTicketRefundStatus, {
            ticketId: ticket._id,
            refundStatus: "not_applicable",
          });
        }
        skipped += sessionTickets.length;
        continue;
      }

      try {
        // Retrieve checkout session → payment intent
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntentId = session.payment_intent as string;

        // Create refund
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });

        // Mark tickets as refunded
        for (const ticket of sessionTickets) {
          await fetchMutation(internal.tickets.updateTicketRefundStatus, {
            ticketId: ticket._id,
            refundStatus: "refunded",
            refundedAt: Date.now(),
            stripeRefundId: refund.id,
          });
        }
        refunded += sessionTickets.length;
      } catch (err) {
        // Mark tickets as failed, continue processing
        for (const ticket of sessionTickets) {
          await fetchMutation(internal.tickets.updateTicketRefundStatus, {
            ticketId: ticket._id,
            refundStatus: "failed",
          });
        }
        failed += sessionTickets.length;
        console.error(`Refund failed for session ${sessionId}:`, err);
      }
    }

    return { success: true, data: { refunded, failed, skipped } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refund processing failed",
    };
  }
}
```

### Internal Mutation — updateTicketRefundStatus

```typescript
// In convex/tickets.ts
export const updateTicketRefundStatus = internalMutation({
  args: {
    ticketId: v.id("tickets"),
    refundStatus: v.string(),
    refundedAt: v.optional(v.number()),
    stripeRefundId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ticketId, {
      refundStatus: args.refundStatus,
      refundedAt: args.refundedAt,
      stripeRefundId: args.stripeRefundId,
    });
  },
});
```

### Internal Query — getTicketsByEventForRefund

```typescript
export const getTicketsByEventForRefund = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return Promise.all(
      tickets.map(async (t) => {
        const tier = await ctx.db.get(t.tierId);
        return {
          _id: t._id,
          stripeSessionId: t.stripeSessionId,
          tierId: t.tierId,
          tierPrice: tier?.price ?? 0,
          buyerEmail: t.buyerEmail,
          refundStatus: t.refundStatus,
        };
      })
    );
  },
});
```

### Cancel Event UI Integration

Find the cancel event dialog component (likely in `src/components/custom/cancel-event-dialog.tsx` or the event management page). After `cancelEvent` mutation succeeds:

```typescript
// After successful cancel mutation
const refundResult = await processEventRefunds(eventId);
if (refundResult.success) {
  const { refunded, failed, skipped } = refundResult.data!;
  showSuccess(
    `Event cancelled. ${refunded} ticket(s) refunded, ${skipped} free ticket(s) skipped.`
  );
  if (failed > 0) {
    showError(`${failed} refund(s) failed — check admin panel.`);
  }
} else {
  showError("Event cancelled but refund processing failed. Refunds may need manual processing.");
}
```

### Important: Stripe Separate Charges & Transfers

The project uses Stripe's **Separate Charges and Transfers** pattern. When refunding:
- `stripe.refunds.create({ payment_intent })` refunds the ENTIRE charge on the platform account
- Stripe automatically reverses the transfer to the creator's connected account
- The platform fee is also refunded to the buyer
- No need to manually handle connected account refunds

### Previous Story Learnings

- **Server actions return `ActionResult<T>`** — `{ success: true, data } | { success: false, error }`
- **`ctx.scheduler.runAfter`** — used in 8.3 for async notifications (can't use here since we need Stripe API)
- **`fetchQuery`/`fetchMutation` from `convex/nextjs`** — for server actions calling Convex
- **Error handling**: log but don't halt on single failure (AC3)
- **Contract tests are pure** — no Convex/Stripe runtime

### References

- Stripe checkout (pattern): [src/lib/actions/stripe-checkout.ts](src/lib/actions/stripe-checkout.ts)
- Stripe config: [src/lib/stripe/config.ts](src/lib/stripe/config.ts)
- Tickets operations: [convex/tickets.ts](convex/tickets.ts)
- Cancel event mutation: [convex/events.ts](convex/events.ts) lines 220-267
- Cancel event dialog: [src/components/custom/cancel-event-dialog.tsx](src/components/custom/cancel-event-dialog.tsx)
- Schema: [convex/schema.ts](convex/schema.ts)
- Webhook handler (reference): [src/lib/stripe/webhooks.ts](src/lib/stripe/webhooks.ts)

### File Locations

**New files:**
- `src/lib/actions/refunds.ts` — Stripe refund server action
- `convex/refunds.test.ts` — Contract tests

**Modified files:**
- `convex/schema.ts` — Add refund fields to tickets table
- `convex/tickets.ts` — Add `updateTicketRefundStatus` internal mutation + `getTicketsByEventForRefund` internal query
- Cancel event UI component — Call refund server action after cancel mutation

**Existing files to reuse (DO NOT modify):**
- `src/lib/stripe/config.ts` — Stripe SDK client
- `convex/events.ts` — `cancelEvent` mutation (already works, refunds are separate flow)
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showError()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `refundStatus`, `refundedAt`, `stripeRefundId` optional fields to tickets table in schema.
- Task 2: Added `getTicketsByEventForRefund` internal query (joins tickets with tier prices) and `updateTicketRefundStatus` internal mutation to `convex/tickets.ts`.
- Task 3: Created `src/lib/actions/refunds.ts` server action — `processEventRefunds(eventId)` groups tickets by stripeSessionId, handles free (not_applicable), calls Stripe refund API for paid, handles failures per-session, returns ActionResult with counts.
- Task 4: Integrated refund call into cancel-event-dialog — fire-and-forget after cancel mutation, shows toast with refund results.
- Task 5: Created 13 contract tests covering grouping, free/paid detection, status transitions, idempotency, error continuation, result shape. Added refund mock to cancel-event-dialog test.
- All 888 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): changed internal functions to public with webhook secret auth, fixed failure toast to use showError, improved idempotency check to verify all tickets in session.

### Change Log

- 2026-03-14: Story 9.1 implementation complete
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1: changed `internalQuery`/`internalMutation` to `query`/`mutation` with `CONVEX_WEBHOOK_SECRET` auth (ConvexHttpClient can't call internal functions). M1: failure toast uses `showError` not `showSuccess`. M2: idempotency check verifies ALL tickets in session, not just first. — schema, backend, server action, UI integration, tests

### File List

**New files:**
- `src/lib/actions/refunds.ts` — Stripe refund server action
- `convex/refunds.test.ts` — 13 contract tests

**Modified files:**
- `convex/schema.ts` — added `refundStatus`, `refundedAt`, `stripeRefundId` to tickets table
- `convex/tickets.ts` — added `getTicketsByEventForRefund` internal query, `updateTicketRefundStatus` internal mutation
- `src/components/custom/cancel-event-dialog.tsx` — integrated `processEventRefunds` call
- `src/components/custom/__tests__/cancel-event-dialog.test.tsx` — added refund action mock
