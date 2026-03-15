# Story 6.2: Venue Availability Calendar

Status: done

## Story

As a **venue manager**,
I want to manage my venue's availability calendar,
so that organizers know which dates are open for booking.

## Acceptance Criteria

1. **AC1 — Availability page accessible:** Navigating to `/dashboard/venues/availability` (with `venue_manager` active role) shows a venue selector if the manager has multiple venues. If only one venue exists, the calendar loads directly. If no venues exist, an empty state directs the user to Create Venue first. Page is wrapped in `<RoleGuard requiredRoles={["venue_manager"]}>`.

2. **AC2 — Calendar month view:** The selected venue's availability renders a month grid (current month default, 7-column CSS grid) with Prev/Next month navigation. Dates with no entry show as default (available). Dates with `tentative` status show an amber indicator. Dates with `booked` status show a red indicator.

3. **AC3 — Set date status:** Clicking a date cell selects it (highlighted border). A status editor panel appears below the calendar showing the selected date, a `<Select>` control with options: Available (clears entry), Tentatively Held, Booked — plus an optional notes `<Textarea>` (max 500 chars). Saving calls `setVenueAvailability` mutation.

4. **AC4 — Data model — available = no record:** The `venueAvailability` table stores one record per date per venue, only for `tentative` and `booked` states. Setting status to `available` deletes any existing record. This keeps storage minimal and queries simple.

5. **AC5 — Convex authorization:** `setVenueAvailability` mutation requires `venue_manager` role + `venue.managerId === user._id` ownership check. `getAvailabilityByVenue` query requires auth + ownership.

6. **AC6 — Public read query for Story 6.3:** `getPublicVenueAvailability` query (no auth required) returns all non-available records for a given `venueId`. This query is wired up in this story to support Story 6.3's public venue profile page.

## Tasks / Subtasks

- [x] Task 1: Add `venueAvailability` table to `convex/schema.ts` (AC: 4, 5)
  - [x] 1.1 Add `venueAvailability` table with fields: `venueId: v.id("venues")`, `date: v.string()` (ISO "YYYY-MM-DD"), `status: v.string()` ("tentative" | "booked"), `notes: v.optional(v.string())`, `createdAt: v.number()`, `updatedAt: v.number()`. Add `.index("by_venue_id", ["venueId"])` and `.index("by_venue_date", ["venueId", "date"])`.
  - [x] 1.2 Install `date-fns` package: copied from pnpm tmp dir (Windows EPERM workaround); added `"date-fns": "^4.1.0"` to `package.json`.
  - [x] 1.3 Add shadcn `Checkbox` component (needed by `venue-form.tsx` from Story 6.1): created manually using `radix-ui` umbrella import pattern (same as `label.tsx`).

- [x] Task 2: Create `convex/venueAvailability.ts` (AC: 4, 5, 6)
  - [x] 2.1 `setVenueAvailability` mutation: args `{ venueId, date, status, notes? }`. Auth + ownership check. If `status === "available"` → delete existing record if any (return). Otherwise upsert: update existing record if found via `by_venue_date` index, else insert new record.
  - [x] 2.2 `getAvailabilityByVenue` query: args `{ venueId }`. Auth + ownership check (fetch venue, verify `managerId === user._id`). Returns all records for the venue ordered by date.
  - [x] 2.3 `getPublicVenueAvailability` query: args `{ venueId }`. No auth required. Returns all availability records for the venue. (Prepared for Story 6.3 organizer view.)

- [x] Task 3: Create validator `src/lib/validators/venue-availability.ts` (AC: 3, 4)
  - [x] 3.1 Export `AVAILABILITY_STATUSES = ["available", "tentative", "booked"] as const` and `AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number]`.
  - [x] 3.2 Export `setAvailabilitySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"), status: z.enum(AVAILABILITY_STATUSES), notes: z.string().max(500).optional() })`.
  - [x] 3.3 Write pure contract tests in `src/lib/validators/__tests__/venue-availability.test.ts`: valid date format passes, invalid format fails, valid status enum passes, unknown status fails, notes max 500 chars.

- [x] Task 4: Create availability dashboard page `src/app/(dashboard)/dashboard/venues/availability/page.tsx` (AC: 1, 2, 3)
  - [x] 4.1 `"use client"`, wrapped in `<RoleGuard requiredRoles={["venue_manager"]}>`. Uses `useQuery(api.venues.getVenuesByManager)` to fetch venues.
  - [x] 4.2 Loading state (venues === undefined): 3 `<Skeleton>` rows.
  - [x] 4.3 Empty state (venues.length === 0): centered message "Create a venue first to manage availability" with a "Create Venue" link to `/dashboard/venues/create`.
  - [x] 4.4 Venue selector (venues.length > 1): render a `<Select>` at the top of the page to pick a venue. Auto-select the first venue.
  - [x] 4.5 Single venue or venue selected: render `<AvailabilityCalendar venueId={selectedVenueId} />`.

- [x] Task 5: Create `src/components/custom/availability-calendar.tsx` (AC: 2, 3, 5)
  - [x] 5.1 Props: `venueId: string`. Uses `useQuery(api.venueAvailability.getAvailabilityByVenue, { venueId: venueId as any })` and `useMutation(api.venueAvailability.setVenueAvailability)`.
  - [x] 5.2 Month navigation state (`currentMonth: Date`, default to `new Date()`). "Prev" / "Next" buttons using `subMonths` / `addMonths` from `date-fns`. Header shows month/year.
  - [x] 5.3 Calendar grid: build day cells using `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `getDay` from `date-fns`. CSS Grid 7 columns. Prepend empty cells for the day-of-week offset. Each cell renders the day number + a colored status dot (amber = tentative, red = booked, none = available).
  - [x] 5.4 Selected date state (`selectedDate: string | null`). Clicking a date sets it as selected (highlighted with ring). Past dates still clickable (managers may want to mark historical records).
  - [x] 5.5 Status editor panel (shown below calendar when `selectedDate` is set): displays formatted selected date, a `<Select>` for status (Available / Tentatively Held / Booked), optional `<Textarea>` for notes, and a "Save" `<Button>`. On save → call `setVenueAvailability` → show `showSuccess("Availability saved")`. On status selection of "Available" with no existing record, the save is a no-op (but still callable).
  - [x] 5.6 Build `statusMap: Record<string, AvailabilityRecord>` memo from query data: `const statusMap = useMemo(() => { const m: Record<string, (typeof records)[0]> = {}; records?.forEach(r => { m[r.date] = r; }); return m; }, [records])`.

- [x] Task 6: Write pure contract tests `convex/venueAvailability.test.ts` (AC: all)
  - [x] 6.1 Authorization: only `venue_manager` role allowed for `setVenueAvailability`.
  - [x] 6.2 Ownership: `venue.managerId !== user._id` → reject.
  - [x] 6.3 Status "available" triggers delete logic (no record stored).
  - [x] 6.4 Status "tentative" and "booked" trigger upsert logic.
  - [x] 6.5 Date format validation contract: "YYYY-MM-DD" valid, other formats rejected.
  - [x] 6.6 `getPublicVenueAvailability` has no auth requirement (always accessible).

## Dev Notes

### CRITICAL: Missing `checkbox.tsx` from Story 6.1

`src/components/custom/venue-form.tsx` imports `Checkbox` from `@/components/ui/checkbox` but the component file does not exist in `src/components/ui/`. This must be added as part of **Task 1.3** before running the dev server:

```bash
pnpm dlx shadcn@latest add checkbox
```

### `venueAvailability` Table Schema

```typescript
// Add to convex/schema.ts alongside other tables
venueAvailability: defineTable({
  venueId: v.id("venues"),
  date: v.string(), // ISO "YYYY-MM-DD" — stores calendar date, not timestamp
  status: v.string(), // "tentative" | "booked" only — "available" = no record
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_venue_id", ["venueId"])
  .index("by_venue_date", ["venueId", "date"]),
```

**Important design decision:** Only `tentative` and `booked` records are stored. "Available" is the implicit default (no record). This avoids storing one record per day per venue (which could be thousands of records per year).

### `setVenueAvailability` Upsert Logic

```typescript
export const setVenueAvailability = mutation({
  args: {
    venueId: v.id("venues"),
    date: v.string(),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");

    const existing = await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_date", (q) =>
        q.eq("venueId", args.venueId).eq("date", args.date)
      )
      .unique();

    if (args.status === "available") {
      // "available" = no record — delete override if exists
      if (existing) await ctx.db.delete(existing._id);
      return;
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        notes: args.notes,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("venueAvailability", {
        venueId: args.venueId,
        date: args.date,
        status: args.status,
        notes: args.notes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
```

### `date-fns` — Required Installation

`date-fns` is NOT in `package.json`. Install it as part of **Task 1.2**:

```bash
pnpm add date-fns
```

Key functions used in `availability-calendar.tsx`:

```typescript
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, addMonths, subMonths, isToday, isSameDay,
} from "date-fns";

// Build month grid:
const monthStart = startOfMonth(currentMonth);
const monthEnd = endOfMonth(currentMonth);
const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
const startPadding = getDay(monthStart); // 0=Sun, day-of-week offset for CSS Grid

// Format for display:
format(currentMonth, "MMMM yyyy") // → "March 2026"
format(day, "yyyy-MM-dd")          // → "2026-03-13" (key for statusMap)
format(day, "d")                   // → "13" (day number for cell)
```

### No Popover Component Needed

`popover.tsx` is not in `src/components/ui/` and `popover` is not in the installed packages. The status editor is implemented as an **inline panel below the calendar** rather than a floating popover. This requires only `Select`, `Textarea`, and `Button` — all already installed.

```typescript
{selectedDate && (
  <div className="mt-4 p-4 border rounded-lg space-y-3">
    <p className="font-medium text-sm">
      {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
    </p>
    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="available">Available</SelectItem>
        <SelectItem value="tentative">Tentatively Held</SelectItem>
        <SelectItem value="booked">Booked</SelectItem>
      </SelectContent>
    </Select>
    <Textarea
      placeholder="Notes (optional)"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      maxLength={500}
      rows={2}
    />
    <Button onClick={handleSave} disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
      Save
    </Button>
  </div>
)}
```

### Status Color Coding

```typescript
const STATUS_STYLES: Record<string, string> = {
  available: "",               // no indicator — default
  tentative: "bg-amber-100 border-amber-400 text-amber-900",
  booked:    "bg-red-100 border-red-400 text-red-900",
};
```

Day cell structure:
```typescript
<button
  type="button"
  onClick={() => handleDayClick(format(day, "yyyy-MM-dd"))}
  className={cn(
    "aspect-square w-full rounded-md border text-sm font-medium flex items-center justify-center",
    isToday(day) && "ring-2 ring-primary",
    selectedDate === format(day, "yyyy-MM-dd") && "ring-2 ring-primary ring-offset-1",
    STATUS_STYLES[statusMap[format(day, "yyyy-MM-dd")]?.status ?? "available"],
  )}
>
  {format(day, "d")}
</button>
```

### Calendar Grid Layout (7-column CSS Grid)

```typescript
// Render empty filler cells for day-of-week offset (0=Sun)
// Then render day cells

<div className="grid grid-cols-7 gap-1">
  {/* Day headers */}
  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
    <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
  ))}
  {/* Padding cells */}
  {Array.from({ length: startPadding }).map((_, i) => (
    <div key={`pad-${i}`} />
  ))}
  {/* Day cells */}
  {days.map((day) => (
    <DayCell key={format(day, "yyyy-MM-dd")} day={day} ... />
  ))}
</div>
```

### Convex Authorization Pattern

Same pattern as `convex/venues.ts`. Key imports:
```typescript
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";
```

For `getPublicVenueAvailability` — no auth required:
```typescript
export const getPublicVenueAvailability = query({
  args: { venueId: v.id("venues") },
  handler: async (ctx, args) => {
    // No auth — public data for organizer discovery (Story 6.3)
    return await ctx.db
      .query("venueAvailability")
      .withIndex("by_venue_id", (q) => q.eq("venueId", args.venueId))
      .collect();
  },
});
```

### Route Structure

```
src/app/(dashboard)/dashboard/venues/
  availability/
    page.tsx    ← NEW: implements the sidebar nav link that was 404
```

The sidebar nav already links here:
```typescript
// src/components/custom/sidebar-nav.tsx (NO CHANGE NEEDED)
venue_manager: [
  { label: "My Venues", href: "/dashboard/venues", icon: Building2 },
  { label: "Availability", href: "/dashboard/venues/availability", icon: CalendarDays },
],
```

### Validator File Location

```
src/lib/validators/
  venue-availability.ts         ← NEW
  __tests__/
    venue-availability.test.ts  ← NEW
```

`AVAILABILITY_STATUSES` is exported from the validator file so both the Zod schema and the React component share the same constant.

### Venue Selector State (Multi-Venue Case)

```typescript
// In availability page
const venues = useQuery(api.venues.getVenuesByManager);
const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

// Auto-select first venue when data loads
useEffect(() => {
  if (venues && venues.length > 0 && !selectedVenueId) {
    setSelectedVenueId(venues[0]._id as string);
  }
}, [venues, selectedVenueId]);
```

### `parseISO` for Display Formatting

When formatting `selectedDate` (a string like "2026-03-15") for display in the status editor, use `parseISO` to convert to a Date object first:

```typescript
import { parseISO } from "date-fns";
// In status editor:
format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")
// → "Thursday, March 15, 2026"
```

### Testing Approach

Pure contract tests — no Convex runtime (same pattern as `convex/venues.test.ts`):

```typescript
// convex/venueAvailability.test.ts

describe("setVenueAvailability — available status contract", () => {
  it("'available' status should trigger delete, not insert", () => {
    const shouldDelete = (status: string) => status === "available";
    expect(shouldDelete("available")).toBe(true);
    expect(shouldDelete("tentative")).toBe(false);
    expect(shouldDelete("booked")).toBe(false);
  });
});
```

### File Locations (relative to repo root)

- `convex/schema.ts` — add `venueAvailability` table
- `convex/venueAvailability.ts` — NEW: queries and mutation
- `convex/venueAvailability.test.ts` — NEW: contract tests
- `src/lib/validators/venue-availability.ts` — NEW: Zod schema + constants
- `src/lib/validators/__tests__/venue-availability.test.ts` — NEW: validator tests
- `src/components/custom/availability-calendar.tsx` — NEW: calendar UI
- `src/app/(dashboard)/dashboard/venues/availability/page.tsx` — NEW: availability management page
- `src/components/ui/checkbox.tsx` — NEW (via shadcn add): fixes missing component from Story 6.1

### References

- Auth/role pattern: [convex/lib/auth.ts](convex/lib/auth.ts), [convex/lib/roles.ts](convex/lib/roles.ts)
- Venue ownership pattern: [convex/venues.ts](convex/venues.ts) — all mutation handlers
- Dashboard client page pattern: [src/app/(dashboard)/dashboard/venues/page.tsx](src/app/(dashboard)/dashboard/venues/page.tsx) — `useQuery` + `RoleGuard` + skeleton/empty/populated states
- Sidebar nav (availability link already present): [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx)
- VenueForm (checkbox usage): [src/components/custom/venue-form.tsx](src/components/custom/venue-form.tsx)
- Select component (for venue picker + status selector): [src/components/ui/select.tsx](src/components/ui/select.tsx)
- Textarea, Button, Skeleton, Label: existing shadcn components in `src/components/ui/`
- `showSuccess`, `showErrorFromCatch`: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- Story 6.1 (reference for code patterns): [_bmad-output/implementation-artifacts/6-1-venue-profile-creation-editing.md](_bmad-output/implementation-artifacts/6-1-venue-profile-creation-editing.md)
- Architecture — Data Architecture section: venue_availability table in schema diagram
- Architecture — Authorization: `requireRole(user, "venue_manager")` + ownership check

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- date-fns pnpm add failed with Windows EPERM (antivirus lstat lock during tmp→final rename). Worked around by copying from `.pnpm/date-fns@4.1.0/node_modules/date-fns_tmp_*` to `node_modules/date-fns` directly, then adding `"date-fns": "^4.1.0"` to `package.json`.
- `checkbox.tsx` created manually using `radix-ui` umbrella import pattern instead of `pnpm dlx shadcn@latest add checkbox` (which would install to `@radix-ui/react-checkbox` — inconsistent with rest of project).
- All 747 tests pass (50 test files). +44 new tests: 25 in `convex/venueAvailability.test.ts`, 19 in `src/lib/validators/__tests__/venue-availability.test.ts`.
- Code review fixes (H1, M1, M2, M3): validated status against allowed values, added requireRole to getAvailabilityByVenue, returned explicit fields in public query, validated date format in backend.

### Change Log

- 2026-03-14: Code review — fixed 4 issues (1H, 3M). H1: validate status values in setVenueAvailability. M1: added requireRole("venue_manager") to getAvailabilityByVenue. M2: getPublicVenueAvailability now returns explicit fields only. M3: validate YYYY-MM-DD date format in backend.

### File List

- `convex/schema.ts` — added `venueAvailability` table
- `convex/venueAvailability.ts` — NEW: `setVenueAvailability`, `getAvailabilityByVenue`, `getPublicVenueAvailability`
- `convex/venueAvailability.test.ts` — NEW: 25 contract tests
- `src/lib/validators/venue-availability.ts` — NEW: `AVAILABILITY_STATUSES`, `setAvailabilitySchema`
- `src/lib/validators/__tests__/venue-availability.test.ts` — NEW: 19 contract tests
- `src/components/ui/checkbox.tsx` — NEW: Checkbox component (radix-ui pattern)
- `src/components/custom/availability-calendar.tsx` — NEW: calendar UI component
- `src/app/(dashboard)/dashboard/venues/availability/page.tsx` — NEW: availability management page
- `package.json` — added `"date-fns": "^4.1.0"` to dependencies
