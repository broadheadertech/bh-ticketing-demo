"use client";

import Link from "next/link";
import { RoleGuard } from "@/components/custom/role-guard";
import { VenueForm } from "@/components/custom/venue-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreateVenuePage() {
  return (
    <RoleGuard requiredRoles={["venue_manager"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/venues">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Create Venue</h1>
        </div>
        <VenueForm mode="create" />
      </div>
    </RoleGuard>
  );
}
