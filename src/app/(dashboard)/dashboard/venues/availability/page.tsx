"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { AvailabilityCalendar } from "@/components/custom/availability-calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

export default function VenueAvailabilityPage() {
  const venues = useQuery(api.venues.getVenuesByManager);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (venues && venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0]._id as string);
    }
  }, [venues, selectedVenueId]);

  return (
    <RoleGuard requiredRoles={["venue_manager"]}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Venue Availability</h1>

        {/* Loading */}
        {venues === undefined && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full max-w-lg" />
            <Skeleton className="h-10 w-48" />
          </div>
        )}

        {/* Empty state */}
        {venues !== undefined && venues.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground mb-4">
              Create a venue first to manage availability.
            </p>
            <Button asChild>
              <Link href="/dashboard/venues/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Venue
              </Link>
            </Button>
          </div>
        )}

        {/* Venue selector (multi-venue) + calendar */}
        {venues !== undefined && venues.length > 0 && (
          <div className="space-y-4">
            {venues.length > 1 && (
              <div className="max-w-xs">
                <Select
                  value={selectedVenueId ?? ""}
                  onValueChange={setSelectedVenueId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue) => (
                      <SelectItem key={venue._id} value={venue._id as string}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedVenueId && (
              <AvailabilityCalendar venueId={selectedVenueId} />
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
