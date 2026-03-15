"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import Link from "next/link";
import { RoleGuard } from "@/components/custom/role-guard";
import { ImageUpload } from "@/components/custom/image-upload";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ArtworkUploadPage() {
  const params = useParams<{ eventId: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventId = params.eventId as any;

  const event = useQuery(api.events.getEventById, { eventId });

  useEffect(() => {
    document.title = "Upload Artwork | PHLive";
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
          <h1 className="text-2xl font-bold">Upload Event Artwork</h1>
        </div>

        {/* getEventById throws ConvexError on not-found/no-access; caught by error.tsx */}
        {event === undefined ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              {event.title} &mdash;{" "}
              <span className="capitalize">{event.eventType}</span>
            </p>
            <ImageUpload
              eventId={eventId}
              eventTitle={event.title}
              currentImageUrl={event.artworkUrl}
            />
          </>
        )}
      </div>
    </RoleGuard>
  );
}
