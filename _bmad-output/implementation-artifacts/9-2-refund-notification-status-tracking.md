# Story 9.2: Refund Notification & Status Tracking

Status: done

## Story

As a **ticket holder**,
I want to know the status of my refund and receive confirmation when it's processed,
so that I can confirm my money is being returned.

## Acceptance Criteria

1. **AC1 — Refund confirmation email:** When a refund is successfully processed via Stripe, the ticket holder receives an email via Resend with: event title, refund amount (₱X.XX), and confirmation message.

2. **AC2 — Refund status on tickets page:** On the "My Tickets" page, tickets for cancelled events display a refund status badge: "Refunded" (green), "Processing" (yellow), "Failed" (red), or "N/A" (gray, for free events). The badge is derived from the `refundStatus` field on the ticket.

3. **AC3 — Admin refund summary:** On the admin moderation page, when viewing a cancelled event's details, the admin sees a refund summary: total tickets, refunded count, failed count, skipped (free) count, and total refund amount.

4. **AC4 — Contract tests:** Pure contract tests validate email parameter shape, refund status badge logic, and admin refund summary computation.

## Tasks / Subtasks

- [x] Task 1: Refund confirmation email (AC: 1)
  - [x] 1.1 Create email template `src/lib/email/templates/refund-confirmation.tsx` using react-email components. Shows: event title, refund amount (formatted with `formatCurrency`), confirmation message, and "Refund processed on [date]" footer.
  - [x] 1.2 Add `sendRefundConfirmation({ buyerEmail, eventTitle, refundAmount, eventDate })` to `src/lib/actions/email.ts`. Uses Resend to send the email. Returns `ActionResult<void>`.
  - [x] 1.3 Integrate email sending into `processEventRefunds` in `src/lib/actions/refunds.ts`. After each successful per-session refund, collect buyer email + amount. After all sessions processed, send one refund confirmation email per unique buyer email with total refund amount. Use fire-and-forget pattern (`.catch(console.error)`).

- [x] Task 2: Refund status on tickets page (AC: 2)
  - [x] 2.1 Update `getMyTickets` query in `convex/tickets.ts` to include `refundStatus` in the returned fields. Also include `eventStatus` from the joined event record so the UI knows when to show the refund badge.
  - [x] 2.2 Update `src/app/(dashboard)/dashboard/tickets/page.tsx` to show a refund status badge on tickets where `eventStatus === "cancelled"`. Badge variants: `refundStatus === "refunded"` → green "Refunded", `refundStatus === "failed"` → red destructive "Refund Failed", `refundStatus === "not_applicable"` → gray outline "Free Event", `!refundStatus` (null/undefined) → yellow "Processing".

- [x] Task 3: Admin refund summary (AC: 3)
  - [x] 3.1 Add `getEventRefundSummary` query to `convex/admin.ts` — requires admin role. Takes `eventId: v.id("events")`. Queries all tickets for the event. Returns `{ totalTickets, refundedCount, failedCount, skippedCount, totalRefundAmount }`. `totalRefundAmount` sums `tierPrice` for tickets with `refundStatus === "refunded"`.
  - [x] 3.2 Update admin moderation page (`src/app/(dashboard)/dashboard/admin/moderation/page.tsx`) — when viewing a cancelled event, show a "Refund Summary" section with MetricCards for each stat. Only render when `event.status === "cancelled"`.

- [x] Task 4: Contract tests (AC: 4)
  - [x] 4.1 Add tests to `convex/refunds.test.ts`: refund confirmation email parameter shape (buyerEmail, eventTitle, refundAmount required), unique buyer email deduplication (one email per buyer even with multiple sessions).
  - [x] 4.2 Add tests: refund status badge logic mapping (refunded→green, failed→red, not_applicable→gray, null→yellow).
  - [x] 4.3 Add tests: admin refund summary computation — counts by refundStatus, sums tierPrice only for refunded tickets, excludes free tickets from amount.
  - [x] 4.4 Add tests to `convex/admin.test.ts`: `getEventRefundSummary` requires admin role authorization.

## Dev Notes

### Email Template Pattern

Follow the existing template at `src/lib/email/templates/event-cancellation.tsx`:

```tsx
// src/lib/email/templates/refund-confirmation.tsx
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from "@react-email/components";

interface RefundConfirmationEmailProps {
  eventTitle: string;
  refundAmount: string; // Already formatted: "₱500.00"
  eventDate?: string;
}

export function RefundConfirmationEmail({
  eventTitle,
  refundAmount,
  eventDate,
}: RefundConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Refund processed for {eventTitle}</Preview>
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Heading>Refund Confirmation</Heading>
          <Text>
            Your refund of <strong>{refundAmount}</strong> for{" "}
            <strong>{eventTitle}</strong> has been processed.
          </Text>
          <Text>
            The refund should appear on your statement within 5-10 business days.
          </Text>
          {eventDate && (
            <Text style={{ color: "#666", fontSize: "14px" }}>
              Original event date: {eventDate}
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}
```

### Email Server Action Pattern

Extend `src/lib/actions/email.ts` — follow the `sendEventCancellation` pattern:

```typescript
export async function sendRefundConfirmation({
  buyerEmail,
  eventTitle,
  refundAmount,
  eventDate,
}: {
  buyerEmail: string;
  eventTitle: string;
  refundAmount: string;
  eventDate?: string;
}): Promise<ActionResult<void>> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: `Refund processed for ${eventTitle}`,
      react: RefundConfirmationEmail({ eventTitle, refundAmount, eventDate }),
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to send refund confirmation:", error);
    return { success: false, error: "Failed to send refund confirmation email" };
  }
}
```

### Integrating Email into processEventRefunds

In `src/lib/actions/refunds.ts`, after all sessions are processed, aggregate refunded amounts per buyer and send emails:

```typescript
// After the main refund loop, collect refunded buyers
const refundedBuyers = new Map<string, number>(); // email → total amount in centavos

for (const [sessionId, sessionTickets] of grouped) {
  // ... existing refund logic ...
  if (refundResult.success) {
    for (const ticket of sessionTickets) {
      const existing = refundedBuyers.get(ticket.buyerEmail) ?? 0;
      refundedBuyers.set(ticket.buyerEmail, existing + ticket.tierPrice);
    }
  }
}

// Send one email per buyer (fire-and-forget)
for (const [email, totalCentavos] of refundedBuyers) {
  sendRefundConfirmation({
    buyerEmail: email,
    eventTitle,
    refundAmount: formatCurrency(totalCentavos),
  }).catch((err) => console.error("Refund email failed:", err));
}
```

**IMPORTANT:** Import `formatCurrency` from `@/lib/utils/format` — it already handles centavos to ₱ display.

### Tickets Page — Refund Badge

The tickets page at `src/app/(dashboard)/dashboard/tickets/page.tsx` currently does NOT show refund status. Add a badge next to the ticket info:

```tsx
import { Badge } from "@/components/ui/badge";

function getRefundBadge(eventStatus: string, refundStatus?: string) {
  if (eventStatus !== "cancelled") return null;

  switch (refundStatus) {
    case "refunded":
      return <Badge className="bg-green-100 text-green-800">Refunded</Badge>;
    case "failed":
      return <Badge variant="destructive">Refund Failed</Badge>;
    case "not_applicable":
      return <Badge variant="outline">Free Event</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
  }
}
```

### getMyTickets Query Update

The `getMyTickets` query in `convex/tickets.ts` needs to return `refundStatus`. Check the current return shape and add:
- `refundStatus` from ticket record
- `eventStatus` from the joined event record (already likely joined for event title)

Do NOT modify the query args — just extend the return fields.

### Admin Refund Summary

Add to `convex/admin.ts`:

```typescript
export const getEventRefundSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const refundedCount = tickets.filter((t) => t.refundStatus === "refunded").length;
    const failedCount = tickets.filter((t) => t.refundStatus === "failed").length;
    const skippedCount = tickets.filter((t) => t.refundStatus === "not_applicable").length;
    const totalRefundAmount = tickets
      .filter((t) => t.refundStatus === "refunded")
      .reduce((sum, t) => sum + (t.tierPrice ?? 0), 0);

    return {
      totalTickets: tickets.length,
      refundedCount,
      failedCount,
      skippedCount,
      totalRefundAmount,
    };
  },
});
```

### Admin Moderation Page — Refund Section

On the moderation page, when an event detail shows `status === "cancelled"`, render:

```tsx
{event.status === "cancelled" && (
  <RefundSummarySection eventId={event._id} />
)}
```

Where `RefundSummarySection` is a small inline component using `useQuery(api.admin.getEventRefundSummary, { eventId })` and MetricCard components.

### Previous Story 9.1 Learnings

- **Server actions use `fetchQuery`/`fetchMutation` from `convex/nextjs`** — not `useQuery`
- **Ticket refund queries use webhook secret auth** — `getTicketsByEventForRefund` and `updateTicketRefundStatus` validate `CONVEX_WEBHOOK_SECRET`
- **Fire-and-forget for emails** — `.catch(err => console.error(...))` pattern
- **`processEventRefunds` returns `{ refunded, failed, skipped }` counts** — extend but don't change this shape
- **`ActionResult<T>` pattern** — `{ success: true, data } | { success: false, error }`
- **Contract tests are pure** — no Convex/Stripe/Resend runtime

### Auth Pattern

| Query/Mutation | Auth | Role Check | Notes |
|---|---|---|---|
| `getMyTickets` (update) | Required | Any role | Add refundStatus + eventStatus to return |
| `getEventRefundSummary` | Required | `admin` | New query for moderation page |
| `sendRefundConfirmation` | Server action | N/A | Called from processEventRefunds |

### References

- Refund processing: [src/lib/actions/refunds.ts](src/lib/actions/refunds.ts)
- Email sending: [src/lib/actions/email.ts](src/lib/actions/email.ts)
- Email config: [src/lib/email/config.ts](src/lib/email/config.ts)
- Cancellation template: [src/lib/email/templates/event-cancellation.tsx](src/lib/email/templates/event-cancellation.tsx)
- Tickets page: [src/app/(dashboard)/dashboard/tickets/page.tsx](src/app/(dashboard)/dashboard/tickets/page.tsx)
- Tickets queries: [convex/tickets.ts](convex/tickets.ts)
- Admin queries: [convex/admin.ts](convex/admin.ts)
- Admin moderation: [src/app/(dashboard)/dashboard/admin/moderation/page.tsx](src/app/(dashboard)/dashboard/admin/moderation/page.tsx)
- Refund tests: [convex/refunds.test.ts](convex/refunds.test.ts)
- Admin tests: [convex/admin.test.ts](convex/admin.test.ts)
- Format utilities: [src/lib/utils/format.ts](src/lib/utils/format.ts)
- MetricCard: [src/components/custom/metric-card.tsx](src/components/custom/metric-card.tsx)
- Cancel event dialog: [src/components/custom/cancel-event-dialog.tsx](src/components/custom/cancel-event-dialog.tsx)

### File Locations

**New files:**
- `src/lib/email/templates/refund-confirmation.tsx` — Refund confirmation email template

**Modified files:**
- `src/lib/actions/email.ts` — Add `sendRefundConfirmation` function
- `src/lib/actions/refunds.ts` — Integrate email sending after successful refunds
- `convex/tickets.ts` — Update `getMyTickets` to include `refundStatus` and `eventStatus`
- `src/app/(dashboard)/dashboard/tickets/page.tsx` — Add refund status badges
- `convex/admin.ts` — Add `getEventRefundSummary` query
- `src/app/(dashboard)/dashboard/admin/moderation/page.tsx` — Add refund summary section
- `convex/refunds.test.ts` — Append contract tests
- `convex/admin.test.ts` — Append authorization test

**Existing files to reuse (DO NOT modify):**
- `src/lib/email/config.ts` — Resend client
- `src/components/custom/metric-card.tsx` — MetricCard component
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatDate()`
- `convex/lib/auth.ts` — `getAuthenticatedUser()`
- `convex/lib/roles.ts` — `requireRole()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Created refund confirmation email template (`refund-confirmation.tsx`) with green-themed styling. Added `sendRefundConfirmation` to `email.ts`. Integrated into `processEventRefunds` — aggregates refund amounts per unique buyer email, sends one fire-and-forget email per buyer after all sessions processed.
- Task 2: Updated `getMyTickets` to include `refundStatus` and `eventStatus` fields (explicit field selection, no spread). Added refund status badges to tickets page: green "Refunded", red "Refund Failed", gray "Free Event", yellow "Processing". Added "Cancelled" badge for cancelled events.
- Task 3: Added `getEventRefundSummary` query to `convex/admin.ts` — admin-only, returns ticket counts by refund status and total refund amount (summed from tier prices). Added `RefundSummarySection` component to moderation page details dialog, shown only for cancelled events.
- Task 4: Added 17 contract tests — refund email shape & buyer deduplication (4), badge logic mapping (5), admin summary computation (5), admin auth (3). Total: 905 tests passing.

### Change Log

- 2026-03-15: Story 9.2 implementation complete — email template, refund status UI, admin summary, contract tests
- 2026-03-15: Code review — fixed 3 issues (1H, 2M). H1: removed internal fields from getMyTickets (qrSignature, stripeSessionId, buyerEmail, scannedBy). M1: hide QR code for cancelled events, show "no longer valid" message. M2: pass eventTitle to processEventRefunds instead of querying public API (cancelled events not returned by public queries).

### File List

**New files:**
- `src/lib/email/templates/refund-confirmation.tsx` — Refund confirmation email template

**Modified files:**
- `src/lib/actions/email.ts` — Added `sendRefundConfirmation` function
- `src/lib/actions/refunds.ts` — Integrated refund email sending, event title fetch
- `convex/tickets.ts` — Updated `getMyTickets` to include `refundStatus` and `eventStatus`
- `src/app/(dashboard)/dashboard/tickets/page.tsx` — Added refund status badges and cancelled event indicator
- `convex/admin.ts` — Added `getEventRefundSummary` query
- `src/app/(dashboard)/dashboard/admin/moderation/page.tsx` — Added `RefundSummarySection` for cancelled events
- `convex/refunds.test.ts` — Added 14 contract tests for email, badge logic, summary computation
- `convex/admin.test.ts` — Added 3 contract tests for refund summary authorization
