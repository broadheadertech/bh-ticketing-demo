# Story 2.1: Event Creation Wizard - Basic Details

Status: done

## Story

As a **creator**,
I want to create a new event by entering its type, title, description, date, time, and venue,
So that I can start building my event listing.

## Acceptance Criteria

1. **Given** I am authenticated with `artist` or `organization` active role **When** I navigate to `/dashboard/events/create` **Then** I see a multi-step wizard starting with event type selection
2. **Given** I am on the event type step **When** I select an event type (concert, racing, seminar, class, other) **Then** the form adapts to show type-relevant fields and suggestions (FR7) **And** I proceed to the details step
3. **Given** I am on the details step **When** I enter title, description, date, time, and optionally select a venue from existing platform venues (FR11, FR12) **Then** the form validates inputs with Zod **And** I can proceed to the next step
4. **Given** I submit the wizard with valid basic details **When** the event is saved **Then** an `events` table record is created with status `draft` (FR13) **And** I am redirected to the event edit page **And** a success toast confirms "Event created as draft"
5. **Given** Convex function-level authorization (NFR14) **When** I query events **Then** I only see events where I am the creator

## Tasks / Subtasks

- [x] **Task 1: Add `events` table to Convex schema** (AC: #4, #5)
  - [x]1.1 Add `events` table to `convex/schema.ts` with fields: `creatorId` (v.id("users")), `eventType` (v.string()), `title` (v.string()), `description` (v.string()), `date` (v.number() — Unix ms), `time` (v.string() — "HH:mm" format), `venueId` (v.optional(v.id("venues"))), `venueName` (v.optional(v.string()) — free-text venue for MVP since venues table doesn't exist yet), `status` (v.string() — "draft"), `artworkUrl` (v.optional(v.string())), `createdAt` (v.number()), `updatedAt` (v.number())
  - [x]1.2 Add indexes: `by_creator_id` on ["creatorId"], `by_status` on ["status"]
  - [x]1.3 Do NOT create a `venues` table — that's Epic 6. For MVP, venue is a free-text `venueName` string field. The `venueId` field is optional and reserved for future venue linking.

- [x] **Task 2: Create event Zod validation schema** (AC: #3)
  - [x]2.1 Create `src/lib/validators/event.ts` with Zod schemas:
    - `eventTypeSchema` — z.enum(["concert", "racing", "seminar", "class", "other"])
    - `eventDetailsSchema` — title (1-200 chars, required), description (1-5000 chars, required), date (required, must be future date), time (required, "HH:mm" format), venueName (optional, max 200 chars)
    - `createEventSchema` — combines eventType + eventDetails for full wizard submission
  - [x]2.2 Export TypeScript types: `EventType`, `EventDetailsFormData`, `CreateEventFormData`
  - [x]2.3 Create `src/lib/validators/__tests__/event.test.ts` with tests for: valid data passes, missing required fields fail, past date fails, title too long fails, invalid event type fails

- [x] **Task 3: Create Convex event mutations and queries** (AC: #4, #5)
  - [x]3.1 Create `convex/events.ts` with:
    - `createEvent` mutation: accepts eventType, title, description, date, time, venueName (optional). Uses `getAuthenticatedUser` + `requireAnyRole(user, ["artist", "organization"])`. Sets status to "draft", sets creatorId to user._id. Validates title (1-200), description (1-5000), date (must be future), time (HH:mm regex). Returns the new event ID.
    - `getMyEvents` query: uses `getAuthenticatedUser`, queries events by creatorId index, returns sorted by date descending. Uses `requireAnyRole(user, ["artist", "organization"])`.
    - `getEventById` query: accepts eventId, returns event only if creatorId matches current user (or user is admin).
  - [x]3.2 Update `convex/_generated/api.d.ts` to add events module (manual placeholder update since no Convex deployment)
  - [x]3.3 Create `convex/events.test.ts` with contract tests: createEvent with valid data succeeds, createEvent rejects unauthorized roles, createEvent validates required fields, createEvent validates future date, getMyEvents returns only creator's events

- [x] **Task 4: Create event type constants and helpers** (AC: #2)
  - [x]4.1 Add to `src/lib/utils/constants.ts`:
    - `EVENT_TYPES` array: ["concert", "racing", "seminar", "class", "other"]
    - `EVENT_TYPE_LABELS` record: { concert: "Concert / Gig", racing: "Racing Event", seminar: "Seminar / Workshop", class: "Class / Course", other: "Other" }
    - `EVENT_STATUSES` array: ["draft", "published", "on_sale", "sold_out", "completed", "cancelled"]
    - `EVENT_STATUS_LABELS` record with human-readable labels
  - [x]4.2 Add event type icons mapping (lucide icons: Music for concert, Flag for racing, BookOpen for seminar, GraduationCap for class, Calendar for other)

- [x] **Task 5: Build the event creation wizard page and components** (AC: #1, #2, #3, #4)
  - [x]5.1 Create `src/app/(dashboard)/dashboard/events/create/page.tsx` — the wizard page, server component wrapper with metadata title "Create Event | PHLive"
  - [x]5.2 Create `src/components/custom/create-event-wizard.tsx` — "use client" component containing the multi-step wizard state machine:
    - Step 1: Event Type Selection — grid of cards (one per event type) with icon + label + brief description. Clicking a card selects the type and auto-advances to step 2.
    - Step 2: Event Details — form with title, description (Textarea), date (native date input), time (native time input), venueName (optional Input). Uses react-hook-form + zodResolver with `eventDetailsSchema`.
    - Step 3: Review & Create — summary card showing all entered data. "Create Event" button submits to Convex mutation.
    - Wizard state: `currentStep` (1|2|3), `eventType` (selected in step 1), form data (managed by react-hook-form in step 2)
    - Progress indicator at top showing step 1/2/3 with labels
    - Back button on steps 2 and 3
    - On successful creation: `showSuccess("Event created as draft")`, redirect to `/dashboard/events` (events list — will be built in Story 2.5, but route should work)
  - [x]5.3 Install any missing shadcn components needed: `pnpm dlx shadcn@latest add progress` (for step indicator if needed). Native HTML date/time inputs are sufficient — do NOT add a date picker library.
  - [x]5.4 Use `showSuccess` and `showErrorFromCatch` from `@/lib/utils/toast-helpers` for all feedback

- [x] **Task 6: Add RoleGuard to protect the create page** (AC: #1)
  - [x]6.1 Wrap the create event page content with `<RoleGuard requiredRoles={["artist", "organization"]}>` to show access restricted message for attendees/venue_managers
  - [x]6.2 The sidebar nav already has "Create Event" link at `/dashboard/events/create` for artist and organization roles (see sidebar-nav.tsx lines 37, 43)

- [x] **Task 7: Create events list placeholder page** (AC: #4 redirect target)
  - [x]7.1 Create `src/app/(dashboard)/dashboard/events/page.tsx` — simple placeholder page showing "My Events" heading with a message "Your events will appear here" and a "Create Event" button linking to `/dashboard/events/create`. This page is the redirect target after event creation. Full implementation is Story 2.5.
  - [x]7.2 Create `src/app/(dashboard)/dashboard/events/loading.tsx` — skeleton loading state

- [x] **Task 8: Write component and integration tests** (AC: #1-5)
  - [x]8.1 Create `src/components/custom/__tests__/create-event-wizard.test.tsx` — test: renders step 1 with event type cards, clicking a type card advances to step 2, step 2 renders form fields, back button returns to step 1. NOTE: Do NOT test full form submission — react-hook-form + radix-ui hangs in jsdom (known issue from Story 1.4). Test rendering and navigation only.
  - [x]8.2 Ensure `convex/events.test.ts` contract tests cover all mutation validation rules

- [x] **Task 9: Final validation**
  - [x]9.1 Run `pnpm build` — must succeed with new routes
  - [x]9.2 Run `pnpm test:run` — all tests pass
  - [x]9.3 Run `pnpm lint` — no new errors
  - [x]9.4 Verify `/dashboard/events/create` route renders in build output

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `users` and `creatorProfiles` tables. **MODIFY** to add `events` table.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)` (throws ConvexError) and `getOptionalAuthenticatedUser(ctx)` (returns null). **REUSE** in event mutations/queries.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`, `requireRole(user, role)`, `isValidRole(role)`. **REUSE** for authorization.
- `src/lib/utils/constants.ts` — Has `ROLES`, `ROLE_LABELS`, `DEFAULT_ROLE`, `APP_NAME`. **MODIFY** to add event type and status constants.
- `src/lib/utils/toast-helpers.ts` — `showSuccess(msg)`, `showError(msg)`, `showErrorFromCatch(error)`. **REUSE** for all toast feedback.
- `src/components/custom/role-guard.tsx` — `<RoleGuard requiredRoles={[...]}>`. **REUSE** to protect create page.
- `src/components/custom/sidebar-nav.tsx` — Already has "Create Event" nav item at `/dashboard/events/create` for artist and organization roles. **DO NOT MODIFY**.
- `src/components/ui/` — All shadcn components (Button, Card, Input, Textarea, Form, Skeleton, etc.). **REUSE**.
- `src/app/(dashboard)/error.tsx` and `not-found.tsx` — Dashboard error boundaries. Already in place.
- `src/app/(dashboard)/dashboard/loading.tsx` — Dashboard loading skeleton. Already exists.

### Architecture Compliance

**Events Table Schema (from architecture.md):**
```
events (id, creator_id, venue_id, type, status, title, description, date, artwork_url)
```
Map to Convex schema:
```typescript
events: defineTable({
  creatorId: v.id("users"),
  eventType: v.string(), // "concert" | "racing" | "seminar" | "class" | "other"
  title: v.string(),
  description: v.string(),
  date: v.number(), // Unix ms — event date
  time: v.string(), // "HH:mm" — event start time
  venueName: v.optional(v.string()), // Free-text venue name (MVP)
  venueId: v.optional(v.string()), // Reserved for future venue linking (Epic 6)
  status: v.string(), // "draft" | "published" | "on_sale" | "sold_out" | "completed" | "cancelled"
  artworkUrl: v.optional(v.string()), // Added in Story 2.3
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_creator_id", ["creatorId"])
  .index("by_status", ["status"]),
```

**Event Status State Machine (from architecture.md):**
- Draft -> Published -> OnSale -> SoldOut -> Completed
- Draft -> (delete)
- Published/OnSale -> Cancelled
- Story 2.1 only creates events as "draft". Status transitions are Story 2.4.

**Convex Function Pattern (from architecture.md):**
- Convex queries for all data fetching (reactive subscriptions)
- Convex mutations for all database mutations
- Server Actions only for external API calls (Stripe, email) — NOT needed for Story 2.1

**Authorization Pattern:**
- `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])` in every event mutation/query
- Creators see only their own events (filter by creatorId)
- Match the pattern from `convex/creatorProfiles.ts`

**Validation Pattern:**
- Zod schemas for client-side form validation (react-hook-form + zodResolver)
- Convex argument validators + manual checks in mutations for server-side
- Match the pattern from `src/lib/validators/creator-profile.ts` and `convex/creatorProfiles.ts`

### UX Requirements

**Wizard Pattern (from UX spec — Eventbrite-inspired):**
- Multi-step wizard with progress indicator
- Step validation before advancing
- Save-as-draft at any point (for Story 2.1: only save on final submit as draft)
- Event type shapes the form — selecting "concert" vs "racing" should feel different (for MVP: same fields, different step 1 selection card)
- Completed in <15 minutes on first attempt (success metric)

**Form Layout (from UX spec):**
- Single-column layout
- Labels above inputs
- Real-time validation on blur (mode: "onBlur")
- Error text below field in `text-destructive text-sm` (handled by shadcn FormMessage)
- Native HTML date and time inputs (no date picker library needed for MVP)

**Event Type Selection Cards:**
- Grid layout (2 columns on mobile, 3 on desktop)
- Each card: icon + type name + brief description
- Selected card has primary border/ring styling
- Clicking auto-advances to step 2

**Progress Indicator:**
- Simple step counter: "Step 1 of 3" or a 3-step horizontal progress bar
- Use shadcn Progress component or simple styled divs
- Steps labeled: "Event Type" > "Details" > "Review"

### Key Decisions

- **No venues table for MVP** — Architecture shows a `venues` table, but that's Epic 6. For Story 2.1, venue is a free-text `venueName` string. The schema includes `venueId` as optional for future linking.
- **Native date/time inputs** — Do NOT install a date picker library. Use `<input type="date">` and `<input type="time">`. These work well on all modern browsers and mobile devices. A fancy date picker can be added later if needed.
- **Wizard state in React state** — No URL-based step tracking. Use `useState` for `currentStep` and `selectedEventType`. Form data managed by react-hook-form.
- **Redirect to events list after creation** — Redirect to `/dashboard/events` (placeholder page created in Task 7). NOT to the event edit page yet (no edit page exists until Story 2.4).
- **Event type "adapts" the form** — For MVP, all event types use the same form fields. The "adaptation" is the type selection step which sets the eventType field. Type-specific field customization (e.g., "Zone" for racing) is deferred to later stories.
- **Status values are lowercase snake_case** — "draft", "published", "on_sale", "sold_out", "completed", "cancelled". Consistent with role naming convention.
- **Date stored as Unix ms** — `v.number()` in Convex. Client converts from date input string to Unix ms before sending to mutation.
- **Time stored as "HH:mm" string** — Separate from date for flexible display. Combined with date for sorting/filtering.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files, e.g., `events.ts`)
- Validators: `src/lib/validators/` (kebab-case files, e.g., `event.ts`)
- Route pages: `src/app/(dashboard)/dashboard/events/create/page.tsx`
- Tests co-located: `__tests__/` subdirectory with `.test.tsx` suffix for components, `.test.ts` for utilities

### Environment Variables Needed

No new environment variables needed for this story.

### Project Structure Notes

Files to create:
```
convex/events.ts                                          # CREATE: Event mutations and queries
convex/events.test.ts                                     # CREATE: Event contract tests
src/lib/validators/event.ts                               # CREATE: Zod event schemas
src/lib/validators/__tests__/event.test.ts                # CREATE: Zod schema tests
src/components/custom/create-event-wizard.tsx              # CREATE: Multi-step wizard component
src/components/custom/__tests__/create-event-wizard.test.tsx # CREATE: Wizard component tests
src/app/(dashboard)/dashboard/events/create/page.tsx      # CREATE: Create event route page
src/app/(dashboard)/dashboard/events/page.tsx             # CREATE: Events list placeholder
src/app/(dashboard)/dashboard/events/loading.tsx          # CREATE: Events loading skeleton
```

Files to modify:
```
convex/schema.ts                                          # MODIFY: Add events table
convex/_generated/api.d.ts                                # MODIFY: Add events module
src/lib/utils/constants.ts                                # MODIFY: Add event type/status constants
```

### Previous Story Learnings

From Story 1.5 (most recent):
- **Toast helpers pattern**: Use `showSuccess()` and `showErrorFromCatch()` from `@/lib/utils/toast-helpers`. Do NOT import `toast` from sonner directly.
- **vi.hoisted()**: Required for vitest mock variables referenced inside `vi.mock()` factory functions.
- **Error component naming**: Don't name React component imports `Error` — shadows the built-in Error class and breaks useEffect.
- **NODE_ENV in vitest**: `process.env.NODE_ENV` is "test" in vitest, not "development". Don't rely on it for dev-only behavior in tests.

From Story 1.4:
- **react-hook-form tests hang in jsdom** — Full form rendering tests with react-hook-form + radix-ui Slot hang. Use loading-state-only tests for form components. Cover validation via dedicated Zod schema tests.
- **Upsert pattern**: Query for existing record by user-specific index, if exists -> patch, if not -> insert. Match this for future event updates.
- **Zod on client, Convex validators on server** — Dual validation. Don't rely on only one.
- **ConvexError for user-facing errors** — `throw new ConvexError("message")` in mutations. Extracted by `showErrorFromCatch` on client.
- **Test mocking pattern**: Mock `convex/react` with `useQuery` and `useMutation`. Mock `sonner` as `{ toast: { success: vi.fn(), error: vi.fn() } }`.

From Story 1.3:
- **Shared constants** — `ROLE_LABELS` in `src/lib/utils/constants.ts`. Add event constants here too, don't duplicate.
- **NavIcon pattern** — Icons resolved via wrapper component, not dynamic `const Icon = ...` during render.
- **requireAnyRole helper** — Already exists in `convex/lib/roles.ts`. Accepts array of role strings.

From Story 1.1:
- jsdom 25 (not 28) for Node 20 compatibility
- vitest.config.mts with React plugin
- shadcn components installed via `pnpm dlx shadcn@latest add [component]`

### Dependencies to Verify

No new npm dependencies needed. All required packages already installed:
- `react-hook-form` + `@hookform/resolvers` + `zod` — already in package.json
- shadcn components: Button, Card, Input, Textarea, Form, Skeleton — already installed
- May need: `pnpm dlx shadcn@latest add progress` for wizard step indicator (check if exists first)

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.1 - Event creation wizard with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md - FR7: Adaptive event types, FR11: Event details, FR12: Venue selection, FR13: Event lifecycle states]
- [Source: _bmad-output/planning-artifacts/prd.md - NFR14: Function-level authorization]
- [Source: _bmad-output/planning-artifacts/architecture.md - Data Architecture: events table schema, status state machine]
- [Source: _bmad-output/planning-artifacts/architecture.md - Convex Function-Level Authorization: creators see only their own events]
- [Source: _bmad-output/planning-artifacts/architecture.md - Validation: Zod + Convex Validators dual pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md - API Patterns: Convex queries for data fetching, mutations for writes]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Progressive wizard from Eventbrite, progress indicator, save-as-draft]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Event type shapes the form, adaptive types]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Custom components: EventCard, TicketTierBuilder (future stories)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Form layout: single-column, labels above, validation on blur]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Review fix: StepDetails now receives `initialData` prop to preserve form data on back navigation
- Review fix: Validator imports `EVENT_TYPES` from constants.ts instead of defining duplicate array
- Review fix: Date parsing uses `T00:00:00` suffix to parse as local time, avoiding UTC timezone shift

### File List

**Created:**
- `convex/events.ts` — createEvent mutation, getMyEvents query, getEventById query
- `convex/events.test.ts` — 17 contract tests for events module
- `src/lib/validators/event.ts` — Zod schemas: eventTypeSchema, eventDetailsSchema, createEventSchema
- `src/lib/validators/__tests__/event.test.ts` — 16 validation tests
- `src/components/custom/create-event-wizard.tsx` — 3-step wizard (type selection, details form, review)
- `src/components/custom/__tests__/create-event-wizard.test.tsx` — 6 wizard component tests
- `src/app/(dashboard)/dashboard/events/create/page.tsx` — Create event page with RoleGuard
- `src/app/(dashboard)/dashboard/events/page.tsx` — Events list placeholder with "Create Event" button
- `src/app/(dashboard)/dashboard/events/loading.tsx` — Events loading skeleton

**Modified:**
- `convex/schema.ts` — Added events table with indexes (by_creator_id, by_status)
- `convex/_generated/api.d.ts` — Added events module import
- `src/lib/utils/constants.ts` — Added EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_DESCRIPTIONS, EVENT_STATUSES, EVENT_STATUS_LABELS
