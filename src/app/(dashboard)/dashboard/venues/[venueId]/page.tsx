"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, CalendarDays, BarChart3 } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

export default function VenueDashboardPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);

  return (
    <RoleGuard requiredRoles={["venue_manager"]}>
      <VenueDashboardContent venueId={venueId} />
    </RoleGuard>
  );
}

function VenueDashboardContent({ venueId }: { venueId: string }) {
  const venue = useQuery(api.venues.getVenueById, {
    venueId: venueId as any,
  });
  const events = useQuery(api.venues.getEventsByVenue, {
    venueId: venueId as any,
  });

  if (venue === undefined || events === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (venue === null) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Venue not found.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard/venues">Back to My Venues</Link>
        </Button>
      </div>
    );
  }

  const now = Date.now();
  const upcomingEvents = events.filter(
    (e) => e.date >= now && e.status !== "cancelled"
  );
  const totalSold = events
    .filter((e) => e.status !== "cancelled")
    .reduce((sum, e) => sum + e.totalSold, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/venues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{venue.name}</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcomingEvents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{events.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSold}</p>
          </CardContent>
        </Card>
      </div>

      {/* Events table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Events at this venue</h2>
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <p className="text-muted-foreground">
              No events have selected this venue yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tickets Sold</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell className="font-medium">
                      {event.title}
                    </TableCell>
                    <TableCell>{formatDate(event.date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.status === "published"
                            ? "default"
                            : event.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.totalSold}</TableCell>
                    <TableCell>{event.creatorName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {event.creatorEmail}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
