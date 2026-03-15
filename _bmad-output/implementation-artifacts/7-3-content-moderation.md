# Story 7.3: Content Moderation

Status: done

## Story

As an **admin**,
I want to review events and take moderation actions,
so that I can maintain platform quality and trust.

## Acceptance Criteria

1. **AC1 — Moderation page:** Navigating to `/dashboard/admin/moderation` requires `admin` active role (via `RoleGuard`). The page shows a table of all events with columns: title, creator name, event type, status, moderation status, date, created at. Sortable by creation date. Filterable by event status and moderation status.

2. **AC2 — Review event details:** Clicking "View Details" on an event opens a dialog showing full event details: title, description, event type, date/time, venue, creator name/email, current status, moderation status, and creation date.

3. **AC3 — Unpublish event:** Admin can unpublish a published event. Clicking "Unpublish" shows a confirmation dialog requiring a reason (textarea). On confirm, the event status changes to `"draft"`, `moderationReason` is stored on the event, and `moderationStatus` is set to `"flagged"`. An audit log entry is created with action `"admin.event_unpublished"`, target type `"event"`, and metadata `{ reason }`.

4. **AC4 — Approve event:** Admin can approve a published event. Clicking "Approve" marks `moderationStatus` as `"approved"`. An audit log entry is created with action `"admin.event_approved"`.

5. **AC5 — Contract tests:** Pure contract tests validate admin role authorization, event list return shape, unpublish logic (status change, reason storage, audit log), approve logic (moderation status change, audit log), and moderation status filtering.

## Tasks / Subtasks

- [x] Task 1: Schema update — add moderation fields to events table (AC: 3, 4)
  - [x] 1.1 Add `moderationStatus` (`v.optional(v.string())`) and `moderationReason` (`v.optional(v.string())`) to `events` table in `convex/schema.ts`. No new indexes needed (admin queries do full table scans).

- [x] Task 2: Backend queries and mutations (AC: 1, 2, 3, 4)
  - [x] 2.1 Add `listEventsForModeration` query to `convex/admin.ts` — requires admin role. Collects all events, joins with creator user (name, email) via `ctx.db.get(event.creatorId)`. Returns explicit fields: `_id`, `title`, `eventType`, `date`, `time`, `venueName`, `status`, `moderationStatus`, `moderationReason`, `createdAt`, `creatorName`, `creatorEmail`.
  - [x] 2.2 Add `getEventForModeration` query to `convex/admin.ts` — requires admin role. Takes `eventId: v.id("events")`. Returns full event details + creator info. Returns null if event not found.
  - [x] 2.3 Add `adminUnpublishEvent` mutation to `convex/admin.ts` — requires admin role. Takes `eventId: v.id("events")`, `reason: v.string()`. Throws if event not found. Throws if event status is not `"published"`. Sets `status: "draft"`, `moderationStatus: "flagged"`, `moderationReason: reason`, `updatedAt: Date.now()`. Creates audit log entry with action `"admin.event_unpublished"` and metadata `{ reason }`.
  - [x] 2.4 Add `adminApproveEvent` mutation to `convex/admin.ts` — requires admin role. Takes `eventId: v.id("events")`. Throws if event not found. Sets `moderationStatus: "approved"`, `updatedAt: Date.now()`. Creates audit log entry with action `"admin.event_approved"`.

- [x] Task 3: Admin moderation page (AC: 1, 2, 3, 4)
  - [x] 3.1 Create `src/app/(dashboard)/dashboard/admin/moderation/page.tsx` — `"use client"`, wrap in `<RoleGuard requiredRoles={["admin"]}>`. Uses `useQuery(api.admin.listEventsForModeration)`.
  - [x] 3.2 Render filter controls: event status dropdown (`All`, `Draft`, `Published`, `Cancelled`), moderation status dropdown (`All`, `Unreviewed`, `Approved`, `Flagged`). Client-side filtering.
  - [x] 3.3 Render a table with columns: Title, Creator, Type, Status (badge), Moderation (badge), Date, Created. Sort by `createdAt` descending by default. Show skeleton loading state. Show empty state when no events match filters.
  - [x] 3.4 Add "View Details" button per row. Opens a `Dialog` showing full event details + creator info + moderation reason (if flagged).
  - [x] 3.5 Add "Unpublish" button (only for published events). Opens `AlertDialog` with reason `Textarea`. On confirm, calls `adminUnpublishEvent` mutation with reason. Shows success/error toast. Track `isPending` state to disable button during mutation.
  - [x] 3.6 Add "Approve" button (only for published events without `"approved"` moderation status). Calls `adminApproveEvent` mutation. Shows success toast. Track `isPending` state.

- [x] Task 4: Contract tests (AC: 5)
  - [x] 4.1 Append tests to `convex/admin.test.ts`: admin role authorization for `listEventsForModeration`, `adminUnpublishEvent`, `adminApproveEvent` (rejects non-admin roles).
  - [x] 4.2 Test event list return shape includes required fields (title, creatorName, creatorEmail, moderationStatus, etc.).
  - [x] 4.3 Test unpublish logic: only published events can be unpublished, status changes to draft, moderationStatus set to flagged, reason stored, audit log shape correct.
  - [x] 4.4 Test approve logic: moderationStatus set to approved, audit log shape correct.
  - [x] 4.5 Test moderation status filtering logic (unreviewed = undefined, approved, flagged).

## Dev Notes

### Schema Change — Add moderation fields to events

Add two optional fields to the existing `events` table in `convex/schema.ts`:

```typescript
events: defineTable({
  // ... existing fields ...
  moderationStatus: v.optional(v.string()), // undefined | "approved" | "flagged"
  moderationReason: v.optional(v.string()), // reason for admin unpublish
  // ... rest of fields ...
})
```

Do NOT add new indexes — admin queries use full table scans (established pattern). Do NOT add a new table — moderation state belongs on the event.

### Backend Pattern — Extend convex/admin.ts

Add new queries and mutations to the EXISTING `convex/admin.ts` file. The `logAuditEvent` helper already exists in this file from Story 7.2.

```typescript
export const listEventsForModeration = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allEvents = await ctx.db.query("events").collect();

    // Join with creator user for name/email
    const eventsWithCreator = await Promise.all(
      allEvents.map(async (event) => {
        const creator = await ctx.db.get(event.creatorId);
        return {
          _id: event._id,
          title: event.title,
          eventType: event.eventType,
          date: event.date,
          time: event.time,
          venueName: event.venueName,
          status: event.status,
          moderationStatus: event.moderationStatus,
          moderationReason: event.moderationReason,
          createdAt: event.createdAt,
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "Unknown",
        };
      })
    );

    return eventsWithCreator;
  },
});
```

### Mutation Pattern — adminUnpublishEvent

```typescript
export const adminUnpublishEvent = mutation({
  args: {
    eventId: v.id("events"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.status !== "published") {
      throw new ConvexError("Only published events can be unpublished");
    }

    await ctx.db.patch(args.eventId, {
      status: "draft",
      moderationStatus: "flagged",
      moderationReason: args.reason,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.event_unpublished",
      targetType: "event",
      targetId: args.eventId,
      metadata: { reason: args.reason },
    });
  },
});
```

### Mutation Pattern — adminApproveEvent

```typescript
export const adminApproveEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");

    await ctx.db.patch(args.eventId, {
      moderationStatus: "approved",
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.event_approved",
      targetType: "event",
      targetId: args.eventId,
    });
  },
});
```

### Dashboard Page Pattern

Follow the same pattern as `src/app/(dashboard)/dashboard/admin/users/page.tsx`:

```typescript
// src/app/(dashboard)/dashboard/admin/moderation/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "@/lib/utils/constants";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Shield } from "lucide-react";
```

### Moderation Status Badge Colors

```typescript
// Moderation status badge rendering:
function moderationBadge(status: string | undefined) {
  if (!status) return <Badge variant="outline">Unreviewed</Badge>;
  if (status === "approved") return <Badge variant="default">Approved</Badge>;
  if (status === "flagged") return <Badge variant="destructive">Flagged</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
```

### UI Components — Already Exist

These shadcn/ui components are already installed:
- `Table` and subcomponents — from `@/components/ui/table`
- `AlertDialog` and subcomponents — from `@/components/ui/alert-dialog`
- `Dialog` and subcomponents — from `@/components/ui/dialog`
- `Select` and subcomponents — from `@/components/ui/select`
- `Textarea` — from `@/components/ui/textarea`
- `Badge`, `Button`, `Skeleton`, `Input` — from `@/components/ui`

### Previous Story Learnings (from 7.1, 7.2)

- **Admin queries use full table scans** — acceptable pattern
- **RoleGuard wraps page content** — prevents non-admin from seeing the UI
- **useQuery returns undefined while loading** — show Skeleton loading state
- **isPending state on mutation buttons** — prevents double-click (fix from 7.2 review)
- **logAuditEvent helper exists** — reuse from 7.2, do NOT recreate
- **Deduplicate arrays** — validate input integrity (lesson from 7.2 H1)
- **Contract tests are pure** — no Convex runtime, test business logic only
- **Append to existing test file** — `convex/admin.test.ts` already has 32 tests
- **formatDate() for timestamps** — use for dates, formatDateTime() for detailed view
- **EVENT_STATUS_LABELS and EVENT_TYPE_LABELS** — use for display names in UI
- **Return explicit fields** — do NOT spread `{ ...event }` (leaks internal fields)

### Auth Pattern

| Query/Mutation | Auth | Role Check | Notes |
|---|---|---|---|
| `listEventsForModeration` | Required | `admin` | Full table scan + creator join |
| `getEventForModeration` | Required | `admin` | Single event + creator join |
| `adminUnpublishEvent` | Required | `admin` | Only published events, stores reason, audit logged |
| `adminApproveEvent` | Required | `admin` | Sets moderationStatus, audit logged |

### References

- Admin dashboard (pattern): [src/app/(dashboard)/dashboard/admin/page.tsx](src/app/(dashboard)/dashboard/admin/page.tsx)
- Admin users page (pattern): [src/app/(dashboard)/dashboard/admin/users/page.tsx](src/app/(dashboard)/dashboard/admin/users/page.tsx)
- Admin queries (extend this file): [convex/admin.ts](convex/admin.ts)
- Admin tests (append to this file): [convex/admin.test.ts](convex/admin.test.ts)
- Event mutations (reference): [convex/events.ts](convex/events.ts)
- Schema: [convex/schema.ts](convex/schema.ts)
- Role utilities: [convex/lib/roles.ts](convex/lib/roles.ts)
- Auth utilities: [convex/lib/auth.ts](convex/lib/auth.ts)
- Format utilities: [src/lib/utils/format.ts](src/lib/utils/format.ts)
- Constants: [src/lib/utils/constants.ts](src/lib/utils/constants.ts)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- RoleGuard: [src/components/custom/role-guard.tsx](src/components/custom/role-guard.tsx)
- Sidebar nav (admin moderation link): [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx) lines 51-56

### File Locations

**New files:**
- `src/app/(dashboard)/dashboard/admin/moderation/page.tsx` — Admin moderation page

**Modified files:**
- `convex/schema.ts` — Add `moderationStatus` and `moderationReason` to events table
- `convex/admin.ts` — Add `listEventsForModeration`, `getEventForModeration`, `adminUnpublishEvent`, `adminApproveEvent`
- `convex/admin.test.ts` — Append contract tests for moderation operations

**Existing files to reuse (DO NOT modify):**
- `src/components/custom/role-guard.tsx` — RoleGuard component
- `src/components/custom/sidebar-nav.tsx` — Admin nav already has "Moderation" link
- `convex/lib/roles.ts` — `requireRole()`, `VALID_ROLES`
- `convex/lib/auth.ts` — `getAuthenticatedUser()`
- `src/lib/utils/format.ts` — `formatDate()`, `formatDateTime()`
- `src/lib/utils/constants.ts` — `EVENT_STATUS_LABELS`, `EVENT_TYPE_LABELS`
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showErrorFromCatch()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `moderationStatus` and `moderationReason` optional fields to events table in schema
- Task 2: Added 4 new exports to `convex/admin.ts`: `listEventsForModeration` (query with creator join), `getEventForModeration` (single event query), `adminUnpublishEvent` (sets draft + flagged + reason + audit log), `adminApproveEvent` (sets approved + audit log)
- Task 3: Created moderation page with event status and moderation status filters (Select dropdowns), event table sorted by createdAt desc, details dialog, unpublish dialog with reason textarea, approve button. All mutations have isPending loading state.
- Task 4: Added 13 contract tests covering authorization, return shape, unpublish logic, approve logic, and moderation status filtering. Total: 45 tests in admin.test.ts.
- All 812 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): added description to list query and details dialog, validated empty reason in backend, switched to per-event pending state.

### Change Log

- 2026-03-14: Story 7.3 implementation complete — schema, backend, UI, and contract tests
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1: added `description` to `listEventsForModeration` return and details dialog (AC2 compliance). M1: added empty reason validation in `adminUnpublishEvent`. M2: replaced global `isPending` with per-event `pendingId` tracking.

### File List

**New files:**
- `src/app/(dashboard)/dashboard/admin/moderation/page.tsx`

**Modified files:**
- `convex/schema.ts` — added `moderationStatus` and `moderationReason` to events table
- `convex/admin.ts` — added `listEventsForModeration`, `getEventForModeration`, `adminUnpublishEvent`, `adminApproveEvent`
- `convex/admin.test.ts` — added 13 contract tests for content moderation
