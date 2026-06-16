"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { VenueForm } from "@/components/custom/venue-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function EditVenuePage() {
  const params = useParams();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const venueId = params.venueId as any;

  const venue = useQuery(api.venues.getVenueById, { venueId });

  return (
    <RoleGuard requiredRoles={["venue_manager"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/venues">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {venue ? venue.name : "Edit Venue"}
          </h1>
        </div>

        {venue === undefined && (
          <div className="max-w-2xl space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {venue === null && (
          <p className="text-muted-foreground">
            Venue not found or you do not have permission to edit it.
          </p>
        )}

        {venue && (
          <VenueForm
            mode="edit"
            venueId={venueId}
            initialData={{
              name: venue.name,
              location: venue.location,
              capacity: venue.capacity,
              description: venue.description,
              amenities: venue.amenities,
              photoUrls: venue.photoUrls,
              photoStorageIds: venue.photoStorageIds.map((id) => id as string),
            }}
          />
        )}
      </div>
    </RoleGuard>
  );
}
