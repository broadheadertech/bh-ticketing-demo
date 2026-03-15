# Story 4.2: QR Code Delivery & In-App Viewing

Status: done

## Story

As an **attendee**,
I want to view my QR codes in-app and receive them via email,
So that I can show my ticket at the event door.

## Acceptance Criteria

1. **Given** I have purchased tickets (paid or free)
   **When** I navigate to `/tickets` (My Tickets page, authenticated)
   **Then** I see a list of all my tickets with event name, date, tier name, and QR code image
   **And** a text-based ticket code (shortened ticket ID) is displayed alongside the QR for accessibility (FR30, NFR27)

2. **Given** I am viewing my tickets on mobile
   **When** I tap a ticket's QR area
   **Then** a full-screen dialog opens showing the QR code enlarged
   **And** screen brightness maximization is attempted (if `screen.orientation.lock` or WakeLock API is supported)

3. **Given** the purchase confirmation email is sent (Stripe webhook or free registration)
   **When** the email is composed by `sendPurchaseConfirmation`
   **Then** a QR code image (200×200 PNG data URL) is included in the email body for each ticket
   **And** the text-based ticket code is displayed below each QR image for screen readers (FR26, FR30)

4. **Given** the `/tickets` page is loading data
   **When** the Convex query is in-flight
   **Then** skeleton placeholders are shown for the ticket list (consistent loading pattern)

5. **Given** I have no tickets
   **When** I navigate to `/tickets`
   **Then** an empty state is shown with a call-to-action to discover events

## Tasks / Subtasks

- [x] **Task 1: Add `getMyTickets` Convex query in `convex/tickets.ts`** (AC: #1, #4, #5)
  - [x] 1.1 Add a new authenticated query `getMyTickets` to `convex/tickets.ts`:
    ```typescript
    export const getMyTickets = query({
      args: {},
      handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError("Unauthorized");
        const email = identity.email;
        if (!email) throw new ConvexError("No email in Clerk identity");

        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_buyer_email", (q) => q.eq("buyerEmail", email))
          .order("desc")
          .collect();

        return await Promise.all(
          tickets.map(async (ticket) => {
            const event = await ctx.db.get(ticket.eventId);
            const tier = await ctx.db.get(ticket.tierId);
            return {
              ...ticket,
              eventTitle: event?.title ?? "Unknown Event",
              eventDate: event?.date ?? 0,
              eventTime: event?.time ?? "",
              venueName: event?.venueName,
              tierName: tier?.name ?? "Unknown Tier",
            };
          })
        );
      },
    });
    ```
  - [x] 1.2 This query uses `ctx.auth.getUserIdentity()` — no extra `querySecret` arg needed; Clerk handles auth via Convex provider
  - [x] 1.3 Use `by_buyer_email` index (already exists in schema) for efficient lookup
  - [x] 1.4 Returns tickets ordered `desc` (newest first) with enriched event/tier display names

- [x] **Task 2: Create `/tickets` page** (AC: #1, #4, #5)
  - [x] 2.1 Create `src/app/(dashboard)/tickets/page.tsx` as a `"use client"` component (matches all existing dashboard page patterns — see `dashboard/events/[eventId]/page.tsx`)
  - [x] 2.2 Use `useQuery(api.tickets.getMyTickets)` — no args needed (query reads email from Clerk identity via `ctx.auth`)
  - [x] 2.3 Loading state: show `Skeleton` cards while `tickets === undefined`
  - [x] 2.4 Empty state: when `tickets.length === 0`, show a message and a link to `/` to discover events
  - [x] 2.5 For each ticket, render a `Card` with:
    - Event title (heading), event date/time, venue name (if present), tier name
    - `<TicketQrDisplay qrCode={ticket.qrCode} ticketId={ticket._id} />`
    - Skip QR display if `ticket.qrCode === ""` (QR generation is async and may not be ready yet — show "QR code pending" text)
  - [x] 2.6 Create `src/app/(dashboard)/tickets/loading.tsx` with skeleton matching the page structure

- [x] **Task 3: Create `src/components/custom/ticket-qr-display.tsx`** (AC: #1, #2)
  - [x] 3.1 Create a `"use client"` component `TicketQrDisplay`:
    ```typescript
    "use client";
    import { useEffect, useState } from "react";
    import QRCode from "qrcode";
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
    import { Skeleton } from "@/components/ui/skeleton";

    type Props = { qrCode: string; ticketId: string };

    export function TicketQrDisplay({ qrCode, ticketId }: Props) {
      const [dataUrl, setDataUrl] = useState<string>("");
      const [fullscreen, setFullscreen] = useState(false);

      useEffect(() => {
        if (!qrCode) return;
        QRCode.toDataURL(qrCode, {
          errorCorrectionLevel: "M",
          width: 200,
          margin: 2,
        }).then(setDataUrl);
      }, [qrCode]);

      const textCode = formatTextCode(ticketId);

      if (!dataUrl) return <Skeleton className="h-[200px] w-[200px]" />;

      return (
        <>
          <button
            onClick={() => setFullscreen(true)}
            className="focus:outline-none focus:ring-2 focus:ring-ring rounded"
            aria-label="Open full-screen QR code"
          >
            <img src={dataUrl} alt="Ticket QR code" width={200} height={200} />
          </button>
          <p className="text-xs font-mono text-muted-foreground mt-1">{textCode}</p>

          <Dialog open={fullscreen} onOpenChange={setFullscreen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Your Ticket QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4">
                <img src={dataUrl} alt="Ticket QR code full size" width={300} height={300} />
                <p className="text-sm font-mono text-muted-foreground">{textCode}</p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    /** Formats the Convex ticket ID as a human-readable code: first 8 chars in pairs */
    function formatTextCode(ticketId: string): string {
      const code = ticketId.slice(0, 8).toUpperCase();
      return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    }
    ```
  - [x] 3.2 `QRCode.toDataURL()` is called inside `useEffect` (runs client-side only, not during SSR) — this is the safe pattern for using `qrcode` in Client Components
  - [x] 3.3 The `Dialog` is from `@/components/ui/dialog` (existing shadcn/ui component)
  - [x] 3.4 Text code format: `formatTextCode(ticketId)` extracts first 8 chars, uppercase, formatted as `XXXX-XXXX` for readability (e.g., `JX7A-BC12`) — satisfies FR30 accessibility requirement
  - [x] 3.5 Screen brightness: add a `useEffect` that calls `navigator.wakeLock.request("screen")` when `fullscreen` is `true` and releases it when `false`. Wrap in try/catch since WakeLock API is not available in all browsers.
  - [x] 3.6 Dynamic import: in the `/tickets` page, import `TicketQrDisplay` with `dynamic(() => import("@/components/custom/ticket-qr-display"), { ssr: false })` to prevent SSR issues with `qrcode`'s canvas dependency

- [x] **Task 4: Update `sendPurchaseConfirmation` to include QR images in email** (AC: #3)
  - [x] 4.1 Add `stripeSessionId?: string` to the `sendPurchaseConfirmation` params type in `src/lib/actions/email.ts`
  - [x] 4.2 When `stripeSessionId` is provided, fetch tickets using `api.tickets.getTicketsByStripeSessionId` (already exists from Story 4.1):
    ```typescript
    let qrItems: { qrDataUrl: string; textCode: string }[] = [];
    if (params.stripeSessionId) {
      try {
        const tickets = await convex.query(api.tickets.getTicketsByStripeSessionId, {
          stripeSessionId: params.stripeSessionId,
          querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
        });
        // Generate QR data URL for each ticket that has a qrCode
        qrItems = await Promise.all(
          tickets
            .filter((t) => t.qrCode !== "")
            .map(async (t) => ({
              qrDataUrl: await QRCode.toDataURL(t.qrCode, {
                errorCorrectionLevel: "M",
                width: 200,
                margin: 2,
              }),
              textCode: formatTextCode(t._id),
            }))
        );
      } catch (err) {
        // QR email failure must NOT block confirmation email — degrade gracefully
        console.error("Failed to generate QR codes for email:", err);
      }
    }
    ```
  - [x] 4.3 Pass `qrItems` to `TicketConfirmationEmail` template
  - [x] 4.4 Add `import QRCode from "qrcode"` at top of `email.ts` (server-side file — safe import)
  - [x] 4.5 Add `formatTextCode` helper (same 8-char format as component) — extract as shared utility OR duplicate in email.ts (two usages in different layers; not worth sharing across server/client boundary)
  - [x] 4.6 If `qrItems` generation fails, send email WITHOUT QR codes (graceful degradation) — the email is fire-and-forget anyway

- [x] **Task 5: Update `TicketConfirmationEmail` template** (AC: #3)
  - [x] 5.1 Add `qrItems?: { qrDataUrl: string; textCode: string }[]` to the `TicketConfirmationEmailProps` type
  - [x] 5.2 Replace the current footer text `"Check your dashboard for ticket QR codes once they are available."` with:
    - If `qrItems && qrItems.length > 0`: a QR section with each QR image and text code
    - If `qrItems` is empty/absent: keep the current fallback text (for backward compatibility)
  - [x] 5.3 Use `<Img>` from `@react-email/components` (NOT `<img>` or `<Image>`) for email QR images:
    ```tsx
    import { Img } from "@react-email/components";
    // ...
    {qrItems?.map((item, i) => (
      <Section key={i}>
        <Text style={labelStyle}>Your Ticket QR Code</Text>
        <Img src={item.qrDataUrl} width={200} height={200} alt="Ticket QR Code" />
        <Text style={textCodeStyle}>{item.textCode}</Text>
      </Section>
    ))}
    ```
  - [x] 5.4 The `qrDataUrl` is a `data:image/png;base64,...` string — most email clients support inline data URLs, but for those that don't, the text code provides the fallback

- [x] **Task 6: Update callers to pass `stripeSessionId`** (AC: #3)
  - [x] 6.1 In `src/lib/stripe/webhooks.ts`, add `stripeSessionId: session.id` to the `sendPurchaseConfirmation` call:
    ```typescript
    sendPurchaseConfirmation({
      eventId,
      tierSelections,
      buyerEmail,
      totalAmountCentavos: session.amount_total ?? 0,
      stripeSessionId: session.id,  // NEW — enables QR in email
    }).catch((err) => console.error("Confirmation email failed:", err));
    ```
  - [x] 6.2 In `src/lib/actions/free-registration.ts`, add the synthetic session ID:
    ```typescript
    sendPurchaseConfirmation({
      eventId: input.eventId,
      tierSelections: input.tierSelections,
      buyerEmail: input.buyerEmail,
      totalAmountCentavos: "free",
      stripeSessionId: `free_${input.eventId}_${input.buyerEmail}`,  // NEW
    }).catch((err) => console.error("Confirmation email failed:", err));
    ```
  - [x] 6.3 Note: `stripeSessionId` is optional in `sendPurchaseConfirmation` — old callers without it still work (backward compatible)

- [x] **Task 7: Write tests** (AC: #1, #3)
  - [x] 7.1 Add contract tests to `convex/tickets.test.ts` for `getMyTickets`:
    - Auth contract: unauthenticated call (no identity) throws Unauthorized
    - Result shape: returned items have `eventTitle`, `tierName`, `qrCode`, `qrSignature` fields
    - Ordering: most recent first (descending `createdAt`)
  - [x] 7.2 Add tests to `src/lib/actions/__tests__/email.test.ts` for QR-in-email behavior:
    - `sendPurchaseConfirmation` without `stripeSessionId` → sends email without QR items (backward compat)
    - `formatTextCode` helper: 8-char extraction, uppercase, hyphen format (e.g., `"jx7abc12def456"` → `"JX7A-BC12"`)
  - [x] 7.3 If `email.test.ts` already mocks the Convex client, verify the mock covers `getTicketsByStripeSessionId`

## Dev Notes

### Established Codebase Patterns (CRITICAL — follow exactly)

**All dashboard pages are `"use client"` components** using `useQuery` from `convex/react`. NO `preloadQuery` or Server Components in dashboard. Pattern confirmed by reading `dashboard/events/[eventId]/page.tsx`.

**Loading state pattern:**
```tsx
if (tickets === undefined) {
  return <div className="space-y-4"><Skeleton className="h-32 w-full" />...</div>;
}
```

**Import pattern for Convex:**
```typescript
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
// adjust relative depth based on file location
```

**Component pattern:**
```typescript
// For dashboard page at src/app/(dashboard)/tickets/page.tsx:
import { api } from "../../../../convex/_generated/api";
```

**shadcn/ui components available:** `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Skeleton`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Badge`

**RoleGuard component:**
- Existing dashboard pages use `<RoleGuard requiredRoles={[...]}>`
- For the `/tickets` page (buyer-facing), do NOT wrap in `RoleGuard` — all authenticated users can view their tickets regardless of role
- Just ensure the user is signed in (Convex query handles auth via `ctx.auth`)

### QR Code Display: `useEffect` Pattern

The `qrcode` library works in Node.js AND browser, but must not run during SSR. The safe pattern:

```typescript
// SAFE: runs only after hydration
useEffect(() => {
  if (!qrCode) return;
  QRCode.toDataURL(qrCode, { width: 200 }).then(setDataUrl);
}, [qrCode]);
```

Use `dynamic(() => import("..."), { ssr: false })` in the parent page to prevent the module from being included in SSR bundle:
```typescript
import dynamic from "next/dynamic";
const TicketQrDisplay = dynamic(
  () => import("@/components/custom/ticket-qr-display").then(m => ({ default: m.TicketQrDisplay })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-[200px]" /> }
);
```

### WakeLock API (Screen Brightness)

```typescript
useEffect(() => {
  let wakeLock: WakeLockSentinel | null = null;
  if (fullscreen && "wakeLock" in navigator) {
    navigator.wakeLock.request("screen").then((lock) => {
      wakeLock = lock;
    }).catch(() => {}); // silently ignore — not available in all browsers/contexts
  }
  return () => {
    wakeLock?.release().catch(() => {});
  };
}, [fullscreen]);
```

### `getMyTickets` Convex Auth Pattern

This query uses Clerk-native auth via `ctx.auth.getUserIdentity()`, NOT the `querySecret` pattern used for internal server-to-server calls. This is the Clerk + Convex integration pattern where Clerk's JWT token is passed automatically by the ConvexClerkProvider.

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Unauthorized");
const email = identity.email;  // Clerk provides email in identity
```

The Convex `by_buyer_email` index (already in schema) makes this O(log n) rather than a full table scan.

### Email QR: Inline Data URLs in React Email

`@react-email/components` `<Img>` supports `data:` URLs for inline images. This avoids the need to host QR images externally:

```tsx
import { Img } from "@react-email/components";
<Img src={dataUrl} width={200} height={200} alt="Ticket QR Code" />
```

**Important:** Some email clients (Outlook, older Gmail) strip or block inline data URL images. The text code below each QR serves as the accessibility fallback. This is acceptable for MVP; hosted URLs could be added later.

### `sendPurchaseConfirmation` Update

The function already imports `QRCode` is NOT imported — you need to add it:
```typescript
import QRCode from "qrcode";
```

The `formatTextCode` helper (converts Convex ticket `_id` to readable code):
```typescript
function formatTextCode(ticketId: string): string {
  const code = ticketId.slice(0, 8).toUpperCase();
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}
```

### Ticket `qrCode` Field May Be Empty

Tickets are created with `qrCode: ""` and `qrSignature: ""` (Story 4.1 two-phase flow). The QR generation call is try/catch — a QR failure means `qrCode` stays `""`. Always check `ticket.qrCode !== ""` before attempting to display or generate QR images.

### File Structure

```
New files:
  src/app/(dashboard)/tickets/page.tsx        # My Tickets page (client component)
  src/app/(dashboard)/tickets/loading.tsx     # Skeleton loading state
  src/components/custom/ticket-qr-display.tsx # QR display + full-screen modal

Modified files:
  convex/tickets.ts                           # + getMyTickets query
  convex/tickets.test.ts                      # + getMyTickets contract tests
  src/lib/actions/email.ts                    # + stripeSessionId param + QR generation
  src/lib/email/templates/ticket-confirmation.tsx  # + qrItems display
  src/lib/stripe/webhooks.ts                  # + stripeSessionId in sendPurchaseConfirmation call
  src/lib/actions/free-registration.ts        # + stripeSessionId in sendPurchaseConfirmation call
  src/lib/actions/__tests__/email.test.ts     # + QR email tests
```

### Previous Story Learnings (Stories 4.1, 3.5, 3.4)

- **`qrCode` field stores compact JSON payload string** (`~150 chars`), NOT a base64 image. Call `QRCode.toDataURL(ticket.qrCode)` to generate the displayable PNG.
- **`qrCode === ""`** if QR generation failed — always guard against this
- **Fire-and-forget pattern**: `somePromise().catch(console.error)` — never `await` side effects in critical paths
- **`Promise.allSettled` Resend SDK**: always check `!r.value.error` alongside `r.status === "fulfilled"`
- **`formatCurrency(0)` returns `"₱0.00"`, NOT `"Free"`** — pass string `"free"` for free tickets
- **Convex `eslint-disable-next-line @typescript-eslint/no-explicit-any`** before `as any` casts for Id types
- **`ctx.auth.getUserIdentity().email`** is the standard field for email in Clerk + Convex integration
- **Dashboard pages are ALL `"use client"`** — do NOT create Server Components for authenticated dashboard routes

### References

- [Source: epics.md — Epic 4, Story 4.2 — full ACs and requirements]
- [Source: architecture.md — QR Ticketing FR25-30 — qrcode + html5-qrcode libraries]
- [Source: architecture.md — File/Folder Structure — src/app/(dashboard)/tickets/page.tsx]
- [Source: architecture.md — Component Boundaries — "use client" for interactive UI]
- [Source: architecture.md — Bundle optimization — dynamic imports for heavy client components]
- [Source: architecture.md — Email: Resend + React Email — lib/email/templates/]
- [Source: convex/schema.ts — tickets table — qrCode, qrSignature, by_buyer_email index]
- [Source: src/lib/qr/generate.ts — generateQrCodeData — qrCode is JSON payload string]
- [Source: src/lib/stripe/webhooks.ts — processCheckoutCompleted — integration point]
- [Source: src/lib/actions/free-registration.ts — registerFreeEvent — integration point]
- [Source: src/lib/actions/email.ts — sendPurchaseConfirmation — file to modify]
- [Source: src/lib/email/templates/ticket-confirmation.tsx — current template — file to modify]
- [Source: src/app/(dashboard)/dashboard/events/[eventId]/page.tsx — established "use client" dashboard pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

N/A — clean implementation run with no blocking errors.

### Completion Notes List

- All 7 tasks completed in single session. 494 tests passing (42 test files), 0 failures.
- `getMyTickets` Convex query uses Clerk-native auth (`ctx.auth.getUserIdentity()`) — no `querySecret` needed. Returns enriched tickets with `eventTitle`, `eventDate`, `eventTime`, `venueName`, `tierName`.
- `/tickets` page uses `dynamic(() => import(...), { ssr: false })` for `TicketQrDisplay` to prevent SSR issues with `qrcode` canvas dependency.
- QR codes displayed client-side via `useEffect` + `QRCode.toDataURL(ticket.qrCode)` — `qrCode` field is JSON payload string, not an image.
- WakeLock API wrapped in try/catch inside `useEffect(fullscreen)` — fails silently on unsupported browsers.
- `formatTextCode`: first 8 chars uppercase as `XXXX-XXXX` (e.g., `JX7A-BC12`) satisfies FR30 accessibility requirement.
- Email QR integration: `sendPurchaseConfirmation` upgraded with optional `stripeSessionId` param (backward-compatible). Fetches tickets via `getTicketsByStripeSessionId`, generates `data:image/png` URLs, passes `qrItems` to `TicketConfirmationEmail`. QR failure degrades gracefully — email still sends.
- `TicketConfirmationEmail` uses `<Img>` from `@react-email/components` for QR images; text code below each QR as accessibility fallback.
- Both Stripe webhook and free-registration callers updated to pass `stripeSessionId`.
- Story 4.2 tests: 9 `getMyTickets` contract tests in `convex/tickets.test.ts`, 8 new tests in `email.test.ts` (4 `formatTextCode` + 4 `qrItems` prop contracts). email.test.ts total: 30 tests.

**Code Review Fixes (code-review workflow):**
- H1: Moved page/loading from `src/app/(dashboard)/tickets/` → `src/app/(dashboard)/dashboard/tickets/` to match sidebar nav `/dashboard/tickets` href and Next.js `(dashboard)` route group convention.
- H2: Removed redundant `<Hr>` inside `{qrItems}` conditional block in `ticket-confirmation.tsx` (duplicate separator when QR codes present).
- M1: Added `.catch(console.error)` to `QRCode.toDataURL().then(setDataUrl)` in `ticket-qr-display.tsx` — prevents unhandled rejection when QR rendering fails.
- M2: Marked task subtask 3.1 `[x]` in story file (was unchecked while parent task 3 was complete).
- M3: Added "MUST stay in sync" comment to `formatTextCode` in `email.ts` to prevent drift from component implementation.
- 494 tests passing post-review fixes.

### File List

**New files:**
- `src/app/(dashboard)/dashboard/tickets/page.tsx` — My Tickets page (client component, `useQuery(getMyTickets)`)
- `src/app/(dashboard)/dashboard/tickets/loading.tsx` — Skeleton loading state (3 card skeletons)
- `src/components/custom/ticket-qr-display.tsx` — QR display thumbnail + full-screen Dialog + WakeLock

**Modified files:**
- `convex/tickets.ts` — Added `getMyTickets` authenticated query
- `convex/tickets.test.ts` — Added 9 `getMyTickets` contract tests
- `src/lib/actions/email.ts` — Added `stripeSessionId` param, QR generation block, `formatTextCode` helper
- `src/lib/email/templates/ticket-confirmation.tsx` — Added `qrItems` prop and QR section rendering
- `src/lib/stripe/webhooks.ts` — Added `stripeSessionId: session.id` to `sendPurchaseConfirmation` call
- `src/lib/actions/free-registration.ts` — Added synthetic `stripeSessionId` to `sendPurchaseConfirmation` call
- `src/lib/actions/__tests__/email.test.ts` — Added 8 QR-related contract tests
