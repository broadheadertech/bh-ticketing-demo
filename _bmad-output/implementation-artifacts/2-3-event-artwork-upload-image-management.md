# Story 2.3: Event Artwork Upload & Image Management

Status: done

## Story

As a **creator**,
I want to upload event artwork and banner images,
So that my event listing looks professional and attracts attendees.

## Acceptance Criteria

1. **Given** I am editing a draft event **When** I navigate to the artwork upload section **Then** I see a drag-and-drop zone or file picker to upload an image (FR10)
2. **Given** I select a file to upload **When** the file is valid (JPEG, PNG, WebP; max 5MB) **Then** the file uploads to Convex file storage (FR48) **And** the storage ID is saved to the event record **And** a preview of the uploaded image is shown
3. **Given** I upload an invalid file (wrong type or >5MB) **When** client-side validation fails **Then** a descriptive error message is shown **And** the upload is rejected before sending to storage (NFR16)
4. **Given** an event has artwork **When** it is displayed on event cards or the event detail section **Then** the image is served via Convex storage URL **And** rendered with `next/image` using 16:9 aspect ratio for CLS prevention (NFR20, FR49)
5. **Given** I want to change artwork **When** I upload a new image **Then** the old storage file is deleted and the new storage ID replaces it
6. **Given** I skip artwork upload **When** no image is provided **Then** a default placeholder is shown on event cards

## Tasks / Subtasks

- [x] **Task 1: Update schema — change `artworkUrl` to `artworkStorageId`** (AC: #2)
  - [x]1.1 In `convex/schema.ts`, change the events table field `artworkUrl: v.optional(v.string())` to `artworkStorageId: v.optional(v.id("_storage"))`. This is the correct Convex pattern — store the storage ID, generate URLs at query time.
  - [x]1.2 Run `npx convex dev` or check that `convex/_generated` types update correctly after schema change.

- [x] **Task 2: Create Convex file upload utilities** (AC: #2, #5)
  - [x]2.1 Create `convex/files.ts` with:
    - `generateUploadUrl` mutation: Uses `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])`. Calls `ctx.storage.generateUploadUrl()` and returns the URL. This is a standard Convex pattern — the client gets a presigned URL to POST the file to.
    - `deleteFile` mutation (internal helper): Accepts a storage ID, calls `ctx.storage.delete(storageId)`. Used when replacing artwork.
  - [x]2.2 Update `convex/_generated/api.d.ts` to add `files` module import.

- [x] **Task 3: Update events mutations and queries for artwork** (AC: #2, #4, #5)
  - [x]3.1 In `convex/events.ts`, add `artworkStorageId: v.optional(v.id("_storage"))` to `createEvent` mutation args. Store it on the event record.
  - [x]3.2 Create `updateEventArtwork` mutation in `convex/events.ts`:
    - Args: `eventId: v.id("events")`, `artworkStorageId: v.id("_storage")`
    - Auth: `getAuthenticatedUser` + `requireAnyRole(user, ["artist", "organization"])`, verify ownership + draft status
    - If event already has an `artworkStorageId`, delete the old file via `ctx.storage.delete(oldId)`
    - Update event record with new `artworkStorageId` and `updatedAt`
  - [x]3.3 Create `removeEventArtwork` mutation in `convex/events.ts`:
    - Args: `eventId: v.id("events")`
    - Auth: same as above
    - Delete the storage file, set `artworkStorageId` to `undefined` on event
  - [x]3.4 In `getEventById` and `getMyEvents` queries, generate the artwork URL from storage ID using `ctx.storage.getUrl(event.artworkStorageId)` and return it as `artworkUrl` alongside the event data.

- [x] **Task 4: Create image upload validator** (AC: #3)
  - [x]4.1 Create `src/lib/validators/image-upload.ts` with constants and validation:
    - `ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]`
    - `MAX_IMAGE_SIZE_MB = 5`
    - `MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024`
    - `validateImageFile(file: File): { valid: boolean; error?: string }` — checks type and size
  - [x]4.2 Create `src/lib/validators/__tests__/image-upload.test.ts` — test valid JPEG, PNG, WebP pass; invalid type (GIF, PDF) fails; oversized file fails; edge case exactly 5MB passes

- [x] **Task 5: Build ImageUpload component** (AC: #1, #2, #3, #5, #6)
  - [x]5.1 Create `src/components/custom/image-upload.tsx` — "use client" component:
    - Props: `eventId: string`, `currentImageUrl?: string | null`, `onUploadComplete?: (storageId: string) => void`
    - Dropzone area: dashed border, accepts drag-and-drop or click-to-select
    - On file select: validate with `validateImageFile()`, show error toast if invalid
    - Upload flow: call `generateUploadUrl` mutation, POST file to returned URL, extract storage ID from response, call `updateEventArtwork` mutation with storage ID
    - Show upload progress indicator (use state: idle → uploading → complete)
    - Preview: show uploaded image in 16:9 aspect ratio container (`aspect-video`)
    - Remove button: calls `removeEventArtwork`, clears preview
    - If `currentImageUrl` provided, show it as initial preview with option to replace
    - Use `showSuccess` and `showErrorFromCatch` from toast-helpers
    - Icons: `ImagePlus`, `X`, `Upload` from lucide-react
  - [x]5.2 The component should handle the entire upload lifecycle independently — it is a self-contained upload widget, not part of the wizard form state

- [x] **Task 6: Integrate artwork upload into event workflow** (AC: #1, #6)
  - [x]6.1 Create `src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx` — standalone artwork upload page:
    - Uses `useParams` to get eventId, `useQuery(api.events.getEventById)` to load event
    - Shows loading skeleton, error state (via error.tsx boundary)
    - Renders `ImageUpload` component with eventId and current artwork URL
    - Wraps with `RoleGuard`
    - Back link to `/dashboard/events`
    - `useEffect` for `document.title = "Upload Artwork | PHLive"`
  - [x]6.2 Create `src/app/(dashboard)/dashboard/events/[eventId]/artwork/loading.tsx` — skeleton
  - [x]6.3 In `src/app/(dashboard)/dashboard/events/page.tsx`, add an "Upload Artwork" link/button alongside "Configure Tickets" for each event card. Use `ImagePlus` icon.

- [x] **Task 7: Configure next/image for Convex storage** (AC: #4)
  - [x]7.1 Update `next.config.ts` to add Convex file storage domain to `images.remotePatterns`:
    ```typescript
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "**.convex.cloud" },
      ],
    },
    ```
  - [x]7.2 In event cards and the artwork preview, use `next/image` with `width`, `height`, and `alt` props for CLS prevention. Use `aspect-video` (16:9) container.

- [x] **Task 8: Write component tests** (AC: #1-6)
  - [x]8.1 Create `src/components/custom/__tests__/image-upload.test.tsx`:
    - Test: renders dropzone with upload prompt
    - Test: shows current image preview when `currentImageUrl` provided
    - Test: shows remove button when image exists
    - Test: validates file type on selection (mock File object)
    - Test: validates file size on selection
    - NOTE: Do NOT test actual upload flow (requires Convex runtime). Test rendering and validation only.
  - [x]8.2 Create `convex/files.test.ts` with contract tests for the upload/delete patterns (similar pattern to ticketTiers.test.ts)

- [x]**Task 9: Final validation**
  - [x]9.1 Run `pnpm build` — must succeed
  - [x]9.2 Run `pnpm test:run` — all tests pass
  - [x]9.3 Run `pnpm lint` — no new errors

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — Has `users`, `creatorProfiles`, `events`, `ticketTiers` tables. **MODIFY** events table to change `artworkUrl` → `artworkStorageId`.
- `convex/events.ts` — Has `createEvent`, `getMyEvents`, `getEventById`. **MODIFY** to add artwork fields and mutations.
- `convex/_generated/api.d.ts` — Has users, creatorProfiles, events, http, ticketTiers modules. **MODIFY** to add files module.
- `convex/lib/auth.ts` — `getAuthenticatedUser(ctx)`. **REUSE**.
- `convex/lib/roles.ts` — `requireAnyRole(user, roles[])`. **REUSE**.
- `src/lib/utils/toast-helpers.ts` — `showSuccess(msg)`, `showErrorFromCatch(error)`. **REUSE**.
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatDate()`. **REUSE** if needed.
- `src/components/custom/role-guard.tsx` — `<RoleGuard>`. **REUSE**.
- `src/components/ui/` — All shadcn components. **REUSE**.
- `src/app/(dashboard)/dashboard/events/page.tsx` — Events list with "Configure Tickets" links. **MODIFY** to add "Upload Artwork" link.
- `next.config.ts` — Currently empty config. **MODIFY** to add image domains.

### Architecture Compliance

**Image Storage: Convex File Storage (NOT Vercel Blob)**

The architecture doc explicitly states:
> "File storage: Convex file storage (replaces Vercel Blob)"
> "User uploads: Convex file storage (storage URLs stored in DB)"

The epics file references "Vercel Blob" but the architecture overrides this. Use **Convex file storage** exclusively.

**Convex File Upload Pattern:**
1. Client calls `generateUploadUrl` mutation → gets presigned upload URL
2. Client POSTs file to that URL → gets back a `storageId`
3. Client calls `updateEventArtwork` mutation with `storageId` → saves to DB
4. To serve: query calls `ctx.storage.getUrl(storageId)` → returns CDN URL

**Schema Change — `artworkUrl` → `artworkStorageId`:**
The current schema has `artworkUrl: v.optional(v.string())`. This should change to `artworkStorageId: v.optional(v.id("_storage"))` to use the proper Convex file storage type. The generated URL is ephemeral and should be computed at query time, not stored.

**Image Validation (from NFR16):**
- Accepted types: JPEG, PNG, WebP
- Max size: 5MB
- Validate client-side BEFORE upload to avoid unnecessary bandwidth

**Image Display (from NFR20, UX spec):**
- Use `next/image` for all event artwork
- 16:9 aspect ratio (`aspect-video` class)
- Lazy-loaded with blur placeholder
- `alt="[Event name] event artwork"`

**Authorization Pattern (same as all creator mutations):**
- `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])`
- Verify `event.creatorId === user._id`
- Verify `event.status === "draft"` for write operations

### UX Requirements

**Artwork Upload Component (from UX spec):**
- Drag-and-drop zone or click-to-select
- Upload progress bar during upload
- Preview in 16:9 aspect ratio after upload
- "Replace" and "Remove" actions on existing artwork
- If skipped: default placeholder shown on event cards
- Warning toast pattern: "Event has no artwork — attendees may skip it"

**EventCard Image Display (from UX spec):**
- Event artwork image at top of card (16:9 aspect ratio, lazy-loaded, blur placeholder)
- Date badge overlay (top-left, absolute positioned)
- `alt` text: "[Event name] event artwork"
- If no artwork: show a neutral placeholder (gradient or icon)

**Upload is a Separate Page (not wizard step):**
The artwork upload is NOT embedded in the create-event wizard. It's a standalone page at `/dashboard/events/[eventId]/artwork` — similar to how ticket tiers are at `/dashboard/events/[eventId]/tickets`. This keeps the wizard simple (create event → draft) and lets creators add artwork anytime.

### Key Decisions

- **Convex file storage over Vercel Blob** — Architecture decision. Integrated with backend, no additional service, included in Convex plan.
- **Store storage ID, not URL** — `artworkStorageId: v.id("_storage")` instead of `artworkUrl: v.string()`. URLs can change; storage IDs are stable. Generate URLs at query time.
- **Separate artwork page** — Artwork upload is at `/dashboard/events/[eventId]/artwork`, not embedded in the wizard. Creator creates event first (draft), then adds artwork/tickets separately.
- **Self-contained ImageUpload component** — Handles the full upload lifecycle (validate → upload → save → preview). Not tied to form state.
- **Delete old file on replace** — When uploading new artwork, delete the old storage file to avoid orphaned files.
- **Client-side validation first** — Validate type and size before uploading to save bandwidth and improve UX.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex domain files: `convex/` (camelCase files, e.g., `files.ts`)
- Validators: `src/lib/validators/` (kebab-case files, e.g., `image-upload.ts`)
- Route pages: `src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx`
- Tests co-located: `__tests__/` subdirectory with `.test.tsx` suffix

### Environment Variables Needed

No new environment variables needed. Convex file storage is built into the Convex platform.

### Project Structure Notes

Files to create:
```
convex/files.ts                                                # CREATE: File upload utilities
convex/files.test.ts                                           # CREATE: File upload contract tests
src/lib/validators/image-upload.ts                             # CREATE: Image validation
src/lib/validators/__tests__/image-upload.test.ts              # CREATE: Image validation tests
src/components/custom/image-upload.tsx                          # CREATE: ImageUpload component
src/components/custom/__tests__/image-upload.test.tsx           # CREATE: Component tests
src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx   # CREATE: Artwork upload page
src/app/(dashboard)/dashboard/events/[eventId]/artwork/loading.tsx # CREATE: Loading skeleton
```

Files to modify:
```
convex/schema.ts                                               # MODIFY: Change artworkUrl → artworkStorageId
convex/events.ts                                               # MODIFY: Add artwork mutations, update queries
convex/_generated/api.d.ts                                     # MODIFY: Add files module
src/app/(dashboard)/dashboard/events/page.tsx                  # MODIFY: Add "Upload Artwork" link
next.config.ts                                                 # MODIFY: Add Convex image domains
```

### Previous Story Learnings

From Story 2.2 (most recent):
- **Relative import paths**: Page components deep in `(dashboard)` route group need careful counting of `../` levels for convex imports. Count directory depth precisely.
- **Zod v4 API**: Use `z.number({ error: "..." })` not `{ required_error, invalid_type_error }`.
- **Convex ID type workaround**: `Id` type not directly importable from generated code. Use `as any` cast for Convex ID arguments from URL params with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment.
- **ConvexError handling**: Convex queries that throw `ConvexError` are caught by `error.tsx` boundary. Don't add dead `event === null` branches for queries that throw instead.
- **Client component metadata**: Use `useEffect(() => { document.title = "..." }, [])` for page titles in client components.
- **Toast helpers**: Use `showSuccess()` and `showErrorFromCatch()` from `@/lib/utils/toast-helpers`.
- **Price precision**: Truncate decimal input before floating-point conversion.

From Story 2.1:
- **Form data preservation**: Pass previous data as `defaultValues` or `initialData` props.
- **Convex auth pattern**: `getAuthenticatedUser(ctx)` + `requireAnyRole(user, ["artist", "organization"])` in every mutation/query.

From Story 1.4:
- **react-hook-form tests hang in jsdom** — Test rendering/interaction only, not full form submission.
- **Test mocking pattern**: Mock `convex/react` with `useQuery`/`useMutation`. Mock `sonner` as `{ toast: { success: vi.fn(), error: vi.fn() } }`.

### Dependencies to Verify

No new npm dependencies needed. Convex file storage is built into the `convex` package. `next/image` is built into Next.js.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.3 - Event artwork upload with BDD acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md - FR10: Upload event artwork, FR48: Image upload to cloud storage, FR49: Image optimization]
- [Source: _bmad-output/planning-artifacts/architecture.md - "File storage: Convex file storage (replaces Vercel Blob)"]
- [Source: _bmad-output/planning-artifacts/architecture.md - Data Architecture: events table with artwork_url field]
- [Source: _bmad-output/planning-artifacts/architecture.md - Image Storage: Convex File Storage section]
- [Source: _bmad-output/planning-artifacts/architecture.md - Gap Analysis: Image optimization config for next.config.ts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - EventCard anatomy: 16:9 aspect ratio, lazy-loaded, blur placeholder]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Creator flow Step 5: Upload artwork, auto-optimize, show preview]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Responsive: aspect-video for event artwork]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build failed due to `storageId` property name mismatch — `updateEventArtwork` expects `artworkStorageId`, not `storageId`. Fixed in image-upload.tsx.

### Completion Notes List

- All 9 tasks completed. 207 tests pass after code review fixes.
- Build, lint, and tests all pass clean.
- Used Convex file storage pattern (not Vercel Blob) per architecture override.

### Code Review Fixes Applied (2026-03-07)

- **H1**: Removed `deleteFile` mutation from `convex/files.ts` — was publicly exposed without ownership verification (security vulnerability) and unused dead code. All file deletion is correctly handled inline in `updateEventArtwork`/`removeEventArtwork`.
- **M1**: Fixed blob URL memory leak in `image-upload.tsx` — added `blobUrlRef` to track and revoke blob URLs on replace, remove, and unmount.
- **M2**: Added `eventTitle` prop to `ImageUpload` component — alt text now follows UX spec: `"[Event name] event artwork"`. Artwork page passes `event.title`.
- **M3/M4**: Added artwork thumbnail display and placeholder to dashboard event cards — events with artwork show `next/image` in 16:9 aspect ratio; events without artwork show `ImageOff` placeholder icon.
- **L1**: Moved `updateEventArtwork`/`removeEventArtwork` contract tests from `files.test.ts` to `events.test.ts` for proper co-location. Removed deleted `deleteFile` tests.

### Change Log

- `convex/schema.ts` — Changed `artworkUrl: v.optional(v.string())` to `artworkStorageId: v.optional(v.id("_storage"))`
- `convex/files.ts` — CREATED: `generateUploadUrl` mutation (deleteFile removed in code review)
- `convex/events.ts` — Added `updateEventArtwork`, `removeEventArtwork` mutations; updated `getMyEvents` and `getEventById` to resolve storage URLs
- `convex/events.test.ts` — Added artwork mutation contract tests (6 tests)
- `convex/_generated/api.d.ts` — Added `files` module import
- `src/lib/validators/image-upload.ts` — CREATED: Image file validation (type + size)
- `src/lib/validators/__tests__/image-upload.test.ts` — CREATED: 10 validation tests
- `src/components/custom/image-upload.tsx` — CREATED: Self-contained drag-and-drop upload component with blob URL cleanup and eventTitle prop
- `src/components/custom/__tests__/image-upload.test.tsx` — CREATED: 9 component render/validation tests
- `src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx` — CREATED: Artwork upload page (passes eventTitle)
- `src/app/(dashboard)/dashboard/events/[eventId]/artwork/loading.tsx` — CREATED: Skeleton loading
- `src/app/(dashboard)/dashboard/events/page.tsx` — Added artwork thumbnail/placeholder display and "Upload Artwork" button
- `next.config.ts` — Added `images.remotePatterns` for `**.convex.cloud`
- `convex/files.test.ts` — CREATED: 2 contract tests for generateUploadUrl

### File List

**Created:**
- `convex/files.ts`
- `convex/files.test.ts`
- `src/lib/validators/image-upload.ts`
- `src/lib/validators/__tests__/image-upload.test.ts`
- `src/components/custom/image-upload.tsx`
- `src/components/custom/__tests__/image-upload.test.tsx`
- `src/app/(dashboard)/dashboard/events/[eventId]/artwork/page.tsx`
- `src/app/(dashboard)/dashboard/events/[eventId]/artwork/loading.tsx`

**Modified:**
- `convex/schema.ts`
- `convex/events.ts`
- `convex/events.test.ts`
- `convex/_generated/api.d.ts`
- `src/app/(dashboard)/dashboard/events/page.tsx`
- `next.config.ts`
