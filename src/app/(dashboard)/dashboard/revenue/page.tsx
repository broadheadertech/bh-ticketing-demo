"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { formatCurrency } from "@/lib/utils/format";
import { EVENT_STATUS_LABELS } from "@/lib/utils/constants";
import { getStatusBadgeVariant } from "@/lib/utils/event-status";
import { cn } from "@/lib/utils";
import { DollarSign, Ticket, CalendarCheck, CalendarDays } from "lucide-react";

export default function RevenuePage() {
  const data = useQuery(api.events.getMyEventsRevenue);

  useEffect(() => {
    document.title = "Revenue | PHLive";
  }, []);

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Revenue</h1>

        {/* Metric Cards */}
        {data === undefined ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Revenue"
              value={formatCurrency(data.totals.totalRevenue)}
            />
            <MetricCard
              icon={<Ticket className="h-5 w-5" />}
              label="Total Tickets Sold"
              value={data.totals.totalTicketsSold}
            />
            <MetricCard
              icon={<CalendarCheck className="h-5 w-5" />}
              label="Events with Sales"
              value={data.totals.eventsWithSales}
            />
          </div>
        )}

        {/* Per-Event Revenue Table */}
        {data === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data.events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No events yet</h3>
              <p className="text-muted-foreground mt-1">
                Create your first event to start tracking revenue
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/create">Create Event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">
                Revenue by Event
              </h2>
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
                  {data.events.map((event) => {
                    const statusConfig = getStatusBadgeVariant(event.status);
                    const isCancelled = event.status === "cancelled";
                    return (
                      <TableRow
                        key={event._id}
                        className={cn(isCancelled && "opacity-50")}
                      >
                        <TableCell>
                          <Link
                            href={`/dashboard/events/${event._id}/sales`}
                            className="font-medium hover:underline"
                          >
                            {event.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusConfig.variant}
                            className={cn(statusConfig.className)}
                          >
                            {EVENT_STATUS_LABELS[event.status] ?? event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.ticketsSold}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(event.revenue)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleGuard>
  );
}
