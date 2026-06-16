# Payments Architecture — PayMongo (primary) + Stripe (international)

Status: **design / for approval**. No code changed yet.

## 1. Goal & principles

- **PayMongo is the default** provider (Philippines: GCash, Maya, GrabPay, cards, in PHP).
- **Stripe stays as the international lane** (multi-currency cards) for overseas events.
- **One server-side abstraction**; the clients (web + mobile) stay **provider-agnostic**.
- **Reuse the existing ticket-issuance path** (`tickets:createTicketsFromWebhook`) for both providers — we add a provider, not a second ticketing flow.
- Money stays in **centavos** (already true) — PayMongo's native unit, so no currency refactor.

The unlock: both PayMongo and Stripe expose a **hosted Checkout Session that returns a URL**. If the backend always returns a URL, the web redirect and the mobile in-app browser never need to know which provider ran.

```
 client (web redirect / mobile in-app browser)
        │  asks for checkout
        ▼
 purchaseTickets()  ──►  PaymentProvider.createCheckout()  ──►  { url }
        ▲                       │ picks PayMongo or Stripe by event/organizer
        │                       ▼
        │              hosted checkout page (GCash/Maya/card)
        │                       │ buyer pays
        ▼                       ▼
 /api/webhooks/paymongo   /api/webhooks/stripe
        └──────────┬───────────┘
                   ▼
        tickets:createTicketsFromWebhook   (unchanged ticket issuance + signed QR)
```

## 2. Provider model

A `paymentProvider` lives on the **organizer** (their default), with an optional **per-event override**:

- New organizers default to `"paymongo"`.
- An organizer running an international show sets that one event to `"stripe"`.
- Resolution order at checkout: `event.paymentProvider ?? organizer.paymentProvider ?? "paymongo"`.

**Recommended rollout:** ship **PayMongo-only** first with Stripe **wired but dormant** (the interface + Stripe impl stay, but the UI only offers PayMongo until you actually have an international event). This keeps the abstraction honest without forcing both live at once.

## 3. The abstraction

A single interface both providers implement (server-side only):

```ts
// src/lib/payments/types.ts
export type Provider = "paymongo" | "stripe";

export interface CheckoutInput {
  eventId: string;
  buyerEmail: string;
  lineItems: { name: string; amount: number; quantity: number }[]; // amount = centavos
  metadata: Record<string, string>; // eventId, tierSelections, buyerEmail, promoCode?
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly id: Provider;
  createCheckout(input: CheckoutInput): Promise<{ url: string; ref: string }>;
  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null; // null = bad sig
  refund(paymentRef: string, amount: number, reason?: string): Promise<{ ok: boolean }>;
}

export interface WebhookEvent {
  type: "paid";                 // we only act on the "paid" event
  ref: string;                  // provider session/payment id
  metadata: Record<string, string>;
}
```

`purchaseTickets` does everything provider-independent (validation, inventory check, promo discount, platform-fee calc), then calls `provider.createCheckout()` and returns the URL.

## 4. Schema changes (minimal, back-compatible)

`convex/schema.ts`:

```ts
// events: add
paymentProvider: v.optional(v.string()),   // per-event override

// users (organizer): add
paymentProvider: v.optional(v.string()),   // organizer default
paymongoAccountRef: v.optional(v.string()),// reserved for future PayMongo payouts

// tickets: generalize the Stripe-specific field
paymentProvider: v.optional(v.string()),   // "paymongo" | "stripe"
paymentRef: v.optional(v.string()),        // provider session/payment id
// keep stripeSessionId + by_stripe_session_id for back-compat; new code writes paymentRef
```

Add index `tickets.by_payment_ref` for idempotency lookups (mirrors `by_stripe_session_id`).

`tickets:createTicketsFromWebhook` gains `provider` + `paymentRef` args (keeps `stripeSessionId` optional for back-compat); idempotency keys off `paymentRef`.

## 5. Files — add vs change

**Add**
- `src/lib/payments/types.ts` — the interface above.
- `src/lib/payments/paymongo.ts` — PayMongo provider (Checkout Sessions + webhook verify + refund).
- `src/lib/payments/stripe.ts` — thin adapter wrapping the **existing** Stripe code to the interface.
- `src/lib/payments/index.ts` — `getProvider(event, organizer)` resolver.
- `src/app/api/webhooks/paymongo/route.ts` — verifies `Paymongo-Signature`, maps `checkout_session.payment.paid` → `createTicketsFromWebhook`.

**Change**
- `src/lib/actions/stripe-checkout.ts` → rename to `checkout.ts` (or keep name); make it provider-aware via `getProvider()`. Provider-independent logic (promo, inventory, fee) stays here.
- `convex/tickets.ts` `createTicketsFromWebhook` — add `provider`/`paymentRef`.
- `src/lib/actions/refunds.ts` & `partial-refund.ts` — route refunds through `provider.refund()`.
- Organizer settings UI — a "Payout / payment provider" choice (PayMongo connect vs Stripe connect).

## 6. PayMongo specifics

- **Checkout Session:** `POST https://api.paymongo.com/v1/checkout_sessions`, Basic auth (base64 of `SECRET_KEY:`). Body: `line_items[{ name, amount(centavos), currency:"PHP", quantity }]`, `payment_method_types: ["gcash","paymaya","grab_pay","card"]`, `success_url`, `cancel_url`, `metadata`. Response → `attributes.checkout_url` (the URL we return) + the session id (our `ref`).
- **Webhook:** PayMongo posts `checkout_session.payment.paid` (and/or `payment.paid`). Verify the `Paymongo-Signature` header (timestamp + HMAC-SHA256 of `timestamp.rawBody` with the webhook secret). Read our `metadata` back, then issue tickets.
- **Amounts:** centavos, same as our store. Enforce provider minimums (e.g. ₱20–₱100 depending on method). **Free events (₱0) skip PayMongo entirely** — they already go through `free-registration.ts`.
- **Test mode:** PayMongo issues **test keys instantly** (no business verification) — full sandbox build/testing possible now; live keys need a verified account later.
- *(Verify exact field names against current PayMongo API docs at implementation time.)*

## 7. The payouts divergence — a real decision

Stripe today uses **Connect** (`creatorStripeAccountId`, transfer + 5% application fee) so each organizer is paid directly and the platform auto-takes its cut.

**PayMongo has no equivalent drop-in marketplace/Connect.** Options:
1. **Platform-collect (recommended for MVP):** all PayMongo funds land in the platform account; organizer payouts + the 5% cut are settled **out-of-band** (manual/scheduled bank transfer), tracked in a `payouts` ledger table. Simple, ships now.
2. **PayMongo sub-merchant / marketplace:** requires a special arrangement with PayMongo; defer until volume justifies it.

This means: for **PayMongo events the 5% fee is computed and recorded but not auto-split**; for **Stripe events it stays auto-split via Connect**. Flagging so it's a conscious choice, not a surprise at payout time.

## 8. Provider selection (resolver)

```ts
function getProvider(event, organizer): PaymentProvider {
  const id = event.paymentProvider ?? organizer.paymentProvider ?? "paymongo";
  return id === "stripe" ? stripeProvider : paymongoProvider;
}
```

## 9. Env vars

```
# PayMongo (test now, live later)
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsk_...
# Stripe (existing) stays as-is
```

## 10. Rollout phases (updates Phase 3)

1. **3a — Abstraction + PayMongo (sandbox):** interface, `getProvider`, PayMongo checkout + webhook, schema fields, `createTicketsFromWebhook` provider arg. Test full buy→ticket with PayMongo test keys. Stripe refactored behind the interface but unchanged in behavior.
2. **3b — Refunds + payouts ledger:** provider-aware refunds; a `payouts` table to record platform fee + organizer owed for PayMongo (platform-collect).
3. **3c — Stripe international (when needed):** flip the per-event override on; verify the international card path.
4. **3d — Go live:** swap PayMongo test→live keys after account verification.

## 11. Resolved decisions ✅

1. **Payouts model:** **Platform-collect** — all PayMongo funds land in the platform account; organizer payouts settled out-of-band via a `payouts` ledger. (No PayMongo marketplace.)
2. **Provider exposure:** **PayMongo only** in the UI now; Stripe stays wired-but-dormant behind the interface for later international use.
3. **Platform fee:** **5% for now**, recorded in the ledger. Later: expose a configurable **service fee** setting (per-platform or per-organizer) — schema should leave room for `feePercent`.
4. **Mobile checkout:** **In-app browser → deep-link return** for both providers (GCash/Maya/GrabPay are redirect/app-switch flows that hosted checkout handles natively; same URL as web; no native SDK). Native Payment Sheet deferred.

### Implications locked in
- PayMongo events: 5% fee **recorded, not auto-split**; settlement is manual via the ledger.
- UI surfaces PayMongo only; the resolver still defaults to `"paymongo"` and Stripe remains callable for a future per-event override.
- Add a `feePercent` field (default 5) rather than hardcoding, so the future service-fee setting is a value change, not a refactor.
```
