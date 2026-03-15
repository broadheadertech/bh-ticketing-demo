# Story 6.1: Venue Profile Creation & Editing

Status: done

## Story

As a **venue manager**,
I want to create and edit my venue profile with photos, amenities, and details,
so that event organizers can discover and choose my venue.

## Acceptance Criteria

1. **AC1 — Venue list page:** Navigating to `/dashboard/venues` (with `venue_manager` active role) renders a list of the manager's venues (name, capacity, photo count) or an empty state with a "Create Venue" CTA.

2. **AC2 — Create venue form:** Clicking "Create Venue" navigates to `/dashboard/venues/create` where a form collects: name (required, max 100 chars), location (required, max 200 chars), capacity (required, positive integer), description (optional, max 2000 chars), and amenities (multi-select checkboxes from a predefined list).

3. **AC3 — Zod validation:** All fields are validated client-side with Zod (`src/lib/validators/venue.ts`). Validation errors display inline. Form is disabled while submitting.

4. **AC4 — Photo upload (up to 8):** The create and edit forms allow uploading up to 8 venue photos (JPEG, PNG, WebP, max 5MB each) via drag-and-drop or file picker. Photos are uploaded to Convex file storage. The `venues` record stores `photoStorageIds: Id<"_storage">[]`. On create, storageIds are collected locally before form submission and included in the `createVenue` mutation. The photo upload button is disabled when 8 photos are already added.

5. **AC5 — Save and redirect:** Submitting the create form calls `createVenue` mutation, shows a success toast, and redirects to `/dashboard/venues`. Submitting the edit form calls `updateVenue` mutation and shows a success toast (stays on edit page).

6. **AC6 — Edit venue form:** Navigating to `/dashboard/venues/[venueId]/edit` loads the existing venue data into the form. Photo management shows current photos with a remove button per photo. Adding new photos calls `addVenuePhoto` mutation immediately; removing calls `removeVenuePhoto` mutation (also deletes from storage).

7. **AC7 — Role guard:** All venue management pages are wrapped in `<RoleGuard requiredRoles={["venue_manager"]}>`. Attempting to access without the role shows the role-guard access restricted card.

8. **AC8 — Convex authorization:** `createVenue`, `updateVenue`, `addVenuePhoto`, `removeVenuePhoto` all call `requireRole(user, "venue_manager")`. `updateVenue`, `addVenuePhoto`, `removeVenuePhoto` also verify `venue.managerId === user._id` and throw `ConvexError("You do not own this venue")` otherwise.

## Tasks / Subtasks

- [x] Task 1: Add `venues` table to Convex schema (AC: 1, 4, 8)
  - [x] 1.1 Add `venues` table to `convex/schema.ts` with fields: `managerId: v.id("users")`, `name: v.string()`, `location: v.string()`, `capacity: v.number()`, `description: v.optional(v.string())`, `amenities: v.array(v.string())`, `photoStorageIds: v.array(v.id("_storage"))`, `createdAt: v.number()`, `updatedAt: v.number()`. Add `.index("by_manager_id", ["managerId"])`.
  - [x] 1.2 Add `VENUE_AMENITIES` constant to `src/lib/utils/constants.ts`: array of predefined amenity strings (`"PA System"`, `"Projector"`, `"Green Room"`, `"Bar Service"`, `"Parking"`, `"Loading Dock"`, `"Catering Kitchen"`, `"Air Conditioning"`, `"WiFi"`, `"Outdoor Space"`).

- [x] Task 2: Create `convex/venues.ts` with queries and mutations (AC: 1, 4, 5, 6, 8)
  - [x] 2.1 `generateVenuePhotoUploadUrl` mutation: requires `venue_manager` role; calls `ctx.storage.generateUploadUrl()` and returns the URL. (Separate from `files.ts` which only allows creator roles.)
  - [x] 2.2 `createVenue` mutation: args `{ name, location, capacity, description?, amenities, photoStorageIds }`. Calls `requireRole(user, "venue_manager")`. Validates name ≤ 100 chars, location ≤ 200 chars, capacity is positive integer, description ≤ 2000 chars, amenities ≤ 20 items, `photoStorageIds.length ≤ 8`. Inserts to `venues` table. Returns new venue `_id`.
  - [x] 2.3 `updateVenue` mutation: args `{ venueId, name, location, capacity, description?, amenities }`. Auth + ownership check. Updates `name`, `location`, `capacity`, `description`, `amenities`, `updatedAt`. Does NOT update photos (managed separately via 2.4/2.5).
  - [x] 2.4 `addVenuePhoto` mutation: args `{ venueId, storageId }`. Auth + ownership check. Validates `venue.photoStorageIds.length < 8` (throws `ConvexError("Maximum 8 photos per venue")` if at limit). Patches venue to append `storageId`.
  - [x] 2.5 `removeVenuePhoto` mutation: args `{ venueId, storageId }`. Auth + ownership check. Removes `storageId` from `venue.photoStorageIds` array. Calls `ctx.storage.delete(storageId)` to free storage.
  - [x] 2.6 `getVenuesByManager` query: authenticated. Returns all venues for `user._id`, with computed `photoUrls: string[]` via `Promise.all(venue.photoStorageIds.map(id => ctx.storage.getUrl(id)))` (filter null URLs). Sorted by `createdAt` descending.
  - [x] 2.7 `getVenueById` query: args `{ venueId }`. Auth + ownership check. Returns single venue with `photoUrls: string[]`. Returns `null` if not found or not owned by user.

- [x] Task 3: Create Zod validator `src/lib/validators/venue.ts` (AC: 3)
  - [x] 3.1 Export `createVenueSchema` with fields: `name` (string, trim, min 1, max 100), `location` (string, trim, min 1, max 200), `capacity` (number, int, min 1, max 100000), `description` (optional string, max 2000), `amenities` (array of strings, max 20 items).
  - [x] 3.2 Export `CreateVenueFormData = z.infer<typeof createVenueSchema>`.
  - [x] 3.3 Write pure contract tests in `src/lib/validators/__tests__/venue.test.ts`: name required, location required, capacity must be positive integer, description optional, amenities max 20, valid full input passes.

- [x] Task 4: Create venue list page `src/app/(dashboard)/dashboard/venues/page.tsx` (AC: 1, 7)
  - [x] 4.1 `"use client"` page wrapping `<RoleGuard requiredRoles={["venue_manager"]}>`. Uses `useQuery(api.venues.getVenuesByManager)` to fetch venues.
  - [x] 4.2 Loading state: show 3 `<Skeleton>` cards while venues === undefined.
  - [x] 4.3 Empty state (venues.length === 0): show a centered message "No venues yet" with a "Create Venue" `<Button asChild><Link href="/dashboard/venues/create">`.
  - [x] 4.4 Populated state: render a grid of venue cards showing: first photo (or a `Building2` icon placeholder), name, location, capacity, and an "Edit" link to `/dashboard/venues/[venueId]/edit`.

- [x] Task 5: Create `src/components/custom/venue-form.tsx` shared form component (AC: 2, 3, 4, 5, 6)
  - [x] 5.1 `"use client"` component. Props: `mode: "create" | "edit"`, `venueId?: string`, `initialData?: { name, location, capacity, description, amenities, photoUrls }`.
  - [x] 5.2 Form fields using `react-hook-form` + `zodResolver(createVenueSchema)`. Controlled inputs with inline error messages.
  - [x] 5.3 Amenities section: render `VENUE_AMENITIES` as checkboxes. Controlled via `react-hook-form` field array.
  - [x] 5.4 Photo upload section (new logic, not reusing `ImageUpload`):
    - Display current photos (URLs) in a grid with a remove button per photo.
    - "Add Photo" button (hidden when 8 photos reached): triggers file input. On file select → validate via `validateImageFile` → call `generateVenuePhotoUploadUrl` mutation → POST to storage → get `storageId`.
    - **Create mode**: add `storageId` to local state `pendingStorageIds: string[]`. Display pending photos as blob URLs. On form submit: pass `photoStorageIds: pendingStorageIds` to `createVenue` mutation.
    - **Edit mode**: call `addVenuePhoto({ venueId, storageId })` immediately on successful upload. Remove button calls `removeVenuePhoto({ venueId, storageId })`.
  - [x] 5.5 Submit handler: calls `createVenue` (create mode) or `updateVenue` (edit mode). Shows `showSuccess("Venue saved")`. Create mode redirects to `/dashboard/venues` via `router.push`.

- [x] Task 6: Create venue pages (AC: 2, 5, 6, 7)
  - [x] 6.1 `src/app/(dashboard)/dashboard/venues/create/page.tsx`: `"use client"`, wrapped in `<RoleGuard requiredRoles={["venue_manager"]}>`. Renders `<VenueForm mode="create" />`. `metadata.title = "Create Venue | PHLive"`.
  - [x] 6.2 `src/app/(dashboard)/dashboard/venues/[venueId]/edit/page.tsx`: `"use client"`, `useParams` for `venueId`. Uses `useQuery(api.venues.getVenueById, { venueId })` to load data. Shows `<Skeleton>` while loading, "Venue not found" if null. Renders `<VenueForm mode="edit" venueId={venueId} initialData={venue} />` when loaded. Wrapped in `<RoleGuard requiredRoles={["venue_manager"]}>`.

- [x] Task 7: Write pure contract tests (AC: all)
  - [x] 7.1 Tests in `convex/venues.test.ts`: authorization contract (venue_manager required for mutations), ownership enforcement (managerId !== userId throws), photo limit (max 8), capacity validation (must be positive integer).
  - [x] 7.2 Tests in `src/lib/validators/__tests__/venue.test.ts` (from Task 3.3).

## Dev Notes

### CRITICAL: `venues` Table Does NOT Exist Yet

**`convex/schema.ts` must be updated** — add `venues` table. The `venue_availability` table is **NOT** part of this story (Story 6.2). Do not add it.

The existing `events` table has `venueId: v.optional(v.string())` — **DO NOT change** this field in this story. The typed relationship to `v.optional(v.id("venues"))` is a Story 6.3 concern.

### Schema to Add

```typescript
// Add to convex/schema.ts alongside other tables
venues: defineTable({
  managerId: v.id("users"),
  name: v.string(),
  location: v.string(),
  capacity: v.number(),
  description: v.optional(v.string()),
  amenities: v.array(v.string()),
  photoStorageIds: v.array(v.id("_storage")),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_manager_id", ["managerId"]),
```

### Photo Upload: Two-Phase Flow (Create vs Edit)

**Create mode** — Venue doesn't exist yet, so photos are uploaded to storage first, storageIds held in local component state, then included in the `createVenue` mutation call:

```typescript
// In VenueForm (create mode)
const [pendingStorageIds, setPendingStorageIds] = useState<string[]>([]);
const [pendingBlobUrls, setPendingBlobUrls] = useState<string[]>([]);

async function handlePhotoSelect(file: File) {
  const validation = validateImageFile(file);
  if (!validation.valid) { showErrorFromCatch(new Error(validation.error)); return; }
  const uploadUrl = await generateVenuePhotoUploadUrl();
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
  const { storageId } = await res.json();
  setPendingStorageIds(prev => [...prev, storageId]);
  setPendingBlobUrls(prev => [...prev, URL.createObjectURL(file)]);
}

// On submit:
await createVenue({ ...formData, photoStorageIds: pendingStorageIds });
```

**Edit mode** — Venue exists, mutations happen immediately:
```typescript
const addPhoto = useMutation(api.venues.addVenuePhoto);
const removePhoto = useMutation(api.venues.removeVenuePhoto);

// After upload:
await addPhoto({ venueId: venueId as any, storageId });

// On remove:
await removePhoto({ venueId: venueId as any, storageId });
```

### `generateVenuePhotoUploadUrl` — NOT reusing `files.ts`

`convex/files.ts` `generateUploadUrl` only allows `CREATOR_ROLES` (artist, organization). Venue managers need their own upload URL mutation. Add to `convex/venues.ts`:

```typescript
export const generateVenuePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    return await ctx.storage.generateUploadUrl();
  },
});
```

### Convex Authorization Pattern

All mutations follow this pattern (see `convex/events.ts` for reference):

```typescript
export const updateVenue = mutation({
  args: { venueId: v.id("venues"), /* ... */ },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "venue_manager");
    const venue = await ctx.db.get(args.venueId);
    if (!venue) throw new ConvexError("Venue not found");
    if (venue.managerId !== user._id) throw new ConvexError("You do not own this venue");
    // ... proceed
  },
});
```

- `requireRole` is imported from `./lib/roles` (already exists, supports "venue_manager")
- `getAuthenticatedUser` from `./lib/auth` (already exists)

### Photo URL Resolution in Queries

Same pattern as `getPublicEventDetailPage` for `artworkUrl`:

```typescript
// In getVenuesByManager / getVenueById
const photoUrls = (
  await Promise.all(
    venue.photoStorageIds.map((id) => ctx.storage.getUrl(id))
  )
).filter((url): url is string => url !== null);
```

### React Hook Form + Zod Pattern

Follow event creation wizard for form management. See `src/components/custom/create-event-wizard.tsx` for reference (uses `react-hook-form` + `zodResolver`). Key imports:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVenueSchema, type CreateVenueFormData } from "@/lib/validators/venue";
```

### Route Structure

```
src/app/(dashboard)/dashboard/venues/
  page.tsx                    ← venue list ("My Venues")
  create/
    page.tsx                  ← create form
  [venueId]/
    edit/
      page.tsx                ← edit form
```

The `(dashboard)` route group wraps all these pages in `DashboardLayout` (sidebar + topbar). No change to `layout.tsx`.

### Sidebar Nav — NO CHANGE NEEDED

`src/components/custom/sidebar-nav.tsx` already has `venue_manager` entries:
```typescript
venue_manager: [
  { label: "My Venues", href: "/dashboard/venues", icon: Building2 },
  { label: "Availability", href: "/dashboard/venues/availability", icon: CalendarDays },
],
```
The "Availability" link points to a route that doesn't exist yet (Story 6.2). It will show a 404 for now — that's expected and acceptable.

### `validateImageFile` — Reuse Existing Validator

```typescript
import { validateImageFile } from "@/lib/validators/image-upload";
// Returns { valid: boolean; error?: string }
// Validates: JPEG/PNG/WebP, max 5MB
```

### `Id` Cast Pattern for Client Components

Dashboard client components use `useParams()` which returns strings. Cast pattern for Convex:
```typescript
const venueId = params.venueId as any; // consistent with event pages
```

See `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx:28` for reference.

### Capacity Field Type

The `capacity` form input is a number input (`type="number"`). `react-hook-form` with `zodResolver` will pass it as a string from the DOM. Use `z.coerce.number().int().min(1)` in the Zod schema to handle string-to-number coercion from form inputs.

### Testing Approach

Pure contract tests — no Convex runtime imports (same pattern as all previous stories):

```typescript
// convex/venues.test.ts
describe("createVenue authorization contract", () => {
  it("requires venue_manager active role", () => {
    const user = { activeRole: "artist" };
    const isAllowed = user.activeRole === "venue_manager";
    expect(isAllowed).toBe(false);
  });
});
```

```typescript
// src/lib/validators/__tests__/venue.test.ts
describe("createVenueSchema", () => {
  it("rejects empty name", () => {
    const result = createVenueSchema.safeParse({ name: "", location: "Makati", capacity: 100 });
    expect(result.success).toBe(false);
  });
});
```

### File Locations (relative to repo root)

- `convex/schema.ts` — add `venues` table
- `convex/venues.ts` — NEW: all venue queries and mutations
- `convex/venues.test.ts` — NEW: contract tests
- `src/lib/utils/constants.ts` — add `VENUE_AMENITIES`
- `src/lib/validators/venue.ts` — NEW: Zod schema
- `src/lib/validators/__tests__/venue.test.ts` — NEW: validator tests
- `src/components/custom/venue-form.tsx` — NEW: shared create/edit form
- `src/app/(dashboard)/dashboard/venues/page.tsx` — NEW: venue list page
- `src/app/(dashboard)/dashboard/venues/create/page.tsx` — NEW: create page
- `src/app/(dashboard)/dashboard/venues/[venueId]/edit/page.tsx` — NEW: edit page

### References

- Auth/role pattern: [convex/lib/auth.ts](convex/lib/auth.ts), [convex/lib/roles.ts](convex/lib/roles.ts)
- Existing `generateUploadUrl`: [convex/files.ts](convex/files.ts) — DO NOT modify; create separate venue upload mutation
- Image upload flow: [src/components/custom/image-upload.tsx](src/components/custom/image-upload.tsx) — reference for upload pattern
- `validateImageFile`: [src/lib/validators/image-upload.ts](src/lib/validators/image-upload.ts)
- Convex schema: [convex/schema.ts](convex/schema.ts) — add venues table here
- Dashboard client page pattern: [src/app/(dashboard)/dashboard/events/[eventId]/page.tsx](src/app/(dashboard)/dashboard/events/[eventId]/page.tsx) — `useParams` + `useQuery` + `RoleGuard`
- Zod validator pattern: [src/lib/validators/event.ts](src/lib/validators/event.ts)
- `showSuccess` / `showErrorFromCatch`: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- Photo URL resolution with `Promise.all`: [convex/events.ts](convex/events.ts) — `getPublicEventDetailPage` query

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- All 7 tasks implemented. 698 tests passing (48 test files), +50 new tests vs baseline of 648. Zero regressions.
- `convex/schema.ts` updated with `venues` table; no changes to existing tables.
- `convex/venues.ts` exports 8 functions: `generateVenuePhotoUploadUrl`, `createVenue`, `updateVenue`, `addVenuePhoto`, `removeVenuePhoto`, `deleteVenuePhotoUpload`, `getVenuesByManager`, `getVenueById`.
- Two-phase photo upload implemented: create mode collects `pendingStorageIds` locally before form submit; edit mode calls `addVenuePhoto`/`removeVenuePhoto` mutations immediately.
- Separate `generateVenuePhotoUploadUrl` mutation added (not reusing `files.ts`) because `files.ts` restricts to creator roles only.
- `z.coerce.number().int()` used in validator schema to handle string-to-number coercion from HTML number inputs.
- `VenueCard` and `VenueCardSkeleton` helper components co-located in `venue-form.tsx` and exported for use by the venues list page.
- `MAX_VENUE_PHOTOS = 8` constant added to `constants.ts` alongside `VENUE_AMENITIES`.
- **Code review fixes applied:**
  - [H1] `removeVenuePhoto` now verifies `storageId` is in `venue.photoStorageIds` before calling `ctx.storage.delete()` — prevents cross-venue file deletion.
  - [H2] Added `deleteVenuePhotoUpload` mutation; `venue-form.tsx` calls it when removing a photo in create mode and on component unmount if form was abandoned without submitting.
  - [M1] Blob URLs revoked via `URL.revokeObjectURL()` when photos are removed in both create and edit modes.
  - [M2] Added null-check on `storageId` from upload response before use.
  - [M3] Removed `undefined as unknown as number` type-hack from `capacity` defaultValue.
  - [L1] Added comment to `convex/venues.ts:MAX_VENUE_PHOTOS` noting it must stay in sync with `src/lib/utils/constants.ts`.
- Final test count: 703 passing (48 files), zero regressions.

### File List

**New files:**
- `convex/venues.ts` (added `deleteVenuePhotoUpload` mutation during code review)
- `convex/venues.test.ts`
- `src/lib/validators/venue.ts`
- `src/lib/validators/__tests__/venue.test.ts`
- `src/components/custom/venue-form.tsx`
- `src/app/(dashboard)/dashboard/venues/page.tsx`
- `src/app/(dashboard)/dashboard/venues/create/page.tsx`
- `src/app/(dashboard)/dashboard/venues/[venueId]/edit/page.tsx`

**Modified files:**
- `convex/schema.ts` — added `venues` table
- `src/lib/utils/constants.ts` — added `VENUE_AMENITIES` and `MAX_VENUE_PHOTOS`
