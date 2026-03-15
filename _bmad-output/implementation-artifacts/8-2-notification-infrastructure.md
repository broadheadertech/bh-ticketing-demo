# Story 8.2: Notification Infrastructure

Status: done

## Story

As a **user**,
I want to receive in-app notifications,
so that I know about important updates without checking manually.

## Acceptance Criteria

1. **AC1 — Notifications table:** The `notifications` table stores: `userId` (v.id("users")), `type` (v.string()), `title` (v.string()), `message` (v.string()), `entityType` (v.optional(v.string())), `entityId` (v.optional(v.string())), `read` (v.boolean()), `createdAt` (v.number()). Indexes: `by_user` on `[userId]`, `by_user_read` on `[userId, read]`. Notifications appear in real-time via Convex reactive query.

2. **AC2 — Notification bell:** On any dashboard page, a notification bell icon appears in the header (topbar). When the user has unread notifications, the bell shows an unread count badge. The bell is only visible to authenticated users.

3. **AC3 — Notification panel:** Clicking the bell opens a dropdown panel showing recent notifications (up to 20) sorted by date desc. Unread notifications have a highlighted background. A "Mark all as read" button clears all unread. Each notification shows title, message, and relative time.

4. **AC4 — Notification click navigation:** Clicking a notification with an associated entity navigates to the relevant public page (event detail, venue detail). The notification is automatically marked as read on click.

5. **AC5 — Contract tests:** Pure contract tests validate: auth required for queries/mutations, notification return shape, unread count computation, mark-as-read logic, and navigation URL generation.

## Tasks / Subtasks

- [x] Task 1: Schema update — add notifications table (AC: 1)
  - [x]1.1 Add `notifications` table to `convex/schema.ts` with fields: `userId` (v.id("users")), `type` (v.string()), `title` (v.string()), `message` (v.string()), `entityType` (v.optional(v.string())), `entityId` (v.optional(v.string())), `read` (v.boolean()), `createdAt` (v.number()). Indexes: `by_user` on `[userId]`, `by_user_read` on `[userId, read]`.

- [x] Task 2: Backend queries and mutations (AC: 1, 2, 3, 4)
  - [x]2.1 Create `convex/notifications.ts`. Add `getMyNotifications` query — requires auth. Returns up to 20 most recent notifications for the current user, sorted by `createdAt` desc. Returns explicit fields: `_id`, `type`, `title`, `message`, `entityType`, `entityId`, `read`, `createdAt`.
  - [x]2.2 Add `getUnreadCount` query — requires auth. Returns count of notifications where `userId === user._id` and `read === false`. Uses `by_user_read` index.
  - [x]2.3 Add `markAsRead` mutation — requires auth. Takes `notificationId: v.id("notifications")`. Sets `read: true`. Throws if notification not found or doesn't belong to user.
  - [x]2.4 Add `markAllAsRead` mutation — requires auth. Finds all unread notifications for user via `by_user_read` index, patches each to `read: true`.
  - [x]2.5 Add `createNotification` internal mutation (not exported as API) — takes `userId`, `type`, `title`, `message`, optional `entityType`/`entityId`. Inserts with `read: false`, `createdAt: Date.now()`. This will be called by Story 8.3 triggers.

- [x] Task 3: NotificationBell component (AC: 2, 3, 4)
  - [x]3.1 Create `src/components/custom/notification-bell.tsx` — `"use client"`. Uses `useQuery(api.users.getCurrentUser)` for auth guard (returns null if not auth'd). Uses `useQuery(api.notifications.getUnreadCount)` for badge.
  - [x]3.2 Render a Bell icon button. When unread count > 0, show a red badge with the count. Use Popover from shadcn/ui for the dropdown panel.
  - [x]3.3 Popover content: show `useQuery(api.notifications.getMyNotifications)` results. Each notification shows title (bold), message, relative time (e.g., "2h ago"). Unread items have a subtle background highlight. Empty state: "No notifications yet."
  - [x]3.4 "Mark all as read" button at top of popover. Calls `markAllAsRead` mutation with isPending state.
  - [x]3.5 Clicking a notification: calls `markAsRead` mutation, then navigates using `router.push()` to the entity's public page based on `entityType`/`entityId`. Navigation mapping: `event` → `/events/{entityId}`, `venue` → `/venues/{entityId}`, `creator` → `/events?creator={entityId}`.

- [x] Task 4: Integrate NotificationBell into dashboard header (AC: 2)
  - [x]4.1 Add `<NotificationBell />` to the topbar header in `src/components/layouts/dashboard-layout.tsx`. Position it to the right of the header using `ml-auto`.

- [x] Task 5: Install Popover component (AC: 3)
  - [x]5.1 Install shadcn Popover component: `npx shadcn@latest add popover`.

- [x] Task 6: Contract tests (AC: 5)
  - [x]6.1 Create `convex/notifications.test.ts`: auth required for all queries/mutations.
  - [x]6.2 Test notification return shape (all required fields present).
  - [x]6.3 Test unread count computation (counts only `read: false`).
  - [x]6.4 Test markAsRead logic (sets read to true, rejects wrong user's notification).
  - [x]6.5 Test markAllAsRead logic (patches all unread for user).
  - [x]6.6 Test navigation URL generation from entityType/entityId.

## Dev Notes

### Schema Change — notifications Table

```typescript
notifications: defineTable({
  userId: v.id("users"),
  type: v.string(),         // "new_event" | "event_cancelled" | "event_updated" | etc.
  title: v.string(),
  message: v.string(),
  entityType: v.optional(v.string()), // "event" | "venue" | "creator"
  entityId: v.optional(v.string()),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_read", ["userId", "read"]),
```

### Backend Pattern — convex/notifications.ts

```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entityType,
      entityId: n.entityId,
      read: n.read,
      createdAt: n.createdAt,
    }));
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();
    return unread.length;
  },
});
```

### createNotification — Internal Mutation

Use `internalMutation` so it's callable from other Convex functions but NOT exposed as a public API endpoint. Story 8.3 will call this from event triggers.

```typescript
export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});
```

### Popover Component — Needs Installation

`src/components/ui/popover.tsx` does NOT exist yet. Install via shadcn:

```bash
npx shadcn@latest add popover
```

### NotificationBell Component Pattern

```typescript
// src/components/custom/notification-bell.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Bell } from "lucide-react";
```

### Relative Time Display

Use a simple helper (no library needed):

```typescript
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

### Navigation URL Mapping

```typescript
function getNotificationHref(entityType?: string, entityId?: string): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "event") return `/events/${entityId}`;
  if (entityType === "venue") return `/venues/${entityId}`;
  if (entityType === "creator") return `/events?creator=${entityId}`;
  return null;
}
```

### Dashboard Layout Integration Point

**File:** `src/components/layouts/dashboard-layout.tsx`

The topbar header currently has:
- Mobile hamburger (Sheet trigger)
- Mobile "PHLive" text

Add `<NotificationBell />` with `ml-auto` to push it to the right:

```typescript
<header className="flex items-center gap-4 border-b bg-background px-6 py-4">
  {/* ... existing mobile hamburger ... */}
  <div className="ml-auto">
    <NotificationBell />
  </div>
</header>
```

### Previous Story Learnings (from 8.1)

- **Auth guard in components** — return null if `getCurrentUser` is null
- **isPending state** — track per mutation button
- **Entity existence check** — validate referenced entities exist (H1 fix from 8.1)
- **Consistent validation** — validate inputs in all mutations (M2 fix from 8.1)
- **Contract tests are pure** — no Convex runtime
- **Return explicit fields** — never spread records

### Auth Pattern

| Query/Mutation | Auth | Notes |
|---|---|---|
| `getMyNotifications` | Required | Up to 20, sorted desc |
| `getUnreadCount` | Required | Count via `by_user_read` index |
| `markAsRead` | Required | Owns the notification |
| `markAllAsRead` | Required | Only user's notifications |
| `createNotification` | Internal | Not exposed as API |

### References

- Dashboard layout (integration): [src/components/layouts/dashboard-layout.tsx](src/components/layouts/dashboard-layout.tsx)
- Follow button (component pattern): [src/components/custom/follow-button.tsx](src/components/custom/follow-button.tsx)
- Auth helpers: [convex/lib/auth.ts](convex/lib/auth.ts)
- Schema: [convex/schema.ts](convex/schema.ts)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)

### File Locations

**New files:**
- `convex/notifications.ts` — Notification queries, mutations, internal mutation
- `convex/notifications.test.ts` — Contract tests
- `src/components/custom/notification-bell.tsx` — NotificationBell component with popover
- `src/components/ui/popover.tsx` — Popover component (via shadcn)

**Modified files:**
- `convex/schema.ts` — Add `notifications` table
- `src/components/layouts/dashboard-layout.tsx` — Add NotificationBell to header

**Existing files to reuse (DO NOT modify):**
- `convex/lib/auth.ts` — `getAuthenticatedUser()`
- `convex/users.ts` — `getCurrentUser` query
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showErrorFromCatch()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `notifications` table to schema with `by_user` and `by_user_read` indexes.
- Task 2: Created `convex/notifications.ts` with 5 functions: `getMyNotifications` (top 20 desc), `getUnreadCount` (via index), `markAsRead`, `markAllAsRead`, `createNotification` (internalMutation for 8.3 triggers).
- Task 3: Created NotificationBell component with Popover dropdown, unread badge (red, caps at 99+), relative time display, mark-all-read button, click-to-navigate with markAsRead. Auth-guarded.
- Task 4: Integrated NotificationBell into dashboard header with `ml-auto` positioning.
- Task 5: Installed shadcn Popover component.
- Task 6: Created 19 contract tests covering auth, return shape, unread count, markAsRead/markAllAsRead logic, navigation URL generation.
- All 862 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): skip queries for unauth'd users, lazy-load notifications only when popover open, explicit field insertion in createNotification.

### Change Log

- 2026-03-14: Story 8.2 implementation complete
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1: notification queries skip when user not loaded (prevents server errors). M1: `getMyNotifications` only fetches when popover is open. M2: `createNotification` uses explicit fields instead of `...args` spread. — schema, backend, component, header integration, tests

### File List

**New files:**
- `convex/notifications.ts` — Notification queries, mutations, internal mutation
- `convex/notifications.test.ts` — 19 contract tests
- `src/components/custom/notification-bell.tsx` — NotificationBell with Popover
- `src/components/ui/popover.tsx` — Popover component (via shadcn)

**Modified files:**
- `convex/schema.ts` — added `notifications` table
- `src/components/layouts/dashboard-layout.tsx` — added NotificationBell to header
