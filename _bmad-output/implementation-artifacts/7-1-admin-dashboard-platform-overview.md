# Story 7.1: Admin Dashboard & Platform Overview

Status: done

## Story

As an **admin**,
I want to view a platform overview dashboard with key metrics,
so that I can monitor platform health and growth.

## Acceptance Criteria

1. **AC1 — Admin route guard:** Navigating to `/dashboard/admin` requires authentication with `admin` active role. Non-admin users see the `RoleGuard` fallback (existing component).

2. **AC2 — Platform metrics display:** The admin dashboard shows `MetricCard` components displaying: total registered users, total events created (with status breakdown), total tickets sold, total revenue (GMV formatted in PHP using `formatCurrency`), and active creators count. All counts are current (queried from database).

3. **AC3 — Admin backend query:** A single Convex query `getAdminDashboardMetrics` returns all dashboard metrics. It requires `admin` active role. Revenue is returned as integer centavos; the frontend formats it via `formatCurrency`.

4. **AC4 — Contract tests:** Pure contract tests validate the admin role authorization contract and the dashboard metrics return shape.

## Tasks / Subtasks

- [x] Task 1: Admin dashboard backend query (AC: 3)
  - [x] 1.1 Create `convex/admin.ts` with `getAdminDashboardMetrics` query — requires auth + `requireRole(user, "admin")`. Counts: total users (`users` table), total events by status (`events` table grouped by `status`), total tickets sold (sum `soldCount` from `ticketTiers`), total revenue (sum `price * soldCount` from `ticketTiers`), active creators (distinct `creatorId` from events where status is not `draft`).
  - [x] 1.2 Return shape: `{ totalUsers, totalEvents, eventsByStatus: { draft, published, cancelled }, totalTicketsSold, totalRevenue, activeCreators }`. Revenue in centavos (integer).

- [x] Task 2: Admin dashboard page (AC: 1, 2)
  - [x] 2.1 Create `src/app/(dashboard)/dashboard/admin/page.tsx` — `"use client"`, wrap in `<RoleGuard requiredRoles={["admin"]}>`. Uses `useQuery(api.admin.getAdminDashboardMetrics)`.
  - [x] 2.2 Render `MetricCard` components (already exists at `src/components/custom/metric-card.tsx`) for each metric. Use `formatCurrency` from `src/lib/utils/format.ts` for revenue. Use `toLocaleString()` for counts. Include a skeleton loading state.
  - [x] 2.3 Show event status breakdown below the metric cards — a simple card or table showing draft/published/cancelled counts.

- [x] Task 3: Contract tests (AC: 4)
  - [x] 3.1 Create `convex/admin.test.ts` with tests: admin role required (rejects artist, attendee, venue_manager, organization), return shape includes all required fields, revenue computed as `price * soldCount` sum, `activeCreators` counts only distinct creator IDs from non-draft events.

## Dev Notes

### Admin Role Infrastructure — Already Exists

The admin role is already fully defined in the codebase. **Do NOT recreate** any of these:

- `convex/lib/roles.ts` — `VALID_ROLES` includes `"admin"`, `requireRole()` and `requireAnyRole()` functions exist
- `src/lib/utils/constants.ts` — `ROLES` includes `"admin"`, `ROLE_LABELS` maps `admin: "Admin"`
- `src/components/custom/sidebar-nav.tsx` lines 51-56 — admin nav items already configured:
  ```
  admin: [
    { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Users", href: "/dashboard/admin/users", icon: Users },
    { label: "Moderation", href: "/dashboard/admin/moderation", icon: Shield },
    { label: "Financial", href: "/dashboard/admin/financial", icon: BarChart3 },
  ]
  ```
- `src/components/custom/role-guard.tsx` — works for admin role, use `<RoleGuard requiredRoles={["admin"]}>`
- `src/components/custom/role-switcher.tsx` — includes admin in dropdown with `Shield` icon

### Backend Query Pattern

Follow the same pattern as `getMyEventsWithStats` in `convex/events.ts`:

```typescript
// convex/admin.ts
import { query } from "./_generated/server";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";

export const getAdminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allUsers = await ctx.db.query("users").collect();
    const allEvents = await ctx.db.query("events").collect();
    const allTiers = await ctx.db.query("ticketTiers").collect();

    // Event status breakdown
    const eventsByStatus = {
      draft: allEvents.filter((e) => e.status === "draft").length,
      published: allEvents.filter((e) => e.status === "published").length,
      cancelled: allEvents.filter((e) => e.status === "cancelled").length,
    };

    // Revenue and tickets from tiers
    const totalTicketsSold = allTiers.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = allTiers.reduce((sum, t) => sum + t.price * t.soldCount, 0);

    // Active creators = distinct creatorIds from non-draft events
    const activeCreatorIds = new Set(
      allEvents
        .filter((e) => e.status !== "draft")
        .map((e) => e.creatorId)
    );

    return {
      totalUsers: allUsers.length,
      totalEvents: allEvents.length,
      eventsByStatus,
      totalTicketsSold,
      totalRevenue,          // centavos — frontend uses formatCurrency()
      activeCreators: activeCreatorIds.size,
    };
  },
});
```

### Dashboard Page Pattern

Follow the pattern from `src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx` (venue dashboard with stat cards):

```typescript
// src/app/(dashboard)/dashboard/admin/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { formatCurrency } from "@/lib/utils/format";
import { Users, Calendar, Ticket, DollarSign, Mic2 } from "lucide-react";
```

### MetricCard Component — Already Exists

File: `src/components/custom/metric-card.tsx`

```typescript
// Props: { icon: ReactNode, label: string, value: string | number, subtitle?: string }
<MetricCard
  icon={<Users className="h-5 w-5" />}
  label="Total Users"
  value={metrics.totalUsers.toLocaleString()}
/>
<MetricCard
  icon={<DollarSign className="h-5 w-5" />}
  label="Total Revenue (GMV)"
  value={formatCurrency(metrics.totalRevenue)}
  subtitle="Gross merchandise value"
/>
```

### Currency Formatting

Revenue stored as integer centavos in `ticketTiers.price`. Use `formatCurrency()` from `src/lib/utils/format.ts`:
- `formatCurrency(0)` → `"Free"`
- `formatCurrency(50000)` → `"₱500.00"`

### Schema Tables Used (Read-Only — DO NOT modify schema)

```typescript
// users table — count for totalUsers
users: { clerkId, name, email, roles, activeRole, isActive, ... }

// events table — count by status, extract distinct creatorIds
events: { creatorId, status, title, date, ... }
// status values: "draft" | "published" | "cancelled"

// ticketTiers table — sum soldCount and price*soldCount
ticketTiers: { eventId, price, quantity, soldCount, ... }
```

No schema changes needed for this story.

### Testing Pattern

Same pure contract tests as all other stories. File: `convex/admin.test.ts`

```typescript
describe("getAdminDashboardMetrics authorization contract", () => {
  it("requires admin role", () => { ... });
  it("rejects non-admin roles", () => { ... });
});

describe("admin dashboard metrics return shape", () => {
  it("includes all required metric fields", () => { ... });
  it("computes totalRevenue as sum of price * soldCount", () => { ... });
  it("counts activeCreators as distinct creatorIds from non-draft events", () => { ... });
});
```

### File Locations

**New files:**
- `convex/admin.ts` — admin queries (just `getAdminDashboardMetrics` for this story)
- `convex/admin.test.ts` — contract tests
- `src/app/(dashboard)/dashboard/admin/page.tsx` — admin dashboard page

**Existing files to reuse (DO NOT modify):**
- `src/components/custom/metric-card.tsx` — MetricCard component
- `src/components/custom/role-guard.tsx` — RoleGuard component
- `src/components/custom/sidebar-nav.tsx` — admin nav already configured
- `src/lib/utils/format.ts` — `formatCurrency()`, `formatDate()`
- `convex/lib/roles.ts` — `requireRole()`, `requireAnyRole()`
- `convex/lib/auth.ts` — `getAuthenticatedUser()`

### Auth Pattern

| Query | Auth | Role Check | Notes |
|---|---|---|---|
| `getAdminDashboardMetrics` | Required | `admin` | Full table scans — acceptable for admin-only query |

### Previous Story Learnings

- **Public queries return null, not throw** — but this is an admin query, so throwing `ConvexError` on auth failure is correct (via `requireRole`).
- **Don't leak internal fields in public queries** — not applicable here (admin sees everything).
- **Use `toLocaleString()` for counts** — consistent with venue dashboard pattern.
- **Skeleton loading state** — show Skeleton components while `metrics === undefined`.
- **Test mocks** — if the page uses `useQuery`, ensure tests mock `convex/react` with `useQuery`.

### References

- MetricCard component: [src/components/custom/metric-card.tsx](src/components/custom/metric-card.tsx)
- RoleGuard component: [src/components/custom/role-guard.tsx](src/components/custom/role-guard.tsx)
- Sidebar nav (admin items): [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx) lines 51-56
- Role utilities: [convex/lib/roles.ts](convex/lib/roles.ts)
- Auth utilities: [convex/lib/auth.ts](convex/lib/auth.ts)
- Format utilities: [src/lib/utils/format.ts](src/lib/utils/format.ts)
- Venue dashboard pattern: [src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx](src/app/(dashboard)/dashboard/venues/[venueId]/page.tsx)
- Schema: [convex/schema.ts](convex/schema.ts)
- Events queries pattern: [convex/events.ts](convex/events.ts)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Created `convex/admin.ts` with `getAdminDashboardMetrics` query. Requires auth + admin role. Queries users, events, and ticketTiers tables. Returns totalUsers, totalEvents, eventsByStatus breakdown, totalTicketsSold, totalRevenue (centavos), and activeCreators (distinct non-draft creator IDs).
- Task 2: Created admin dashboard page at `src/app/(dashboard)/dashboard/admin/page.tsx`. Wrapped in RoleGuard for admin role. Renders 5 MetricCard components (Users, Events, Tickets Sold, Revenue, Active Creators) plus an event status breakdown card. Includes skeleton loading state.
- Task 3: Created `convex/admin.test.ts` with 11 pure contract tests covering: authorization (admin required, rejects 4 non-admin roles), return shape validation, revenue computation (price × soldCount sum), ticketsSold sum, activeCreators distinct count (excludes draft), eventsByStatus grouping, and revenue integer type assertion.
- All 778 tests pass with zero regressions.

#### Code Review Fixes (Claude Opus 4.6 — 2026-03-14)

- **H1 — Revenue "Free" when zero:** `formatCurrency(0)` returns "Free" which is wrong for admin GMV. Fixed in `page.tsx` to show "₱0.00" when totalRevenue is 0.
- **M1 — Cancelled event tiers inflate metrics:** `totalTicketsSold` and `totalRevenue` included tiers from cancelled events, inconsistent with Story 6.3 venue dashboard fix. Fixed in `convex/admin.ts` to filter out cancelled event tiers. Added contract test for this behavior.
- 3 LOW issues noted (hardcoded status breakdown, inactive users counted, full table scans) — accepted as pre-existing patterns.
- Tests: 779 passing after fixes (12 admin contract tests).

### File List

**New files:**
- `convex/admin.ts` — Admin dashboard metrics query
- `convex/admin.test.ts` — Contract tests for admin dashboard
- `src/app/(dashboard)/dashboard/admin/page.tsx` — Admin dashboard page
