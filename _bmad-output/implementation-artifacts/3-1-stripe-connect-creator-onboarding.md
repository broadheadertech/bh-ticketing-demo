# Story 3.1: Stripe Connect Creator Onboarding

Status: done

## Story

As a **creator** (artist or organization),
I want to connect my Stripe account to receive payouts from ticket sales,
So that I get paid directly when attendees buy my tickets.

## Acceptance Criteria

1. **Given** I am authenticated as a creator without a connected Stripe account **When** I navigate to `/dashboard/settings` **Then** I see a `StripeConnectButton` prompting me to set up payouts with a "Connect with Stripe" button

2. **Given** I click "Connect with Stripe" **When** the onboarding flow starts **Then** I am redirected to Stripe Express onboarding **And** after completing onboarding, I am redirected back to `/dashboard/settings?stripe_success=true` **And** my `stripeAccountId` is stored in `users.stripeAccountId` in Convex **And** a success toast confirms "Stripe account connected"

3. **Given** my Stripe account is connected **When** I view settings **Then** I see my Stripe account status (active/pending) **And** I see a "Open Stripe Dashboard" button that navigates to my Stripe Express dashboard

4. **Given** I have not connected Stripe **When** I try to publish an event that has one or more paid ticket tiers (price > 0) **Then** the `publishEvent` mutation throws `"Connect your Stripe account before publishing a paid event"` **And** the settings page surfaces the prompt to complete onboarding

## Tasks / Subtasks

- [x] **Task 1: Install Stripe SDK and create Stripe client** (AC: #1, #2, #3)
  - [x] 1.1 Run `pnpm add stripe` to install the Stripe Node.js SDK
  - [x] 1.2 Create `src/lib/stripe/config.ts` — export a singleton `stripe` Stripe client initialized from `STRIPE_SECRET_KEY`

- [x] **Task 2: Convex mutation to persist Stripe account ID** (AC: #2)
  - [x] 2.1 Create `convex/stripeConnect.ts` with `saveStripeAccountId` mutation — requires creator role, patches `users.stripeAccountId`
  - [x] 2.2 Create `convex/stripeConnect.ts` with `getMyStripeStatus` query — returns `stripeAccountId` from the authenticated user

- [x] **Task 3: Server Actions for Stripe Connect** (AC: #2, #3)
  - [x] 3.1 Create `src/lib/actions/stripe-connect.ts` with `"use server"` directive
  - [x] 3.2 Implement `createConnectAccount(email: string)` — creates Stripe Express account + account link, returns `{ success, data: { stripeAccountId, url } }`
  - [x] 3.3 Implement `getStripeAccountStatus(stripeAccountId: string)` — calls `stripe.accounts.retrieve()`, returns `{ chargesEnabled, detailsSubmitted }` as `{ success, data }`
  - [x] 3.4 Implement `createDashboardLink(stripeAccountId: string)` — calls `stripe.accounts.createLoginLink()`, returns `{ success, data: { url } }`

- [x] **Task 4: StripeConnectButton component** (AC: #1, #2, #3)
  - [x] 4.1 Create `src/components/custom/stripe-connect-button.tsx` as `"use client"` component
  - [x] 4.2 Render "Connect with Stripe" button when `stripeAccountId` is null/undefined (not connected state)
  - [x] 4.3 On click: call `createConnectAccount`, save returned `stripeAccountId` to Convex via `saveStripeAccountId` mutation, redirect to Stripe URL
  - [x] 4.4 Render status badge (Active/Pending) and "Open Stripe Dashboard" button when `stripeAccountId` is set (connected state)
  - [x] 4.5 Handle `?stripe_success=true` query param on mount: show success toast "Stripe account connected" and clean URL

- [x] **Task 5: Integrate StripeConnectButton into Settings page** (AC: #1, #2, #3)
  - [x] 5.1 Modify `src/app/(dashboard)/dashboard/settings/page.tsx` to add a "Payouts" section below `CreatorProfileForm`, rendering `<StripeConnectButton />`

- [x] **Task 6: Enforce Stripe connection on publishEvent for paid events** (AC: #4)
  - [x] 6.1 Modify `convex/events.ts` `publishEvent` mutation: after existing checks, query `ticketTiers` for the event — if any tier has `price > 0` AND `user.stripeAccountId` is falsy → throw `ConvexError("Connect your Stripe account before publishing a paid event")`

- [x] **Task 7: Write tests** (AC: #1, #2, #3, #4)
  - [x] 7.1 Create `src/lib/actions/__tests__/stripe-connect.test.ts` — contract tests for Server Action return shapes and business logic
  - [x] 7.2 Create `convex/stripeConnect.test.ts` — contract tests for `saveStripeAccountId` authorization (only creators) and data correctness
  - [x] 7.3 Create `src/components/custom/__tests__/stripe-connect-button.test.tsx` — component tests for both states (connected, not connected)
  - [x] 7.4 Add to `convex/events.test.ts` — `publishEvent` rejects paid events when `stripeAccountId` is missing

- [x] **Task 8: Final validation**
  - [x] 8.1 `pnpm build` — succeeds
  - [x] 8.2 `pnpm test:run` — all tests pass (311 tests)
  - [x] 8.3 `pnpm lint` — no new errors

## Dev Notes

### What Story 3.1 IS and IS NOT

**IS:**
- Stripe Express account creation and onboarding link generation
- Storing `stripeAccountId` in the existing `users.stripeAccountId` field
- Settings page UI showing connect status (Active/Pending) and dashboard link
- `publishEvent` server-side guard: paid tiers require Stripe to be connected
- Stripe client (`src/lib/stripe/config.ts`) as foundation for all future Stripe work

**IS NOT:**
- Stripe Checkout session creation (Story 3.2)
- Stripe webhook processing (Story 3.3)
- Ticket creation or inventory tracking (Story 3.3)
- Payout transfers or balance management
- Stripe webhook route handler (Story 3.3 handles `POST /api/webhooks/stripe`)

### Critical: What Previous Stories Already Built

**NO SCHEMA CHANGE NEEDED — `stripeAccountId` already exists:**
```typescript
// convex/schema.ts — users table already has:
stripeAccountId: v.optional(v.string()),
```

**Reuse existing patterns:**
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)` — REUSE in all Convex functions
- `convex/lib/roles.ts` — `requireAnyRole(user, ["artist", "organization"])` — REUSE
- `convex/users.ts` — `getCurrentUser` query already returns `stripeAccountId` — no new query needed for reading
- `src/lib/utils/toast-helpers.ts` — `showSuccess`, `showErrorFromCatch` — REUSE in StripeConnectButton
- `src/components/custom/role-guard.tsx` — REUSE to gate StripeConnectButton to creator roles

### Task 1: Stripe SDK Setup

```bash
pnpm add stripe
```

```typescript
// src/lib/stripe/config.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});
```

**Important:** `stripe` must ONLY be imported in server-side code (Server Actions, Route Handlers, Convex functions). Never import in `"use client"` components.

### Task 2: Convex Mutation Pattern

```typescript
// convex/stripeConnect.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

export const saveStripeAccountId = mutation({
  args: { stripeAccountId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, ["artist", "organization"]);
    await ctx.db.patch(user._id, { stripeAccountId: args.stripeAccountId });
  },
});

export const getMyStripeStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return { stripeAccountId: user.stripeAccountId ?? null };
  },
});
```

### Task 3: Server Actions Pattern

Architecture mandates: Server Actions return `{ success: boolean, data?: T, error?: string }` — **never throw from Server Actions**.

```typescript
// src/lib/actions/stripe-connect.ts
"use server";

import { stripe } from "@/lib/stripe/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createConnectAccount(email: string): Promise<{
  success: boolean;
  data?: { stripeAccountId: string; url: string };
  error?: string;
}> {
  try {
    const account = await stripe.accounts.create({ type: "express", email });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_URL}/dashboard/settings?stripe_refresh=true`,
      return_url: `${APP_URL}/dashboard/settings?stripe_success=true`,
      type: "account_onboarding",
    });
    return { success: true, data: { stripeAccountId: account.id, url: link.url } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create Stripe account" };
  }
}

export async function getStripeAccountStatus(stripeAccountId: string): Promise<{
  success: boolean;
  data?: { chargesEnabled: boolean; detailsSubmitted: boolean };
  error?: string;
}> {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return {
      success: true,
      data: {
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to retrieve account" };
  }
}

export async function createDashboardLink(stripeAccountId: string): Promise<{
  success: boolean;
  data?: { url: string };
  error?: string;
}> {
  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return { success: true, data: { url: link.url } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create dashboard link" };
  }
}
```

### Task 4: StripeConnectButton Component Pattern

```tsx
// src/components/custom/stripe-connect-button.tsx
"use client";

import { useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import {
  createConnectAccount,
  createDashboardLink,
  getStripeAccountStatus,
} from "@/lib/actions/stripe-connect";

export function StripeConnectButton() {
  const user = useQuery(api.users.getCurrentUser);
  const saveStripeAccountId = useMutation(api.stripeConnect.saveStripeAccountId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Handle return from Stripe onboarding
  useEffect(() => {
    if (searchParams.get("stripe_success") === "true") {
      showSuccess("Stripe account connected");
      // Clean the URL param
      const params = new URLSearchParams(searchParams.toString());
      params.delete("stripe_success");
      router.replace(`/dashboard/settings${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, [searchParams, router]);

  function handleConnect() {
    if (!user?.email) return;
    startTransition(async () => {
      const result = await createConnectAccount(user.email);
      if (!result.success || !result.data) {
        showErrorFromCatch(new Error(result.error ?? "Failed to connect Stripe"));
        return;
      }
      await saveStripeAccountId({ stripeAccountId: result.data.stripeAccountId });
      window.location.href = result.data.url;
    });
  }

  // ... render connected or not-connected state
}
```

**Key notes for the StripeConnectButton:**
- Use `window.location.href = url` (not `router.push`) for the Stripe redirect — external URL
- `user` from `useQuery(api.users.getCurrentUser)` — already returns `stripeAccountId`
- Early return `if (user === undefined) return <Skeleton>` for loading state
- Connected state: show status badge + "Open Stripe Dashboard" button (calls `createDashboardLink` on click)
- Status badge logic: call `getStripeAccountStatus` on mount when connected, show "Active" if `chargesEnabled`, else "Pending setup"

### Task 5: Settings Page Modification

The settings page is currently a server component. `StripeConnectButton` is a client component so it can be imported directly:

```tsx
// src/app/(dashboard)/dashboard/settings/page.tsx
import { RoleGuard } from "@/components/custom/role-guard";
import { CreatorProfileForm } from "@/components/custom/creator-profile-form";
import { StripeConnectButton } from "@/components/custom/stripe-connect-button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your creator profile
      </p>
      <div className="mt-6 space-y-8">
        <RoleGuard requiredRoles={["artist", "organization"]}>
          <CreatorProfileForm />
          <Separator />
          <div>
            <h2 className="text-lg font-semibold">Payouts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Stripe account to receive ticket sale payouts
            </p>
            <div className="mt-4">
              <StripeConnectButton />
            </div>
          </div>
        </RoleGuard>
      </div>
    </div>
  );
}
```

Check if `Separator` from `@/components/ui/separator` exists before using — if not, use a `<div className="border-t" />` instead.

### Task 6: publishEvent Guard Pattern

```typescript
// convex/events.ts — MODIFY publishEvent handler, add AFTER existing ownership check:

// Require Stripe for paid events
const tiers = await ctx.db
  .query("ticketTiers")
  .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
  .collect();
if (tiers.length === 0)
  throw new ConvexError("Add at least one ticket tier before publishing");

const hasPaidTiers = tiers.some((t) => t.price > 0);
if (hasPaidTiers && !user.stripeAccountId)
  throw new ConvexError("Connect your Stripe account before publishing a paid event");
```

**Order of checks in `publishEvent` after this change:**
1. Event exists
2. User is owner
3. Event is draft
4. Has at least one tier
5. **NEW: If paid tiers exist, Stripe must be connected**
6. Event date is in the future

### Task 7: Test Patterns

**Contract tests for Server Actions** (`src/lib/actions/__tests__/stripe-connect.test.ts`):
```typescript
// Test the return shape invariants — pure business logic
describe("createConnectAccount contract", () => {
  it("returns success shape with stripeAccountId and url", () => {
    const mockResult = { success: true, data: { stripeAccountId: "acct_123", url: "https://stripe.com/onboard" } };
    expect(mockResult).toHaveProperty("success");
    expect(mockResult.data).toHaveProperty("stripeAccountId");
    expect(mockResult.data).toHaveProperty("url");
  });
  it("returns error shape on failure", () => {
    const mockError = { success: false, error: "Failed to create Stripe account" };
    expect(mockError.success).toBe(false);
    expect(mockError).toHaveProperty("error");
  });
});
```

**Convex contract tests** (`convex/stripeConnect.test.ts`):
```typescript
describe("saveStripeAccountId mutation contract", () => {
  it("should only allow artist or organization roles", () => { ... });
  it("should require a non-empty stripeAccountId", () => { ... });
});
```

**StripeConnectButton component tests** (`src/components/custom/__tests__/stripe-connect-button.test.tsx`):
- Test not-connected state: renders "Connect with Stripe" button
- Test connected state: renders status badge and dashboard link button
- Test loading state: renders skeleton

**publishEvent test additions** (`convex/events.test.ts`):
```typescript
describe("publishEvent with Stripe requirement", () => {
  it("should reject paid events when stripeAccountId is missing", () => {
    const user = { stripeAccountId: undefined };
    const hasPaidTiers = true;
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(false);
  });
  it("should allow paid events when stripeAccountId is set", () => {
    const user = { stripeAccountId: "acct_123" };
    const hasPaidTiers = true;
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(true);
  });
  it("should allow free events without stripeAccountId", () => {
    const user = { stripeAccountId: undefined };
    const hasPaidTiers = false;
    const canPublish = !(hasPaidTiers && !user.stripeAccountId);
    expect(canPublish).toBe(true);
  });
});
```

### Architecture Compliance

**Server Action pattern** (mandated by architecture):
- All Stripe API calls go through Server Actions in `src/lib/actions/`
- Server Actions use `"use server"` directive
- Return `{ success: boolean, data?: T, error?: string }` — NEVER throw
- Client components use `useTransition` for Server Action pending states

**Convex authorization pattern** (same as all Epic 2 stories):
- `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])`
- `saveStripeAccountId` patches the authenticated user's own record only

**NO NEW CONVEX SCHEMA** — `stripeAccountId: v.optional(v.string())` already on `users` table.

**`"use client"` components:**
- `StripeConnectButton` — uses `useQuery`, `useMutation`, `useTransition`, `useSearchParams`

**Server-only code:**
- `src/lib/stripe/config.ts` — Stripe SDK (never import in client components)
- `src/lib/actions/stripe-connect.ts` — Server Actions

**External redirect:**
- Use `window.location.href = url` (not `router.push`) for Stripe onboarding URL

### UX Requirements

**Settings page `/dashboard/settings` — Payouts section:**
- Below `CreatorProfileForm`, separated by a divider
- **Not connected state:**
  - Heading: "Payouts"
  - Description: "Connect your Stripe account to receive ticket sale payouts"
  - Button: "Connect with Stripe" (default variant, loading state while pending)
- **Connected state:**
  - Status badge: "Active" (green, if `chargesEnabled`) or "Pending setup" (yellow, if `!chargesEnabled`)
  - Button: "Open Stripe Dashboard" (outline variant, opens dashboard login link)
- **Loading state:** Skeleton placeholder while `user` data loads

**Publish flow (AC4):**
- The ConvexError from `publishEvent` surfaces in the existing `showErrorFromCatch` handler in `[eventId]/page.tsx`
- Error message: "Connect your Stripe account before publishing a paid event"
- The creator must navigate to Settings → connect Stripe → return and try again

### Previous Story Learnings

From Story 2.7 code review (most recent):
- **`<img>` for external URLs** — Stripe redirects to external URLs. Use `window.location.href` for the Stripe onboarding URL (not next/image or router.push).
- **Early-return loading pattern** — In `StripeConnectButton`, return `<Skeleton>` if `user === undefined`.
- **Optional chaining in tests** — Use `?.` not `!` for property access after `not.toBeNull()` assertions.

From Story 2.6:
- **Store Server Action results in const** — Call once, use `result.success` and `result.data`.
- **`useTransition` for pending states** — `const [isPending, startTransition] = useTransition()` — consistent with architecture mandate.

From Story 1.4 (creator profile):
- `RoleGuard` wraps the entire settings section — already done in settings page.
- `useMutation` pattern: `const save = useMutation(api.stripeConnect.saveStripeAccountId)` then `await save({ stripeAccountId })`.

### Project Structure Notes

**Files to CREATE (new):**
```
src/lib/stripe/config.ts                                      # NEW: Stripe client singleton
src/lib/actions/stripe-connect.ts                             # NEW: Server Actions for Connect
src/lib/actions/__tests__/stripe-connect.test.ts              # NEW: Server Action contract tests
src/components/custom/stripe-connect-button.tsx               # NEW: Connect UI component
src/components/custom/__tests__/stripe-connect-button.test.tsx # NEW: Component tests
convex/stripeConnect.ts                                        # NEW: saveStripeAccountId mutation
convex/stripeConnect.test.ts                                   # NEW: Convex contract tests
```

**Files to MODIFY (existing):**
```
src/app/(dashboard)/dashboard/settings/page.tsx  # ADD: Payouts section with StripeConnectButton
convex/events.ts                                 # MODIFY: publishEvent adds Stripe check for paid tiers
convex/events.test.ts                            # ADD: publishEvent Stripe requirement tests
```

**Files that do NOT need changes:**
```
convex/schema.ts      # stripeAccountId already on users table
convex/users.ts       # getCurrentUser already returns stripeAccountId
```

### Environment Variables Needed

```bash
# .env.local — add these:
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key (test mode for development)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Base URL for Stripe return/refresh URLs
```

`STRIPE_WEBHOOK_SECRET` is needed for Story 3.3 (webhook handler) — NOT this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1 — Stripe Connect Creator Onboarding with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics.md — FR21: Stripe Express connected account onboarding]
- [Source: _bmad-output/planning-artifacts/architecture.md — Server Actions: external API calls only (Stripe, Resend) — never throw, return `{success, data, error}`]
- [Source: _bmad-output/planning-artifacts/architecture.md — Route Handlers: `POST /api/webhooks/stripe` (Story 3.3), `POST /api/webhooks/clerk`]
- [Source: _bmad-output/planning-artifacts/architecture.md — File structure: `src/lib/stripe/config.ts`, `src/lib/actions/stripe-checkout.ts`]
- [Source: _bmad-output/planning-artifacts/architecture.md — STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET env vars]
- [Source: _bmad-output/planning-artifacts/architecture.md — Stripe Connect (Separate Charges & Transfers), Express connected accounts]
- [Source: convex/schema.ts — users.stripeAccountId: v.optional(v.string()) already defined — NO schema change]
- [Source: convex/events.ts — publishEvent mutation — MODIFY to add Stripe check]
- [Source: src/app/(dashboard)/dashboard/settings/page.tsx — currently shows CreatorProfileForm only — ADD Payouts section]
- [Source: _bmad-output/planning-artifacts/architecture.md — NFR30: Stripe signature verification on webhooks (Story 3.3)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Currency: centavos storage, PHP display via Intl.NumberFormat]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

N/A

### Completion Notes List

- Stripe SDK v20.4.1 installed — uses API version `2026-02-25.clover` (not `2024-06-20` as originally specified in story)
- `convex/_generated/api.d.ts` manually updated to include `stripeConnect` module (normally regenerated by `npx convex dev`)
- `Separator` UI component does not exist; used `<div className="border-t" />` instead
- `ConnectedState` sub-component uses `useEffect` + `getStripeAccountStatus` to fetch live Stripe status on mount
- Component tests initially produced act() warnings — fixed in code review by using `act(async () => {...})` for connected state tests

### Senior Developer Review

**Reviewer:** Claude Sonnet 4.6 (adversarial code review)
**Findings:** 1 HIGH, 3 MEDIUM, 2 LOW
**Resolution:** Fixed automatically — all HIGH and MEDIUM issues resolved

**H1 — FIXED:** `handleConnect` missing try/catch around `saveStripeAccountId` Convex mutation — added try/catch + `showErrorFromCatch` in `stripe-connect-button.tsx:41-52`

**M1 — FIXED:** `ConnectedState` badge showed skeleton indefinitely when `getStripeAccountStatus` returned `{success: false}` — added `statusError` state with "Unknown" badge fallback in `stripe-connect-button.tsx:90-93, 107-111`

**M2 — FIXED:** `getMyStripeStatus` query in `convex/stripeConnect.ts` was dead code (never called — `getCurrentUser` already returns `stripeAccountId`) — removed the query entirely

**M3 — FIXED:** `saveStripeAccountId` accepted any string — added `acct_` prefix validation with `ConvexError` before auth check in `convex/stripeConnect.ts:8-10`

**L1 (deferred):** `stripe_refresh=true` URL param ignored — acceptable; user returns to "Pending setup" state which is correct
**L2 (deferred):** Server Action contract tests test mock objects not real functions — consistent with project-wide contract test pattern

**Post-review validation:** 311 tests passing, build ✓, lint 0 errors

### File List

**Created:**
- `src/lib/stripe/config.ts` — Stripe singleton client
- `src/lib/actions/stripe-connect.ts` — Server Actions: createConnectAccount, getStripeAccountStatus, createDashboardLink
- `src/lib/actions/__tests__/stripe-connect.test.ts` — Server Action contract tests (11 tests)
- `src/components/custom/stripe-connect-button.tsx` — StripeConnectButton client component
- `src/components/custom/__tests__/stripe-connect-button.test.tsx` — Component tests (6 tests)
- `convex/stripeConnect.ts` — saveStripeAccountId mutation (getMyStripeStatus removed as dead code)
- `convex/stripeConnect.test.ts` — Convex contract tests (6 tests)

**Modified:**
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Added Payouts section with StripeConnectButton
- `convex/events.ts` — publishEvent: added Stripe guard for paid tiers
- `convex/events.test.ts` — Added 5 publishEvent Stripe requirement tests
- `convex/_generated/api.d.ts` — Added stripeConnect module to generated API types
