# Story 1.5: System Feedback & Error Handling

Status: done

## Story

As a **user**,
I want clear error pages and in-app feedback when things go wrong or succeed,
So that I always know what happened and what to do next.

## Acceptance Criteria

1. **Given** I navigate to a URL that doesn't exist **When** the page loads **Then** a styled 404 page is displayed with navigation back to home (FR50) **And** the page follows the platform's design system
2. **Given** an unhandled server error occurs **When** the error boundary catches it **Then** a styled 500 error page is displayed (FR50) **And** the error is logged
3. **Given** I perform any successful action (e.g., save profile) **When** the action completes **Then** a Sonner toast notification confirms success (FR51)
4. **Given** I perform an action that fails **When** the action returns an error **Then** a destructive toast notification shows the error message (FR51)
5. **Given** I am filling out any form **When** I enter invalid data **Then** Zod-powered validation messages appear inline below the relevant fields (FR52) **And** form inputs have associated labels and error messages announced to screen readers (NFR26) **And** all interactive elements are keyboard accessible with visible focus indicators (NFR24)

## Tasks / Subtasks

- [x] **Task 1: Upgrade global 404 page** (AC: #1)
  - [x] 1.1 Rewrite `src/app/not-found.tsx` using shadcn Button + Card components, matching the design system (no raw HTML `<button>` or inline styles)
  - [x] 1.2 Include: large 404 heading, descriptive message ("The page you're looking for doesn't exist or has been moved"), "Go Home" button linking to `/`, "Go to Dashboard" button linking to `/dashboard`
  - [x] 1.3 Use responsive centering (`min-h-[calc(100vh-4rem)]` or `min-h-screen`) and the design system's typography classes
  - [x] 1.4 Add proper `<title>` via metadata export: `"Page Not Found | PHLive"`

- [x] **Task 2: Upgrade global error boundary** (AC: #2)
  - [x] 2.1 Rewrite `src/app/error.tsx` using shadcn Button + Card components, matching the design system
  - [x] 2.2 Include: "Something went wrong" heading, error message (only show `error.message` in development, generic message in production), "Try Again" button calling `reset()`, "Go Home" button linking to `/`
  - [x] 2.3 Log the error via `console.error` in a `useEffect` (not during render) with the error digest for server-side correlation
  - [x] 2.4 Ensure the component is `"use client"` (required for error boundaries)

- [x] **Task 3: Add dashboard-level error boundary and not-found** (AC: #1, #2)
  - [x] 3.1 Create `src/app/(dashboard)/error.tsx` — dashboard-specific error boundary that renders inside the dashboard layout shell
  - [x] 3.2 Create `src/app/(dashboard)/not-found.tsx` — dashboard-specific 404 that renders inside the dashboard layout, with "Go to Dashboard" button

- [x] **Task 4: Configure Sonner Toaster with UX-compliant settings** (AC: #3, #4)
  - [x] 4.1 Update `src/components/ui/sonner.tsx` — configure Toaster with: `position="bottom-right"` for desktop, `visibleToasts={3}` (max 3 stacked per UX spec), `duration={4000}` (4s auto-dismiss), `closeButton={true}` (dismiss X button per UX spec), `richColors={true}` for success/error color coding
  - [x] 4.2 Verify Toaster is already rendered in root layout (it is at `src/app/layout.tsx:35`)
  - [x] 4.3 Create `src/lib/utils/toast-helpers.ts` with typed toast wrapper functions:
    - `showSuccess(message: string)` — calls `toast.success(message)`
    - `showError(message: string)` — calls `toast.error(message)`
    - `showErrorFromCatch(error: unknown)` — extracts message from `ConvexError` or generic `Error`, calls `toast.error(message)`

- [x] **Task 5: Audit and fix existing toast usage for ConvexError extraction** (AC: #4)
  - [x] 5.1 Search all files for `toast.error` and `toast.success` calls
  - [x] 5.2 Ensure all mutation error catches use `showErrorFromCatch` (or equivalent ConvexError extraction) — especially `src/components/custom/creator-profile-form.tsx` (already fixed in Story 1.4 review), `src/components/custom/role-guard.tsx`, `src/components/custom/role-switcher.tsx`
  - [x] 5.3 Ensure all success toasts use consistent messaging patterns

- [x] **Task 6: Create global loading skeleton page for dashboard** (AC: related to feedback)
  - [x] 6.1 Create `src/app/(dashboard)/dashboard/loading.tsx` — a `loading.tsx` file using Skeleton components matching the dashboard page layout
  - [x] 6.2 Skeletons must match the exact layout of loaded content to prevent layout shift (per UX spec)

- [x] **Task 7: Verify form validation accessibility** (AC: #5)
  - [x] 7.1 Audit `src/components/ui/form.tsx` — confirm `FormMessage` renders with `aria-describedby` linking error messages to inputs (shadcn Form component should do this automatically via `FormControl`)
  - [x] 7.2 Audit `src/components/custom/creator-profile-form.tsx` — confirm all inputs have `<FormLabel>`, inline error via `<FormMessage>`, and validation mode is `"onBlur"` (not on every keystroke)
  - [x] 7.3 Verify keyboard navigation works through the form (tab order, focus indicators)
  - [x] 7.4 If any issues found, fix them. If no issues, document that the audit passed.

- [x] **Task 8: Write tests** (AC: #1, #2, #3, #4, #5)
  - [x] 8.1 Create `src/app/__tests__/not-found.test.tsx` — test: renders 404 heading, renders "Go Home" link, renders "Go to Dashboard" link
  - [x] 8.2 Create `src/app/__tests__/error.test.tsx` — test: renders error heading, renders "Try Again" button, calls reset() on click, renders "Go Home" link
  - [x] 8.3 Create `src/lib/utils/__tests__/toast-helpers.test.ts` — test: `showSuccess` calls `toast.success`, `showError` calls `toast.error`, `showErrorFromCatch` extracts ConvexError message, `showErrorFromCatch` falls back for generic errors
  - [x] 8.4 Create `src/app/(dashboard)/__tests__/error.test.tsx` — test: renders dashboard error boundary, reset button works
  - [x] 8.5 Create `src/app/(dashboard)/__tests__/not-found.test.tsx` — test: renders dashboard 404

- [x] **Task 9: Final validation**
  - [x] 9.1 Run `pnpm build` — must succeed
  - [x] 9.2 Run `pnpm test:run` — all tests pass (98 tests across 16 files)
  - [x] 9.3 Run `pnpm lint` — no errors (4 warnings from generated Convex files only)

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `src/app/error.tsx` — **EXISTS but needs upgrade**. Currently a basic scaffold with raw HTML button/inline styles. Must be rewritten with shadcn components.
- `src/app/not-found.tsx` — **EXISTS but needs upgrade**. Currently a basic scaffold with raw HTML link/inline styles. Must be rewritten with shadcn components.
- `src/app/layout.tsx` — Root layout with `<Toaster />` from sonner already rendered. **Do NOT modify** unless adding Toaster props.
- `src/components/ui/sonner.tsx` — Sonner Toaster wrapper. **MODIFY** to add UX-compliant configuration (position, max toasts, duration, close button).
- `src/components/custom/creator-profile-form.tsx` — Already has ConvexError extraction in catch block (fixed in Story 1.4 review). Use as reference pattern.
- `src/components/custom/role-guard.tsx` — Has `switchRole` and `addRole` mutation calls with toast feedback. Audit for ConvexError extraction.
- `src/components/custom/role-switcher.tsx` — Has role switching with toast. Audit for ConvexError extraction.
- `src/components/ui/form.tsx` — shadcn Form component with `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`. Uses `aria-describedby` and `aria-invalid` automatically.
- `convex/lib/auth.ts` — Has `getAuthenticatedUser(ctx)` (throws) and `getOptionalAuthenticatedUser(ctx)` (returns null)
- All shadcn UI components at `src/components/ui/` — button, card, skeleton, etc.

### Architecture Compliance

**Error Handling Hierarchy (from architecture.md):**
1. Zod validation (client + server) — catches invalid input
2. Server Action try/catch — returns `ActionResult<T>`
3. Route Handler try/catch — webhook processing errors
4. Error boundary (`error.tsx`) — unhandled React rendering errors
5. Not-found (`not-found.tsx`) — 404s at route group level
6. Global error page — last resort

**Error Page Pattern (from Next.js 16.1.6):**
```typescript
// src/app/not-found.tsx — Server Component (no "use client")
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {/* Styled with design system components */}
    </div>
  );
}

// src/app/error.tsx — MUST be "use client"
"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (/* ... */);
}
```

**Toast Configuration Pattern (from UX spec):**
```typescript
// src/components/ui/sonner.tsx — update Toaster props:
<Sonner
  position="bottom-right"
  visibleToasts={3}
  duration={4000}
  closeButton={true}
  richColors={true}
  // ... existing props
/>
```

**Toast Helper Pattern (new utility):**
```typescript
// src/lib/utils/toast-helpers.ts
import { toast } from "sonner";
import { ConvexError } from "convex/values";

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showErrorFromCatch(error: unknown) {
  const message = error instanceof ConvexError
    ? (error.data as string)
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";
  toast.error(message);
}
```

**UX Toast Rules (MUST follow):**
- Maximum 3 toasts stacked simultaneously
- Desktop: bottom-right corner
- Mobile: bottom-center, full-width (Sonner handles this automatically with `position="bottom-right"`)
- All toasts have dismiss button (X)
- Error toasts include retry action when applicable
- Auto-dismiss in 4 seconds
- Success: green with checkmark icon (richColors handles this)
- Error: red with X icon (richColors handles this)

**UX Error Page Rules:**
- Never show raw error codes to users
- Always explain what happened AND what to do next
- "Reassurance, not panic" — clear messages, obvious next step
- Design system components only (no raw HTML buttons)

**Form Validation UX Rules (already mostly implemented, verify):**
- Real-time validation on blur (not on every keystroke) — `mode: "onBlur"` in useForm
- Error text below field in `text-destructive text-sm`
- Field border turns red (`border-destructive`) — handled by shadcn FormMessage
- No validation on empty required fields until form submission attempted
- `aria-describedby` linking error messages to inputs — shadcn FormControl does this
- `aria-invalid` on fields with errors — shadcn FormControl does this

### Key Decisions

- **Upgrade existing files, not create new ones** — `error.tsx` and `not-found.tsx` already exist but are basic scaffolds. Rewrite them in-place.
- **Dashboard-level boundaries** — Add `error.tsx` and `not-found.tsx` inside `(dashboard)/` route group so errors within the dashboard render inside the dashboard shell.
- **Toast helpers as utility functions** — Centralize ConvexError extraction pattern into `toast-helpers.ts` so all components use consistent error display. This prevents the "generic error message" bug found in Story 1.4 code review.
- **No new shadcn components needed** — All required components (Button, Card, Skeleton) are already installed.
- **Loading.tsx only for dashboard** — Create a dashboard loading skeleton. Other loading.tsx files will be added as their routes are created in future stories.
- **Audit approach for AC #5** — The shadcn Form component already handles most accessibility requirements. The task is to audit and verify, not rebuild.

### File Naming Conventions

- Error boundaries: `error.tsx` in route directories (Next.js convention)
- Not-found pages: `not-found.tsx` in route directories (Next.js convention)
- Loading pages: `loading.tsx` in route directories (Next.js convention)
- Test files co-located: `__tests__/` subdirectory with `.test.tsx` suffix
- Utilities: `src/lib/utils/` with kebab-case

### Environment Variables Needed

No new environment variables needed for this story.

### Project Structure Notes

Files to create/modify:
```
src/app/not-found.tsx                                # MODIFY: Upgrade with design system components
src/app/error.tsx                                    # MODIFY: Upgrade with design system + error logging
src/app/(dashboard)/error.tsx                        # CREATE: Dashboard-specific error boundary
src/app/(dashboard)/not-found.tsx                    # CREATE: Dashboard-specific 404
src/app/(dashboard)/dashboard/loading.tsx            # CREATE: Dashboard loading skeleton
src/components/ui/sonner.tsx                         # MODIFY: Add UX-compliant Toaster configuration
src/lib/utils/toast-helpers.ts                       # CREATE: Typed toast utility functions
src/lib/utils/__tests__/toast-helpers.test.ts        # CREATE: Toast helper tests
src/app/__tests__/not-found.test.tsx                 # CREATE: Global 404 tests
src/app/__tests__/error.test.tsx                     # CREATE: Global error boundary tests
src/app/(dashboard)/__tests__/error.test.tsx         # CREATE: Dashboard error boundary tests
src/app/(dashboard)/__tests__/not-found.test.tsx     # CREATE: Dashboard 404 tests
```

Files to audit (may modify if issues found):
```
src/components/custom/role-guard.tsx                 # AUDIT: ConvexError extraction in catch blocks
src/components/custom/role-switcher.tsx              # AUDIT: ConvexError extraction in catch blocks
src/components/ui/form.tsx                           # AUDIT: Accessibility (aria-describedby, aria-invalid)
src/components/custom/creator-profile-form.tsx       # AUDIT: Already fixed, use as reference
```

### Previous Story Learnings

From Story 1.4 code review:
- **ConvexError messages must be extracted** — The code review found that `toast.error("Failed to save profile")` was swallowing server error details. Fixed by extracting `error.data` from `ConvexError` instances. This pattern MUST be standardized across all components.
- **`getOptionalAuthenticatedUser` helper** — Added to `convex/lib/auth.ts` for queries that return null instead of throwing. Use for any new queries.
- **react-hook-form test hang** — Full form rendering tests hang in jsdom due to react-hook-form + radix-ui Slot. Use loading-state-only tests for form components; cover validation via dedicated Zod schema tests.
- **Test mocking pattern**: Mock `convex/react` with `useQuery` and `useMutation`. Mock `sonner` as `{ toast: { success: vi.fn(), error: vi.fn() } }`.
- **`convex/_generated/api.d.ts` manual update** — No Convex deployment configured, so generated types must be manually updated when adding new Convex modules.

From Story 1.3:
- **Shared constants** — `ROLE_LABELS` in `src/lib/utils/constants.ts`. Don't duplicate.
- **NavIcon pattern** — Use wrapper component for icon rendering in sidebar.

From Story 1.1:
- jsdom 25 (not 28) for Node 20 compatibility
- vitest.config.mts with React plugin
- shadcn components installed via `pnpm dlx shadcn@latest add [component]`

### Dependencies to Verify

No new dependencies needed. All required packages already installed:
- `sonner` — Toast library (already in use)
- `convex/values` — For `ConvexError` class
- shadcn UI components — Button, Card, Skeleton already available

### References

- [Source: _bmad-output/planning-artifacts/prd.md - FR50: Error pages (404, 500)]
- [Source: _bmad-output/planning-artifacts/prd.md - FR51: In-app feedback (success/error indicators)]
- [Source: _bmad-output/planning-artifacts/prd.md - FR52: Contextual validation messages on form inputs]
- [Source: _bmad-output/planning-artifacts/prd.md - NFR24: Keyboard accessible with visible focus indicators]
- [Source: _bmad-output/planning-artifacts/prd.md - NFR26: Form inputs have labels and error messages announced to screen readers]
- [Source: _bmad-output/planning-artifacts/architecture.md - Error Handling Hierarchy (6 levels)]
- [Source: _bmad-output/planning-artifacts/architecture.md - Loading State Patterns table]
- [Source: _bmad-output/planning-artifacts/architecture.md - Toast Notifications pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Toast rules: max 3, bottom-right, 4s auto-dismiss, dismiss button]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Inline validation: on blur, text-destructive, border-destructive]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Loading states: skeleton screens, no spinners for content]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Graceful degradation: reassurance not panic, clear error + next step]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- toast-helpers.test.ts: Fixed vi.mock hoisting issue by using `vi.hoisted()` for mock variables
- error.test.tsx: Fixed React useEffect null error (was caused by naming conflict with built-in Error class); fixed dev/prod message assertion (NODE_ENV is "test" in vitest, not "development")

### Completion Notes List

- Task 1: Upgraded global 404 page with shadcn Card + Button, metadata title, responsive centering, descriptive message, Go Home + Go to Dashboard links
- Task 2: Upgraded global error boundary with shadcn components, useEffect error logging with digest, dev/prod message switching, Try Again + Go Home buttons
- Task 3: Created dashboard-level error.tsx and not-found.tsx with flex-1 centering (renders inside dashboard shell), Go to Dashboard as primary CTA
- Task 4: Configured Sonner with position="bottom-right", visibleToasts={3}, duration={4000}, closeButton={true}, richColors={true}. Created toast-helpers.ts with showSuccess, showError, showErrorFromCatch (ConvexError extraction)
- Task 5: Audited all toast usage. Fixed role-guard.tsx (2 catch blocks), role-switcher.tsx (1 catch block), request-role-button.tsx (1 catch block) to use showErrorFromCatch. Migrated creator-profile-form.tsx to use showErrorFromCatch + showSuccess (removing direct ConvexError/toast imports)
- Task 6: Created dashboard loading skeleton matching page layout (h-8 heading + h-5 subtitle)
- Task 7: Audited form.tsx — FormControl sets aria-describedby and aria-invalid correctly. FormMessage renders with id matching aria-describedby. creator-profile-form uses FormLabel+FormControl+FormMessage on all fields with mode:"onBlur". All native inputs are keyboard accessible. Audit passed with no issues.
- Task 8: Created 5 test files with 22 new tests (4 not-found, 5 error, 6 toast-helpers, 4 dashboard-error, 3 dashboard-not-found)
- Task 9: Build succeeds, 98 tests pass across 16 files, lint has 0 errors
- Code Review Fixes: Removed "500" heading from error boundaries (violates UX "never show raw error codes"), added runtime type guard for ConvexError.data in showErrorFromCatch, migrated creator-profile-form.tsx to use toast-helpers, migrated all success toasts to showSuccess(), fixed Sonner props spread order (explicit config now overrides parent props)

### File List

Modified:
- src/app/not-found.tsx
- src/app/error.tsx
- src/components/ui/sonner.tsx
- src/components/custom/role-guard.tsx
- src/components/custom/role-switcher.tsx
- src/components/custom/request-role-button.tsx
- src/components/custom/creator-profile-form.tsx

Created:
- src/app/(dashboard)/error.tsx
- src/app/(dashboard)/not-found.tsx
- src/app/(dashboard)/dashboard/loading.tsx
- src/lib/utils/toast-helpers.ts
- src/app/__tests__/not-found.test.tsx
- src/app/__tests__/error.test.tsx
- src/lib/utils/__tests__/toast-helpers.test.ts
- src/app/(dashboard)/__tests__/error.test.tsx
- src/app/(dashboard)/__tests__/not-found.test.tsx
