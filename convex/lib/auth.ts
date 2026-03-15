import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Returns the authenticated user or null if not authenticated / not found.
 * Use in queries that should gracefully return null for unauthenticated users.
 */
export async function getOptionalAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Returns the authenticated user or throws ConvexError.
 * Use in mutations and queries that require authentication.
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const user = await getOptionalAuthenticatedUser(ctx);
  if (!user) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    throw new ConvexError("User not found in database");
  }
  return user;
}
