# Story 7.4: Financial Summary & Reporting

Status: done

## Story

As an **admin**,
I want to view financial summaries including GMV, platform fees, and infrastructure costs,
so that I can track platform financial health.

## Acceptance Criteria

1. **AC1 — Financial dashboard page:** Navigating to `/dashboard/admin/financial` requires `admin` active role (via `RoleGuard`). The page displays four key metric cards: total GMV (gross merchandise value), platform fees collected (5% of GMV), estimated infrastructure costs (fixed ₱2,100/month), and net platform revenue (fees − costs).

2. **AC2 — Currency formatting:** All monetary values are displayed in PHP using `formatCurrency` from `src/lib/utils/format.ts`. Zero revenue displays as `"₱0.00"` (not `"Free"`), matching the established admin dashboard pattern.

3. **AC3 — Date range filtering:** A dropdown filter allows selecting: "All Time", "This Month", "Last Month". Filtering applies to events by their `date` field. All metrics update based on the selected range.

4. **AC4 — Per-event revenue breakdown:** A table shows individual event revenue details: event title, status (badge), tickets sold, and revenue. Sorted by revenue descending. Excludes cancelled events from revenue totals.

5. **AC5 — Month-over-month summary:** Below the metrics, a summary card shows current month vs previous month for GMV and ticket volume, with the difference displayed (positive/negative).

6. **AC6 — Contract tests:** Pure contract tests validate admin role authorization, financial metrics return shape, platform fee calculation (5%), infrastructure cost constant, net revenue formula, cancelled event exclusion, and date range filtering logic.

## Tasks / Subtasks

- [x] Task 1: Backend query (AC: 1, 2, 3, 4, 5)
  - [x] 1.1 Add `getFinancialMetrics` query to `convex/admin.ts` — requires admin role. Collects all events + ticketTiers. Excludes cancelled event tiers. Computes: `gmv` (sum of price × soldCount in centavos), `platformFees` (gmv × 0.05), `infrastructureCosts` (210000 centavos = ₱2,100), `netRevenue` (platformFees − infrastructureCosts). Returns per-event breakdown: `eventTitle`, `eventStatus`, `ticketsSold`, `revenue` (centavos). Sorted by revenue descending.
  - [x] 1.2 Accept `dateRange: v.string()` argument (`"all_time"` | `"this_month"` | `"last_month"`). Filter events by `date` field using month boundaries. Compute `currentMonthGmv`, `currentMonthTickets`, `previousMonthGmv`, `previousMonthTickets` for month-over-month comparison.

- [x] Task 2: Admin financial page (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Create `src/app/(dashboard)/dashboard/admin/financial/page.tsx` — `"use client"`, wrap in `<RoleGuard requiredRoles={["admin"]}>`. Uses `useQuery(api.admin.getFinancialMetrics, { dateRange })`.
  - [x] 2.2 Render date range filter: `Select` dropdown with options "All Time", "This Month", "Last Month". Default to `"all_time"`.
  - [x] 2.3 Render four MetricCard components: GMV (DollarSign icon), Platform Fees (BarChart3 icon), Infrastructure Costs (Server icon), Net Revenue (TrendingUp icon). Use `formatCurrency` for values. Handle zero with `"₱0.00"`. Show subtitle for each (e.g., "5% of GMV", "Vercel Pro + Convex", "Fees − costs").
  - [x] 2.4 Render month-over-month summary card showing current vs previous month GMV and tickets, with difference (e.g., "+₱5,000" or "−₱2,000"). Use green/red text for positive/negative.
  - [x] 2.5 Render per-event revenue table: Title, Status (badge), Tickets Sold, Revenue. Sorted by revenue desc. Show skeleton loading state and empty state.

- [x] Task 3: Contract tests (AC: 6)
  - [x] 3.1 Append tests to `convex/admin.test.ts`: admin role authorization for `getFinancialMetrics`.
  - [x] 3.2 Test financial metrics return shape (gmv, platformFees, infrastructureCosts, netRevenue, eventBreakdown, monthOverMonth).
  - [x] 3.3 Test platform fee calculation: 5% of GMV (e.g., GMV 1000000 centavos → fees 50000).
  - [x] 3.4 Test infrastructure cost is fixed 210000 centavos (₱2,100).
  - [x] 3.5 Test net revenue formula: platformFees − infrastructureCosts.
  - [x] 3.6 Test cancelled event exclusion from revenue.
  - [x] 3.7 Test date range filtering logic (this_month, last_month, all_time boundary computation).

## Dev Notes

### No Schema Changes

This story requires NO schema changes. All financial data is derived from existing `events` and `ticketTiers` tables.

### Backend Pattern — Extend convex/admin.ts

Add new query to the EXISTING `convex/admin.ts` file. Reuse the cancelled event exclusion pattern from `getAdminDashboardMetrics`.

```typescript
const PLATFORM_FEE_RATE = 0.05; // 5%
const INFRASTRUCTURE_COST_CENTAVOS = 210000; // ₱2,100/month

export const getFinancialMetrics = query({
  args: {
    dateRange: v.string(), // "all_time" | "this_month" | "last_month"
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allEvents = await ctx.db.query("events").collect();
    const allTiers = await ctx.db.query("ticketTiers").collect();

    // Date range boundaries
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    // Filter events by date range
    let filteredEvents = allEvents;
    if (args.dateRange === "this_month") {
      filteredEvents = allEvents.filter(
        (e) => e.date >= currentMonthStart && e.date < currentMonthEnd
      );
    } else if (args.dateRange === "last_month") {
      filteredEvents = allEvents.filter(
        (e) => e.date >= previousMonthStart && e.date < currentMonthStart
      );
    }

    // Exclude cancelled events
    const cancelledEventIds = new Set(
      filteredEvents
        .filter((e) => e.status === "cancelled")
        .map((e) => e._id)
    );
    const activeEvents = filteredEvents.filter(
      (e) => e.status !== "cancelled"
    );
    const filteredEventIds = new Set(filteredEvents.map((e) => e._id));
    const activeTiers = allTiers.filter(
      (t) => filteredEventIds.has(t.eventId) && !cancelledEventIds.has(t.eventId)
    );

    // GMV and ticket calculations
    const gmv = activeTiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );
    const totalTicketsSold = activeTiers.reduce(
      (sum, t) => sum + t.soldCount,
      0
    );
    const platformFees = Math.round(gmv * PLATFORM_FEE_RATE);
    const netRevenue = platformFees - INFRASTRUCTURE_COST_CENTAVOS;

    // Per-event breakdown
    const eventBreakdown = await Promise.all(
      activeEvents.map(async (event) => {
        const eventTiers = activeTiers.filter(
          (t) => t.eventId === event._id
        );
        const ticketsSold = eventTiers.reduce(
          (sum, t) => sum + t.soldCount,
          0
        );
        const revenue = eventTiers.reduce(
          (sum, t) => sum + t.price * t.soldCount,
          0
        );
        return {
          eventId: event._id,
          title: event.title,
          status: event.status,
          ticketsSold,
          revenue, // centavos
        };
      })
    );
    eventBreakdown.sort((a, b) => b.revenue - a.revenue);

    // Month-over-month: always compute for current and previous month
    const currentMonthEvents = allEvents.filter(
      (e) => e.date >= currentMonthStart && e.date < currentMonthEnd && e.status !== "cancelled"
    );
    const previousMonthEvents = allEvents.filter(
      (e) => e.date >= previousMonthStart && e.date < currentMonthStart && e.status !== "cancelled"
    );

    const cmEventIds = new Set(currentMonthEvents.map((e) => e._id));
    const pmEventIds = new Set(previousMonthEvents.map((e) => e._id));

    const currentMonthGmv = allTiers
      .filter((t) => cmEventIds.has(t.eventId))
      .reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const currentMonthTickets = allTiers
      .filter((t) => cmEventIds.has(t.eventId))
      .reduce((sum, t) => sum + t.soldCount, 0);
    const previousMonthGmv = allTiers
      .filter((t) => pmEventIds.has(t.eventId))
      .reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const previousMonthTickets = allTiers
      .filter((t) => pmEventIds.has(t.eventId))
      .reduce((sum, t) => sum + t.soldCount, 0);

    return {
      gmv,
      platformFees,
      infrastructureCosts: INFRASTRUCTURE_COST_CENTAVOS,
      netRevenue,
      totalTicketsSold,
      eventBreakdown,
      monthOverMonth: {
        currentMonthGmv,
        currentMonthTickets,
        previousMonthGmv,
        previousMonthTickets,
        gmvDiff: currentMonthGmv - previousMonthGmv,
        ticketsDiff: currentMonthTickets - previousMonthTickets,
      },
    };
  },
});
```

### Currency Display Pattern for Admin

```typescript
// For admin financial pages, always show ₱ format even for zero:
function formatAdminCurrency(centavos: number): string {
  if (centavos === 0) return "₱0.00";
  return formatCurrency(centavos);
}
// Negative values (net revenue can be negative):
function formatAdminCurrencyWithSign(centavos: number): string {
  if (centavos === 0) return "₱0.00";
  const formatted = formatCurrency(Math.abs(centavos));
  return centavos < 0 ? `−${formatted}` : formatted;
}
```

### Dashboard Page Pattern

Follow the same pattern as other admin pages:

```typescript
// src/app/(dashboard)/dashboard/admin/financial/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/format";
import { DollarSign, BarChart3, Server, TrendingUp } from "lucide-react";
```

### MetricCard Usage for Financial Metrics

```typescript
<MetricCard
  icon={<DollarSign className="h-5 w-5" />}
  label="Gross Merchandise Value"
  value={metrics.gmv === 0 ? "₱0.00" : formatCurrency(metrics.gmv)}
  subtitle="Total platform sales"
/>
<MetricCard
  icon={<BarChart3 className="h-5 w-5" />}
  label="Platform Fees"
  value={metrics.platformFees === 0 ? "₱0.00" : formatCurrency(metrics.platformFees)}
  subtitle="5% of GMV"
/>
<MetricCard
  icon={<Server className="h-5 w-5" />}
  label="Infrastructure Costs"
  value={formatCurrency(metrics.infrastructureCosts)}
  subtitle="Vercel Pro + Convex (monthly)"
/>
<MetricCard
  icon={<TrendingUp className="h-5 w-5" />}
  label="Net Platform Revenue"
  value={metrics.netRevenue === 0 ? "₱0.00" : formatCurrency(Math.abs(metrics.netRevenue))}
  subtitle={metrics.netRevenue >= 0 ? "Revenue positive" : "Below break-even"}
/>
```

### Month-over-Month Summary Card

```typescript
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Month-over-Month</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-4 text-center">
      <div>
        <p className="text-sm text-muted-foreground">GMV Change</p>
        <p className={`text-xl font-bold ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
          {diff >= 0 ? "+" : "−"}{formatCurrency(Math.abs(diff))}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Ticket Volume Change</p>
        <p className={`text-xl font-bold ${ticketDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
          {ticketDiff >= 0 ? "+" : ""}{ticketDiff.toLocaleString()}
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Previous Story Learnings (from 7.1, 7.2, 7.3)

- **Admin queries use full table scans** — acceptable pattern
- **RoleGuard wraps page content** — prevents non-admin from seeing the UI
- **useQuery returns undefined while loading** — show Skeleton loading state
- **formatCurrency(0) returns "Free"** — use `"₱0.00"` for admin financial pages
- **Cancelled events excluded from metrics** — established pattern, MUST follow
- **toLocaleString() for counts** — use for ticket numbers
- **Contract tests are pure** — no Convex runtime, test business logic only
- **Append to existing test file** — `convex/admin.test.ts` already has 45 tests
- **Per-event pending state** — lesson from 7.3 review (not needed here, no mutations)
- **Return explicit fields** — do NOT spread `{ ...event }` (leaks internal fields)

### Auth Pattern

| Query | Auth | Role Check | Notes |
|---|---|---|---|
| `getFinancialMetrics` | Required | `admin` | Full table scan + tier computation, date range filter |

### Constants

```typescript
// In the query handler (not exported):
const PLATFORM_FEE_RATE = 0.05; // 5%
const INFRASTRUCTURE_COST_CENTAVOS = 210000; // ₱2,100/month
```

### References

- Admin dashboard (metric pattern): [src/app/(dashboard)/dashboard/admin/page.tsx](src/app/(dashboard)/dashboard/admin/page.tsx)
- Admin queries (extend this file): [convex/admin.ts](convex/admin.ts)
- Admin tests (append to this file): [convex/admin.test.ts](convex/admin.test.ts)
- MetricCard component: [src/components/custom/metric-card.tsx](src/components/custom/metric-card.tsx)
- Schema: [convex/schema.ts](convex/schema.ts)
- Format utilities: [src/lib/utils/format.ts](src/lib/utils/format.ts)
- Constants: [src/lib/utils/constants.ts](src/lib/utils/constants.ts)
- RoleGuard: [src/components/custom/role-guard.tsx](src/components/custom/role-guard.tsx)
- Sidebar nav (admin financial link): [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx) lines 51-56
- Creator revenue page (reference): [src/app/(dashboard)/dashboard/revenue/page.tsx](src/app/(dashboard)/dashboard/revenue/page.tsx)

### File Locations

**New files:**
- `src/app/(dashboard)/dashboard/admin/financial/page.tsx` — Admin financial dashboard

**Modified files:**
- `convex/admin.ts` — Add `getFinancialMetrics` query
- `convex/admin.test.ts` — Append contract tests for financial metrics

**Existing files to reuse (DO NOT modify):**
- `src/components/custom/role-guard.tsx` — RoleGuard component
- `src/components/custom/metric-card.tsx` — MetricCard component
- `src/components/custom/sidebar-nav.tsx` — Admin nav already has "Financial" link
- `convex/lib/roles.ts` — `requireRole()`, `VALID_ROLES`
- `convex/lib/auth.ts` — `getAuthenticatedUser()`
- `src/lib/utils/format.ts` — `formatCurrency()`
- `src/lib/utils/constants.ts` — `EVENT_STATUS_LABELS`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `getFinancialMetrics` query to `convex/admin.ts` with date range filtering (all_time, this_month, last_month), cancelled event exclusion, GMV/fees/costs/net revenue computation, per-event breakdown sorted by revenue desc, and month-over-month comparison.
- Task 2: Created financial dashboard page with date range Select filter, 4 MetricCards (GMV, fees, costs, net revenue), month-over-month summary card with green/red diff indicators, and per-event revenue table. Zero values display as "₱0.00" not "Free".
- Task 3: Added 16 contract tests covering authorization, return shape, fee calculation (5% + rounding), infrastructure cost constant (₱2,100), net revenue formula (positive/negative/zero), cancelled event exclusion, and date range filtering boundaries.
- All 828 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): validated dateRange argument, scaled infrastructure cost by month span for All Time, filtered zero-revenue events from breakdown.

### Change Log

- 2026-03-14: Story 7.4 implementation complete — backend query, financial page, contract tests
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1: validated dateRange against accepted values. M1: infrastructure cost now scales by month count for All Time range. M2: filtered events with 0 revenue/tickets from breakdown table.

### File List

**New files:**
- `src/app/(dashboard)/dashboard/admin/financial/page.tsx`

**Modified files:**
- `convex/admin.ts` — added `getFinancialMetrics` query with constants
- `convex/admin.test.ts` — added 16 contract tests for financial metrics
