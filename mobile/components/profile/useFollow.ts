// useFollow.ts — follow state + toggle for a creator/venue entity.
// Wraps the convex follows API (isFollowing / followEntity / unfollowEntity)
// and getFollowerCount so profile screens can show a live follower number and a
// Follow/Following button.
import { useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../lib/convex";

export type FollowEntityType = "creator" | "venue";

export function useFollow(entityType: FollowEntityType, entityId: string | undefined) {
  const enabled = !!entityId;
  const following = useQuery(
    api.follows.isFollowing,
    enabled ? { entityType, entityId: entityId! } : "skip",
  );
  const followerCount = useQuery(
    api.follows.getFollowerCount,
    enabled ? { entityType, entityId: entityId! } : "skip",
  );

  const follow = useMutation(api.follows.followEntity);
  const unfollow = useMutation(api.follows.unfollowEntity);
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (!entityId || busy) return;
    setBusy(true);
    try {
      if (following) {
        await unfollow({ entityType, entityId });
      } else {
        await follow({ entityType, entityId });
      }
    } catch {
      // swallow — optimistic UI not needed; convex query will reconcile
    } finally {
      setBusy(false);
    }
  }, [entityId, busy, following, follow, unfollow, entityType]);

  return {
    following: following ?? false,
    loading: following === undefined,
    followerCount: followerCount ?? 0,
    busy,
    toggle,
  };
}
