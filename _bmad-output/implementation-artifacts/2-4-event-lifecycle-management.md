# Story 2.4: Event Lifecycle Management

Status: done

## Story

As a **creator**,
I want my events to transition through lifecycle states (Draft, Published, Cancelled),
So that I can control when my event is visible and manage its lifecycle.

## Acceptance Criteria

1. **Given** I have a draft event with at least one ticket tier **When** I click "Publish" **Then** the event status changes to `published` (FR13) **And** a success toast confirms "Event published" **And** the event is ready for public discovery (when Epic 5 builds public pages)
2. **Given** a published event **When** the status is checked **Then** it shows as "Published" with the correct status badge color
3. **Given** I want to cancel a published event **When** I click "Cancel Event" and confirm via dialog **Then** the event status changes to `cancelled` (FR44) **And** a success toast confirms "Event cancelled" **And** the cancellation reason is stored
4. **Given** I have a draft event **When** I click "Delete Draft" and confirm **Then** the draft event and its associated ticket tiers and artwork storage file are permanently deleted (FR45) **And** a success toast confirms deletion **And** I am redirected to the events list
5. **Given** an event is not in draft status **When** I try to edit its details, artwork, or ticket tiers **Then** the mutations reject the changes with an appropriate error message (already enforced in existing mutations)
6. **Given** I am viewing an event **When** I see its status badge **Then** it uses the correct color scheme: Draft (muted/slate), Published (primary/indigo), Cancelled (destructive/red)
7. **Given** I am on the events list **When** I look at each event card **Then** I see contextual action buttons based on the event's current status (Publish for drafts, Cancel for published, no actions for cancelled)

## Tasks / Subtasks

- [x] **Task 1: Add event lifecycle mutations to Convex** (AC: #1, #3, #4)
  - [x] 1.1 In `convex/events.ts`, create `publishEvent` mutation:
    - Args: `eventId: v.id("events")`
    - Auth: `getAuthenticatedUser` + `requireAnyRole(user, ["artist", "organization"])`, verify ownership
    - Validate: event status must be `"draft"`, event must have ≥1 ticket tier (query `ticketTiers` table by `by_event_id` index), event date must be in the future
    - Update: set status to `"published"`, update `updatedAt`
    - Throw descriptive `ConvexError` for each failure case
  - [x] 1.2 In `convex/events.ts`, create `cancelEvent` mutation:
    - Args: `eventId: v.id("events")`, `reason: v.optional(v.string())`
    - Auth: same ownership + role check
    - Validate: status must be `"published"` (NOT `"draft"`, `"cancelled"`, `"completed"`)
    - Update: set status to `"cancelled"`, update `updatedAt`
    - NOTE: Refund processing and cancellation notifications are deferred to Epic 3 (Stripe not yet integrated). For now, just change status.
  - [x] 1.3 In `convex/events.ts`, create `deleteDraftEvent` mutation:
    - Args: `eventId: v.id("events")`
    - Auth: same ownership + role check
    - Validate: status must be `"draft"`
    - Delete all ticket tiers for this event (query by `by_event_id` index, delete each)
    - If event has `artworkStorageId`, delete the storage file via `ctx.storage.delete()`
    - Delete the event record itself via `ctx.db.delete(args.eventId)`
    - This is a HARD DELETE — no soft delete pattern

- [x] **Task 2: Create event detail/management page** (AC: #1, #2, #3, #4, #6, #7)
  - [x] 2.1 Create `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — event detail page:
    - Uses `useParams` to get eventId, `useQuery(api.events.getEventById)` to load event
    - Shows: event title, type, date, time, venue, description, artwork preview (if exists), status badge
    - Wraps with `RoleGuard`
    - `useEffect` for `document.title`
    - Back link to `/dashboard/events`
    - Links to artwork and tickets sub-pages (only if draft)
  - [x] 2.2 Create `src/app/(dashboard)/dashboard/events/[eventId]/loading.tsx` — skeleton loading state
  - [x] 2.3 Render contextual action buttons based on status:
    - **Draft**: "Publish Event" (primary), "Delete Draft" (destructive), "Edit Artwork" (outline), "Configure Tickets" (outline)
    - **Published**: "Cancel Event" (destructive)
    - **Cancelled**: No action buttons (read-only view)
  - [x] 2.4 Status badge component: Use `Badge` from shadcn/ui with variant mapping:
    - `draft` → `secondary` variant (muted)
    - `published` → `default` variant (primary/indigo)
    - `on_sale` → custom green class
    - `sold_out` → `destructive` variant
    - `completed` → `secondary` variant (muted)
    - `cancelled` → `destructive` variant

- [x] **Task 3: Create confirmation dialogs for destructive actions** (AC: #3, #4)
  - [x] 3.1 Create `src/components/custom/cancel-event-dialog.tsx`:
    - Uses `AlertDialog` from shadcn/ui (not Dialog — AlertDialog is for destructive confirmations)
    - Props: `eventId: string`, `eventTitle: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`
    - Shows warning text: "Are you sure you want to cancel [event title]? This action cannot be undone."
    - Optional textarea for cancellation reason
    - "Cancel Event" button (destructive) and "Keep Event" button (ghost)
    - Calls `cancelEvent` mutation on confirm, shows success/error toast
    - Loading state on confirm button during mutation
  - [x] 3.2 Create `src/components/custom/delete-draft-dialog.tsx`:
    - Same AlertDialog pattern
    - Props: `eventId: string`, `eventTitle: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onDeleted: () => void`
    - Warning text: "Are you sure you want to delete [event title]? This will permanently remove the event and all its ticket tiers."
    - "Delete" button (destructive) and "Keep Draft" button (ghost)
    - Calls `deleteDraftEvent` mutation on confirm
    - On success: calls `onDeleted` callback (parent navigates to events list)

- [x] **Task 4: Update events list page with contextual actions** (AC: #7)
  - [x] 4.1 In `src/app/(dashboard)/dashboard/events/page.tsx`, replace the static "Upload Artwork" / "Configure Tickets" buttons with status-aware action buttons:
    - **Draft events**: Show "Manage Event" link to `/dashboard/events/${event._id}` + existing artwork/tickets links
    - **Published events**: Show "View Event" link to `/dashboard/events/${event._id}`
    - **Cancelled events**: Show "View Event" link (muted style)
  - [x] 4.2 Update status badge styling to use color-coded badges instead of plain muted background:
    - Use a helper function `getStatusBadgeVariant(status)` that returns the appropriate variant/className

- [x] **Task 5: Add publish validation logic** (AC: #1)
  - [x] 5.1 Create `src/lib/validators/event-publish.ts` with a client-side pre-check function:
    - `canPublishEvent(event, tierCount)` → `{ canPublish: boolean; reason?: string }`
    - Checks: has ≥1 tier, date is in the future, status is draft
    - This is a UX helper — the authoritative check is in the Convex mutation
  - [x] 5.2 Create `src/lib/validators/__tests__/event-publish.test.ts` with tests:
    - Can publish with tiers and future date
    - Cannot publish without tiers
    - Cannot publish with past date
    - Cannot publish non-draft events

- [x] **Task 6: Write backend contract tests** (AC: #1, #3, #4)
  - [x] 6.1 Add to `convex/events.test.ts`:
    - `publishEvent` contract: only draft status, requires tiers, requires future date, requires ownership
    - `cancelEvent` contract: only published status, requires ownership, stores reason
    - `deleteDraftEvent` contract: only draft status, requires ownership, cascades deletes

- [x] **Task 7: Write component tests** (AC: #2, #6, #7)
  - [x] 7.1 Create `src/components/custom/__tests__/cancel-event-dialog.test.tsx`:
    - Renders warning text with event title
    - Shows cancel reason textarea
    - Calls mutation on confirm
  - [x] 7.2 Create `src/components/custom/__tests__/delete-draft-dialog.test.tsx`:
    - Renders warning text with event title
    - Calls mutation on confirm
    - Calls onDeleted callback on success
  - [x] 7.3 Test status badge variant mapping function

- [x] **Task 8: Final validation**
  - [x] 8.1 Run `pnpm build` — must succeed
  - [x] 8.2 Run `pnpm test:run` — all tests pass
  - [x] 8.3 Run `pnpm lint` — no new errors

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `events` table with `status: v.string()` field and `by_status` index. **REUSE** as-is.
- `convex/events.ts` — Has `createEvent`, `updateEventArtwork`, `removeEventArtwork`, `getMyEvents`, `getEventById`. **MODIFY** to add lifecycle mutations.
- `convex/ticketTiers.ts` — Has `saveTiers`, `getTiersByEvent`. **REUSE** for tier count validation in publish.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)`. **REUSE**.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`. **REUSE**.
- `src/lib/utils/constants.ts` — Has `EVENT_STATUSES`, `EVENT_STATUS_LABELS`. **REUSE** for badge display.
- `src/lib/utils/toast-helpers.ts` — `showSuccess(msg)`, `showErrorFromCatch(error)`. **REUSE**.
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatDate()`. **REUSE**.
- `src/components/custom/role-guard.tsx` — `<RoleGuard>`. **REUSE**.
- `src/components/ui/` — All shadcn components including `AlertDialog`, `Badge`, `Button`. **REUSE**.
- `src/app/(dashboard)/dashboard/events/page.tsx` — Events list with artwork thumbnails and status badges. **MODIFY** to add contextual actions.
- `src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx` — Artwork upload page. **REUSE** (no changes needed).
- `src/app/(dashboard)/dashboard/events/[eventId]/tickets/page.tsx` — Ticket tier config page. **REUSE** (no changes needed).
- `src/app/(dashboard)/error.tsx` — Error boundary. **REUSE** (catches ConvexErrors from mutations).

### Architecture Compliance

**Event Status Values (from constants.ts — lowercase, NOT PascalCase):**
The architecture doc uses PascalCase (Draft, Published, OnSale) but the actual codebase uses lowercase: `"draft"`, `"published"`, `"on_sale"`, `"sold_out"`, `"completed"`, `"cancelled"`. **Follow the codebase convention** — the constants are already defined.

**Status Transitions Implementable Now:**
```
draft → published       (creator clicks "Publish", requires ≥1 tier + future date)
draft → (deleted)       (creator clicks "Delete Draft", hard delete)
published → cancelled   (creator clicks "Cancel Event" with confirmation)
```

**Status Transitions Deferred (dependencies not yet built):**
- `published` → `on_sale`: Deferred. In the current scope, publishing directly means "available for sale" once Epic 3 builds ticket purchasing. For now, `published` is the terminal "live" state.
- `on_sale` → `sold_out`: Requires ticket purchasing (Epic 3) to increment `soldCount`.
- Any → `completed`: Requires scheduled function or date-based check. Could be implemented as a query-time check, but a proper implementation would use Convex scheduled functions. **Defer to a future story or implement as a query-time computed field.**
- Cancellation refunds/notifications: Requires Stripe (Epic 3) and email (Resend). Just change status for now.

**Hard Delete Pattern for Drafts:**
- Architecture says "Soft deletes are NOT used" — drafts are hard deleted
- Must cascade: delete all ticket tiers, delete artwork storage file, then delete event
- Use `ctx.db.delete()` for record removal

**Convex Mutation Pattern (same as all existing mutations):**
```typescript
export const publishEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) throw new ConvexError("You do not own this event");
    // ... status-specific validation ...
    await ctx.db.patch(args.eventId, { status: "published", updatedAt: Date.now() });
  },
});
```

**AlertDialog for Destructive Actions (from UX spec):**
- Use `AlertDialog` (not `Dialog`) from shadcn/ui for destructive confirmations
- Pattern: title, description, cancel button (ghost), action button (destructive)
- Loading state on action button during mutation
- Focus trapped inside dialog

**Status Badge Colors (from UX spec):**
| Status | Color Token | Badge Approach |
|--------|------------|----------------|
| draft | `--muted` / Slate | `variant="secondary"` |
| published | `--primary` / Indigo | `variant="default"` |
| on_sale | `--success` / Green | Custom `className="bg-green-100 text-green-800"` |
| sold_out | `--destructive` / Red | `variant="destructive"` |
| completed | `--muted` / Slate | `variant="secondary"` |
| cancelled | `--destructive` / Red | `variant="destructive"` + `variant="outline"` to differentiate from sold_out |

### UX Requirements

**Event Detail Page Layout:**
- Back button (ghost, ArrowLeft icon) + page title
- Event info card: artwork (if exists), title, type badge, date/time, venue, description
- Status badge prominently displayed
- Action buttons section at bottom (contextual based on status)

**Publish Flow:**
1. Creator clicks "Publish Event" on event detail page
2. Mutation validates preconditions (≥1 tier, future date, draft status)
3. On success: toast "Event published", status badge updates reactively
4. On failure: toast with specific reason ("Add at least one ticket tier first")

**Cancel Flow:**
1. Creator clicks "Cancel Event" on event detail page
2. AlertDialog appears: "Are you sure you want to cancel [title]?"
3. Optional: textarea for cancellation reason
4. "Cancel Event" (destructive) + "Keep Event" (ghost)
5. On confirm: mutation runs, toast "Event cancelled", badge updates

**Delete Draft Flow:**
1. Creator clicks "Delete Draft" on event detail page
2. AlertDialog: "Delete [title]? This permanently removes the event and all ticket tiers."
3. "Delete" (destructive) + "Keep Draft" (ghost)
4. On confirm: mutation runs, toast "Draft deleted", redirect to `/dashboard/events`

### Key Decisions

- **No `on_sale` transition yet** — Publishing means the event is live. The `on_sale` state will be activated by Epic 3 when ticket purchasing is built.
- **No `completed` auto-transition yet** — This requires scheduled functions or query-time computation. Defer to avoid over-engineering.
- **No `sold_out` detection yet** — Depends on ticket purchasing incrementing `soldCount` (Epic 3).
- **No refund/notification on cancel** — Stripe and email aren't integrated yet. Just change status.
- **Hard delete for drafts** — Cascade delete tiers + artwork file + event record.
- **Event detail page as management hub** — Single page shows event info + contextual actions based on status.
- **Status badge helper function** — Centralized mapping from status string to badge variant/className.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files)
- Validators: `src/lib/validators/` (kebab-case files)
- Route pages: `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx`
- Tests co-located: `__tests__/` subdirectory with `.test.tsx` suffix

### Previous Story Learnings

From Story 2.3 (most recent):
- **Convex ID type workaround**: Use `as any` cast for Convex ID arguments from URL params with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment.
- **ConvexError handling**: Convex queries/mutations that throw `ConvexError` are caught by `error.tsx` boundary.
- **Client component metadata**: Use `useEffect(() => { document.title = "..." }, [])` for page titles.
- **Toast helpers**: Use `showSuccess()` and `showErrorFromCatch()` from `@/lib/utils/toast-helpers`.
- **Blob URL cleanup**: Revoke blob URLs to prevent memory leaks (pattern in ImageUpload).
- **Relative import paths**: Deep route pages need careful `../` counting for convex imports.
- **react-hook-form tests hang in jsdom** — Test rendering/interaction only, not full form submission.
- **next/image with fill**: Use `relative aspect-video` container with `fill` + `object-cover`.
- **Code review caught**: Security issue with publicly exposed mutation lacking ownership check — always verify ownership in every mutation.

### Environment Variables Needed

No new environment variables needed. All existing Convex + Clerk config is sufficient.

### Project Structure Notes

Files to create:
```
src/app/(dashboard)/dashboard/events/[eventId]/page.tsx           # CREATE: Event detail/management page
src/app/(dashboard)/dashboard/events/[eventId]/loading.tsx        # CREATE: Skeleton loading
src/components/custom/cancel-event-dialog.tsx                      # CREATE: Cancel confirmation dialog
src/components/custom/delete-draft-dialog.tsx                      # CREATE: Delete draft confirmation dialog
src/lib/validators/event-publish.ts                                # CREATE: Publish pre-check helper
src/lib/validators/__tests__/event-publish.test.ts                 # CREATE: Publish validation tests
src/components/custom/__tests__/cancel-event-dialog.test.tsx       # CREATE: Cancel dialog tests
src/components/custom/__tests__/delete-draft-dialog.test.tsx       # CREATE: Delete dialog tests
```

Files to modify:
```
convex/events.ts                                                   # MODIFY: Add publishEvent, cancelEvent, deleteDraftEvent mutations
convex/events.test.ts                                              # MODIFY: Add lifecycle contract tests
src/app/(dashboard)/dashboard/events/page.tsx                      # MODIFY: Contextual action buttons per status
```

### Dependencies to Verify

Check that these shadcn/ui components are installed:
- `AlertDialog` — for destructive confirmations
- `Badge` — for status badges
- `Textarea` — for cancellation reason input

If not installed, run: `pnpm dlx shadcn@latest add alert-dialog badge textarea`

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.4 - Event lifecycle with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md - Event status transitions: Draft, Published, OnSale, SoldOut, Completed, Cancelled]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex mutation pattern with auth + ownership + validation]
- [Source: _bmad-output/planning-artifacts/architecture.md - Hard delete for drafts, no soft delete pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Status badge colors: Draft=muted, Published=primary, Cancelled=destructive]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - AlertDialog for destructive confirmations (cancel event, delete draft)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Toast patterns: success 4s auto-dismiss, error persistent]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Button hierarchy: Primary=Publish, Destructive=Cancel/Delete, Outline=Edit]
- [Source: src/lib/utils/constants.ts - EVENT_STATUSES and EVENT_STATUS_LABELS already defined]
- [Source: convex/events.ts - Existing draft-only mutation checks as pattern reference]
- [Source: convex/ticketTiers.ts - Draft-only tier modification check pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build error: `Id` type not exported from Convex dataModel — fixed by using `as any` cast pattern consistent with existing codebase
- Dialog test failures: `toBeInTheDocument` not available (no jest-dom setup) — fixed by using `toBeDefined()`/`toBeNull()`

### Completion Notes List

- Implemented 3 lifecycle mutations: publishEvent (draft→published), cancelEvent (published→cancelled), deleteDraftEvent (hard delete with cascade)
- Created event detail/management page with contextual action buttons based on status
- Created AlertDialog-based confirmation dialogs for cancel and delete-draft flows
- Updated events list with color-coded Badge status badges and status-aware action buttons
- Created canPublishEvent client-side pre-check validator
- Created getStatusBadgeVariant helper for consistent status badge styling
- All 244 tests pass, build succeeds, lint clean (only pre-existing warnings)
- Code review fixes applied: H1 (cancellation reason storage), H2 (AlertDialogAction→Button), M1 (dialog mutation tests with fireEvent), M2 (cancelled badge variant→outline)

### Change Log

- 2026-03-07: Story 2.4 implementation complete — event lifecycle management with publish, cancel, delete-draft flows
- 2026-03-07: Code review fixes — cancellation reason persisted in schema+mutation, AlertDialogAction replaced with Button, dialog mutation tests added, cancelled badge variant corrected to outline

### File List

**New files:**
- src/app/(dashboard)/dashboard/events/[eventId]/page.tsx — Event detail/management page
- src/app/(dashboard)/dashboard/events/[eventId]/loading.tsx — Skeleton loading state
- src/components/custom/cancel-event-dialog.tsx — Cancel event confirmation dialog
- src/components/custom/delete-draft-dialog.tsx — Delete draft confirmation dialog
- src/lib/utils/event-status.ts — getStatusBadgeVariant helper
- src/lib/validators/event-publish.ts — canPublishEvent client-side validator
- src/lib/validators/__tests__/event-publish.test.ts — Publish validation tests (5)
- src/components/custom/__tests__/cancel-event-dialog.test.tsx — Cancel dialog tests (5)
- src/components/custom/__tests__/delete-draft-dialog.test.tsx — Delete dialog tests (4)
- src/lib/utils/__tests__/event-status.test.ts — Status badge variant tests (7)
- src/components/ui/alert-dialog.tsx — shadcn/ui AlertDialog (installed)
- src/components/ui/badge.tsx — shadcn/ui Badge (installed)

**Modified files:**
- convex/schema.ts — Added cancellationReason field to events table
- convex/events.ts — Added publishEvent, cancelEvent, deleteDraftEvent mutations
- convex/events.test.ts — Added 20 lifecycle contract tests
- src/app/(dashboard)/dashboard/events/page.tsx — Color-coded badges, contextual action buttons
