# Story 8.1: Follow System

Status: done

## Story

As an **attendee**,
I want to follow artists and venues,
so that I stay updated on their new events.

## Acceptance Criteria

1. **AC1 — Follow action:** On a public venue detail page or event detail page (near creator info), an authenticated user sees a "Follow" button. Clicking it adds a follow record and changes the button to "Following" with a success toast. Unauthenticated users do not see the button.

2. **AC2 — Unfollow action:** Clicking "Following" removes the follow record, reverts the button to "Follow", and shows a toast.

3. **AC3 — Following dashboard:** An attendee navigating to `/dashboard/following` sees a list of all followed creators and venues, with name, type badge, and link to their public page. Empty state shown when not following anyone.

4. **AC4 — Data model:** The `follows` table stores: `followerId` (v.id("users")), `entityType` (v.string() — "creator" | "venue"), `entityId` (v.string()), `createdAt` (v.number()). Indexes: `by_follower` on `[followerId]`, `by_entity` on `[entityType, entityId]`, `by_follower_entity` on `[followerId, entityType, entityId]` (uniqueness). Duplicate follows are prevented.

5. **AC5 — Follower count:** Public venue detail and event detail pages show follower count (e.g., "42 followers") for the entity. Derived from `follows` table count.

6. **AC6 — Contract tests:** Pure contract tests validate: auth required for mutations, duplicate follow prevention, entityType validation, follow/unfollow logic, return shapes, and follower count computation.

## Tasks / Subtasks

- [x] Task 1: Schema update — add follows table (AC: 4)
  - [x] 1.1 Add `follows` table to `convex/schema.ts` with fields: `followerId` (v.id("users")), `entityType` (v.string()), `entityId` (v.string()), `createdAt` (v.number()). Indexes: `by_follower` on `[followerId]`, `by_entity` on `[entityType, entityId]`, `by_follower_entity` on `[followerId, entityType, entityId]`.

- [x] Task 2: Backend queries and mutations (AC: 1, 2, 3, 4, 5)
  - [x] 2.1 Create `convex/follows.ts`. Add `followEntity` mutation — requires auth. Args: `entityType: v.string()`, `entityId: v.string()`. Validates entityType is "creator" or "venue". Checks for existing follow via `by_follower_entity` index — throws if duplicate. Inserts follow record.
  - [x] 2.2 Add `unfollowEntity` mutation — requires auth. Args: `entityType: v.string()`, `entityId: v.string()`. Finds existing follow via `by_follower_entity` index — throws if not found. Deletes the record.
  - [x] 2.3 Add `isFollowing` query — requires auth (use `getOptionalAuthenticatedUser`). Args: `entityType`, `entityId`. Returns boolean. Returns `false` if not authenticated.
  - [x] 2.4 Add `getMyFollowing` query — requires auth. Returns all follow records for the current user, joined with entity name (creator name via users table, venue name via venues table). Returns `{ entityType, entityId, entityName, createdAt }[]`.
  - [x] 2.5 Add `getFollowerCount` query — no auth required (public). Args: `entityType`, `entityId`. Returns number of followers.

- [x] Task 3: FollowButton component (AC: 1, 2, 5)
  - [x] 3.1 Create `src/components/custom/follow-button.tsx` — `"use client"`. Props: `entityType: "creator" | "venue"`, `entityId: string`. Uses `useQuery(api.users.getCurrentUser)` to check auth — returns `null` if not authenticated. Uses `useQuery(api.follows.isFollowing, ...)` for button state. Uses `useQuery(api.follows.getFollowerCount, ...)` for count display. Shows "Follow" / "Following" with follower count. Tracks `isPending` state.
  - [x] 3.2 Integrate FollowButton into `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — next to venue name/header area. Pass `entityType="venue"` and `entityId={venue._id}`.
  - [x] 3.3 Integrate FollowButton into `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — next to creator name in the "By [Creator]" section. Pass `entityType="creator"` and `entityId={event.creatorId}`.

- [x] Task 4: Following dashboard page (AC: 3)
  - [x] 4.1 Create `src/app/(dashboard)/dashboard/following/page.tsx` — `"use client"`. Uses `useQuery(api.follows.getMyFollowing)`. Shows list of followed entities with name, type badge ("Creator" / "Venue"), and link to public page. Skeleton loading state. Empty state: "You're not following anyone yet."
  - [x] 4.2 Add "Following" nav item to sidebar for `attendee` role in `src/components/custom/sidebar-nav.tsx`. Icon: `Heart` from lucide-react. Href: `/dashboard/following`.

- [x] Task 5: Contract tests (AC: 6)
  - [x] 5.1 Create `convex/follows.test.ts`: auth required for followEntity/unfollowEntity mutations.
  - [x] 5.2 Test duplicate follow prevention (same user + entityType + entityId).
  - [x] 5.3 Test entityType validation (only "creator" and "venue" accepted).
  - [x] 5.4 Test unfollow logic (record must exist to unfollow).
  - [x] 5.5 Test getMyFollowing return shape (entityType, entityId, entityName, createdAt).
  - [x] 5.6 Test follower count computation.

## Dev Notes

### Schema Change — follows Table

```typescript
follows: defineTable({
  followerId: v.id("users"),
  entityType: v.string(), // "creator" | "venue"
  entityId: v.string(),   // userId for creator, venueId for venue
  createdAt: v.number(),
})
  .index("by_follower", ["followerId"])
  .index("by_entity", ["entityType", "entityId"])
  .index("by_follower_entity", ["followerId", "entityType", "entityId"]),
```

The `by_follower_entity` composite index enables both duplicate prevention (`.unique()`) and efficient unfollow lookups.

### Backend Pattern — convex/follows.ts

```typescript
import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthenticatedUser, getOptionalAuthenticatedUser } from "./lib/auth";

const VALID_ENTITY_TYPES = ["creator", "venue"];

export const followEntity = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!VALID_ENTITY_TYPES.includes(args.entityType)) {
      throw new ConvexError(`Invalid entity type: ${args.entityType}`);
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_entity", (q) =>
        q.eq("followerId", user._id)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .unique();

    if (existing) throw new ConvexError("Already following");

    await ctx.db.insert("follows", {
      followerId: user._id,
      entityType: args.entityType,
      entityId: args.entityId,
      createdAt: Date.now(),
    });
  },
});
```

### isFollowing Query — Use getOptionalAuthenticatedUser

```typescript
export const isFollowing = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuthenticatedUser(ctx);
    if (!user) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_entity", (q) =>
        q.eq("followerId", user._id)
          .eq("entityType", args.entityType)
          .eq("entityId", args.entityId)
      )
      .unique();

    return !!existing;
  },
});
```

### getMyFollowing — Join with Entity Names

```typescript
export const getMyFollowing = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    return Promise.all(
      follows.map(async (f) => {
        let entityName = "Unknown";
        if (f.entityType === "creator") {
          const creator = await ctx.db.get(f.entityId as any);
          entityName = creator?.name ?? "Unknown";
        } else if (f.entityType === "venue") {
          const venue = await ctx.db.get(f.entityId as any);
          entityName = venue?.name ?? "Unknown";
        }
        return {
          entityType: f.entityType,
          entityId: f.entityId,
          entityName,
          createdAt: f.createdAt,
        };
      })
    );
  },
});
```

### FollowButton Component

```typescript
// src/components/custom/follow-button.tsx
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
  const isFollowing = useQuery(api.follows.isFollowing, { entityType, entityId });
  const followerCount = useQuery(api.follows.getFollowerCount, { entityType, entityId });
  const follow = useMutation(api.follows.followEntity);
  const unfollow = useMutation(api.follows.unfollowEntity);
  const [isPending, setIsPending] = useState(false);

  if (!currentUser) return null; // Hide for unauthenticated users

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
      <Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />
      {isFollowing ? "Following" : "Follow"}
      {followerCount !== undefined && followerCount > 0 && (
        <span className="ml-1 text-xs">({followerCount.toLocaleString()})</span>
      )}
    </Button>
  );
}
```

### Sidebar Nav Update

Add to `attendee` nav items in `src/components/custom/sidebar-nav.tsx`:

```typescript
attendee: [
  // ... existing items ...
  { label: "Following", href: "/dashboard/following", icon: Heart },
],
```

Import `Heart` from `lucide-react` at the top of the file.

### Integration Points

**Venue detail page** (`venue-detail-client.tsx`):
- Add `<FollowButton entityType="venue" entityId={venue._id} />` near the venue name/header

**Event detail page** (`event-detail-client.tsx`):
- Add `<FollowButton entityType="creator" entityId={event.creatorId} />` next to the "By [Creator Name]" section

### Previous Story Learnings

- **Auth guard in components** — use `useQuery(api.users.getCurrentUser)` and return null if not auth'd (pattern from request-role-button.tsx)
- **isPending state** — track per-button to prevent double-click
- **Public queries** — `getFollowerCount` needs no auth (public data)
- **Optional auth queries** — `isFollowing` uses `getOptionalAuthenticatedUser` to gracefully handle anonymous users
- **Contract tests are pure** — no Convex runtime, test business logic only
- **Return explicit fields** — do NOT spread records

### Auth Pattern

| Query/Mutation | Auth | Notes |
|---|---|---|
| `followEntity` | Required | Validates entityType, prevents duplicates |
| `unfollowEntity` | Required | Must have existing follow |
| `isFollowing` | Optional | Returns false if not auth'd |
| `getMyFollowing` | Required | Joins with entity names |
| `getFollowerCount` | None (public) | Count query |

### References

- Auth helpers: [convex/lib/auth.ts](convex/lib/auth.ts) — `getAuthenticatedUser`, `getOptionalAuthenticatedUser`
- Request role button (component pattern): [src/components/custom/request-role-button.tsx](src/components/custom/request-role-button.tsx)
- Venue detail (integration): [src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx](src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx)
- Event detail (integration): [src/app/(public)/events/[eventId]/_components/event-detail-client.tsx](src/app/(public)/events/[eventId]/_components/event-detail-client.tsx)
- Sidebar nav: [src/components/custom/sidebar-nav.tsx](src/components/custom/sidebar-nav.tsx)
- Toast helpers: [src/lib/utils/toast-helpers.ts](src/lib/utils/toast-helpers.ts)
- Schema: [convex/schema.ts](convex/schema.ts)
- Users (getCurrentUser): [convex/users.ts](convex/users.ts)
- Creator profiles: [convex/creatorProfiles.ts](convex/creatorProfiles.ts)

### File Locations

**New files:**
- `convex/follows.ts` — Follow/unfollow mutations and queries
- `convex/follows.test.ts` — Contract tests
- `src/components/custom/follow-button.tsx` — Reusable FollowButton component
- `src/app/(dashboard)/dashboard/following/page.tsx` — Following dashboard page

**Modified files:**
- `convex/schema.ts` — Add `follows` table
- `src/components/custom/sidebar-nav.tsx` — Add "Following" nav item for attendee role
- `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — Add FollowButton
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — Add FollowButton

**Existing files to reuse (DO NOT modify beyond integration):**
- `convex/lib/auth.ts` — `getAuthenticatedUser()`, `getOptionalAuthenticatedUser()`
- `convex/users.ts` — `getCurrentUser` query
- `src/lib/utils/toast-helpers.ts` — `showSuccess()`, `showErrorFromCatch()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `follows` table to schema with 3 indexes (by_follower, by_entity, by_follower_entity)
- Task 2: Created `convex/follows.ts` with 5 exports: `followEntity`, `unfollowEntity` mutations + `isFollowing`, `getMyFollowing`, `getFollowerCount` queries. Entity type validation, duplicate prevention, optional auth for isFollowing.
- Task 3: Created `FollowButton` component (auth-guarded, shows Follow/Following + count). Integrated into venue detail page (next to venue name) and event detail page (next to creator info).
- Task 4: Created following dashboard page at `/dashboard/following` with empty state. Added "Following" nav item with Heart icon to attendee sidebar.
- Task 5: Created 15 contract tests in `convex/follows.test.ts` covering auth, entity type validation, duplicate prevention, unfollow logic, return shapes, follower count.
- All 843 tests pass, zero regressions.
- Code review fixes (H1, M1, M2): validate entity exists before follow, creator link to filtered events, entityType validation in unfollowEntity.

### Change Log

- 2026-03-14: Story 8.1 implementation complete — schema, backend, components, dashboard, tests
- 2026-03-14: Code review — fixed 3 issues (1H, 2M). H1: validate entity exists via db.get before inserting follow. M1: creator link goes to `/events?creator=ID` instead of generic `/events`. M2: added entityType validation to unfollowEntity.

### File List

**New files:**
- `convex/follows.ts` — Follow/unfollow mutations and queries
- `convex/follows.test.ts` — 15 contract tests
- `src/components/custom/follow-button.tsx` — Reusable FollowButton component
- `src/app/(dashboard)/dashboard/following/page.tsx` — Following dashboard page

**Modified files:**
- `convex/schema.ts` — added `follows` table
- `src/components/custom/sidebar-nav.tsx` — added "Following" nav item for attendee role
- `src/app/(public)/venues/[venueId]/_components/venue-detail-client.tsx` — added FollowButton
- `src/app/(public)/events/[eventId]/_components/event-detail-client.tsx` — added FollowButton
