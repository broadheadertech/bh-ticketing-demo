# Story 12.1: Staff Role & Event Assignment

Status: done

## Story

As a **creator**,
I want to assign staff members to scan tickets at my events,
so that I can delegate entry management without sharing my account.

## Acceptance Criteria

1. **AC1 — Manage staff dialog:** On the event detail page, a "Manage Staff" button opens a dialog showing currently assigned staff and an input to add staff by email.

2. **AC2 — Assign staff:** Adding a staff member by email looks up the user, adds `"staff"` to their roles if not present, and creates a `staffAssignments` record. Error if user not found.

3. **AC3 — Remove staff:** Removing a staff member deletes the `staffAssignments` record. The `staff` role is removed only if the user has no other active assignments.

4. **AC4 — Schema & role updates:** `staffAssignments` table added. `"staff"` added to VALID_ROLES. Staff sidebar nav shows assigned events.

5. **AC5 — Contract tests:** Validate staff assignment logic, role addition/removal rules, and authorization.

## Tasks / Subtasks

- [x]Task 1: Schema + role updates (AC: 4)
  - [x]1.1 Add `staffAssignments` table to schema: `userId` (v.id("users")), `eventId` (v.id("events")), `assignedBy` (v.id("users")), `createdAt` (v.number()). Indexes: `by_event_id` on `[eventId]`, `by_user_id` on `[userId]`.
  - [x]1.2 Add `"staff"` to VALID_ROLES in `convex/lib/roles.ts`.
  - [x]1.3 Add staff nav items to sidebar: `{ label: "My Assignments", href: "/dashboard/staff", icon: Shield }`.

- [x]Task 2: Backend mutations + queries (AC: 2, 3)
  - [x]2.1 Create `convex/staff.ts` with `assignStaff` mutation. Args: `eventId`, `staffEmail`. Auth: creator role + event ownership. Look up user by email, add "staff" to roles if not present, insert staffAssignment.
  - [x]2.2 Add `removeStaff` mutation. Deletes assignment. If user has no other assignments, remove "staff" from their roles.
  - [x]2.3 Add `getEventStaff` query. Returns staff for an event with name+email. Auth: creator + ownership.
  - [x]2.4 Add `getMyAssignments` query for staff dashboard. Auth: any role. Returns events the user is assigned to.

- [x]Task 3: Manage staff UI (AC: 1)
  - [x]3.1 Create `src/components/custom/manage-staff-dialog.tsx` with email input, add button, list of assigned staff with remove button.
  - [x]3.2 Add "Manage Staff" button to event detail page for draft and published events.

- [x]Task 4: Staff assignments page (AC: 4)
  - [x]4.1 Create `src/app/(dashboard)/dashboard/staff/page.tsx` showing events the staff member is assigned to.

- [x]Task 5: Contract tests (AC: 5)
  - [x]5.1 Create `convex/staff.test.ts`: staff role addition, staff role removal (only when no assignments), assignment authorization (creator only), duplicate assignment prevention.

## Dev Notes

### References
- Schema: [convex/schema.ts](convex/schema.ts)
- Roles: [convex/lib/roles.ts](convex/lib/roles.ts)
- Sidebar: [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx)
- Event detail: [src/app/(dashboard)/dashboard/events/[eventId]/page.tsx](src/app/(dashboard)/dashboard/events/[eventId]/page.tsx)

## Dev Agent Record
### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `staffAssignments` table to schema. Added "staff" to VALID_ROLES and frontend ROLES/ROLE_LABELS. Added staff nav to sidebar.
- Task 2: Created `convex/staff.ts` with `assignStaff` (email lookup, role add, duplicate check, self-assign prevention), `removeStaff` (role cleanup when no assignments), `getEventStaff`, `getMyAssignments`.
- Task 3: Created ManageStaffDialog component. Added "Manage Staff" button to event detail page for draft/published events.
- Task 4: Created staff assignments page at `/dashboard/staff` with event cards and scanner links.
- Task 5: Created 17 contract tests. Fixed existing roles test and request-role-button test for new "staff" role.
- All 979 tests pass.

### Change Log

- 2026-03-15: Story 12.1 implementation complete — schema, mutations, staff dialog, assignments page, contract tests

### File List

**New files:**
- `convex/staff.ts` — Staff assignment mutations + queries
- `src/components/custom/manage-staff-dialog.tsx` — Staff management dialog
- `src/app/(dashboard)/dashboard/staff/page.tsx` — Staff assignments page
- `convex/staff.test.ts` — 17 contract tests

**Modified files:**
- `convex/schema.ts` — Added `staffAssignments` table
- `convex/lib/roles.ts` — Added "staff" to VALID_ROLES
- `convex/lib/roles.test.ts` — Updated role count assertion
- `src/lib/utils/constants.ts` — Added "staff" to ROLES and ROLE_LABELS
- `src/components/custom/sidebar-nav.tsx` — Added staff nav items
- `src/app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Added "Manage Staff" button + dialog
- `src/components/custom/__tests__/request-role-button.test.tsx` — Updated "all roles" mock
