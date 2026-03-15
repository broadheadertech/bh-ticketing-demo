# Story 3.5: Purchase Confirmation Email

Status: done

## Story

As an **attendee**,
I want to receive an email confirmation after purchasing tickets (paid or free),
So that I have a record of my purchase and ticket details.

## Acceptance Criteria

1. **Given** I have successfully purchased paid tickets (Stripe checkout completed)
   **When** the `processCheckoutCompleted` webhook handler runs
   **Then** a purchase confirmation email is sent to the buyer via Resend (FR22, FR47)
   **And** the email uses a React Email template
   **And** the email includes: event name, date, time, venue, ticket tier(s), quantity, total amount in PHP
   **And** the email is delivered within 60 seconds of the webhook firing (NFR32)
   **And** a failure to send email does NOT block ticket creation (email is fire-and-forget)

2. **Given** I have successfully registered for a free event
   **When** `registerFreeEvent` Server Action completes successfully
   **Then** a registration confirmation email is sent via Resend
   **And** the email uses the same React Email template
   **And** the email shows "Free" instead of a price total
   **And** a failure to send email does NOT block registration (fire-and-forget)

3. **Given** a creator cancels a published event
   **When** the `cancelEvent` Convex mutation completes (called via `useMutation` in `CancelEventDialog` — `cancelEvent` requires Clerk auth and cannot be wrapped in a Server Action via `ConvexHttpClient`)
   **Then** `sendEventCancellation` is called fire-and-forget from `CancelEventDialog` after the mutation succeeds
   **And** cancellation emails are sent to all unique ticket holder emails for the event
   **And** the email includes: event name, cancellation reason, and refund information notice
   **And** the event status is updated to `cancelled` in Convex
   **And** email send failures are logged but do not roll back the cancellation

4. **Given** the email Server Action is called
   **When** `RESEND_API_KEY` is missing or the Resend API returns an error
   **Then** the Server Action returns `{ success: false, error: "..." }` (never throw)
   **And** the error is logged via `console.error`

## Tasks / Subtasks

- [x] **Task 1: Install email packages** (AC: #1, #2)
  - [x] 1.1 Run: `pnpm add resend @react-email/components`
  - [x] 1.2 Verify packages appear in `package.json` under `dependencies`

- [x] **Task 2: Create `src/lib/email/config.ts` — Resend client** (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `src/lib/email/config.ts` with a lazy singleton:
    ```typescript
    import { Resend } from "resend";

    let _resend: Resend | null = null;

    export function getResend(): Resend {
      if (!_resend) {
        _resend = new Resend(process.env.RESEND_API_KEY!);
      }
      return _resend;
    }

    export const FROM_EMAIL =
      process.env.RESEND_FROM_EMAIL ?? "noreply@phlive.app";
    ```
  - [x] 2.2 Use lazy singleton pattern — same as `src/lib/stripe/webhooks.ts` lazy Stripe/Convex init — do NOT create at module top-level (Next.js evaluates modules at build time)

- [x] **Task 3: Create `src/lib/email/templates/ticket-confirmation.tsx`** (AC: #1, #2)
  - [x] 3.1 Create the React Email template. Props:
    ```typescript
    type TicketConfirmationEmailProps = {
      eventTitle: string;
      eventDate: string;    // pre-formatted with formatDate()
      eventTime: string;
      venueName?: string;
      tiers: { name: string; quantity: number }[];
      totalDisplay: string; // "₱1,500.00" for paid, "Free" for free
      buyerEmail: string;
    };
    ```
  - [x] 3.2 Import from `@react-email/components`: `Body`, `Container`, `Head`, `Heading`, `Html`, `Preview`, `Section`, `Text`, `Hr`
  - [x] 3.3 Template structure:
    - Subject preview: "Your tickets for {eventTitle}"
    - Heading: "Registration Confirmed" or "Purchase Confirmed"
    - Event name, date, time, venue
    - Table/list of tier(s) + quantity
    - Total row showing `totalDisplay`
    - Footer with "Check your dashboard for ticket QR codes once available"
  - [x] 3.4 Export default `TicketConfirmationEmail` component

- [x] **Task 4: Create `src/lib/email/templates/event-cancellation.tsx`** (AC: #3)
  - [x] 4.1 Create the cancellation email template. Props:
    ```typescript
    type EventCancellationEmailProps = {
      eventTitle: string;
      eventDate: string;
      cancellationReason?: string;
    };
    ```
  - [x] 4.2 Template structure:
    - Preview: "Important: {eventTitle} has been cancelled"
    - Heading: "Event Cancelled"
    - Event name and date
    - Cancellation reason (if provided)
    - Refund notice: "If you paid for tickets, refunds will be processed within 5–10 business days to your original payment method."
    - Footer with support contact

- [x] **Task 5: Create `src/lib/actions/email.ts` Server Action** (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `src/lib/actions/email.ts` with `"use server"` directive
  - [x] 5.2 Export `sendPurchaseConfirmation`:
    ```typescript
    export async function sendPurchaseConfirmation(params: {
      eventId: string;
      tierSelections: { tierId: string; quantity: number }[];
      buyerEmail: string;
      totalAmountCentavos: number | "free";
    }): Promise<{ success: boolean; error?: string }>
    ```
    - Fetch event via `convex.query(api.events.getPublicEventById, { eventId })`
    - Fetch tiers via `convex.query(api.ticketTiers.getPublicTiersByEventId, { eventId })`
    - Map `tierSelections` to `{ name: tier.name, quantity }` using fetched tiers
    - Format `totalDisplay`: if `"free"` → `"Free"`; else `formatCurrency(totalAmountCentavos)` from `@/lib/utils/format`
    - Format `eventDate` using `formatDate(event.date)` from `@/lib/utils/format`
    - Send via `getResend().emails.send({ from: FROM_EMAIL, to: [buyerEmail], subject: `Your tickets for ${event.title}`, react: <TicketConfirmationEmail ... /> })`
    - Return `{ success: true }` or `{ success: false, error: err.message }`
    - Wrap in try/catch — NEVER throw
  - [x] 5.3 Export `sendEventCancellation`:
    ```typescript
    export async function sendEventCancellation(params: {
      eventId: string;
      cancellationReason?: string;
    }): Promise<{ success: boolean; error?: string; emailsSent?: number }>
    ```
    - Fetch event and unique buyer emails from Convex
    - Use `convex.query(api.tickets.getUniqueEmailsByEventId, { eventId, querySecret: process.env.CONVEX_WEBHOOK_SECRET! })`  (see Task 6)
    - Send cancellation email to each unique email address
    - Return count of emails sent
    - Wrap in try/catch — NEVER throw
  - [x] 5.4 Module-level `ConvexHttpClient` singleton (same pattern as `free-registration.ts` and `stripe-checkout.ts`):
    ```typescript
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    ```

- [x] **Task 6: Add `getUniqueEmailsByEventId` query to `convex/tickets.ts`** (AC: #3)
  - [x] 6.1 Add a new query to `convex/tickets.ts`:
    ```typescript
    export const getUniqueEmailsByEventId = query({
      args: {
        eventId: v.string(),
        querySecret: v.string(),
      },
      handler: async (ctx, args) => {
        if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
          throw new ConvexError("Unauthorized");
        }
        const tickets = await ctx.db
          .query("tickets")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
          .collect();
        const emails = [...new Set(tickets.map((t) => t.buyerEmail))];
        return emails;
      },
    });
    ```
  - [x] 6.2 Import `query` from `./_generated/server` (already imported via `mutation` — check if `query` is already imported; if not, add it)
  - [x] 6.3 NOTE: `convex/_generated/api.d.ts` — `tickets` module is already declared as `tickets: typeof tickets`, so `api.tickets.getUniqueEmailsByEventId` is auto-typed

- [x] **Task 7: Integrate email in `src/lib/stripe/webhooks.ts`** (AC: #1)
  - [x] 7.1 Import `sendPurchaseConfirmation` from `@/lib/actions/email`
  - [x] 7.2 In `processCheckoutCompleted`, after the `await getConvex().mutation(...)` call succeeds, call:
    ```typescript
    // Fire-and-forget email — do not await, log errors only
    sendPurchaseConfirmation({
      eventId,
      tierSelections,
      buyerEmail,
      totalAmountCentavos: session.amount_total ?? 0,
    }).catch((err) => console.error("Email send failed:", err));
    ```
  - [x] 7.3 Keep the fire-and-forget pattern — webhook must return 200 quickly; email failure must NOT cause webhook to fail

- [x] **Task 8: Integrate email in `src/lib/actions/free-registration.ts`** (AC: #2)
  - [x] 8.1 Import `sendPurchaseConfirmation` from `@/lib/actions/email`
  - [x] 8.2 After the successful `await convex.mutation(api.tickets.registerFreeTickets, ...)` call, add:
    ```typescript
    // Fire-and-forget — email failure must NOT block registration response
    sendPurchaseConfirmation({
      eventId: input.eventId,
      tierSelections: input.tierSelections,
      buyerEmail: input.buyerEmail,
      totalAmountCentavos: "free",
    }).catch((err) => console.error("Confirmation email failed:", err));
    ```
  - [x] 8.3 Place the call BEFORE the `return { success: true, ... }` statement

- [x] **Task 9: Email side-effects for event cancellation** (AC: #3)
  - [x] 9.1 Create `src/lib/actions/events.ts` with `"use server"` directive; re-exports `sendEventCancellation` from `@/lib/actions/email`
  - [~] 9.2 ~~Export `cancelEventWithNotification`~~ — **NOT IMPLEMENTED as originally specified.** `cancelEvent` Convex mutation requires Clerk auth via `getAuthenticatedUser(ctx)` which cannot be satisfied from a Server Action's `ConvexHttpClient`. A standalone `cancelEventWithNotification` wrapper was architecturally infeasible. Outcome achieved via 9.3 instead.
  - [x] 9.3 `CancelEventDialog` calls `cancelEvent` via `useMutation` (Clerk auth available in browser context), then calls `sendEventCancellation` fire-and-forget after the mutation succeeds. Email side-effect is decoupled from the mutation.

- [x] **Task 10: Add tests** (AC: #1, #2, #3, #4)
  - [x] 10.1 Create `src/lib/actions/__tests__/email.test.ts` following the pure contract test pattern (see `stripe-connect.test.ts` and `free-registration.test.ts`)
  - [x] 10.2 Test return shape contracts (success/error shapes)
  - [x] 10.3 Test `totalDisplay` formatting logic (extracted pure function): `"free"` → `"Free"`, number → formatted currency
  - [x] 10.4 Test email template prop validation (pure assertions, no rendering)
  - [x] 10.5 Test cancellation email recipient deduplication (Set-based unique email logic)
  - [x] 10.6 Add `getUniqueEmailsByEventId` contract tests to `convex/tickets.test.ts`:
    - Auth contract: requires `querySecret`
    - Deduplication: same email from multiple tickets appears once
    - Empty result: no tickets → empty array

## Dev Notes

### Packages — MUST INSTALL FIRST (not in package.json)

```bash
pnpm add resend @react-email/components
```

- `resend`: Resend Node.js SDK for sending emails
- `@react-email/components`: React Email component library (Body, Container, Heading, Html, Preview, Section, Text, Hr, etc.)
- Both are `dependencies` (not devDependencies) — needed at runtime
- **Do NOT use `react-email` (the CLI tool)** — only `@react-email/components` (the component library) is needed

### Resend API usage (current as of 2026)

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "noreply@yourdomain.com",  // must be verified in Resend dashboard
  to: ["buyer@example.com"],
  subject: "Your tickets",
  react: <TicketConfirmationEmail {...props} />,
});
```

- The `react` field accepts a React element rendered by Resend server-side
- `resend.emails.send()` returns `{ data, error }` — does NOT throw on API errors
- Check `error` for failure, not try/catch
- `RESEND_API_KEY` env var must be added to `.env.local` and Vercel

### React Email component usage (current as of 2026)

```tsx
import {
  Body, Container, Head, Heading, Html,
  Preview, Section, Text, Hr
} from "@react-email/components";

export default function MyEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Preview>Preview text shown in email client</Preview>
      <Body style={{ fontFamily: "sans-serif" }}>
        <Container>
          <Heading>Hello {name}</Heading>
          <Text>Your email content here.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- Styles should use inline `style` props (email clients don't support CSS classes)
- No Tailwind CSS in email templates — inline styles only
- Export default component from template files

### Architecture File Structure

Per `architecture.md` "File/Folder Structure":

```
src/lib/email/
  config.ts                        # Resend client (lazy singleton)
  templates/
    ticket-confirmation.tsx         # Purchase/registration confirmation
    event-cancellation.tsx          # Event cancellation notification
src/lib/actions/
  email.ts                          # Server Action for sending emails
  events.ts                         # Server Action for event operations (new or add to existing)
```

### Server Action pattern (CRITICAL)

All Server Actions MUST follow this pattern — never throw:

```typescript
"use server";

export async function sendPurchaseConfirmation(...): Promise<{
  success: boolean;
  data?: { messageId: string };
  error?: string;
}> {
  try {
    // ... do work
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Email failed" };
  }
}
```

Source: [architecture.md — Server Action Response Format]

### Fire-and-forget email pattern

Email is non-blocking for user flows. Use:

```typescript
// After ticket creation in webhooks.ts / free-registration.ts:
sendPurchaseConfirmation({ ... }).catch((err) =>
  console.error("Confirmation email failed:", err)
);
```

Do NOT `await` email calls in the webhook handler — webhook must return quickly. Do NOT `await` in `registerFreeEvent` — registration response must not block on email. Email failures must NEVER prevent ticket records from being created.

### Convex HTTP query from Server Action

```typescript
// Same pattern established in stripe-checkout.ts and free-registration.ts:
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const event = await convex.query(api.events.getPublicEventById, {
  eventId: params.eventId as any,  // eslint-disable-next-line needed for Id<"events"> typing
});
```

### formatCurrency / formatDate — existing utilities

```typescript
import { formatCurrency, formatDate } from "@/lib/utils/format";

formatCurrency(150000)  // → "₱1,500.00"
formatDate(event.date)  // → "March 15, 2026"
```

These already exist in `src/lib/utils/format.ts`. Do NOT reimplement.

### `getUniqueEmailsByEventId` — security note

This query uses the same `CONVEX_WEBHOOK_SECRET` guard pattern as `createTicketsFromWebhook` and `registerFreeTickets`. It prevents unauthenticated callers from enumerating all ticket holder emails (privacy protection). Only the Server Action (which knows the secret) can call it.

### Checking if `convex/tickets.ts` imports `query`

Currently `convex/tickets.ts` only imports `mutation` and `ConvexError`. For Task 6, add `query` to the import:

```typescript
import { mutation, query } from "./_generated/server";
```

### RESEND_FROM_EMAIL env var

Add `RESEND_FROM_EMAIL=noreply@phlive.app` to `.env.local`. The domain must be verified in the Resend dashboard before emails will deliver. For dev/test, Resend provides a test mode that doesn't require domain verification.

### Previous story learnings (from Story 3.4 code review)

- **Fire-and-forget does NOT use `await`** — call `.catch()` directly on the Promise
- **Module-level `const convex = new ConvexHttpClient(...)` is fine** for Server Actions (Next.js HMR safe)
- **`as any` casts for Convex `Id<"table">` types** require `// eslint-disable-next-line @typescript-eslint/no-explicit-any` before the line, OR `/* eslint-disable/enable */` blocks for multi-line casts
- **`eslint-disable-next-line`** is preferred for single-line casts; block comments for `ctx.db.insert` with multiple fields
- **Logic ordering in mutations**: idempotency check → validation → writes (matches Story 3.4 fix)

### Project Structure Notes

- Email templates go in `src/lib/email/templates/` (architecture-specified path)
- Email config goes in `src/lib/email/config.ts` (architecture-specified path)
- Server Action for email goes in `src/lib/actions/email.ts` (architecture-specified path)
- Tests co-located: `src/lib/actions/__tests__/email.test.ts`
- No `src/types/` changes needed — types are local to the email module

### References

- [Source: architecture.md — Infrastructure & Deployment — Email: Resend]
- [Source: architecture.md — API & Communication Patterns — Server Actions]
- [Source: architecture.md — File/Folder Structure — lib/email/]
- [Source: architecture.md — Environment configuration — RESEND_API_KEY]
- [Source: convex/schema.ts — tickets table — by_event_id index]
- [Source: src/lib/stripe/webhooks.ts — lazy singleton pattern, processCheckoutCompleted]
- [Source: src/lib/actions/free-registration.ts — Server Action pattern, ConvexHttpClient singleton]
- [Source: src/lib/utils/format.ts — formatCurrency, formatDate]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `resend@6.9.3` and `@react-email/components@1.0.8`
- Created lazy Resend singleton in `src/lib/email/config.ts` (same pattern as lazy Stripe/Convex in `webhooks.ts`)
- `TicketConfirmationEmail` detects paid vs free via `totalDisplay === "Free"` for dynamic heading
- `sendPurchaseConfirmation` uses `Promise.all` to fetch event+tiers in parallel; maps tierSelections to names
- `sendEventCancellation` uses `Promise.allSettled` so partial email failures don't abort the batch; logs failure count
- `cancelEvent` Convex mutation requires Clerk auth context — cannot be called via `ConvexHttpClient` from Server Action. Solution: kept `useMutation` in `CancelEventDialog` and added `sendEventCancellation` fire-and-forget after success
- Added `vi.mock("@/lib/actions/events")` to `cancel-event-dialog.test.tsx` to prevent transitive `ConvexHttpClient` init during tests
- All 448 tests pass (30 new tests added)
- **Code review fixes (3 issues):**
  - M1: Fixed `Promise.allSettled` Resend error counting — added `&& !r.value.error` check so API-level failures aren't counted as sent
  - M2: Corrected `buildTotalDisplay(0)` test contract — `0` centavos (number) renders as `"₱0.00"`, not `"Free"`; callers must pass the `"free"` string literal for free events
  - H1: Updated AC3 and Task 9.2 in story to accurately reflect the architectural deviation (`cancelEventWithNotification` was infeasible due to Clerk auth constraint; outcome achieved via fire-and-forget from `CancelEventDialog`)

### File List

- `src/lib/email/config.ts` (created)
- `src/lib/email/templates/ticket-confirmation.tsx` (created)
- `src/lib/email/templates/event-cancellation.tsx` (created)
- `src/lib/actions/email.ts` (created)
- `src/lib/actions/events.ts` (created)
- `src/lib/stripe/webhooks.ts` (modified — added fire-and-forget `sendPurchaseConfirmation` call)
- `src/lib/actions/free-registration.ts` (modified — added fire-and-forget `sendPurchaseConfirmation` call)
- `convex/tickets.ts` (modified — added `query` import + `getUniqueEmailsByEventId` query)
- `src/components/custom/cancel-event-dialog.tsx` (modified — added `sendEventCancellation` fire-and-forget after mutation)
- `src/lib/actions/__tests__/email.test.ts` (created — 25 contract tests)
- `convex/tickets.test.ts` (modified — added 10 `getUniqueEmailsByEventId` contract tests)
- `src/components/custom/__tests__/cancel-event-dialog.test.tsx` (modified — added mock for `@/lib/actions/events`)
- `package.json` (modified — `resend`, `@react-email/components` added to dependencies)
- `pnpm-lock.yaml` (modified — lockfile updated)
