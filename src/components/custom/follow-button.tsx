"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { showSuccess, showErrorFromCatch } from "@/lib/utils/toast-helpers";

interface FollowButtonProps {
  entityType: "creator" | "venue";
  entityId: string;
}

export function FollowButton({ entityType, entityId }: FollowButtonProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const isFollowing = useQuery(api.follows.isFollowing, {
    entityType,
    entityId,
  });
  const followerCount = useQuery(api.follows.getFollowerCount, {
    entityType,
    entityId,
  });
  const follow = useMutation(api.follows.followEntity);
  const unfollow = useMutation(api.follows.unfollowEntity);
  const [isPending, setIsPending] = useState(false);

  if (!currentUser) return null;

  async function handleToggle() {
    setIsPending(true);
    try {
      if (isFollowing) {
        await unfollow({ entityType, entityId });
        showSuccess("Unfollowed");
      } else {
        await follow({ entityType, entityId });
        showSuccess("Following!");
      }
    } catch (error) {
      showErrorFromCatch(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
    >
      <Heart
        className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`}
      />
      {isFollowing ? "Following" : "Follow"}
      {followerCount !== undefined && followerCount > 0 && (
        <span className="ml-1 text-xs">
          ({followerCount.toLocaleString()})
        </span>
      )}
    </Button>
  );
}
