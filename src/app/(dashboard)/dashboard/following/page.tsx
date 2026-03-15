"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function FollowingPage() {
  const following = useQuery(api.follows.getMyFollowing);

  if (following === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Following</h1>

      {following.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            You&apos;re not following anyone yet.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Follow artists and venues from their public pages to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {following.map((item) => (
            <Link
              key={`${item.entityType}-${item.entityId}`}
              href={
                item.entityType === "venue"
                  ? `/venues/${item.entityId}`
                  : `/events?creator=${item.entityId}`
              }
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart className="h-4 w-4 fill-current text-red-500" />
                <span className="font-medium">{item.entityName}</span>
              </div>
              <Badge variant="outline">
                {item.entityType === "creator" ? "Creator" : "Venue"}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
