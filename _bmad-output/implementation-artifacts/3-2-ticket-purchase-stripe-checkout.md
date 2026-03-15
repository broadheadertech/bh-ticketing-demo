# Story 3.2: Ticket Purchase & Stripe Checkout

Status: done

## Story

As an **attendee**,
I want to select tickets and pay via Stripe Checkout,
So that I can securely purchase tickets for an event.

## Acceptance Criteria

1. **Given** I am viewing a published event with available tickets **When** I use the `TicketPurchaseCard` component to select ticket quantities **Then** I see a running total in PHP (formatted with `formatCurrency`) **And** I can select 1 or more tickets across one or more tiers (FR18)

2. **Given** I click "Buy Tickets" **When** the `purchaseTickets` Server Action runs **Then** ticket availability is checked against current inventory (FR23) **And** a Stripe Checkout Session is created with Separate Charges and Transfers (FR20) **And** the session uses PHP currency **And** I am redirected to Stripe Checkout within 3 seconds (NFR2) **And** payment card data never touches the platform server (NFR11)

3. **Given** tickets are sold out for a tier I selected **When** the inventory check runs **Then** I see an error "Some tickets are no longer available" and am shown updated availability

4. **Given** I am not authenticated **When** I try to purchase tickets **Then** I am redirected to sign in, then returned to the event page after authentication

## Tasks / Subtasks

- [x] **Task 1: Add public Convex queries for events and tiers** (AC: #1, #2, #3)
  - [x] 1.1 Add `getPublicEventById` query to `convex/events.ts` — no auth required, only returns published events (throws `ConvexError("Event not found")` if not found or not published)
  - [x] 1.2 Add `getPublicTiersByEventId` query to `convex/ticketTiers.ts` — no auth required, returns tiers for a published event sorted by `sortOrder`

- [x] **Task 2: Create `purchaseTickets` Server Action** (AC: #2, #3)
  - [x] 2.1 Create `src/lib/actions/stripe-checkout.ts` with `"use server"` directive
  - [x] 2.2 Implement `purchaseTickets(args)` — validates inventory, creates Stripe Checkout Session with SCT, returns `{ success, data: { url }, error }`
  - [x] 2.3 Validate tier selections with `purchaseSchema` (Zod) before hitting Stripe
  - [x] 2.4 Fetch tier prices and event/creator data server-side via `ConvexHttpClient` (never trust client-provided prices)
  - [x] 2.5 Add `application_fee_amount` and `transfer_data.destination` for Stripe Connect SCT model

- [x] **Task 3: Create Zod validator for purchase input** (AC: #2)
  - [x] 3.1 Create `src/lib/validators/ticket.ts` with `purchaseSchema` — validates `eventId: string`, `tierSelections: { tierId: string; quantity: number }[]` (quantity 1–10 per tier, at least 1 selection)

- [x] **Task 4: Create `TicketPurchaseCard` client component** (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `src/components/custom/ticket-purchase-card.tsx` as `"use client"` component
  - [x] 4.2 Render quantity stepper (+/−) for each tier showing name, price (via `formatCurrency`), and available count
  - [x] 4.3 Show running total in PHP below tier list using `formatCurrency`
  - [x] 4.4 "Buy Tickets" button — if not signed in: redirect to `/sign-in?redirect_url=/events/${eventId}`, else call `purchaseTickets`
  - [x] 4.5 On `purchaseTickets` success: `window.location.href = result.data.url` (external Stripe redirect)
  - [x] 4.6 On inventory error: show error toast via `showErrorFromCatch`
  - [x] 4.7 Disable "Buy Tickets" if no tickets selected or total quantity is 0
  - [x] 4.8 Use `useTransition` for pending state — button shows "Processing..." while action runs

- [x] **Task 5: Create public event detail page** (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `src/app/(public)/events/[eventId]/page.tsx` — renders event details + `TicketPurchaseCard`
  - [x] 5.2 Use `useQuery(api.events.getPublicEventById)` + `useQuery(api.ticketTiers.getPublicTiersByEventId)` for reactive data
  - [x] 5.3 Show event artwork, title, description, date, time, venue, creator profile
  - [x] 5.4 Show "This event is not available for purchase." if no tiers or no creator Stripe account

- [x] **Task 6: Create Stripe return URL page** (AC: #2)
  - [x] 6.1 Create `src/app/(public)/events/[eventId]/success/page.tsx` — shown after successful Stripe payment
  - [x] 6.2 Show "Payment successful! Your tickets will be emailed to you." message (actual ticket creation happens via webhook in Story 3.3)
  - [x] 6.3 Link back to /events and to `/dashboard`

- [x] **Task 7: Write tests** (AC: #1, #2, #3, #4)
  - [x] 7.1 Create `src/lib/actions/__tests__/stripe-checkout.test.ts` — contract tests for `purchaseTickets` return shapes, inventory check logic, Zod validation
  - [x] 7.2 Create `convex/publicEvents.test.ts` — contract tests for `getPublicEventById` and `getPublicTiersByEventId` (only published events accessible, sorting)
  - [x] 7.3 Create `src/components/custom/__tests__/ticket-purchase-card.test.tsx` — component tests for quantity selection, running total calculation, disabled state, auth redirect

- [x] **Task 8: Final validation**
  - [x] 8.1 `pnpm build` — succeeds
  - [x] 8.2 `pnpm test:run` — all 350 tests pass
  - [x] 8.3 `pnpm lint` — no new errors (5 pre-existing warnings only)

## Dev Notes

### What Story 3.2 IS and IS NOT

**IS:**
- Public event detail page (`/events/[eventId]`) with ticket purchase UI
- `TicketPurchaseCard` component with quantity selectors and running PHP total
- `purchaseTickets` Server Action: inventory check + Stripe Checkout Session (SCT model)
- Stripe success/cancel redirect URL handling
- Public Convex queries for events and tiers (no auth required)
- Zod validator `purchaseSchema` in `src/lib/validators/ticket.ts`

**IS NOT:**
- Ticket record creation — Story 3.3 (webhook handler does this)
- QR code generation — Story 4.1
- Email confirmation — Story 3.5
- Free event registration — Story 3.4 (no Stripe)
- Webhook handler at `/api/webhooks/stripe` — Story 3.3
- `STRIPE_WEBHOOK_SECRET` env var — Story 3.3

### Critical: What Previous Stories Already Built

**Reuse existing:**
- `src/lib/stripe/config.ts` — `stripe` singleton client already created in Story 3.1 — REUSE
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_APP_URL` env vars already set in Story 3.1 — REUSE
- `formatCurrency(centavos: number)` in `src/lib/utils/format.ts` — REUSE for PHP display
- `showSuccess`, `showErrorFromCatch` from `src/lib/utils/toast-helpers.ts` — REUSE
- `getAuthenticatedUser` pattern from `convex/lib/auth.ts` — NOT needed for public queries, but understand the auth pattern
- `convex/ticketTiers.ts` `getTiersByEventId` exists (authenticated) — ADD public variant alongside it
- `convex/events.ts` `getEventById` exists (authenticated) — ADD public variant alongside it

**Architecture constraint confirmed:**
- `stripe-checkout.ts` is the mandated file name per `architecture.md` line 523
- `purchaseTickets` is the mandated function name per `architecture.md` line 428
- `ticket.ts` is the mandated validator file per `architecture.md` line 828

### Task 1: Public Convex Queries Pattern

```typescript
// convex/events.ts — ADD this query (no auth, public access)
export const getPublicEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "published") {
      throw new ConvexError("Event not found");
    }
    const artworkUrl = event.artworkStorageId
      ? await ctx.storage.getUrl(event.artworkStorageId)
      : null;
    const creatorProfile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", event.creatorId))
      .unique();
    return {
      ...event,
      artworkUrl,
      creatorProfile: creatorProfile
        ? { displayName: creatorProfile.displayName, profilePhotoUrl: creatorProfile.profilePhotoUrl ?? null }
        : null,
    };
  },
});

// convex/ticketTiers.ts — ADD this query (no auth, public access)
export const getPublicTiersByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // Verify event is published first
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "published") return [];
    return await ctx.db
      .query("ticketTiers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .order("asc")
      .collect();
    // Note: Sort by sortOrder client-side or add a sortOrder index if needed
  },
});
```

**IMPORTANT:** When adding `getPublicTiersByEventId`, Convex does not allow `.order()` with `.withIndex()` on a compound value. Sort the results by `sortOrder` after fetching:
```typescript
const tiers = await ctx.db.query("ticketTiers").withIndex("by_event_id", (q) => q.eq("eventId", args.eventId)).collect();
return tiers.sort((a, b) => a.sortOrder - b.sortOrder);
```

### Task 2: `purchaseTickets` Server Action Pattern

```typescript
// src/lib/actions/stripe-checkout.ts
"use server";

import { stripe } from "@/lib/stripe/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { purchaseSchema } from "@/lib/validators/ticket";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee (configurable)

export async function purchaseTickets(input: {
  eventId: string;
  tierSelections: { tierId: string; quantity: number }[];
  buyerEmail: string;
  creatorStripeAccountId: string;
}): Promise<{
  success: boolean;
  data?: { url: string };
  error?: string;
}> {
  try {
    // Validate input shape
    const parsed = purchaseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    // Fetch tiers server-side (never trust client prices)
    const tiers = await convex.query(api.ticketTiers.getPublicTiersByEventId, {
      eventId: input.eventId as Id<"events">,
    });

    // Inventory check
    const lineItems = [];
    let totalAmount = 0;
    for (const selection of input.tierSelections) {
      const tier = tiers.find((t) => t._id === selection.tierId);
      if (!tier) return { success: false, error: "Invalid tier selected" };
      const available = tier.quantity - tier.soldCount;
      if (available < selection.quantity) {
        return { success: false, error: "Some tickets are no longer available" };
      }
      totalAmount += tier.price * selection.quantity;
      lineItems.push({
        price_data: {
          currency: "php",
          product_data: { name: `${tier.name}` },
          unit_amount: tier.price, // centavos
        },
        quantity: selection.quantity,
      });
    }

    // Create Stripe Checkout Session — Separate Charges and Transfers
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: Math.round(totalAmount * PLATFORM_FEE_PERCENT),
        transfer_data: {
          destination: input.creatorStripeAccountId,
        },
      },
      metadata: {
        eventId: input.eventId,
        tierSelections: JSON.stringify(input.tierSelections),
        buyerEmail: input.buyerEmail,
      },
      success_url: `${APP_URL}/events/${input.eventId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/events/${input.eventId}`,
    });

    return { success: true, data: { url: session.url! } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create checkout session",
    };
  }
}
```

**CRITICAL SECURITY NOTE:**
- `tier.price` is fetched from Convex DB server-side — NOT from client input
- `creatorStripeAccountId` is fetched from the **client** via `useQuery(api.users.getCurrentUser)` on the creator — pass it from the page/component which reads it from the DB. This is acceptable since the value is public (connects to creator's own Stripe account).
- `buyerEmail` comes from `useUser().user?.emailAddresses[0]?.emailAddress` (Clerk client-side). The Server Action trusts this since Stripe uses it for receipts only — no financial security impact.

**Alternative (simpler) approach:** The event page fetches the creator's event (which includes `creatorId`), and the Server Action fetches the creator's `stripeAccountId` via `ConvexHttpClient` using a new `getCreatorStripeAccount` public query. This avoids passing `creatorStripeAccountId` from the client entirely. Implement whichever approach is cleaner.

### Task 3: Zod Validator

```typescript
// src/lib/validators/ticket.ts
import { z } from "zod";

export const purchaseSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  tierSelections: z
    .array(
      z.object({
        tierId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1, "Select at least one ticket")
    .max(10, "Too many tiers selected"),
  buyerEmail: z.string().email("Invalid email"),
  creatorStripeAccountId: z.string().startsWith("acct_", "Invalid Stripe account"),
});
```

### Task 4: `TicketPurchaseCard` Component Pattern

```tsx
// src/components/custom/ticket-purchase-card.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { purchaseTickets } from "@/lib/actions/stripe-checkout";

type Tier = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  description?: string;
};

export function TicketPurchaseCard({
  eventId,
  tiers,
  creatorStripeAccountId,
}: {
  eventId: string;
  tiers: Tier[];
  creatorStripeAccountId: string;
}) {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  const total = tiers.reduce(
    (sum, tier) => sum + tier.price * (quantities[tier._id] ?? 0),
    0
  );
  const totalTickets = Object.values(quantities).reduce((s, q) => s + q, 0);

  function handleQuantityChange(tierId: string, delta: number) {
    const tier = tiers.find((t) => t._id === tierId)!;
    const available = tier.quantity - tier.soldCount;
    const current = quantities[tierId] ?? 0;
    const next = Math.max(0, Math.min(available, current + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  }

  function handleBuyTickets() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/events/${eventId}`);
      return;
    }
    const selections = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tierId, quantity }));

    startTransition(async () => {
      try {
        const result = await purchaseTickets({
          eventId,
          tierSelections: selections,
          buyerEmail: user!.emailAddresses[0]?.emailAddress ?? "",
          creatorStripeAccountId,
        });
        if (!result.success || !result.data) {
          showErrorFromCatch(new Error(result.error ?? "Purchase failed"));
          return;
        }
        window.location.href = result.data.url; // external Stripe redirect
      } catch (err) {
        showErrorFromCatch(err);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.map((tier) => {
          const available = tier.quantity - tier.soldCount;
          const qty = quantities[tier._id] ?? 0;
          return (
            <div key={tier._id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(tier.price)} · {available} remaining
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(tier._id, -1)}
                  disabled={qty === 0}
                >
                  −
                </Button>
                <span className="w-6 text-center">{qty}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(tier._id, 1)}
                  disabled={qty >= available}
                >
                  +
                </Button>
              </div>
            </div>
          );
        })}
        {total > 0 && (
          <div className="border-t pt-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        )}
        <Button
          className="w-full"
          onClick={handleBuyTickets}
          disabled={totalTickets === 0 || isPending}
        >
          {isPending ? "Processing..." : isSignedIn ? "Buy Tickets" : "Sign in to Buy Tickets"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Task 5: Public Event Detail Page

```tsx
// src/app/(public)/events/[eventId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketPurchaseCard } from "@/components/custom/ticket-purchase-card";
import { formatDate } from "@/lib/utils/format";

export default function PublicEventDetailPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;

  const event = useQuery(api.events.getPublicEventById, { eventId });
  const tiers = useQuery(api.ticketTiers.getPublicTiersByEventId, { eventId });

  if (event === undefined || tiers === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }

  const hasPurchasableTiers = tiers.length > 0;
  // Need creator's stripeAccountId — fetch from creator user record
  // The event.creatorId is available; we need a way to get the stripe account
  // Option: add creatorStripeAccountId to getPublicEventById return
  // OR: use a separate query getCreatorStripeAccount(creatorId)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Artwork */}
        {event.artworkUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.artworkUrl} alt={event.title} className="w-full rounded-lg object-cover max-h-64" />
        )}
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <p className="text-muted-foreground">{formatDate(event.date)} · {event.time}</p>
        {event.venueName && <p className="text-muted-foreground">{event.venueName}</p>}
        <p className="whitespace-pre-wrap">{event.description}</p>
      </div>
      <div>
        {hasPurchasableTiers && event.creatorStripeAccountId ? (
          <TicketPurchaseCard
            eventId={eventId}
            tiers={tiers}
            creatorStripeAccountId={event.creatorStripeAccountId}
          />
        ) : (
          <p className="text-muted-foreground">Tickets not available.</p>
        )}
      </div>
    </div>
  );
}
```

**CRITICAL NOTE on `creatorStripeAccountId`:** The `getPublicEventById` query must also return the creator's `stripeAccountId`. Modify the query to additionally fetch `creator.stripeAccountId` from the `users` table:

```typescript
// In getPublicEventById handler, add:
const creator = await ctx.db.get(event.creatorId);
// Return includes:
creatorStripeAccountId: creator?.stripeAccountId ?? null,
```

This exposes the Stripe account ID publicly, which is acceptable — it's a Stripe-internal identifier, not a secret. Stripe validates this on the server side.

### Task 6: Success Page

```tsx
// src/app/(public)/events/[eventId]/success/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PurchaseSuccessPage() {
  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold">Payment successful!</h1>
      <p className="text-muted-foreground">
        Your tickets will be emailed to you shortly. Check your inbox in a few minutes.
      </p>
      <div className="flex gap-4 justify-center">
        <Button asChild variant="outline">
          <Link href="/events">Browse more events</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
```

### Task 7: Test Patterns

**Server Action contract tests:**
```typescript
// src/lib/actions/__tests__/stripe-checkout.test.ts
describe("purchaseTickets contract", () => {
  it("returns success shape with checkout url", () => { /* mock result */ });
  it("returns error when inventory insufficient", () => { /* mock error */ });
  it("returns error on Stripe API failure", () => { /* mock error */ });
  it("metadata includes eventId, tierSelections, buyerEmail", () => { /* verify metadata structure */ });
});

describe("purchaseSchema validation", () => {
  it("rejects empty tierSelections array", () => { /* zod validation */ });
  it("rejects quantity > 10", () => { /* zod validation */ });
  it("rejects invalid email", () => { /* zod validation */ });
  it("rejects non-acct_ stripeAccountId", () => { /* zod validation */ });
});
```

**TicketPurchaseCard component tests:**
```typescript
// src/components/custom/__tests__/ticket-purchase-card.test.tsx
describe("TicketPurchaseCard", () => {
  it("shows running total when tickets selected", () => { /* formatCurrency total */ });
  it("Buy Tickets button disabled when no tickets selected", () => { /* disabled state */ });
  it("shows Sign in to Buy Tickets when not authenticated", () => { /* Clerk mock */ });
  it("respects available quantity limit on + button", () => { /* max = quantity - soldCount */ });
});
```

### Stripe Checkout Session — Separate Charges and Transfers

Per architecture: **Stripe Connect (Separate Charges & Transfers)** — the platform account charges the card, then transfers funds to the connected Express account, retaining the `application_fee_amount`.

```typescript
stripe.checkout.sessions.create({
  payment_intent_data: {
    application_fee_amount: Math.round(totalCentavos * 0.05), // 5% MVP fee
    transfer_data: {
      destination: creatorStripeAccountId, // "acct_..."
    },
  },
  // ... rest of session config
});
```

**IMPORTANT:** The platform account (where `STRIPE_SECRET_KEY` belongs) must have the Express connected account enabled. The `transfer_data.destination` is the creator's `stripeAccountId` from Story 3.1.

**PHP Currency:** Stripe accepts `"php"` as currency. PHP centavos (1 PHP = 100 centavos). All `unit_amount` values are already stored as centavos in Convex — pass directly to Stripe with no conversion.

**Stripe Metadata for Story 3.3:** The webhook handler (Story 3.3) needs `eventId`, `tierSelections`, and `buyerEmail` from the checkout session metadata. Structure:
```json
{
  "eventId": "j572...",
  "tierSelections": "[{\"tierId\":\"k123\",\"quantity\":2}]",
  "buyerEmail": "attendee@example.com"
}
```
**Note:** Stripe metadata values must be strings — JSON.stringify the `tierSelections` array.

### Architecture Compliance

- **Server Action** in `src/lib/actions/stripe-checkout.ts` — mandated filename per `architecture.md`
- **Function name** `purchaseTickets` — mandated per `architecture.md` line 428
- **Zod validator** in `src/lib/validators/ticket.ts` — mandated per `architecture.md` line 828
- **Client component** `ticket-purchase-card.tsx` — mandated per `architecture.md` line 917
- **`window.location.href`** for Stripe redirect (not `router.push`) — same pattern as Story 3.1
- **`useTransition`** for pending state — same pattern as all previous stories
- **Never trust client prices** — fetch tier prices server-side via `ConvexHttpClient`
- **`formatCurrency(centavos)`** for all PHP display — already in `src/lib/utils/format.ts`

### Project Structure Notes

**Files to CREATE (new):**
```
src/lib/actions/stripe-checkout.ts                              # NEW: purchaseTickets Server Action
src/lib/actions/__tests__/stripe-checkout.test.ts               # NEW: contract tests
src/lib/validators/ticket.ts                                    # NEW: purchaseSchema Zod validator
src/components/custom/ticket-purchase-card.tsx                  # NEW: TicketPurchaseCard component
src/components/custom/__tests__/ticket-purchase-card.test.tsx   # NEW: component tests
src/app/(public)/events/[eventId]/page.tsx                      # NEW: public event detail page
src/app/(public)/events/[eventId]/success/page.tsx              # NEW: Stripe success return page
convex/publicEvents.test.ts                                     # NEW: public query contract tests
```

**Files to MODIFY (existing):**
```
convex/events.ts                   # ADD: getPublicEventById query (+ creatorStripeAccountId field)
convex/ticketTiers.ts              # ADD: getPublicTiersByEventId query (sorted by sortOrder)
convex/_generated/api.d.ts         # UPDATE: add new public queries to type declarations
```

**Files that do NOT need changes:**
```
convex/schema.ts        # No new tables needed for Story 3.2
src/lib/stripe/config.ts  # Already exists from Story 3.1
```

### Environment Variables Needed

```bash
# Already set from Story 3.1 (NO new variables required):
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONVEX_URL=...   # Already set in project
```

### Previous Story Learnings

From Story 3.1 code review:
- **`window.location.href`** for all external redirects (Stripe URLs) — not `router.push`
- **try/catch around Convex mutations** in `startTransition` callbacks — always wrap in try/catch
- **`acct_` prefix validation** on Stripe account IDs — already enforced in `saveStripeAccountId`
- **`useTransition` for pending states** — consistent across all components with Server Actions
- **`convex/_generated/api.d.ts` must be manually updated** when new Convex files are added (run `npx convex dev` or manually add imports)
- **Early-return loading pattern** — `if (event === undefined || tiers === undefined) return <Skeleton>`

From Story 2.7 code review:
- **`<img>` not `<Image>` for external URLs** — artwork URLs from Convex storage are whitelisted via `**.convex.cloud` in `next.config.ts`, so `<Image>` IS safe for Convex storage URLs. But for external `profilePhotoUrl`, use `<img>`.
- **Optional chaining in tests** — use `?.` not `!` after `not.toBeNull()` assertions

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.2 — Ticket Purchase & Stripe Checkout BDD criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — Server Actions pattern: `stripe-checkout.ts` for checkout]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data flow: `purchaseTickets()` → Stripe Checkout Session → webhook]
- [Source: _bmad-output/planning-artifacts/architecture.md — FR18: Multi-ticket purchase in single checkout]
- [Source: _bmad-output/planning-artifacts/architecture.md — FR20: Stripe Connect (Separate Charges & Transfers)]
- [Source: _bmad-output/planning-artifacts/architecture.md — FR23: Inventory check before checkout]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR2: Checkout redirect <3 seconds]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR11: Card data never touches platform server]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR30: Stripe signature verification (Story 3.3)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming: `purchaseTickets`, `stripe-checkout.ts`, `ticket.ts`]
- [Source: _bmad-output/planning-artifacts/architecture.md — Currency: PHP centavos, `formatCurrency` utility]
- [Source: convex/schema.ts — No tickets table yet; ticketTiers.soldCount used for inventory]
- [Source: src/lib/utils/format.ts — `formatCurrency(centavos)` already exists]
- [Source: src/lib/stripe/config.ts — `stripe` singleton already created in Story 3.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Zod v4 uses `.issues` not `.errors` on `ZodError` — updated `purchaseSchema.safeParse` error extraction accordingly
- Zod v4 removed `z.string().startsWith()` — replaced with `.refine(s => s.startsWith("acct_"), { message: "..." })`
- `Id` type is not exported from `convex/_generated/dataModel` — used `as any` cast (consistent with existing pages in project)
- Relative import path for `[eventId]/page.tsx` is 5 levels deep to project root (not 4)
- `getPublicEventById` returns `creatorStripeAccountId` from the `users` table so the page can gate-check whether to show `TicketPurchaseCard`
- Test for "shows running total" used `getAllByText` instead of `getByText` to avoid multiple-match error (₱500 appears in both tier price and Total section)

**Code Review Fixes Applied (Senior Developer Review):**
- H1: `creatorStripeAccountId` removed from client input and `purchaseSchema` — `purchaseTickets` now fetches it server-side via `ConvexHttpClient.query(api.events.getPublicEventById)`, preventing payment routing manipulation by malicious clients
- M1: Non-null assertion `tiers.find(...)!` replaced with null guard `if (!tier) return` in `handleQuantityChange`
- M2: "redirects unauthenticated user" test was a no-op — fixed to click + then click button and assert `mockPush` called with correct URL
- M3: `payment_method_types: ["card"]` removed from Stripe checkout session — allows automatic payment methods (GCash, PayMaya, etc.) for PH market

### File List

- convex/events.ts (modified — added `getPublicEventById`)
- convex/ticketTiers.ts (modified — added `getPublicTiersByEventId`)
- src/lib/validators/ticket.ts (new)
- src/lib/actions/stripe-checkout.ts (new)
- src/components/custom/ticket-purchase-card.tsx (new)
- src/app/(public)/events/[eventId]/page.tsx (new)
- src/app/(public)/events/[eventId]/success/page.tsx (new)
- src/lib/actions/__tests__/stripe-checkout.test.ts (new)
- convex/publicEvents.test.ts (new)
- src/components/custom/__tests__/ticket-purchase-card.test.tsx (new)
