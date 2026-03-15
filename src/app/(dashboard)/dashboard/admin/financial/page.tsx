"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/format";
import { DollarSign, BarChart3, Server, TrendingUp } from "lucide-react";

export default function AdminFinancialPage() {
  return (
    <RoleGuard requiredRoles={["admin"]}>
      <AdminFinancialContent />
    </RoleGuard>
  );
}

function formatAdminCurrency(centavos: number): string {
  if (centavos === 0) return "₱0.00";
  return formatCurrency(centavos);
}

function formatDiffCurrency(centavos: number): string {
  if (centavos === 0) return "₱0.00";
  const prefix = centavos > 0 ? "+" : "−";
  return `${prefix}${formatCurrency(Math.abs(centavos))}`;
}

function AdminFinancialContent() {
  const [dateRange, setDateRange] = useState("all_time");
  const metrics = useQuery(api.admin.getFinancialMetrics, { dateRange });

  if (metrics === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { monthOverMonth: mom } = metrics;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Summary</h1>

      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_time">All Time</SelectItem>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
        </SelectContent>
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Gross Merchandise Value"
          value={formatAdminCurrency(metrics.gmv)}
          subtitle="Total platform sales"
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Platform Fees"
          value={formatAdminCurrency(metrics.platformFees)}
          subtitle="5% of GMV"
        />
        <MetricCard
          icon={<Server className="h-5 w-5" />}
          label="Infrastructure Costs"
          value={formatAdminCurrency(metrics.infrastructureCosts)}
          subtitle={`₱2,100/mo × ${Math.round(metrics.infrastructureCosts / 210000)} mo`}
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Net Platform Revenue"
          value={
            metrics.netRevenue >= 0
              ? formatAdminCurrency(metrics.netRevenue)
              : `−${formatCurrency(Math.abs(metrics.netRevenue))}`
          }
          subtitle={
            metrics.netRevenue >= 0 ? "Revenue positive" : "Below break-even"
          }
        />
      </div>

      {/* Month-over-Month Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Month-over-Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">GMV Change</p>
              <p
                className={`text-xl font-bold ${
                  mom.gmvDiff >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatDiffCurrency(mom.gmvDiff)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatAdminCurrency(mom.previousMonthGmv)} →{" "}
                {formatAdminCurrency(mom.currentMonthGmv)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Ticket Volume Change
              </p>
              <p
                className={`text-xl font-bold ${
                  mom.ticketsDiff >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {mom.ticketsDiff >= 0 ? "+" : ""}
                {mom.ticketsDiff.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {mom.previousMonthTickets.toLocaleString()} →{" "}
                {mom.currentMonthTickets.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Event Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Event</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tickets Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.eventBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No events in selected date range.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.eventBreakdown.map((event) => (
                    <TableRow key={event.eventId}>
                      <TableCell className="font-medium">
                        {event.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_STATUS_LABELS[event.status] ?? event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {event.ticketsSold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAdminCurrency(event.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
