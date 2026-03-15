# Story 1.3: Multi-Role User System & Role Switching

Status: done

## Story

As a **user**,
I want to hold multiple roles and switch between them,
So that I can be both an attendee and a creator from the same account.

## Acceptance Criteria

1. **Given** I am authenticated with role `attendee` **When** I request the `artist` role via a role request action **Then** my `roles` array is updated to include `artist` **And** I can now switch my `activeRole` to `artist`
2. **Given** I have multiple roles **When** I click the RoleSwitcher component in the dashboard header **Then** I see a dropdown with all my available roles **And** selecting a different role updates my `activeRole` in Convex **And** the dashboard UI adapts to show features for the selected role **And** a toast confirms "Switched to [Role]"
3. **Given** I have only one role **When** I view the dashboard **Then** the RoleSwitcher is hidden or shows my single role without dropdown
4. **Given** role-based access control (NFR13) **When** I attempt to access a creator-only feature with `attendee` active role **Then** I see an appropriate access denied message

## Tasks / Subtasks

- [x] **Task 1: Add role management mutations to Convex** (AC: #1)
  - [x]1.1 Add `addRole` public mutation to `convex/users.ts` — accepts `role: v.string()`, validates against allowed roles list, adds to user's `roles` array if not already present, uses Clerk identity (`ctx.auth.getUserIdentity()`) to identify caller
  - [x]1.2 Add `switchRole` public mutation to `convex/users.ts` — accepts `role: v.string()`, validates role exists in user's `roles` array, updates `activeRole`, updates `updatedAt`
  - [x]1.3 Add `getCurrentUser` query to `convex/users.ts` — uses `ctx.auth.getUserIdentity()` to get the Clerk identity token subject, looks up user by clerkId, returns full user document (needed by RoleSwitcher and RBAC checks)

- [x] **Task 2: Create role validation helpers** (AC: #1, #4)
  - [x]2.1 Create `convex/lib/roles.ts` with:
    - `VALID_ROLES` constant array matching `ROLES` from `src/lib/utils/constants.ts`
    - `isValidRole(role: string): boolean` helper
    - `requireRole(user, role: string)` helper that throws ConvexError if user doesn't have the required `activeRole`
  - [x]2.2 Create `convex/lib/auth.ts` with:
    - `getAuthenticatedUser(ctx)` helper that calls `ctx.auth.getUserIdentity()`, looks up user by Clerk subject/clerkId, throws ConvexError if not found — reusable across all Convex functions

- [x] **Task 3: Create RoleSwitcher component** (AC: #2, #3)
  - [x]3.1 Create `src/components/custom/role-switcher.tsx` as a `"use client"` component
  - [x]3.2 Use `useQuery(api.users.getCurrentUser)` to get user data (roles array, activeRole)
  - [x]3.3 Use `useMutation(api.users.switchRole)` for role switching
  - [x]3.4 Render current role display: role icon + role label + chevron-down
  - [x]3.5 Use shadcn `DropdownMenu` (or `Select`) for the role list — show all roles from user's `roles` array with active role indicated by checkmark
  - [x]3.6 On role selection: call `switchRole` mutation, show toast "Switched to [Role]" via Sonner
  - [x]3.7 If user has only 1 role: render as static text (no dropdown trigger) or hide entirely
  - [x]3.8 Add loading/skeleton state while user data loads
  - [x]3.9 Accessibility: `aria-haspopup="listbox"`, `aria-checked` on active role, `aria-live="polite"` region for role switch announcement, keyboard arrow navigation

- [x] **Task 4: Add "Request Role" action** (AC: #1)
  - [x]4.1 Create `src/components/custom/request-role-button.tsx` — `"use client"` component with a button/dialog that lets a user request an additional role
  - [x]4.2 For MVP: role request is immediately granted (call `addRole` mutation directly). No admin approval flow yet.
  - [x]4.3 Show available roles the user doesn't already have (filter `ROLES` minus user's current `roles`)
  - [x]4.4 Toast confirmation: "Role [name] added!"
  - [x]4.5 Place in dashboard settings or profile section (accessible from sidebar)

- [x] **Task 5: Update dashboard layout with RoleSwitcher and role-based navigation** (AC: #2, #3)
  - [x]5.1 Update `src/components/layouts/dashboard-layout.tsx` to include `<RoleSwitcher />` in the sidebar header area (below logo, above nav)
  - [x]5.2 Create role-based sidebar navigation items in `src/components/custom/sidebar-nav.tsx`:
    - **attendee**: My Tickets, Discover Events
    - **artist/organization**: My Events, Create Event, Revenue
    - **venue_manager**: My Venues, Availability
    - **admin**: Overview, Users, Moderation, Financial
  - [x]5.3 Use `useQuery(api.users.getCurrentUser)` to get `activeRole` and render appropriate nav items
  - [x]5.4 Mobile: add RoleSwitcher inside the Sheet drawer header (use existing mobile hamburger pattern)

- [x] **Task 6: Implement RBAC access denied pattern** (AC: #4)
  - [x]6.1 Create `src/components/custom/role-guard.tsx` — a wrapper component that checks `activeRole` against required role(s) and renders children or an access-denied message
  - [x]6.2 Access denied message: card with lock icon, "You need the [role] role to access this feature", and a CTA to request the role or switch role
  - [x]6.3 Use `<RoleGuard requiredRoles={["artist", "organization"]}>` pattern in dashboard pages that are role-specific

- [x] **Task 7: Add shadcn DropdownMenu component** (AC: #2)
  - [x]7.1 Install `dropdown-menu` via `pnpm dlx shadcn@latest add dropdown-menu` (if not already present)
  - [x]7.2 Verify component exists at `src/components/ui/dropdown-menu.tsx`

- [x] **Task 8: Write tests** (AC: #1, #2, #3, #4)
  - [x]8.1 Create `convex/lib/roles.test.ts` — test `isValidRole`, `requireRole` helpers
  - [x]8.2 Create `src/components/custom/__tests__/role-switcher.test.tsx` — test rendering with single role (no dropdown), multi-role (dropdown visible), role switch callback
  - [x]8.3 Create `src/components/custom/__tests__/role-guard.test.tsx` — test access granted vs denied rendering
  - [x]8.4 Verify all tests pass with `pnpm test:run`

- [x] **Task 9: Final validation**
  - [x]9.1 Run `pnpm build` — must succeed
  - [x]9.2 Run `pnpm test:run` — all tests pass
  - [x]9.3 Run `pnpm lint` — no errors

## Dev Notes

### Critical: What Previous Stories Already Built

These files already exist — do NOT recreate them:
- `convex/schema.ts` — users table already has `roles: v.array(v.string())` and `activeRole: v.string()` fields
- `convex/users.ts` — has `getUser` query (by clerkId arg) and `createUser`/`updateUser`/`deleteUser` as `internalMutation`
- `convex/http.ts` — Clerk webhook handler (creates users with `roles: ["attendee"]`, `activeRole: "attendee"`)
- `src/middleware.ts` — clerkMiddleware protecting `/(dashboard)(.*)` routes
- `src/components/providers.tsx` — ClerkProvider + ConvexProviderWithClerk (Convex client has auth context)
- `src/components/layouts/dashboard-layout.tsx` — shell layout with sidebar (placeholder nav) and topbar (placeholder)
- `src/types/index.ts` — `UserRole` union type: `"attendee" | "artist" | "organization" | "venue_manager" | "admin"`
- `src/lib/utils/constants.ts` — `ROLES` array and `DEFAULT_ROLE = "attendee"`
- `src/components/ui/` — 10 shadcn components already installed (button, card, form, input, label, select, skeleton, table, tabs, sonner)

### Architecture Compliance

**Convex Auth Identity Pattern:**
```typescript
// In Convex mutations/queries, get the authenticated user:
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Not authenticated");
// identity.subject is the Clerk user ID (same as clerkId in our users table)
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
  .unique();
```

**Public Mutations (not internalMutation):**
`addRole` and `switchRole` MUST be public `mutation` (not `internalMutation`) because they are called from the client via `useMutation()` hook. They use `ctx.auth.getUserIdentity()` for authorization — only the authenticated user can modify their own roles.

**RoleSwitcher Component Pattern (from UX spec):**
```typescript
// src/components/custom/role-switcher.tsx
"use client";

// Anatomy:
// - Current role display: role icon + role label + chevron
// - Dropdown: list of available roles with active indicator
// - Single role: static display, no dropdown

// States:
// - Loading: skeleton while useQuery resolves
// - Single role: hidden or static text
// - Multi-role: clickable dropdown trigger
// - Switching: optimistic update + toast

// Accessibility:
// - aria-haspopup="listbox" on trigger
// - aria-checked on active role item
// - aria-live="polite" region announces role switch
// - Keyboard: arrow keys navigate, Enter selects, Escape closes
```

**Role-Based Sidebar Navigation (from UX spec):**
```typescript
// Navigation items vary by activeRole:
const NAV_ITEMS: Record<string, NavItem[]> = {
  attendee: [
    { label: "My Tickets", href: "/dashboard/tickets", icon: TicketIcon },
    { label: "Discover Events", href: "/events", icon: SearchIcon },
  ],
  artist: [
    { label: "My Events", href: "/dashboard/events", icon: CalendarIcon },
    { label: "Create Event", href: "/dashboard/events/create", icon: PlusIcon },
    { label: "Revenue", href: "/dashboard/revenue", icon: DollarSignIcon },
  ],
  organization: [
    // Same as artist for now
  ],
  venue_manager: [
    { label: "My Venues", href: "/dashboard/venues", icon: BuildingIcon },
    { label: "Availability", href: "/dashboard/venues/availability", icon: CalendarIcon },
  ],
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboardIcon },
    { label: "Users", href: "/dashboard/admin/users", icon: UsersIcon },
    { label: "Moderation", href: "/dashboard/admin/moderation", icon: ShieldIcon },
    { label: "Financial", href: "/dashboard/admin/financial", icon: BarChartIcon },
  ],
};
```

**Convex Error Pattern:**
```typescript
import { ConvexError } from "convex/values";
// Use ConvexError for user-facing errors in mutations
throw new ConvexError("You don't have the required role");
// Client catches via useMutation error handling
```

**Client-Side Convex Hooks:**
```typescript
// In "use client" components:
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const user = useQuery(api.users.getCurrentUser);
const switchRole = useMutation(api.users.switchRole);
```

### Convex Users Schema (already defined — do NOT modify)

```typescript
users: defineTable({
  clerkId: v.string(),
  name: v.string(),
  email: v.string(),
  image: v.optional(v.string()),
  roles: v.array(v.string()),
  activeRole: v.string(),
  stripeAccountId: v.optional(v.string()),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_clerk_id", ["clerkId"])
  .index("by_email", ["email"]),
```

### Key Decisions

- **`addRole` is auto-approved for MVP** — no admin approval workflow. Any user can self-assign roles. Admin approval can be added in a future story.
- **`getCurrentUser` uses Clerk identity** — NOT a clerkId argument. The query reads `ctx.auth.getUserIdentity()` so no user can read another user's data by guessing their clerkId.
- **RoleSwitcher uses shadcn DropdownMenu** — consistent with existing UI component library, accessible by default.
- **Role validation happens in Convex** — `addRole` validates against allowed roles list, `switchRole` validates the role exists in user's roles array. Client-side validation is optional.
- **RBAC is advisory at UI level, enforced at data level** — `RoleGuard` component hides UI features, but Convex mutation/query functions also check `activeRole` before executing. Defense in depth.
- **No router-level role checking** — middleware only checks auth (is user logged in?). Role checks happen in components and Convex functions. This keeps middleware simple.
- **`convex/lib/` directory** for shared Convex utilities — keeps role helpers and auth helpers reusable across all Convex function files.

### File Naming Conventions

- Custom components: `src/components/custom/` (kebab-case files)
- Convex utilities: `convex/lib/` (camelCase exports)
- Tests co-located: `__tests__/` subdirectory for component tests, `.test.ts` suffix for utility tests

### Environment Variables Needed

No new environment variables needed for this story. Clerk + Convex already configured.

### Project Structure Notes

Files to create/modify:
```
convex/users.ts                                    # MODIFY: Add getCurrentUser, addRole, switchRole
convex/lib/roles.ts                                # CREATE: Role validation helpers
convex/lib/auth.ts                                 # CREATE: Auth helper (getAuthenticatedUser)
convex/lib/roles.test.ts                           # CREATE: Role helper tests
src/components/custom/role-switcher.tsx             # CREATE: RoleSwitcher dropdown component
src/components/custom/request-role-button.tsx       # CREATE: Request additional role component
src/components/custom/sidebar-nav.tsx               # CREATE: Role-based sidebar navigation
src/components/custom/role-guard.tsx                # CREATE: RBAC wrapper component
src/components/custom/__tests__/role-switcher.test.tsx  # CREATE: RoleSwitcher tests
src/components/custom/__tests__/role-guard.test.tsx     # CREATE: RoleGuard tests
src/components/layouts/dashboard-layout.tsx         # MODIFY: Integrate RoleSwitcher + SidebarNav
src/components/ui/dropdown-menu.tsx                 # CREATE: shadcn DropdownMenu (via CLI)
```

### Previous Story Learnings

From Story 1.2 code review:
- Public mutations are a security risk — but `addRole`/`switchRole` ARE client-facing so they MUST be public `mutation`. Security comes from `ctx.auth.getUserIdentity()` — only authenticated users can call them, and they can only modify their own record.
- Convex `_generated` files are placeholders using `anyApi` — type safety is loose until `npx convex dev` runs against a real deployment.
- Test approach: contract tests for Convex mutation logic (pure business rules), component tests with React Testing Library for UI components.

From Story 1.1:
- jsdom 25 (not 28) for Node 20 compatibility
- vitest.config.mts (ESM, .mts extension) with React plugin
- shadcn components installed via `pnpm dlx shadcn@latest add [component]`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Authorization pattern, Data Architecture, Component architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md - Role management via custom roles[] in Convex users table]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - RoleSwitcher component spec]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Dashboard navigation per role]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 1, Story 1.3]
- [Source: _bmad-output/planning-artifacts/prd.md - FR3, FR4, NFR13]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- React compiler lint rule `react-hooks/static-components` flagged dynamic component assignment (`const Icon = getRoleIcon(role)`) during render. Fixed by extracting a `RoleIcon` component that resolves the icon internally.
- Installed `@testing-library/react` and `@testing-library/jest-dom` as dev dependencies for component testing.
- Also installed shadcn `sheet` component for mobile drawer in dashboard layout.
- Added `requireAnyRole` helper beyond spec (accepts array of roles) for flexibility in future RBAC checks.

### Completion Notes List
- All 4 acceptance criteria addressed
- `pnpm build` passes with all routes: `/sign-in`, `/sign-up`, `/dashboard`, `/events`
- `pnpm test:run` passes (37 tests: 4 format + 5 user-helpers + 8 users contract + 9 roles + 5 role-switcher + 6 role-guard)
- `pnpm lint` has 0 errors (4 warnings from auto-generated placeholder files)
- Convex mutations `getCurrentUser`, `addRole`, `switchRole` use `ctx.auth.getUserIdentity()` for secure identity-based access
- `convex/lib/auth.ts` provides reusable `getAuthenticatedUser(ctx)` helper for all future Convex functions
- `convex/lib/roles.ts` provides `isValidRole`, `requireRole`, `requireAnyRole` helpers
- RoleSwitcher component: full accessibility (aria-haspopup, aria-checked, aria-live), loading skeleton, single-role static display
- SidebarNav: role-based navigation items per UX spec (attendee, artist, organization, venue_manager, admin)
- RoleGuard: RBAC wrapper with access-denied card UI
- RequestRoleButton: auto-approved role addition for MVP
- DashboardLayout: fully integrated with RoleSwitcher, SidebarNav, RequestRoleButton + mobile Sheet drawer

### Code Review Fixes Applied
- **[HIGH] Admin self-grant blocked**: Added `SELF_ASSIGNABLE_ROLES` constant excluding `admin` from self-assignable roles. `addRole` mutation now rejects admin self-assignment.
- **[HIGH] switchRole validation**: Added `isValidRole()` check to `switchRole` mutation for defense in depth.
- **[HIGH] DRY violation fixed**: Extracted shared `ROLE_LABELS` to `src/lib/utils/constants.ts`, removed 3 duplicate definitions from role-switcher, role-guard, request-role-button.
- **[MEDIUM] NavIcon component**: Extracted `NavIcon` wrapper component in sidebar-nav to avoid fragile render-time icon assignment.
- **[MEDIUM] RoleGuard CTA buttons**: Added "Switch to [Role]" and "Add [Role] Role" buttons in access-denied card, fulfilling Task 6.2 CTA requirement.
- **[MEDIUM] Missing tests added**: Created test suites for `RequestRoleButton` (4 tests) and `SidebarNav` (6 tests).

### File List
- `convex/users.ts` — MODIFIED: added getCurrentUser query, addRole and switchRole public mutations; code review: added SELF_ASSIGNABLE_ROLES guard, isValidRole in switchRole
- `convex/lib/roles.ts` — CREATED: VALID_ROLES, SELF_ASSIGNABLE_ROLES, isValidRole, requireRole, requireAnyRole helpers
- `convex/lib/auth.ts` — CREATED: getAuthenticatedUser helper using Clerk identity
- `convex/lib/roles.test.ts` — CREATED: 12 tests for role validation helpers (including SELF_ASSIGNABLE_ROLES)
- `src/lib/utils/constants.ts` — MODIFIED: added shared ROLE_LABELS constant
- `src/components/custom/role-switcher.tsx` — CREATED: RoleSwitcher dropdown with accessibility; uses shared ROLE_LABELS
- `src/components/custom/request-role-button.tsx` — CREATED: Add Role dropdown button; uses shared ROLE_LABELS
- `src/components/custom/sidebar-nav.tsx` — CREATED: Role-based sidebar navigation with NavIcon component
- `src/components/custom/role-guard.tsx` — CREATED: RBAC wrapper component with CTA buttons; uses shared ROLE_LABELS
- `src/components/custom/__tests__/role-switcher.test.tsx` — CREATED: 5 component tests
- `src/components/custom/__tests__/role-guard.test.tsx` — CREATED: 8 component tests (including CTA buttons)
- `src/components/custom/__tests__/request-role-button.test.tsx` — CREATED: 4 component tests
- `src/components/custom/__tests__/sidebar-nav.test.tsx` — CREATED: 6 component tests
- `src/components/layouts/dashboard-layout.tsx` — MODIFIED: integrated RoleSwitcher, SidebarNav, RequestRoleButton, mobile Sheet
- `src/components/ui/dropdown-menu.tsx` — CREATED: shadcn DropdownMenu (via CLI)
- `src/components/ui/sheet.tsx` — CREATED: shadcn Sheet (via CLI)
- `package.json` — MODIFIED: added @testing-library/react, @testing-library/jest-dom dev deps
