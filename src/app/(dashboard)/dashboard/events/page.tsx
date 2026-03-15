"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/custom/role-guard";
import { MetricCard } from "@/components/custom/metric-card";
import { formatDate } from "@/lib/utils/format";
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_FILTERS,
} from "@/lib/utils/constants";
import { getStatusBadgeVariant } from "@/lib/utils/event-status";
import {
  filterEventsByStatus,
  filterEventsByType,
} from "@/lib/utils/event-filters";
import { cn } from "@/lib/utils";
import {
  Plus,
  Settings,
  ImagePlus,
  ImageOff,
  Eye,
  CalendarDays,
  CalendarCheck,
  Ticket,
} from "lucide-react";
import Image from "next/image";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EventsPage() {
  const data = useQuery(api.events.getMyEventsWithStats);
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusFilter = searchParams.get("status") ?? "all";
  const typeFilter = searchParams.get("type") ?? "all";

  const events = data?.events;
  const summary = data?.summary;

  const filteredEvents = events
    ? filterEventsByType(filterEventsByStatus(events, statusFilter), typeFilter)
    : undefined;

  useEffect(() => {
    document.title = "My Events | PHLive";
  }, []);

  function handleStatusFilterChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/dashboard/events${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleTypeFilterChange(type: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    router.push(`/dashboard/events${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Events</h1>
          <Button asChild>
            <Link href="/dashboard/events/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Summary Metrics */}
        {!summary ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Total Events"
              value={summary.totalEvents}
            />
            <MetricCard
              icon={<CalendarCheck className="h-5 w-5" />}
              label="Upcoming Events"
              value={summary.upcomingEvents}
            />
            <MetricCard
              icon={<Ticket className="h-5 w-5" />}
              label="Tickets Sold"
              value={summary.totalTicketsSold}
            />
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleStatusFilterChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Event Type Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {EVENT_TYPE_FILTERS.map((filter) => (
              <Button
                key={filter.value}
                variant={typeFilter === filter.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleTypeFilterChange(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Events List */}
        {filteredEvents === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : events && events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No events yet</h3>
              <p className="text-muted-foreground mt-1">
                Create your first event and start selling tickets
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events/create">Create Event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>
                No{statusFilter !== "all" ? ` ${EVENT_STATUS_LABELS[statusFilter]?.toLowerCase() ?? statusFilter}` : ""}{typeFilter !== "all" ? ` ${(EVENT_TYPE_FILTERS.find((f) => f.value === typeFilter)?.label ?? typeFilter).toLowerCase()}` : ""} events found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const statusConfig = getStatusBadgeVariant(event.status);
              const isDraft = event.status === "draft";
              const isCancelled = event.status === "cancelled";

              return (
                <Card key={event._id} className="overflow-hidden">
                  {event.artworkUrl ? (
                    <div className="relative aspect-video">
                      <Image
                        src={event.artworkUrl}
                        alt={`${event.title} event artwork`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-video bg-muted">
                      <ImageOff className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}{" "}
                          &middot; {formatDate(event.date)} &middot; {event.time}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Ticket className="h-3.5 w-3.5" />
                          {event.totalCapacity > 0 ? (
                            <span>
                              {event.totalSold} / {event.totalCapacity} sold
                            </span>
                          ) : (
                            <span>No tickets configured</span>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant={statusConfig.variant}
                        className={cn(statusConfig.className)}
                      >
                        {EVENT_STATUS_LABELS[event.status] ?? event.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2 flex-wrap">
                      {isDraft && (
                        <>
                          <Button variant="default" size="sm" asChild>
                            <Link href={`/dashboard/events/${event._id}`}>
                              Manage Event
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/events/${event._id}/artwork`}>
                              <ImagePlus className="mr-2 h-4 w-4" />
                              Upload Artwork
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/events/${event._id}/tickets`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Configure Tickets
                            </Link>
                          </Button>
                        </>
                      )}

                      {!isDraft && (
                        <Button
                          variant={isCancelled ? "ghost" : "outline"}
                          size="sm"
                          asChild
                        >
                          <Link href={`/dashboard/events/${event._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Event
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
