# Story 13.2: Promo Code Application at Checkout

Status: done

## Tasks / Subtasks

- [x]Task 1: Add validatePromoCode public query
- [x]Task 2: Update purchaseTickets to accept promoCode + apply discount
- [x]Task 3: Update ticket purchase UI with promo code input
- [x]Task 4: Update webhook to store promoCode on tickets + increment usedCount
- [x]Task 5: Contract tests

## Dev Agent Record
### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `validatePromoCode` public query and `incrementPromoCodeUsage` mutation to `convex/promoCodes.ts`.
- Task 2: Updated `purchaseTickets` server action to accept `promoCode`, validate it, apply discount (percentage or fixed) to line item prices, recalculate total, and store code in Stripe metadata.
- Task 3: Added promo code input to TicketPurchaseCard with apply/remove UX, discount display, strikethrough subtotal.
- Task 4: Updated Stripe webhook to extract promoCode from metadata and increment usage count (fire-and-forget).
- Task 5: Added 11 contract tests for checkout validation, discount calculation, platform fee on discounted total, usage increment. Fixed ticket purchase card test mocks. Total: 1023 tests.

### Change Log

- 2026-03-15: Story 13.2 implementation complete

### File List

**Modified files:**
- `convex/promoCodes.ts` — Added `validatePromoCode` query + `incrementPromoCodeUsage` mutation
- `src/lib/actions/stripe-checkout.ts` — Added promoCode param, discount application, metadata
- `src/components/custom/ticket-purchase-card.tsx` — Added promo code input, discount display
- `src/lib/stripe/webhooks.ts` — Added promo code usage increment in webhook
- `convex/promoCodes.test.ts` — Added 11 checkout contract tests
- `src/components/custom/__tests__/ticket-purchase-card.test.tsx` — Added convex/react mocks
