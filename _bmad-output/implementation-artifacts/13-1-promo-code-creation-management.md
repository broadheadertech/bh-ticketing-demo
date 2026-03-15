# Story 13.1: Promo Code Creation & Management

Status: done

## Story

As a **creator**,
I want to create promo codes for my events,
so that I can offer discounts to drive ticket sales.

## Acceptance Criteria

1. **AC1 — Promo code dialog:** On the event detail page for draft/published events, a "Promo Codes" button opens a dialog showing existing codes and a form to create new ones.

2. **AC2 — Create promo code:** Creator can create a promo code with: code string (4-20 chars, alphanumeric, unique per event), discount type (percentage or fixed), discount value (>0, percentage ≤100), max uses (optional), expiration date (optional). The code is stored uppercase.

3. **AC3 — Deactivate promo code:** Creator can toggle a code's `isActive` status to prevent further use.

4. **AC4 — Usage stats:** Each code shows its `usedCount` vs `maxUses` and active/inactive status.

5. **AC5 — Contract tests:** Validate code format, discount validation, uniqueness, expiration logic.

## Tasks / Subtasks

- [x]Task 1: Schema (AC: 2)
  - [x]1.1 Add `promoCodes` table to `convex/schema.ts`.

- [x]Task 2: Backend (AC: 2, 3, 4)
  - [x]2.1 Create `convex/promoCodes.ts` with `createPromoCode`, `togglePromoCode`, `getEventPromoCodes` mutations/queries.

- [x]Task 3: UI (AC: 1, 4)
  - [x]3.1 Create `src/components/custom/promo-code-dialog.tsx`.
  - [x]3.2 Add "Promo Codes" button to event detail page.

- [x]Task 4: Contract tests (AC: 5)
  - [x]4.1 Create `convex/promoCodes.test.ts`.

## Dev Notes

### References
- Schema: [convex/schema.ts](convex/schema.ts)
- Event detail: [src/app/(dashboard)/dashboard/events/[eventId]/page.tsx](src/app/(dashboard)/dashboard/events/[eventId]/page.tsx)
- Staff dialog pattern: [src/components/custom/manage-staff-dialog.tsx](src/components/custom/manage-staff-dialog.tsx)

## Dev Agent Record
### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `promoCodes` table to schema with `by_event_id` and `by_event_code` indexes.
- Task 2: Created `convex/promoCodes.ts` with `createPromoCode` (validates code format, discount, uniqueness, expiration), `togglePromoCode`, `getEventPromoCodes` queries.
- Task 3: Created PromoCodeDialog component with create form (code, type, value, max uses) and code list with toggle. Added "Promo Codes" button to event detail page.
- Task 4: Created 28 contract tests covering code format, discount validation, uniqueness, expiration, usage tracking, authorization, toggle, return shape.
- All 1012 tests pass.

### Change Log

- 2026-03-15: Story 13.1 implementation complete

### File List

**New files:**
- `convex/promoCodes.ts` — Promo code mutations + queries
- `src/components/custom/promo-code-dialog.tsx` — Promo code management dialog
- `convex/promoCodes.test.ts` — 28 contract tests

**Modified files:**
- `convex/schema.ts` — Added `promoCodes` table
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Added "Promo Codes" button + dialog
