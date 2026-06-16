"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import Link from "next/link";
import { RoleGuard } from "@/components/custom/role-guard";
import { TicketTierBuilder } from "@/components/custom/ticket-tier-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { EventType } from "@/lib/validators/event";

export default function TicketTierConfigPage() {
  const params = useParams<{ eventId: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;

  const event = useQuery(api.events.getEventById, { eventId });
  const tiers = useQuery(api.ticketTiers.getTiersByEventId, { eventId });

  useEffect(() => {
    document.title = "Configure Ticket Tiers | TIX.PH";
  }, []);

  return (
    <RoleGuard requiredRoles={["artist", "organization"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/events">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Configure Ticket Tiers</h1>
        </div>

        {/* getEventById throws ConvexError on not-found/no-access; caught by error.tsx */}
        {event === undefined || tiers === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              {event.title} &mdash;{" "}
              <span className="capitalize">{event.eventType}</span>
            </p>
            <TicketTierBuilder
              eventId={eventId}
              eventType={event.eventType as EventType}
              initialTiers={
                tiers.length > 0
                  ? tiers.map((t) => ({
                      name: t.name,
                      price: t.price,
                      quantity: t.quantity,
                      description: t.description ?? undefined,
                    }))
                  : undefined
              }
            />
          </>
        )}
      </div>
    </RoleGuard>
  );
}
