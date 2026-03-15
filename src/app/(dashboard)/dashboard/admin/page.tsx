"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { Users, Calendar, Ticket, DollarSign, Mic2 } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <RoleGuard requiredRoles={["admin"]}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  const metrics = useQuery(api.admin.getAdminDashboardMetrics);

  if (metrics === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Total Users"
          value={metrics.totalUsers.toLocaleString()}
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Total Events"
          value={metrics.totalEvents.toLocaleString()}
          subtitle={`${metrics.eventsByStatus.published} published`}
        />
        <MetricCard
          icon={<Ticket className="h-5 w-5" />}
          label="Total Tickets Sold"
          value={metrics.totalTicketsSold.toLocaleString()}
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Revenue (GMV)"
          value={metrics.totalRevenue === 0 ? "₱0.00" : formatCurrency(metrics.totalRevenue)}
          subtitle="Gross merchandise value"
        />
        <MetricCard
          icon={<Mic2 className="h-5 w-5" />}
          label="Active Creators"
          value={metrics.activeCreators.toLocaleString()}
          subtitle="Creators with non-draft events"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {metrics.eventsByStatus.draft.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Draft</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics.eventsByStatus.published.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {metrics.eventsByStatus.cancelled.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
