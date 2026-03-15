"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, DollarSign, Ticket, Users, ScanLine } from "lucide-react";

export default function EventAnalyticsPage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;
  const data = useQuery(api.analytics.getEventAnalytics, { eventId });

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      {data === undefined ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/events/${eventId}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">
              Analytics: {data.event.title}
            </h1>
          </div>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Revenue"
              value={formatCurrency(data.metrics.totalRevenue)}
            />
            <MetricCard
              icon={<Ticket className="h-5 w-5" />}
              label="Tickets Sold"
              value={`${data.metrics.totalSold.toLocaleString()} / ${data.metrics.totalCapacity.toLocaleString()}`}
              subtitle={`${Math.round((data.metrics.totalSold / Math.max(1, data.metrics.totalCapacity)) * 100)}% sold`}
            />
            <MetricCard
              icon={<Users className="h-5 w-5" />}
              label="Unique Buyers"
              value={data.metrics.uniqueBuyers.toLocaleString()}
              subtitle={`Avg ${formatCurrency(data.metrics.avgTicketPrice)}/ticket`}
            />
            <MetricCard
              icon={<ScanLine className="h-5 w-5" />}
              label="Attendance"
              value={`${data.metrics.scanRate}%`}
              subtitle={`${data.metrics.scannedCount} of ${data.metrics.totalSold} scanned`}
            />
          </div>

          {/* Sales by Tier */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Sales by Tier</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>% of Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tierBreakdown.map((tier) => (
                    <TableRow key={tier.name}>
                      <TableCell className="font-medium">{tier.name}</TableCell>
                      <TableCell>{formatCurrency(tier.price)}</TableCell>
                      <TableCell>{tier.soldCount.toLocaleString()}</TableCell>
                      <TableCell>{tier.remaining.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(tier.revenue)}</TableCell>
                      <TableCell>
                        {data.metrics.totalSold > 0
                          ? `${Math.round((tier.soldCount / data.metrics.totalSold) * 100)}%`
                          : "0%"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Sales Timeline */}
          {data.salesTimeline.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Sales Timeline</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Tickets Sold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesTimeline.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{day.date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{day.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Scan Timeline */}
          {data.scanTimeline.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Check-in Timeline</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Check-ins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.scanTimeline.map((entry) => (
                      <TableRow key={entry.hour}>
                        <TableCell>{entry.hour}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </RoleGuard>
  );
}
