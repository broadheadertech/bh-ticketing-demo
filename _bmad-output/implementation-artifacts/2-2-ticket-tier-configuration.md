# Story 2.2: Ticket Tier Configuration

Status: done

## Story

As a **creator**,
I want to define custom ticket tiers with name, price, quantity, and description for my event,
So that I can offer different ticket options to attendees.

## Acceptance Criteria

1. **Given** I am editing a draft event **When** I navigate to the ticket tiers page **Then** I see the TicketTierBuilder component with suggested tier templates based on event type (FR9)
2. **Given** I am configuring ticket tiers **When** I add a tier with name, price (in PHP centavos), quantity, and description **Then** the tier is validated (name required, price >= 0, quantity >= 1) (FR8) **And** prices are stored as integer centavos (P300 = 30000) **And** prices display formatted with `Intl.NumberFormat` as "PHP 300.00" (FR46)
3. **Given** I want multiple tiers **When** I add additional tiers **Then** I can create up to `MAX_TIERS_PER_EVENT` tiers per event **And** each tier has independent name, price, quantity, and description
4. **Given** I want a free event **When** I set all tier prices to 0 **Then** the event is marked as a free event **And** the tier displays "Free" instead of "PHP 0.00"
5. **Given** the `ticket_tiers` table schema **Then** it includes `eventId`, `name`, `price`, `quantity`, `soldCount` (default 0), `description`, `sortOrder`, `createdAt`, `updatedAt`

## Tasks / Subtasks

- [x] **Task 1: Add `ticket_tiers` table to Convex schema** (AC: #5)
  - [x] 1.1 Add `ticket_tiers` table to `convex/schema.ts` with fields: `eventId` (v.id("events")), `name` (v.string()), `price` (v.number() — integer centavos), `quantity` (v.number() — integer >= 1), `soldCount` (v.number() — default 0), `description` (v.optional(v.string())), `sortOrder` (v.number()), `createdAt` (v.number()), `updatedAt` (v.number())
  - [x] 1.2 Add index: `by_event_id` on ["eventId"]
  - [x] 1.3 Update `convex/_generated/api.d.ts` to add ticketTiers module

- [x] **Task 2: Create ticket tier Zod validation schemas** (AC: #2)
  - [x] 2.1 Create `src/lib/validators/ticket-tier.ts` with Zod schemas:
    - `ticketTierSchema` — name (1-100 chars, required), price (integer >= 0, required), quantity (integer >= 1, required), description (optional, max 500 chars)
    - `createTicketTiersSchema` — eventId (string, required) + tiers array (1 to MAX_TIERS_PER_EVENT items of ticketTierSchema)
  - [x] 2.2 Export TypeScript types: `TicketTierFormData`, `CreateTicketTiersFormData`
  - [x] 2.3 Create `src/lib/validators/__tests__/ticket-tier.test.ts` with tests for: valid tier passes, missing name fails, negative price fails, zero quantity fails, too many tiers fails, free tier (price=0) passes

- [x] **Task 3: Add ticket tier constants and templates** (AC: #1, #3)
  - [x] 3.1 Add to `src/lib/utils/constants.ts`:
    - `MAX_TIERS_PER_EVENT = 10`
    - `TIER_TEMPLATES` record keyed by event type with suggested tier arrays. Example: `concert: [{ name: "General Admission", price: 30000, quantity: 100 }, { name: "VIP", price: 80000, quantity: 20 }]`
    - Templates for all 5 event types (concert, racing, seminar, class, other)

- [x] **Task 4: Create Convex ticket tier mutations and queries** (AC: #2, #3, #5)
  - [x] 4.1 Create `convex/ticketTiers.ts` with:
    - `saveTiers` mutation: accepts eventId + tiers array (name, price, quantity, description, sortOrder). Uses `getAuthenticatedUser` + `requireAnyRole(user, ["artist", "organization"])`. Verifies event exists, is owned by user, and has status "draft". Deletes all existing tiers for the event, then inserts the new tiers (replace-all pattern). Sets `soldCount` to 0 on each. Validates: name required (1-100 chars), price >= 0 (integer), quantity >= 1 (integer), max MAX_TIERS_PER_EVENT tiers. Returns the event ID.
    - `getTiersByEventId` query: accepts eventId. Uses `getAuthenticatedUser`. Verifies event ownership (creator or admin). Returns tiers sorted by sortOrder ascending.
  - [x] 4.2 Create `convex/ticketTiers.test.ts` with contract tests: saveTiers with valid data, saveTiers rejects non-owner, saveTiers rejects non-draft event, saveTiers validates tier fields, saveTiers enforces max tier count, getTiersByEventId returns sorted tiers

- [x] **Task 5: Build the TicketTierBuilder component** (AC: #1, #2, #3, #4)
  - [x] 5.1 Create `src/components/custom/ticket-tier-builder.tsx` — "use client" component:
    - Props: `eventId` (string), `eventType` (EventType), `initialTiers` (array, optional)
    - State: `tiers` array managed with `useState`, each tier has: id (temp UUID), name, price (centavos), quantity, description
    - "Suggest Tiers" button: populates tiers from `TIER_TEMPLATES[eventType]` (only if tiers array is empty or user confirms overwrite)
    - For each tier: inline form row with name Input, price Input (with "P" prefix, user enters peso amount which converts to centavos), quantity Input (type="number"), description toggle/Input, remove (X) button
    - "Add Tier" button: adds empty tier row (disabled if at MAX_TIERS_PER_EVENT)
    - Running totals panel: total capacity (sum of quantities), potential revenue (sum of price * quantity, formatted with `formatCurrency`)
    - "Save Tiers" button: validates all tiers client-side with Zod, calls `saveTiers` mutation, shows success/error toast
    - Price display: format with `formatCurrency` from `@/lib/utils/format`. Show "Free" when price is 0.
    - Use `showSuccess` and `showErrorFromCatch` from `@/lib/utils/toast-helpers`
  - [x] 5.2 Move up/down buttons for tier reorder (no drag-and-drop library needed for MVP — use simple button-based reordering)

- [x] **Task 6: Create ticket tier configuration page** (AC: #1)
  - [x] 6.1 Create `src/app/(dashboard)/dashboard/events/[eventId]/tickets/page.tsx` — page component that:
    - Uses `useQuery(api.events.getEventById, { eventId })` to load event data
    - Uses `useQuery(api.ticketTiers.getTiersByEventId, { eventId })` to load existing tiers
    - Shows loading skeleton while data loads
    - Shows error if event not found or user doesn't own it
    - Renders TicketTierBuilder with eventId, eventType, and existing tiers
    - Wraps with `<RoleGuard requiredRoles={["artist", "organization"]}>`
    - Back link to `/dashboard/events`
  - [x] 6.2 Create `src/app/(dashboard)/dashboard/events/[eventId]/tickets/loading.tsx` — skeleton loading state

- [x] **Task 7: Update events list placeholder to link to tier configuration** (AC: #1)
  - [x] 7.1 Update `src/app/(dashboard)/dashboard/events/page.tsx` — replace the simple placeholder with a basic list using `useQuery(api.events.getMyEvents)`. For each event show: title, event type, status badge, date, and a "Configure Tickets" link to `/dashboard/events/[eventId]/tickets`. Keep it simple — full dashboard is Story 2.5.
  - [x] 7.2 The page needs to become a "use client" component to use `useQuery`

- [x] **Task 8: Write component tests** (AC: #1-4)
  - [x] 8.1 Create `src/components/custom/__tests__/ticket-tier-builder.test.tsx` — test: renders with empty tiers, renders suggested tiers button, clicking "Add Tier" adds a row, renders tier fields (name, price, quantity), remove button removes tier row, running totals display. NOTE: Do NOT test full form submission — react-hook-form + radix-ui hangs in jsdom. Test rendering and interaction only.

- [x] **Task 9: Final validation**
  - [x] 9.1 Run `pnpm build` — must succeed with new routes including dynamic [eventId]
  - [x] 9.2 Run `pnpm test:run` — all tests pass
  - [x] 9.3 Run `pnpm lint` — no new errors

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `users`, `creatorProfiles`, and `events` tables. **MODIFY** to add `ticket_tiers` table.
- `convex/events.ts` — Has `createEvent`, `getMyEvents`, `getEventById`. **REUSE** `getEventById` to verify event ownership in tier mutations.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)` and `getOptionalAuthenticatedUser(ctx)`. **REUSE** in tier mutations/queries.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`. **REUSE** for authorization.
- `convex/_generated/api.d.ts` — Has users, creatorProfiles, events, http modules. **MODIFY** to add ticketTiers module.
- `src/lib/utils/constants.ts` — Has ROLES, ROLE_LABELS, EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS, EVENT_STATUSES, EVENT_STATUS_LABELS. **MODIFY** to add MAX_TIERS_PER_EVENT and TIER_TEMPLATES.
- `src/lib/utils/format.ts` — Already has `formatCurrency(centavos)` that returns "Free" for 0 and formats as "PHP 300.00". **REUSE** — do NOT create a new formatter.
- `src/lib/utils/toast-helpers.ts` — `showSuccess(msg)`, `showErrorFromCatch(error)`. **REUSE** for all toast feedback.
- `src/lib/validators/event.ts` — Has `eventTypeSchema`, `EventType` type. **REUSE** the `EventType` type.
- `src/components/custom/role-guard.tsx` — `<RoleGuard requiredRoles={[...]}>`. **REUSE** to protect tier config page.
- `src/components/ui/` — All shadcn components (Button, Card, Input, Label, Skeleton, etc.). **REUSE**.
- `src/app/(dashboard)/dashboard/events/page.tsx` — Events list placeholder. **MODIFY** to show actual events with tier config links.
- `src/app/(dashboard)/dashboard/events/loading.tsx` — Events loading skeleton. Already exists.

### Architecture Compliance

**Ticket Tiers Table Schema (from architecture.md):**
```
ticket_tiers (id, event_id, name, price, quantity, sold_count, sort_order)
```
Map to Convex schema (using camelCase per existing convention):
```typescript
ticketTiers: defineTable({
  eventId: v.id("events"),
  name: v.string(),
  price: v.number(),       // Integer centavos (P300 = 30000)
  quantity: v.number(),     // Integer >= 1
  soldCount: v.number(),   // Default 0, denormalized counter
  description: v.optional(v.string()),
  sortOrder: v.number(),   // Display order (0-based)
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_event_id", ["eventId"]),
```

**Price Storage Pattern (from architecture.md):**
- Prices stored as integer centavos (PHP): P300 = 30000
- Display using `formatCurrency()` from `@/lib/utils/format.ts` (already exists)
- Free tiers: price = 0, displays "Free"
- Price input: user enters peso amount (e.g., "300"), multiply by 100 to store as centavos

**soldCount Field:**
- Denormalized on ticket_tiers table (not calculated from tickets table)
- Updated atomically during Stripe webhook processing (Story 3.3)
- For Story 2.2: always initialized to 0, read-only in tier builder

**saveTiers Replace-All Pattern:**
- Instead of individual create/update/delete mutations, use a single `saveTiers` mutation
- Delete all existing tiers for the event, then insert the new set
- Simpler than tracking individual tier changes
- Only works on draft events (soldCount is always 0 for draft tiers)

**Authorization Pattern:**
- `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])` in every tier mutation/query
- Verify event ownership: `event.creatorId === user._id`
- Verify event is draft: `event.status === "draft"` for write operations
- Match the pattern from `convex/events.ts`

**Validation Pattern:**
- Zod schemas for client-side validation
- Convex argument validators + manual checks in mutations for server-side
- Match the dual-validation pattern from Story 2.1

### UX Requirements

**TicketTierBuilder Component (from UX spec):**
- Tier list with inline editing (no modal per tier)
- Each tier row: name input, price input (P prefix), quantity input, description toggle
- "Add Tier" button at bottom (disabled at MAX_TIERS_PER_EVENT)
- Running totals panel: total capacity, potential revenue
- "Suggest Tiers" button: populates template tiers based on event type
- Desktop: tier rows horizontal (name | price | qty | actions)
- Mobile: tier rows stack vertically

**Suggested Tier Templates (from UX spec, FR9):**
- Concert: General Admission + VIP
- Racing: Zone A, Zone B, Pit Access, VIP, Team Entry
- Seminar: Early Bird + Regular
- Class: Standard enrollment
- Other: Empty (no suggestions)

**Price Input Behavior:**
- User enters peso amount (e.g., "300")
- Stored as centavos (30000)
- Display shows formatted currency: "PHP 300.00"
- `inputmode="decimal"` for numeric keyboard on mobile
- "P" shown as input prefix/addon

**Free Event Handling:**
- When all tier prices are 0, display "Free" instead of "PHP 0.00"
- `formatCurrency(0)` already returns "Free" (existing utility)

**Tier Reordering (MVP):**
- Use up/down arrow buttons for reordering (not drag-and-drop)
- Drag-and-drop is a post-MVP enhancement
- Each tier has a `sortOrder` number for display ordering

### Key Decisions

- **Replace-all mutation pattern** — `saveTiers` deletes all existing tiers and inserts the new set. Simpler than tracking individual CRUD operations. Safe because draft events always have soldCount = 0.
- **No drag-and-drop for MVP** — Use simple up/down buttons for tier reordering. Drag-and-drop requires additional libraries (@dnd-kit or @hello-pangea/dnd) and is deferred.
- **Price input as peso amount** — User enters "300" (peso), component multiplies by 100 to store as 30000 (centavos). Reverse on load: divide by 100 for display in input.
- **MAX_TIERS_PER_EVENT = 10** — Supports the racing event use case (5 zones) with room for growth. Constant defined in constants.ts.
- **Tier description is optional** — Toggle to show/hide description field per tier to keep the UI clean.
- **Events list upgrade** — Task 7 upgrades the placeholder events page to show actual events with tier config links. This is a minimal list, not the full dashboard (Story 2.5).
- **Convex file naming** — `convex/ticketTiers.ts` (camelCase per existing convention: `creatorProfiles.ts`, `events.ts`).
- **Dynamic route** — `/dashboard/events/[eventId]/tickets` for the tier configuration page. Uses Next.js dynamic route segment.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files, e.g., `ticketTiers.ts`)
- Validators: `src/lib/validators/` (kebab-case files, e.g., `ticket-tier.ts`)
- Route pages: `src/app/(dashboard)/dashboard/events/[eventId]/tickets/page.tsx`
- Tests co-located: `__tests__/` subdirectory with `.test.tsx` suffix

### Environment Variables Needed

No new environment variables needed for this story.

### Project Structure Notes

Files to create:
```
convex/ticketTiers.ts                                           # CREATE: Tier mutations and queries
convex/ticketTiers.test.ts                                      # CREATE: Tier contract tests
src/lib/validators/ticket-tier.ts                               # CREATE: Zod tier schemas
src/lib/validators/__tests__/ticket-tier.test.ts                # CREATE: Zod schema tests
src/components/custom/ticket-tier-builder.tsx                    # CREATE: TicketTierBuilder component
src/components/custom/__tests__/ticket-tier-builder.test.tsx     # CREATE: Component tests
src/app/(dashboard)/dashboard/events/[eventId]/tickets/page.tsx # CREATE: Tier config page
src/app/(dashboard)/dashboard/events/[eventId]/tickets/loading.tsx # CREATE: Loading skeleton
```

Files to modify:
```
convex/schema.ts                                                # MODIFY: Add ticket_tiers table
convex/_generated/api.d.ts                                      # MODIFY: Add ticketTiers module
src/lib/utils/constants.ts                                      # MODIFY: Add MAX_TIERS_PER_EVENT, TIER_TEMPLATES
src/app/(dashboard)/dashboard/events/page.tsx                   # MODIFY: Upgrade to show events with tier links
```

### Previous Story Learnings

From Story 2.1 (most recent):
- **Toast helpers pattern**: Use `showSuccess()` and `showErrorFromCatch()` from `@/lib/utils/toast-helpers`. Do NOT import `toast` from sonner directly.
- **Shared constants**: Import `EVENT_TYPES` from `@/lib/utils/constants` — do NOT duplicate arrays across files.
- **Date parsing**: Use `T00:00:00` suffix when parsing date strings to avoid UTC timezone shift.
- **Form data preservation**: When building multi-step/back-navigable forms, pass previous data as `defaultValues` or `initialData` props.
- **Convex auth pattern**: `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])` in every mutation/query. Verify ownership with `entity.creatorId === user._id`.

From Story 1.4:
- **react-hook-form tests hang in jsdom** — Do NOT test full form submission in component tests. Test rendering/interaction only. Cover validation via dedicated Zod schema tests.
- **vi.hoisted()**: Required for vitest mock variables inside `vi.mock()` factory functions.
- **ConvexError for user-facing errors** — `throw new ConvexError("message")` in mutations.
- **Test mocking pattern**: Mock `convex/react` with `useQuery` and `useMutation`. Mock `sonner` as `{ toast: { success: vi.fn(), error: vi.fn() } }`.

From Story 1.3:
- **Shared constants** — Place all shared constants in `src/lib/utils/constants.ts`.
- **requireAnyRole helper** — Already exists in `convex/lib/roles.ts`.

### Dependencies to Verify

No new npm dependencies needed. All required packages already installed:
- `react-hook-form` + `@hookform/resolvers` + `zod` — already in package.json
- shadcn components: Button, Card, Input, Label, Skeleton — already installed
- `lucide-react` — already installed (for icons like Plus, X, ChevronUp, ChevronDown)

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.2 - Ticket tier configuration with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md - FR8: Custom ticket tiers, FR9: Tier templates by event type, FR46: PHP currency formatting]
- [Source: _bmad-output/planning-artifacts/architecture.md - Data Architecture: ticket_tiers table schema, price as centavos]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex Function-Level Authorization: creator ownership verification]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - TicketTierBuilder component anatomy, states, responsive behavior]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Price input patterns, running totals, free event handling]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Tier templates by event type: concert GA+VIP, racing zones]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build failed initially: relative import paths to convex/_generated were wrong (off by 1 level) for page components in (dashboard) route group. Fixed by counting directory depth correctly.
- Build failed: Zod v4 doesn't support `required_error`/`invalid_type_error` params on `z.number()`. Fixed using `error` param.
- Build failed: `Id` type not exported from generated dataModel.d.ts. Fixed by removing import and using `as any` cast for Convex ID args.

### Completion Notes List

- Task 1: Added `ticketTiers` table to schema.ts with all required fields and `by_event_id` index. Updated api.d.ts.
- Task 2: Created Zod validation schemas (ticketTierSchema, createTicketTiersSchema) with proper integer/min/max constraints. 16 tests pass.
- Task 3: Added MAX_TIERS_PER_EVENT=10 and TIER_TEMPLATES for all 5 event types to constants.ts.
- Task 4: Created convex/ticketTiers.ts with saveTiers (replace-all pattern) and getTiersByEventId. 20 contract tests pass.
- Task 5: Built TicketTierBuilder with inline editing, price centavo conversion, suggest tiers, add/remove, up/down reorder, running totals, Zod validation, save mutation.
- Task 6: Created tier config page at /dashboard/events/[eventId]/tickets with RoleGuard, loading states, and error handling.
- Task 7: Upgraded events list from placeholder to real event cards with type, status badge, date, and "Configure Tickets" link.
- Task 8: Created 7 component tests (empty state, suggest button visibility, add tier, initial data, remove tier, running totals).
- Task 9: Build passes, all 180 tests pass, lint clean (no new errors).

### Change Log

- 2026-03-07: Story 2.2 implementation complete. All 9 tasks done. 180 tests (43 new), build clean.
- 2026-03-07: Code review fixes applied (4 issues: H1, M1, M2, M3). H1: Added duplication comment to convex/ticketTiers.ts MAX_TIERS_PER_EVENT. M1: Fixed price input floating-point precision by truncating to 2 decimal places before conversion. M2: Removed dead `event === null` branch (getEventById throws ConvexError, caught by error.tsx). M3: Restored page titles via useEffect(document.title) for client components. All 180 tests pass, build clean.

### File List

Files created:
- convex/ticketTiers.ts
- convex/ticketTiers.test.ts
- src/lib/validators/ticket-tier.ts
- src/lib/validators/__tests__/ticket-tier.test.ts
- src/components/custom/ticket-tier-builder.tsx
- src/components/custom/__tests__/ticket-tier-builder.test.tsx
- src/app/(dashboard)/dashboard/events/[eventId]/tickets/page.tsx
- src/app/(dashboard)/dashboard/events/[eventId]/tickets/loading.tsx

Files modified:
- convex/schema.ts (added ticketTiers table)
- convex/_generated/api.d.ts (added ticketTiers module)
- src/lib/utils/constants.ts (added MAX_TIERS_PER_EVENT, TIER_TEMPLATES)
- src/app/(dashboard)/dashboard/events/page.tsx (upgraded to show real events with tier config links)
