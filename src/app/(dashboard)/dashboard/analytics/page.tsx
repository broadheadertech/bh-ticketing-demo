"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { LineChart, DollarSign, Ticket, Calendar, Star } from "lucide-react";

export default function CreatorAnalyticsPage() {
  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <CreatorAnalyticsContent />
    </RoleGuard>
  );
}

function CreatorAnalyticsContent() {
  const data = useQuery(api.analytics.getCreatorOverviewAnalytics);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (data.totals.totalEvents === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <LineChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <LineChart className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No events yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Create your first event to start seeing analytics.
          </p>
          <Button asChild>
            <Link href="/dashboard/events/create">Create Event</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LineChart className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Lifetime Revenue"
          value={formatCurrency(data.totals.totalRevenue)}
        />
        <MetricCard
          icon={<Ticket className="h-5 w-5" />}
          label="Total Tickets Sold"
          value={data.totals.totalTicketsSold.toLocaleString()}
        />
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Total Events"
          value={data.totals.totalEvents.toLocaleString()}
        />
        <MetricCard
          icon={<Star className="h-5 w-5" />}
          label="Average Rating"
          value={data.totals.avgRating > 0 ? `${data.totals.avgRating} / 5` : "N/A"}
          subtitle={
            data.totals.totalReviews > 0
              ? `${data.totals.totalReviews} review${data.totals.totalReviews !== 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Events by Revenue</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.eventBreakdown.map((event) => (
                <TableRow key={event.eventId}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    <Link
                      href={`/dashboard/events/${event.eventId}/analytics`}
                      className="hover:underline"
                    >
                      {event.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {event.date > 0 ? formatDate(event.date) : "Not set"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.status}</Badge>
                  </TableCell>
                  <TableCell>{event.ticketsSold.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(event.revenue)}</TableCell>
                  <TableCell>
                    {event.rating > 0 ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {event.rating}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
