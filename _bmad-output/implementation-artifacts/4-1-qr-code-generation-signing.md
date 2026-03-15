# Story 4.1: QR Code Generation & Signing

Status: done

## Story

As the **platform**,
I want to generate cryptographically signed QR codes for each purchased ticket,
So that tickets cannot be forged or tampered with.

## Acceptance Criteria

1. **Given** a ticket record is created (via webhook or free registration)
   **When** the QR code is generated
   **Then** the QR payload contains ticket ID, event ID, tier ID, and buyer email
   **And** the payload is signed using HMAC-SHA256 with `QR_SIGNING_SECRET` (FR25, NFR10)
   **And** the signed payload string is stored in the `tickets.qrCode` field
   **And** the HMAC signature is stored separately in the `tickets.qrSignature` field

2. **Given** a QR code value is stored in a ticket record
   **When** the signing library is used to verify it
   **Then** valid signatures verify successfully
   **And** tampered payloads are rejected
   **And** a payload signed for a different ticket ID is rejected

3. **Given** the QR signing library is used
   **When** `QR_SIGNING_SECRET` env var is missing
   **Then** signing throws a descriptive error (cannot sign with undefined secret)

4. **Given** the Stripe webhook creates tickets
   **When** `processCheckoutCompleted` completes ticket insertion
   **Then** QR codes are generated for all inserted tickets and stored via `patchTicketsQrCodes` mutation

5. **Given** `registerFreeEvent` Server Action creates tickets
   **When** the `registerFreeTickets` Convex mutation completes
   **Then** QR codes are generated for all inserted tickets and stored via `patchTicketsQrCodes` mutation

## Tasks / Subtasks

- [x] **Task 1: Install `qrcode` package** (AC: #1)
  - [x] 1.1 Run: `pnpm add qrcode && pnpm add -D @types/qrcode`
  - [x] 1.2 Verify in `package.json`: `qrcode` under `dependencies`, `@types/qrcode` under `devDependencies`
  - [x] 1.3 Note: `qrcode` is a **server-side Node.js library** — do NOT import it in Client Components; import only in Server Actions, Route Handlers, or `src/lib/` utilities that run server-side

- [x] **Task 2: Create `src/lib/qr/signing.ts` — HMAC-SHA256 signing/verification** (AC: #1, #2, #3)
  - [x] 2.1 Create `src/lib/qr/` directory and `signing.ts`:
    ```typescript
    import crypto from "crypto";

    export type QrPayload = {
      ticketId: string;
      eventId: string;
      tierId: string;
      buyerEmail: string;
    };

    function getSecret(): string {
      const secret = process.env.QR_SIGNING_SECRET;
      if (!secret) throw new Error("QR_SIGNING_SECRET env var is not set");
      return secret;
    }

    /** Returns HMAC-SHA256 hex digest of the given string using QR_SIGNING_SECRET */
    export function signPayload(payloadJson: string): string {
      return crypto
        .createHmac("sha256", getSecret())
        .update(payloadJson)
        .digest("hex");
    }

    /** Verifies that signature matches HMAC-SHA256 of payloadJson */
    export function verifySignature(payloadJson: string, signature: string): boolean {
      const expected = signPayload(payloadJson);
      return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex")
      );
    }

    /** Builds the JSON string stored in tickets.qrCode */
    export function buildQrPayload(payload: QrPayload): string {
      return JSON.stringify(payload);
    }
    ```
  - [x] 2.2 Use `crypto.timingSafeEqual` for signature comparison (prevents timing attacks — NFR10)
  - [x] 2.3 Use Node.js built-in `crypto` module — NO external crypto libraries needed
  - [x] 2.4 The `ticketId` in the payload is the Convex document `_id` string (e.g., `"jx7abc123..."`)

- [x] **Task 3: Create `src/lib/qr/generate.ts` — QR code data generation** (AC: #1)
  - [x] 3.1 Create `src/lib/qr/generate.ts`:
    ```typescript
    import { signPayload, buildQrPayload, type QrPayload } from "./signing";

    export type QrCodeResult = {
      qrCode: string;       // JSON payload string — stored in DB, encoded in QR image
      qrSignature: string;  // HMAC-SHA256 hex — stored in DB for scanner verification
    };

    /**
     * Generates the QR code value and signature for a ticket.
     * qrCode = JSON payload string (what gets encoded in the QR image)
     * qrSignature = HMAC-SHA256 signature of the payload
     */
    export function generateQrCodeData(payload: QrPayload): QrCodeResult {
      const qrCode = buildQrPayload(payload);
      const qrSignature = signPayload(qrCode);
      return { qrCode, qrSignature };
    }
    ```
  - [x] 3.2 `qrCode` field stores the **payload JSON string** (compact, ~150 chars) — NOT a base64 image
  - [x] 3.3 QR images are rendered on-demand (in Story 4.2) by passing `qrCode` to the `qrcode` library's `toDataURL()` for emails, or a React QR component for in-app display
  - [x] 3.4 This function is synchronous — no async needed since `qrcode` image rendering happens at display time

- [x] **Task 4: Add secured Convex helpers in `convex/tickets.ts`** (AC: #4, #5)
  - [x] 4.1 Add a new **secured query** `getTicketsByStripeSessionId` to `convex/tickets.ts`:
    ```typescript
    export const getTicketsByStripeSessionId = query({
      args: {
        stripeSessionId: v.string(),
        querySecret: v.string(),
      },
      handler: async (ctx, args) => {
        if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
          throw new ConvexError("Unauthorized");
        }
        return await ctx.db
          .query("tickets")
          .withIndex("by_stripe_session_id", (q) =>
            q.eq("stripeSessionId", args.stripeSessionId)
          )
          .collect();
      },
    });
    ```
  - [x] 4.2 Add a new **secured mutation** `patchTicketsQrCodes` to `convex/tickets.ts`:
    ```typescript
    export const patchTicketsQrCodes = mutation({
      args: {
        webhookSecret: v.string(),
        updates: v.array(
          v.object({
            ticketId: v.string(),
            qrCode: v.string(),
            qrSignature: v.string(),
          })
        ),
      },
      handler: async (ctx, args) => {
        if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
          throw new ConvexError("Unauthorized");
        }
        for (const update of args.updates) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await ctx.db.patch(update.ticketId as any, {
            qrCode: update.qrCode,
            qrSignature: update.qrSignature,
          });
        }
      },
    });
    ```
  - [x] 4.3 Both use `CONVEX_WEBHOOK_SECRET` guard — same pattern as `createTicketsFromWebhook` and `registerFreeTickets`

- [x] **Task 5: Integrate QR generation into `src/lib/stripe/webhooks.ts`** (AC: #4)
  - [x] 5.1 Import `generateQrCodeData` from `@/lib/qr/generate`
  - [x] 5.2 After the `await getConvex().mutation(api.tickets.createTicketsFromWebhook, {...})` call succeeds, add:
    ```typescript
    // Generate and store QR codes for the newly created tickets
    try {
      const tickets = await getConvex().query(
        api.tickets.getTicketsByStripeSessionId,
        {
          stripeSessionId: session.id,
          querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
        }
      );
      const qrUpdates = tickets.map((ticket) => ({
        ticketId: ticket._id,
        ...generateQrCodeData({
          ticketId: ticket._id,
          eventId: ticket.eventId,
          tierId: ticket.tierId,
          buyerEmail: ticket.buyerEmail,
        }),
      }));
      if (qrUpdates.length > 0) {
        await getConvex().mutation(api.tickets.patchTicketsQrCodes, {
          webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
          updates: qrUpdates,
        });
      }
    } catch (err) {
      console.error("QR code generation failed:", err);
      // QR failure must NOT fail the webhook — tickets were already created successfully
    }
    ```
  - [x] 5.3 Wrap QR generation in try/catch — a QR failure must NOT fail the webhook (tickets already created)
  - [x] 5.4 Place QR generation BEFORE the fire-and-forget email call (email will be enhanced in Story 4.2 to include QR)

- [x] **Task 6: Integrate QR generation into `src/lib/actions/free-registration.ts`** (AC: #5)
  - [x] 6.1 Import `generateQrCodeData` from `@/lib/qr/generate`
  - [x] 6.2 After the `await convex.mutation(api.tickets.registerFreeTickets, {...})` call succeeds, add:
    ```typescript
    // Generate and store QR codes for the registered tickets
    try {
      const syntheticSessionId = `free_${input.eventId}_${input.buyerEmail}`;
      const tickets = await convex.query(
        api.tickets.getTicketsByStripeSessionId,
        {
          stripeSessionId: syntheticSessionId,
          querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
        }
      );
      const qrUpdates = tickets.map((ticket) => ({
        ticketId: ticket._id,
        ...generateQrCodeData({
          ticketId: ticket._id,
          eventId: ticket.eventId,
          tierId: ticket.tierId,
          buyerEmail: ticket.buyerEmail,
        }),
      }));
      if (qrUpdates.length > 0) {
        await convex.mutation(api.tickets.patchTicketsQrCodes, {
          webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
          updates: qrUpdates,
        });
      }
    } catch (err) {
      console.error("QR code generation failed for free registration:", err);
      // QR failure must NOT fail the registration — tickets already created
    }
    ```
  - [x] 6.3 The synthetic sessionId for free tickets is always `free_${eventId}_${buyerEmail}` (same idempotency key used in `registerFreeTickets`)
  - [x] 6.4 Place QR generation BEFORE the fire-and-forget email call

- [x] **Task 7: Write tests in `src/lib/qr/signing.test.ts`** (AC: #2, #3)
  - [x] 7.1 Create `src/lib/qr/signing.test.ts` — pure unit tests, no mocking needed (pure functions, deterministic)
  - [x] 7.2 Set `process.env.QR_SIGNING_SECRET = "test-secret-for-unit-tests"` in test setup
  - [x] 7.3 Tests to implement:
    - `signPayload()` produces a consistent hex string for same input
    - `verifySignature()` returns `true` for valid signature
    - `verifySignature()` returns `false` for tampered payload (changed ticketId)
    - `verifySignature()` returns `false` for wrong signature
    - `verifySignature()` returns `false` for empty signature
    - `buildQrPayload()` produces valid JSON string containing all four fields
    - `buildQrPayload()` is deterministic (same input → same output)
    - `signPayload()` throws when `QR_SIGNING_SECRET` is not set (delete env var first, restore after)
    - Different ticketIds produce different signatures (uniqueness per ticket)
  - [x] 7.4 Add contract tests to `convex/tickets.test.ts` for the new Convex functions:
    - `patchTicketsQrCodes` auth contract (wrong secret throws)
    - `getTicketsByStripeSessionId` auth contract (wrong secret throws)

## Dev Notes

### QR Code Architecture

**What `qrCode` stores (in DB):**
```
{"ticketId":"jx7abc123...","eventId":"jh8xyz...","tierId":"jk9def...","buyerEmail":"buyer@example.com"}
```
This compact JSON string is what gets encoded in the QR image. The `qrcode` library converts this string into a QR PNG or SVG at display time.

**What `qrSignature` stores (in DB):**
```
a3f9c1d2e4b5... (64-char HMAC-SHA256 hex string)
```

**Why separate storage:** Allows the scanner (Story 4.3) to: (1) scan QR → get payload JSON, (2) extract `ticketId`, (3) load ticket from DB, (4) recompute HMAC and compare against stored `qrSignature`, (5) validate match. Separating payload from signature enables server-side verification without embedding the secret in the QR.

### HMAC-SHA256 Implementation

```typescript
import crypto from "crypto";

// Sign
const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");

// Verify (timing-safe to prevent oracle attacks)
crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"))
```

Use Node.js built-in `crypto` — no external library needed. `crypto` is available in Next.js Route Handlers and Server Actions (Node.js runtime), but NOT in Convex functions (Deno/V8 runtime). This is why QR generation happens in the Next.js layer, not in Convex mutations.

### Why `qrCode` is a payload string (NOT a base64 image)

Storing base64 PNG data URLs per ticket would add ~3-5KB per ticket record in Convex. At 1,000 tickets that's 3-5MB of binary data in the DB. Instead, the payload string is ~150 chars (150 bytes). QR images are generated on-demand:
- **Email (Story 4.2):** `await QRCode.toDataURL(ticket.qrCode)` in the email Server Action
- **In-app (Story 4.2):** `<Image src={await QRCode.toDataURL(ticket.qrCode)} />` or a React QR component

### QR Payload Fields

```typescript
type QrPayload = {
  ticketId: string;   // Convex _id of the ticket document (e.g., "jx7abc123")
  eventId: string;    // Convex _id of the events document
  tierId: string;     // Convex _id of the ticketTiers document
  buyerEmail: string; // Buyer's email — ties ticket to identity
};
```

**Note:** `buyerUserId` is NOT included because it's optional (some tickets created via webhook have no Clerk user). `buyerEmail` is always present. Story 4.3 (scanner) verifies via ticketId lookup + HMAC, so buyerUserId is not needed for validation.

### New `convex/tickets.ts` Convex Functions

**`getTicketsByStripeSessionId`** (query, secured):
- Uses existing `by_stripe_session_id` index
- Returns all ticket documents for a session (multiple for multi-quantity purchases)
- Called by webhook handler and free-registration action to get ticket IDs for QR generation
- Secured with `querySecret` == `CONVEX_WEBHOOK_SECRET` (same pattern as `getUniqueEmailsByEventId`)

**`patchTicketsQrCodes`** (mutation, secured):
- Batch updates `qrCode` and `qrSignature` on existing ticket documents
- Secured with `webhookSecret` == `CONVEX_WEBHOOK_SECRET`
- Called after ticket creation, not during (two-phase: create → generate QR → patch)

### `qrcode` Library Usage (server-side only)

```typescript
import QRCode from "qrcode";

// Data URL for email embedding (used in Story 4.2)
const dataUrl = await QRCode.toDataURL(ticket.qrCode, {
  errorCorrectionLevel: "M",
  width: 300,
  margin: 2,
});

// SVG string (alternative for in-app display)
const svg = await QRCode.toString(ticket.qrCode, { type: "svg" });
```

`qrcode` is **not needed in Story 4.1** (signing.ts and generate.ts don't use it). It IS needed in Story 4.2 for email embedding and possibly in-app display. Import `qrcode` only in the email Server Action or a server-side helper.

### File Structure (Architecture-Specified)

```
src/lib/qr/
  signing.ts          # HMAC-SHA256 sign/verify — pure functions, testable
  signing.test.ts     # Unit tests for signing logic
  generate.ts         # QrCodeResult builder (payload + signature)
```
Per architecture.md §File/Folder Structure: `src/lib/qr/signing.ts`, `src/lib/qr/generate.ts`.

### Integration Points

**Webhook flow (after Task 5):**
```
processCheckoutCompleted:
  1. createTicketsFromWebhook mutation (creates tickets, qrCode="", qrSignature="")
  2. getTicketsByStripeSessionId query (get ticket IDs)
  3. generateQrCodeData() for each ticket (pure, sync)
  4. patchTicketsQrCodes mutation (stores QR data)
  5. sendPurchaseConfirmation() fire-and-forget (email — Story 4.2 will add QR image)
```

**Free registration flow (after Task 6):**
```
registerFreeEvent:
  1. registerFreeTickets mutation (creates tickets, qrCode="", qrSignature="")
  2. getTicketsByStripeSessionId query (using synthetic sessionId)
  3. generateQrCodeData() for each ticket
  4. patchTicketsQrCodes mutation
  5. sendPurchaseConfirmation() fire-and-forget
```

### Security Notes

- `QR_SIGNING_SECRET` is a server-side secret — never expose to client or embed in QR payload
- `crypto.timingSafeEqual` prevents timing oracle attacks on signature comparison (NFR10)
- Both `getTicketsByStripeSessionId` and `patchTicketsQrCodes` require `CONVEX_WEBHOOK_SECRET` — same guard as other internal mutations
- The QR payload only contains data that's already known to the ticket holder (their own ticketId, eventId, etc.) — no new PII exposure

### ESLint Patterns (follow existing codebase patterns)

For Convex Id type casting in mutations:
```typescript
// Single line:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await ctx.db.patch(update.ticketId as any, { ... });

// Multi-line insert block uses /* eslint-disable/enable */ wrapper
```

### Test Pattern (pure contract tests — established project pattern)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("signPayload contract", () => {
  beforeEach(() => {
    process.env.QR_SIGNING_SECRET = "test-secret-for-signing";
  });
  afterEach(() => {
    delete process.env.QR_SIGNING_SECRET;
  });

  it("produces consistent hex string", () => {
    const sig1 = signPayload('{"ticketId":"abc"}');
    const sig2 = signPayload('{"ticketId":"abc"}');
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);  // 64-char hex
  });
});
```

### Environment Variables

Add to `.env.local`:
```
QR_SIGNING_SECRET=<random-32-char-secret>
```
Generate with: `openssl rand -hex 32`

The `QR_SIGNING_SECRET` must be consistent across deployments (changing it invalidates all existing QR codes). It must be set in Vercel for production.

### Previous Story Learnings (from Stories 3.4 and 3.5)

- **Idempotency ordering**: Guard → idempotency check → validation → writes
- **Fire-and-forget pattern**: `somePromise().catch(console.error)` — never `await` for side effects
- **Module-level `const convex = new ConvexHttpClient(...)`** is fine for Server Actions
- **Lazy singletons** (like in `webhooks.ts`) prevent build-time initialization failures for Route Handlers
- **`// eslint-disable-next-line @typescript-eslint/no-explicit-any`** before single-line `as any` casts
- **`/* eslint-disable/enable */` blocks** for multi-line casts (e.g., `ctx.db.insert` with multiple fields)
- **Pure contract tests** (no mocking of module-level singletons) — extract logic to pure functions and test those
- **`Promise.allSettled` with Resend SDK**: must check `!r.value.error` not just `r.status === "fulfilled"` (Resend resolves even on API errors)

### References

- [Source: architecture.md — QR Ticketing (FR25-30) — lib/qr/signing.ts, lib/qr/generate.ts]
- [Source: architecture.md — Security — HMAC-SHA256 for QR codes using QR_SIGNING_SECRET]
- [Source: architecture.md — QR | `qrcode`, `html5-qrcode` | QR generation + scanning]
- [Source: architecture.md — File/Folder Structure — src/lib/qr/]
- [Source: architecture.md — Test file: lib/qr/signing.test.ts]
- [Source: convex/schema.ts — tickets table — qrCode: v.string(), qrSignature: v.string()]
- [Source: convex/schema.ts — tickets.index("by_stripe_session_id")]
- [Source: convex/tickets.ts — getUniqueEmailsByEventId — querySecret guard pattern]
- [Source: src/lib/stripe/webhooks.ts — processCheckoutCompleted — integration point]
- [Source: src/lib/actions/free-registration.ts — registerFreeEvent — integration point]
- [Source: epics.md — Epic 4, Story 4.1 — AC and functional requirements]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `qrcode@1.5.4` (dependencies) and `@types/qrcode@1.5.6` (devDependencies) via pnpm — not used in 4.1 itself but required for Story 4.2 image rendering
- Created `src/lib/qr/signing.ts` with HMAC-SHA256 sign/verify using Node.js built-in `crypto` — `crypto.timingSafeEqual()` used for timing-safe comparison (NFR10)
- Created `src/lib/qr/generate.ts` with `generateQrCodeData()` — synchronous, pure function returning `{ qrCode, qrSignature }`; `qrCode` stores compact JSON payload string (~150 chars), NOT a base64 image
- Added `getTicketsByStripeSessionId` (secured query) and `patchTicketsQrCodes` (secured mutation) to `convex/tickets.ts` — both guard with `CONVEX_WEBHOOK_SECRET` (same pattern as existing secured mutations)
- Integrated QR generation into `src/lib/stripe/webhooks.ts` `processCheckoutCompleted` — two-phase: create tickets → query by sessionId → generate QR → patch tickets; wrapped in try/catch so QR failure never fails the webhook
- Integrated same QR pattern into `src/lib/actions/free-registration.ts` `registerFreeEvent` — uses synthetic sessionId `free_${eventId}_${buyerEmail}` matching the idempotency key used in `registerFreeTickets`
- Created `src/lib/qr/signing.test.ts` with 14 pure unit tests covering `signPayload`, `verifySignature`, and `buildQrPayload` — uses `beforeEach`/`afterEach` to set/delete `QR_SIGNING_SECRET` env var
- Added 8 contract tests to `convex/tickets.test.ts` for `getTicketsByStripeSessionId` and `patchTicketsQrCodes` auth/shape contracts
- All 470 tests pass (42 test files, 22 new tests added in this story)
- **Code review fixes (5 issues):**
  - H1: Added `generateQrCodeData` round-trip tests (6 new tests) to `signing.test.ts` — covers `generate.ts` which had zero dedicated test coverage
  - M1: Fixed `verifySignature` to let `signPayload` errors propagate — missing `QR_SIGNING_SECRET` now throws instead of silently returning `false`
  - M2: Fixed `verifySignature` to compare byte-buffer lengths (not string lengths) before `timingSafeEqual` — prevents false-positive length check on non-hex input
  - M3: Added test: `verifySignature` throws when `QR_SIGNING_SECRET` is not set (1 new test)
  - M4: Deduplicated `checkTicketQuerySecret`/`checkPatchSecret` in `convex/tickets.test.ts` — both replaced with existing shared `checkQuerySecret` helper
- All 477 tests pass after code review fixes (42 test files, 7 new tests from review)

### File List

- `package.json` — added `qrcode@^1.5.4` (dependencies), `@types/qrcode@^1.5.6` (devDependencies)
- `src/lib/qr/signing.ts` — new: HMAC-SHA256 signing/verification utilities
- `src/lib/qr/generate.ts` — new: `generateQrCodeData()` orchestrator
- `src/lib/qr/signing.test.ts` — new: 14 unit tests for signing/verification/payload building
- `convex/tickets.ts` — modified: added `getTicketsByStripeSessionId` query and `patchTicketsQrCodes` mutation
- `convex/tickets.test.ts` — modified: added 8 contract tests for new Convex functions
- `src/lib/stripe/webhooks.ts` — modified: QR generation integrated after `createTicketsFromWebhook`
- `src/lib/actions/free-registration.ts` — modified: QR generation integrated after `registerFreeTickets`
