# Story 7.2: User Management

Status: done

## Story

As an **admin**,
I want to view, search, and manage user accounts,
so that I can handle user issues and enforce platform policies.

## Acceptance Criteria

1. **AC1 — User list page:** Navigating to `/dashboard/admin/users` requires `admin` active role (via `RoleGuard`). The page shows a table of all users with columns: name, email, roles, active role, registration date, status (active/disabled).

2. **AC2 — User search:** A search input filters the user list by name or email. Filtering is client-side (acceptable for admin-only queries).

3. **AC3 — Disable/enable user:** Admin can disable a user account (sets `isActive: false`). Admin can re-enable a disabled account. A confirmation dialog is shown before the action. A success toast confirms the action.

4. **AC4 — Role management:** Admin can add or remove roles from a user's `roles` array. A dialog shows the user's current roles with toggles to add/remove. Changes are saved via mutation. Admin role can only be granted/revoked by admin (not self-assignable).

5. **AC5 — Audit logging:** All admin actions (disable, enable, role changes) create an audit log entry with: timestamp, admin actor ID, action type, target user ID, and metadata (e.g., roles changed). An `auditLogs` table is added to the schema.

6. **AC6 — Contract tests:** Pure contract tests validate admin role authorization, user list return shape, disable/enable logic, role management rules, and audit log entry shape.

## Tasks / Subtasks

- [x] Task 1: Schema update — add auditLogs table (AC: 5)
  - [x] 1.1 Add `auditLogs` table to `convex/schema.ts` with fields: `actorId` (v.id("users")), `action` (v.string()), `targetType` (v.string()), `targetId` (v.string()), `metadata` (v.optional(v.any())), `createdAt` (v.number()). Index: `by_target` on `[targetType, targetId]`.

- [x] Task 2: Backend queries and mutations (AC: 1, 3, 4, 5)
  - [x] 2.1 Add `listUsers` query to `convex/admin.ts` — requires auth + `requireRole(user, "admin")`. Returns all users from `users` table with fields: `_id`, `name`, `email`, `roles`, `activeRole`, `isActive`, `createdAt`. Use `ctx.db.query("users").collect()` (full table scan, acceptable for admin).
  - [x] 2.2 Add `disableUser` mutation to `convex/admin.ts` — requires admin role. Takes `userId: v.id("users")`. Sets `isActive: false`, `updatedAt: Date.now()`. Throws if user not found or is already disabled. Prevents admin from disabling themselves. Creates audit log entry with action `"admin.user_disabled"`.
  - [x] 2.3 Add `enableUser` mutation to `convex/admin.ts` — requires admin role. Takes `userId: v.id("users")`. Sets `isActive: true`, `updatedAt: Date.now()`. Throws if user not found or is already enabled. Creates audit log entry with action `"admin.user_enabled"`.
  - [x] 2.4 Add `adminUpdateUserRoles` mutation to `convex/admin.ts` — requires admin role. Takes `userId: v.id("users")`, `roles: v.array(v.string())`. Validates all roles are in `VALID_ROLES`. Updates `roles` array. If `activeRole` is no longer in the new roles array, reset to first role. Creates audit log entry with action `"admin.roles_updated"` and metadata `{ previousRoles, newRoles }`. Throws if user not found.
  - [x] 2.5 Create helper `logAuditEvent(ctx, { actorId, action, targetType, targetId, metadata })` in `convex/admin.ts` — inserts into `auditLogs` table with `createdAt: Date.now()`.

- [x] Task 3: Admin users page (AC: 1, 2, 3, 4)
  - [x] 3.1 Create `src/app/(dashboard)/dashboard/admin/users/page.tsx` — `"use client"`, wrap in `<RoleGuard requiredRoles={["admin"]}>`. Uses `useQuery(api.admin.listUsers)`.
  - [x] 3.2 Render a search input that filters users by name or email (client-side, case-insensitive). Show result count.
  - [x] 3.3 Render a table with columns: Name, Email, Roles (as badges), Active Role (highlighted badge), Registered (formatted date), Status (active/disabled badge), Actions. Include skeleton loading state.
  - [x] 3.4 Add "Disable"/"Enable" button in actions column. Show confirmation dialog (use `AlertDialog` from shadcn/ui) before executing. Call `disableUser`/`enableUser` mutation. Show success/error toast.
  - [x] 3.5 Add "Manage Roles" button in actions column. Show a dialog with checkboxes for each role in `VALID_ROLES`. Pre-check current roles. On save, call `adminUpdateUserRoles` mutation. Show success/error toast.

- [x] Task 4: Contract tests (AC: 6)
  - [x] 4.1 Create tests in `convex/admin.test.ts` (append to existing file): admin role authorization for `listUsers`, `disableUser`, `enableUser`, `adminUpdateUserRoles` (rejects non-admin roles).
  - [x] 4.2 Test user list return shape includes required fields.
  - [x] 4.3 Test disable/enable logic: cannot disable self, cannot disable already-disabled user, cannot enable already-enabled user.
  - [x] 4.4 Test role management: validates roles against VALID_ROLES, resets activeRole when removed from roles array, preserves audit log shape.
  - [x] 4.5 Test audit log entry shape: includes actorId, action, targetType, targetId, metadata, createdAt.

## Dev Notes

### Schema Change — auditLogs Table

This is the ONLY schema change for this story. Add to `convex/schema.ts`:

```typescript
auditLogs: defineTable({
  actorId: v.id("users"),
  action: v.string(),
  targetType: v.string(), // "user" | "event" | etc.
  targetId: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index("by_target", ["targetType", "targetId"]),
```

Do NOT modify existing tables. The `users` table already has `isActive` field and `roles` array — these are sufficient for user management.

### Backend Pattern — Extend convex/admin.ts

Add new queries and mutations to the EXISTING `convex/admin.ts` file. Do NOT create a new file. Follow the same auth pattern:

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";
import { VALID_ROLES } from "./lib/roles";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allUsers = await ctx.db.query("users").collect();
    return allUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      activeRole: u.activeRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  },
});
```

### Mutation Pattern — disableUser/enableUser

```typescript
export const disableUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    if (admin._id === args.userId) {
      throw new ConvexError("Cannot disable your own account");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");
    if (!targetUser.isActive) throw new ConvexError("User is already disabled");

    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.user_disabled",
      targetType: "user",
      targetId: args.userId,
    });
  },
});
```

### Mutation Pattern — adminUpdateUserRoles

```typescript
export const adminUpdateUserRoles = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    // Validate all roles
    for (const role of args.roles) {
      if (!VALID_ROLES.includes(role as any)) {
        throw new ConvexError(`Invalid role: ${role}`);
      }
    }

    if (args.roles.length === 0) {
      throw new ConvexError("User must have at least one role");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");

    const previousRoles = targetUser.roles;
    const newActiveRole = args.roles.includes(targetUser.activeRole)
      ? targetUser.activeRole
      : args.roles[0];

    await ctx.db.patch(args.userId, {
      roles: args.roles,
      activeRole: newActiveRole,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.roles_updated",
      targetType: "user",
      targetId: args.userId,
      metadata: { previousRoles, newRoles: args.roles },
    });
  },
});
```

### Audit Log Helper

```typescript
async function logAuditEvent(
  ctx: MutationCtx,
  entry: {
    actorId: Id<"users">;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: any;
  }
) {
  await ctx.db.insert("auditLogs", {
    ...entry,
    createdAt: Date.now(),
  });
}
```

Note: Import `MutationCtx` from `"./_generated/server"` and `Id` from `"./_generated/dataModel"`.

### Dashboard Page Pattern

Follow the same pattern as `src/app/(dashboard)/dashboard/admin/page.tsx`:

```typescript
// src/app/(dashboard)/dashboard/admin/users/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { VALID_ROLES, ROLE_LABELS } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/format";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";
import { Search } from "lucide-react";
```

### UI Components — Already Exist

These shadcn/ui components are already installed and can be imported:
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` — from `@/components/ui/table`
- `AlertDialog` and subcomponents — from `@/components/ui/alert-dialog`
- `Dialog` and subcomponents — from `@/components/ui/dialog`
- `Checkbox` — from `@/components/ui/checkbox`
- `Badge` — from `@/components/ui/badge`
- `Input`, `Button`, `Skeleton` — from `@/components/ui`

### VALID_ROLES on Frontend

The frontend constants file at `src/lib/utils/constants.ts` has `ROLES` and `ROLE_LABELS`. Check if `VALID_ROLES` is exported — if not, use the `ROLES` constant. The backend `VALID_ROLES` is in `convex/lib/roles.ts`.

### Previous Story Learnings (from 7.1)

- **Admin queries use full table scans** — acceptable pattern, established in 7.1
- **RoleGuard wraps page content** — prevents non-admin from seeing the UI
- **useQuery returns undefined while loading** — show Skeleton loading state
- **formatCurrency(0) returns "Free"** — not relevant for user management, but be aware
- **Cancelled events excluded from metrics** — apply same pattern if showing per-user stats
- **toLocaleString() for counts** — use for any numeric displays
- **formatDate() for timestamps** — use for registration date column
- **Contract tests are pure** — no Convex runtime, test business logic only
- **Append to existing test file** — `convex/admin.test.ts` already exists with 12 tests

### Auth Pattern

| Query/Mutation | Auth | Role Check | Notes |
|---|---|---|---|
| `listUsers` | Required | `admin` | Full table scan, returns explicit fields |
| `disableUser` | Required | `admin` | Cannot disable self, audit logged |
| `enableUser` | Required | `admin` | Audit logged |
| `adminUpdateUserRoles` | Required | `admin` | Validates VALID_ROLES, resets activeRole if needed, audit logged |

### References

- Admin dashboard (pattern): [src/app/(dashboard)/dashboard/admin/page.tsx](src/app/(dashboard)/dashboard/admin/page.tsx)
- Admin queries (extend this file): [convex/admin.ts](convex/admin.ts)
- Admin tests (append to this file): [convex/admin.test.ts](convex/admin.test.ts)
- User mutations: [convex/users.ts](convex/users.ts)
- Role utilities: [convex/lib/roles.ts](convex/lib/roles.ts)
- Auth utilities: [convex/lib/auth.ts](convex/lib/auth.ts)
- Schema: [convex/schema.ts](convex/schema.ts)
- Format utilities: [src/lib/utils/format.ts](src/lib/utils/format.ts)
- Constants: [src/lib/utils/constants.ts](src/lib/utils/constants.ts)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- RoleGuard: [src/components/custom/role-guard.tsx](src/components/custom/role-guard.tsx)
- Sidebar nav (admin users link): [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx) lines 51-56

### File Locations

**New files:**
- `src/app/(dashboard)/dashboard/admin/users/page.tsx` — Admin user management page

**Modified files:**
- `convex/schema.ts` — Add `auditLogs` table
- `convex/admin.ts` — Add `listUsers` query, `disableUser`, `enableUser`, `adminUpdateUserRoles` mutations, `logAuditEvent` helper
- `convex/admin.test.ts` — Append contract tests for new queries/mutations

**Existing files to reuse (DO NOT modify):**
- `src/components/custom/role-guard.tsx` — RoleGuard component
- `src/components/custom/sidebar-nav.tsx` — Admin nav already has "Users" link
- `convex/lib/roles.ts` — `requireRole()`, `VALID_ROLES`
- `convex/lib/auth.ts` — `getAuthenticatedUser()`
- `src/lib/utils/format.ts` — `formatDate()`
- `src/lib/utils/constants.ts` — `ROLES`, `ROLE_LABELS`
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showErrorFromCatch()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `auditLogs` table to `convex/schema.ts` with `by_target` index
- Task 2: Extended `convex/admin.ts` with `listUsers` query, `disableUser`/`enableUser`/`adminUpdateUserRoles` mutations, and `logAuditEvent` helper. All mutations enforce admin role, validate inputs, and create audit log entries.
- Task 3: Created admin users page with search filtering, user table (name, email, roles as badges, active role, registration date, status), disable/enable confirmation dialog, and role management dialog with checkboxes. Installed `dialog` shadcn/ui component.
- Task 4: Added 19 contract tests to `convex/admin.test.ts` covering authorization, return shape, disable/enable logic, role management rules, and audit log entry shape. Total: 31 tests in file.
- All 798 tests pass, zero regressions.
- Code review fixes (H1, M2, M3): deduplicate roles array, add mutation loading state, remove unnecessary type casts. 799 tests pass.

### Change Log

- 2026-03-14: Story 7.2 implementation complete — schema, backend, UI, and contract tests
- 2026-03-14: Code review — fixed 4 issues (1H, 3M). H1: deduplicate roles in adminUpdateUserRoles. M1: noted as acceptable pattern. M2: added isPending state to mutation buttons. M3: removed unnecessary `as UserRow` casts.

### File List

**New files:**
- `src/app/(dashboard)/dashboard/admin/users/page.tsx`
- `src/components/ui/dialog.tsx` (shadcn/ui component)

**Modified files:**
- `convex/schema.ts` — added `auditLogs` table
- `convex/admin.ts` — added `listUsers`, `disableUser`, `enableUser`, `adminUpdateUserRoles`, `logAuditEvent`
- `convex/admin.test.ts` — added 19 contract tests for user management
