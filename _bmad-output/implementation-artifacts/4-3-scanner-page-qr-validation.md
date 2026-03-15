# Story 4.3: Scanner Page & QR Validation

Status: done

## Story

As a **door staff member**,
I want to scan QR codes at the event entrance and see instant pass/fail results,
So that I can validate tickets quickly and prevent unauthorized entry.

## Acceptance Criteria

1. **Given** I am the event creator
   **When** I navigate to `/dashboard/events/[eventId]/scanner`
   **Then** I see the QrScanner component in a full-screen minimal layout (FR27)
   **And** the camera activates and scans for QR codes

2. **Given** I scan a valid, unused QR code
   **When** the scan API at `/api/scan` verifies the HMAC signature and checks the database
   **Then** a green "Valid" result is displayed with buyer email and tier name (FR27)
   **And** the ticket's `scannedAt` timestamp and `scannedBy` email are set in the database
   **And** the scan result auto-resets after 4 seconds for the next scan

3. **Given** I scan a QR code that has already been scanned
   **When** the duplicate check runs
   **Then** a red "Already Scanned" result is shown with the original scan timestamp (FR28)
   **And** the ticket is NOT re-admitted (no second scannedAt write)

4. **Given** I scan an invalid or tampered QR code
   **When** HMAC verification fails
   **Then** a red "Invalid Ticket" result is shown (NFR10)

5. **Given** I scan a QR code for a different event
   **When** the event ID check runs
   **Then** a red "Wrong Event" result is shown

6. **Given** I am NOT the event creator
   **When** I navigate to `/dashboard/events/[eventId]/scanner`
   **Then** an "Unauthorized" message is shown and scanning is disabled

## Tasks / Subtasks

- [x] **Task 1: Install `html5-qrcode` library** (AC: #1)
  - [x] 1.1 Run `pnpm add html5-qrcode` to add camera QR scanning library
  - [x] 1.2 Verify it appears in `package.json` dependencies (no types package needed — library ships its own)

- [x] **Task 2: Add Convex functions in `convex/tickets.ts`** (AC: #2, #3, #4, #5)
  - [x] 2.1 Add `getTicketByIdForScan` query:
    ```typescript
    export const getTicketByIdForScan = query({
      args: {
        ticketId: v.string(),
        querySecret: v.string(),
      },
      handler: async (ctx, args) => {
        if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
          throw new ConvexError("Unauthorized");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await ctx.db.get(args.ticketId as any) ?? null;
      },
    });
    ```
  - [x] 2.2 Add `markTicketScanned` mutation:
    ```typescript
    export const markTicketScanned = mutation({
      args: {
        scanSecret: v.string(),
        ticketId: v.string(),
        scannedBy: v.string(),
      },
      handler: async (ctx, args) => {
        if (args.scanSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
          throw new ConvexError("Unauthorized");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.patch(args.ticketId as any, {
          scannedAt: Date.now(),
          scannedBy: args.scannedBy,
        });
      },
    });
    ```
  - [x] 2.3 Note: `scannedAt` and `scannedBy` are already in the `tickets` schema (`v.optional(v.number())` and `v.optional(v.string())`) — no schema migration needed

- [x] **Task 3: Create scan API route `src/app/api/scan/route.ts`** (AC: #2, #3, #4, #5)
  - [x] 3.1 Create `src/app/api/scan/route.ts` as a Next.js Route Handler:
    ```typescript
    import { NextRequest, NextResponse } from "next/server";
    import { auth } from "@clerk/nextjs/server";
    import { ConvexHttpClient } from "convex/browser";
    import { api } from "../../../../convex/_generated/api";
    import { verifySignature, buildQrPayload, type QrPayload } from "@/lib/qr/signing";

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    export async function POST(req: NextRequest) {
      // ... (see subtasks below)
    }
    ```
  - [x] 3.2 Verify Clerk auth — return 401 if unauthenticated:
    ```typescript
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    ```
  - [x] 3.3 Parse request body `{ qrCode: string, eventId: string }` — return 400 if malformed
  - [x] 3.4 Parse `qrCode` as `QrPayload` JSON (wrap in try/catch — invalid JSON = invalid ticket):
    ```typescript
    let payload: QrPayload;
    try {
      payload = JSON.parse(qrCode);
    } catch {
      return NextResponse.json({ status: "invalid_signature" });
    }
    if (!payload.ticketId || !payload.eventId || !payload.tierId || !payload.buyerEmail) {
      return NextResponse.json({ status: "invalid_signature" });
    }
    ```
  - [x] 3.5 Fetch ticket from Convex via `getTicketByIdForScan` — return `{ status: "not_found" }` if null
  - [x] 3.6 Verify HMAC signature: `verifySignature(qrCode, ticket.qrSignature)` — return `{ status: "invalid_signature" }` if false
  - [x] 3.7 Check event match: `payload.eventId !== eventId` → return `{ status: "wrong_event" }`
  - [x] 3.8 Check duplicate scan: `ticket.scannedAt !== undefined` → return `{ status: "already_scanned", scannedAt: ticket.scannedAt }`
  - [x] 3.9 Mark as scanned via `markTicketScanned` mutation (pass `scannedBy` = user Clerk email):
    ```typescript
    // Get scanner email from Convex user record (or Clerk identity)
    const clerkUser = await clerkClient().users.getUser(userId);
    const scannerEmail = clerkUser.emailAddresses[0]?.emailAddress ?? userId;
    await convex.mutation(api.tickets.markTicketScanned, {
      scanSecret: process.env.CONVEX_WEBHOOK_SECRET!,
      ticketId: payload.ticketId,
      scannedBy: scannerEmail,
    });
    ```
  - [x] 3.10 Return success: `{ status: "valid", buyerEmail: ticket.buyerEmail, tierId: ticket.tierId }`
  - [x] 3.11 Wrap entire handler in try/catch — return `{ status: "error", message: "..." }` for unexpected errors

  **Response shape:**
  ```typescript
  type ScanResponse =
    | { status: "valid"; buyerEmail: string; tierId: string }
    | { status: "already_scanned"; scannedAt: number }
    | { status: "invalid_signature" }
    | { status: "wrong_event" }
    | { status: "not_found" }
    | { status: "error"; message: string };
  ```

- [x] **Task 4: Create `ScannerLayout` component `src/components/layouts/scanner-layout.tsx`** (AC: #1)
  - [x] 4.1 Create a minimal full-screen layout (no sidebar, dark background for camera contrast):
    ```tsx
    type Props = { children: React.ReactNode; title?: string };

    export function ScannerLayout({ children, title }: Props) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col">
          {title && (
            <header className="p-4 border-b">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
            </header>
          )}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      );
    }
    ```
  - [x] 4.2 This is a layout COMPONENT (not a Next.js `layout.tsx` route segment) — used inside the scanner page

- [x] **Task 5: Create `QrScanner` component `src/components/custom/qr-scanner.tsx`** (AC: #1)
  - [x] 5.1 Create a `"use client"` component that wraps `html5-qrcode`'s `Html5Qrcode` class:
    ```typescript
    "use client";
    import { useEffect, useRef } from "react";

    type Props = {
      onScan: (qrCode: string) => void;
      /** Pause scanning while a result is being processed */
      paused?: boolean;
    };

    export function QrScanner({ onScan, paused }: Props) {
      const pausedRef = useRef(paused);
      useEffect(() => { pausedRef.current = paused; }, [paused]);
      const scannerRef = useRef<any>(null);

      useEffect(() => {
        let stopped = false;
        import("html5-qrcode").then(({ Html5Qrcode }) => {
          if (stopped) return;
          const scanner = new Html5Qrcode("qr-reader-container");
          scannerRef.current = scanner;
          scanner
            .start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (text) => {
                if (!pausedRef.current) onScan(text);
              },
              undefined
            )
            .catch((err) => console.error("QR scanner start failed:", err));
        });
        return () => {
          stopped = true;
          scannerRef.current
            ?.stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        };
      }, []); // Start once on mount — pause via ref to avoid re-starting camera

      return (
        <div
          id="qr-reader-container"
          className="w-full max-w-sm mx-auto rounded-lg overflow-hidden"
        />
      );
    }
    ```
  - [x] 5.2 Use `Html5Qrcode` (NOT `Html5QrcodeScanner`) — lower-level, gives control over UI
  - [x] 5.3 Use `facingMode: "environment"` for rear camera on mobile devices
  - [x] 5.4 Dynamic import via `import("html5-qrcode")` inside `useEffect` — browser-only, safe from SSR
  - [x] 5.5 Use a `ref` for `paused` state to avoid restarting the camera on each render
  - [x] 5.6 Always stop and clear scanner in `useEffect` cleanup to release camera

- [x] **Task 6: Create scanner page `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx`** (AC: #1–#6)
  - [x] 6.1 Create as a `"use client"` component (matches ALL existing dashboard page patterns)
  - [x] 6.2 Import `QrScanner` with `dynamic(..., { ssr: false })` to prevent SSR issues:
    ```typescript
    const QrScanner = dynamic(
      () => import("@/components/custom/qr-scanner").then((m) => ({ default: m.QrScanner })),
      { ssr: false, loading: () => <Skeleton className="w-full max-w-sm h-64 mx-auto" /> }
    );
    ```
  - [x] 6.3 Fetch event data via `useQuery(api.events.getPublicEventById, { eventId })` and current user via `useQuery(api.users.getCurrentUser)`
  - [x] 6.4 Authorization check: compare `event.creatorId` with `currentUser._id` — show "Unauthorized" state if mismatch
  - [x] 6.5 State management:
    ```typescript
    const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    ```
  - [x] 6.6 On QR code scanned, POST to `/api/scan`:
    ```typescript
    async function handleScan(qrCode: string) {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode, eventId }),
        });
        const data = await res.json();
        setScanResult(data);
      } catch {
        setScanResult({ status: "error", message: "Network error" });
      } finally {
        setIsProcessing(false);
      }
    }
    ```
  - [x] 6.7 Auto-reset result after 4 seconds:
    ```typescript
    useEffect(() => {
      if (!scanResult) return;
      const timer = setTimeout(() => setScanResult(null), 4000);
      return () => clearTimeout(timer);
    }, [scanResult]);
    ```
  - [x] 6.8 Render result overlay:
    - `"valid"` → green card: "✓ Valid Ticket" + buyer email + tier name
    - `"already_scanned"` → red card: "✗ Already Scanned" + formatted timestamp
    - `"invalid_signature"` → red card: "✗ Invalid Ticket"
    - `"wrong_event"` → red card: "✗ Wrong Event"
    - `"not_found"` → red card: "✗ Ticket Not Found"
    - `"error"` → red card: error message
  - [x] 6.9 Use `ScannerLayout` as wrapper with event title as header
  - [x] 6.10 Show a back link to `/dashboard/events/[eventId]` in the header

- [x] **Task 7: Write tests** (AC: #2–#5)
  - [x] 7.1 Add contract tests to `convex/tickets.test.ts` for new Convex functions:
    - `getTicketByIdForScan` auth contract: wrong secret throws Unauthorized
    - `getTicketByIdForScan` returns null for unknown ticketId (not found contract)
    - `markTicketScanned` auth contract: wrong secret throws Unauthorized
    - `markTicketScanned` write contract: patches `scannedAt` (number) and `scannedBy` (string)
  - [x] 7.2 Add contract tests to `src/app/api/scan/__tests__/route.test.ts` (create new file):
    - Scan logic: valid QR + correct eventId + not yet scanned → `"valid"`
    - Scan logic: valid QR + already scanned → `"already_scanned"` with timestamp
    - Scan logic: tampered/invalid JSON → `"invalid_signature"`
    - Scan logic: valid QR but wrong eventId → `"wrong_event"`
    - HMAC verification contract: `verifySignature` integration (reuse established pattern from `signing.test.ts`)
  - [x] 7.3 Use pure contract-testing pattern (no module imports of actual route — test extracted logic functions) — consistent with all existing test files

## Dev Notes

### Critical: `html5-qrcode` Must Be Installed First

`html5-qrcode` is in the architecture spec but NOT yet in `package.json`. Task 1 must run before any other task.

```bash
pnpm add html5-qrcode
```

The library ships its own TypeScript types (no `@types/html5-qrcode` needed). Ships v2.x with `Html5Qrcode` (programmatic) and `Html5QrcodeScanner` (built-in UI). Use `Html5Qrcode` for custom UI control.

### Schema: `scannedAt` and `scannedBy` Already in Schema — No Migration

Current `convex/schema.ts` tickets table:
```typescript
tickets: defineTable({
  // ... existing fields ...
  scannedAt: v.optional(v.number()),    // ← ALREADY EXISTS
  scannedBy: v.optional(v.string()),    // ← ALREADY EXISTS
  createdAt: v.number(),
})
```
No Convex schema migration needed. Both fields are optional — tickets without scans simply don't have these fields set.

### QR Payload Structure

The `qrCode` field stored in the `tickets` table IS the JSON string encoded in the QR image. It has shape:
```typescript
type QrPayload = {
  ticketId: string;  // Convex ticket _id
  eventId: string;   // Convex event _id
  tierId: string;    // Convex ticketTier _id
  buyerEmail: string;
};
```
Built via `buildQrPayload(payload)` from `src/lib/qr/signing.ts`.

**Verification flow:**
1. Parse scanned string as `QrPayload` JSON → get `ticketId`
2. Fetch ticket from DB by `ticketId` → get stored `qrSignature`
3. `verifySignature(scannedString, ticket.qrSignature)` → boolean
4. `verifySignature` throws if `QR_SIGNING_SECRET` is not set — this is intentional (misconfiguration = loud failure)

### Existing QR Signing Library (`src/lib/qr/signing.ts`)

```typescript
export type QrPayload = { ticketId: string; eventId: string; tierId: string; buyerEmail: string };
export function verifySignature(payloadJson: string, signature: string): boolean { ... }
export function buildQrPayload(payload: QrPayload): string { ... }
```

The `verifySignature` function uses `crypto.timingSafeEqual` with byte-buffer comparison (not string-length). It uses `QR_SIGNING_SECRET` env var — must be set in both Next.js and Convex environments.

### Clerk Auth in Route Handlers

Import from `@clerk/nextjs/server` (NOT `@clerk/nextjs`):
```typescript
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ status: "error" }, { status: 401 });

  // Get user's email for scannedBy field:
  const clerkUser = await clerkClient().users.getUser(userId);
  const scannerEmail = clerkUser.emailAddresses[0]?.emailAddress ?? userId;
}
```

### `html5-qrcode` Usage Pattern

```typescript
import("html5-qrcode").then(({ Html5Qrcode }) => {
  const scanner = new Html5Qrcode("dom-element-id");
  // Start with rear camera:
  scanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => { /* success callback */ },
    undefined  // error callback (scan attempt failures — not errors)
  ).catch((err) => console.error("Camera start failed:", err));

  // Cleanup (MUST call in useEffect return):
  return () => {
    scanner.stop().then(() => scanner.clear()).catch(() => {});
  };
});
```

**CRITICAL:** `Html5Qrcode` attaches to a DOM element by ID. The element MUST be in the DOM when `start()` is called. Use `useEffect` (not a ref callback) so the DOM is ready.

**CRITICAL:** `html5-qrcode` is browser-only. Import inside `useEffect` via dynamic import. Parent page must use `dynamic(..., { ssr: false })`.

### Dynamic Import Pattern for Browser-Only Libraries (Established in Story 4.2)

```typescript
import dynamic from "next/dynamic";

const QrScanner = dynamic(
  () => import("@/components/custom/qr-scanner").then((m) => ({ default: m.QrScanner })),
  { ssr: false, loading: () => <Skeleton className="w-full max-w-sm h-64 mx-auto" /> }
);
```

### Dashboard Page Import Depth

The scanner page is at `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` — 6 levels deep from `src/`:
```typescript
import { api } from "../../../../../../convex/_generated/api";
//                  6 levels up to project root
```

### Convex Function Authorization Pattern

Scan-related Convex functions use `CONVEX_WEBHOOK_SECRET` (same as webhook pattern from Stories 4.1/4.2):
```typescript
if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
  throw new ConvexError("Unauthorized");
}
```
This is the established pattern for server-to-server calls (API Route → Convex).

### Event Creator Authorization on Scanner Page

The scanner page (client component) checks ownership:
```typescript
const event = useQuery(api.events.getPublicEventById, { eventId: params.eventId as any });
const currentUser = useQuery(api.users.getCurrentUser);

const isAuthorized = event && currentUser && event.creatorId === currentUser._id;
```

`getPublicEventById` is used in `email.ts` — it returns `{ title, date, time, venueName }` but NOT `creatorId`. **Check if it returns `creatorId` before using it.** If not, you may need to use a different existing query or add `creatorId` to the return shape. Look at `convex/events.ts` `getPublicEventById` to verify.

### ScannerLayout: Component, NOT Next.js Route Segment

Architecture shows `scanner-layout.tsx` as a component in `src/components/layouts/`. This is NOT a Next.js `layout.tsx` route segment — it's a React component used inside the scanner page to override the dashboard sidebar layout.

```tsx
// Usage in scanner/page.tsx:
return (
  <ScannerLayout title={event.title}>
    <QrScanner onScan={handleScan} paused={isProcessing} />
    {scanResult && <ScanResultOverlay result={scanResult} />}
  </ScannerLayout>
);
```

### Test Pattern: Pure Contract Tests (Established Pattern)

All existing tests in this project use pure contract tests — no module imports of actual server code. For the scan API route tests, extract the scan logic into pure functions and test those:

```typescript
// In route.test.ts — test extracted helpers, not the actual Next.js handler:
function parseScanPayload(qrCode: string): QrPayload | null { ... }
function checkScanResult(ticket, scannedPayload, eventId): ScanResponse { ... }

describe("parseScanPayload", () => { ... });
describe("checkScanResult", () => { ... });
```

### File Structure

```
New files:
  src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx  # Scanner page
  src/app/api/scan/route.ts                                         # Scan verification API
  src/components/custom/qr-scanner.tsx                              # Camera scanner component
  src/components/layouts/scanner-layout.tsx                         # Minimal full-screen layout
  src/app/api/scan/__tests__/route.test.ts                          # Scan API contract tests

Modified files:
  convex/tickets.ts                    # + getTicketByIdForScan, markTicketScanned
  convex/tickets.test.ts               # + contract tests for both new functions
  package.json                         # + html5-qrcode dependency
```

### Previous Story Learnings (Stories 4.1, 4.2, 3.5, 3.4)

- **`qrCode` field is JSON payload string** — NOT a base64 image. Pass raw string to `verifySignature()` and `buildQrPayload()`.
- **`qrCode === ""`** if QR generation failed — guard against scanning empty strings
- **All dashboard pages are `"use client"`** — scanner page MUST be `"use client"`
- **`eslint-disable-next-line @typescript-eslint/no-explicit-any`** before Convex `as any` casts for Id types
- **`useEffect` cleanup is CRITICAL** for camera resources — always stop and clear `Html5Qrcode`
- **`convex/browser` `ConvexHttpClient`** for server-side (Route Handler) Convex calls — NOT `convex/react` hooks
- **Lazy singleton pattern** for Convex and Stripe clients in Route Handlers (see `src/lib/stripe/webhooks.ts`)

### References

- [Source: epics.md — Epic 4, Story 4.3 — ACs and requirements]
- [Source: architecture.md — QR scanning FR28-30 — html5-qrcode library]
- [Source: architecture.md — File/folder structure — scanner/, api/scan/]
- [Source: architecture.md — API boundaries — `/api/scan` Route Handler with HMAC verification]
- [Source: architecture.md — Tech stack — html5-qrcode for scanning]
- [Source: convex/schema.ts — tickets table — scannedAt, scannedBy already defined]
- [Source: src/lib/qr/signing.ts — verifySignature, buildQrPayload, QrPayload type]
- [Source: src/lib/qr/generate.ts — generateQrCodeData — confirms qrCode is JSON payload]
- [Source: src/app/(dashboard)/dashboard/events/[eventId]/page.tsx — dashboard "use client" pattern]
- [Source: src/components/layouts/dashboard-layout.tsx — existing layouts for scanner-layout reference]
- [Source: src/lib/stripe/webhooks.ts — ConvexHttpClient lazy singleton pattern]
- [Source: Story 4.2 Dev Notes — html5-qrcode dynamic import, useEffect camera cleanup]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Installed `html5-qrcode@2.3.8` (ships its own types — no `@types/` package needed).
- Added `getTicketByIdForScan` (query) and `markTicketScanned` (mutation) to `convex/tickets.ts` — both secured with `CONVEX_WEBHOOK_SECRET`, following the established pattern from Stories 4.1/4.2.
- Created `src/app/api/scan/route.ts` — POST Route Handler with Clerk auth, HMAC verification (via `verifySignature`), duplicate scan detection, and `markTicketScanned` call. Exports `ScanResponse` discriminated union type for use by the scanner page.
- Created `src/components/layouts/scanner-layout.tsx` — minimal full-screen layout component (not a Next.js route segment). Conditionally renders a header with event title.
- Created `src/components/custom/qr-scanner.tsx` — `"use client"` component using dynamic import of `Html5Qrcode` inside `useEffect`. Uses `pausedRef` pattern to avoid restarting camera on state changes. Camera stopped and cleared on unmount.
- Created `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` — `"use client"` page using `getPublicEventById` + `getCurrentUser` for client-side ownership check (AC#6). `QrScanner` dynamically imported with `ssr: false`. Result cards for all 6 `ScanResponse` statuses with 4-second auto-reset. Back link to event detail page included.
- Added 9 contract tests to `convex/tickets.test.ts` for `getTicketByIdForScan` (auth + not-found + found) and `markTicketScanned` (auth + patch contract).
- Created `src/app/api/scan/__tests__/route.test.ts` with 16 contract tests covering `parseScanPayload` (7 tests) and `checkScanResult` (6 tests) extracted logic functions, plus HMAC contract (3 tests).
- All 519 tests pass (up from 494 — 25 new tests added).
- **Decision note:** Scanner page uses `getPublicEventById` (requires published event) + `getCurrentUser` for client-side auth check. Published-only is appropriate for scanner use case (events must be live to scan tickets).

### Code Review Fixes (claude-sonnet-4-6, 2026-03-11)

- ✅ Fixed H1: AC#2 violation — `getTicketByIdForScan` now joins tier record and returns `tierName`; `ScanResponse.valid` includes `tierName`; scanner page displays `result.tierName` instead of raw `tierId`
- ✅ Fixed M1: Stale `onScan` closure in `QrScanner` — added `onScanRef` pattern (mirrors `pausedRef`) so scanner always calls the latest `handleScan` function reference
- ✅ Fixed M2: Added empty string guard `if (!qrCode) return;` at top of `handleScan` per Story Dev Notes requirement
- ✅ Fixed M3: `already_scanned` timestamp now uses `formatDateTime` (date + time) instead of `formatDate` (date only) — critical UX for door staff
- ✅ Fixed M4: Replaced mock HMAC tests with real `verifySignature` + `beforeEach`/`afterEach` env setup — 4 real assertions now cover correct, tampered, different-payload, and round-trip cases
- ✅ Fixed L1: `setScanResult(null)` added at top of `handleScan` — clears previous result immediately on new scan instead of waiting for 4s timer
- ✅ Fixed L2: `scanner-layout.tsx` now imports `ReactNode` from `react` explicitly
- All 520 tests pass after code review fixes (1 additional test from expanded HMAC suite)

### File List

- `package.json` (modified — added html5-qrcode@2.3.8)
- `pnpm-lock.yaml` (modified — updated by pnpm)
- `convex/tickets.ts` (modified — added getTicketByIdForScan, markTicketScanned; H1 fix: join tierName)
- `convex/tickets.test.ts` (modified — added 9 new contract tests)
- `src/app/api/scan/route.ts` (created; H1 fix: ScanResponse.valid includes tierName)
- `src/app/api/scan/__tests__/route.test.ts` (created; M4 fix: real verifySignature HMAC tests)
- `src/components/layouts/scanner-layout.tsx` (created; L2 fix: explicit ReactNode import)
- `src/components/custom/qr-scanner.tsx` (created; M1 fix: onScanRef pattern)
- `src/app/(dashboard)/dashboard/events/[eventId]/scanner/page.tsx` (created; M2/M3/L1 fixes)
- `_bmad-output/implementation-artifacts/4-3-scanner-page-qr-validation.md` (updated — status: done)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated — 4-3: done)
