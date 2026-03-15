"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { RoleGuard } from "@/components/custom/role-guard";
import { VenueCard, VenueCardSkeleton } from "@/components/custom/venue-form";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, LayoutDashboard } from "lucide-react";

export default function VenuesPage() {
  const venues = useQuery(api.venues.getVenuesByManager);

  return (
    <RoleGuard requiredRoles={["venue_manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Venues</h1>
          <Button asChild>
            <Link href="/dashboard/venues/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Venue
            </Link>
          </Button>
        </div>

        {venues === undefined && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <VenueCardSkeleton />
            <VenueCardSkeleton />
            <VenueCardSkeleton />
          </div>
        )}

        {venues !== undefined && venues.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <p className="text-muted-foreground mb-4">
              No venues yet. Create your first venue to get started.
            </p>
            <Button asChild>
              <Link href="/dashboard/venues/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Venue
              </Link>
            </Button>
          </div>
        )}

        {venues !== undefined && venues.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue._id} className="relative">
                <VenueCard venue={venue} />
                <div className="absolute top-2 left-2 flex gap-1">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/dashboard/venues/${venue._id}`}>
                      <LayoutDashboard className="mr-1 h-3 w-3" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/dashboard/venues/${venue._id}/edit`}>
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
