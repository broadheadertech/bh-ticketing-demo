import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { isValidRole, SELF_ASSIGNABLE_ROLES } from "./lib/roles";

export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      ...args,
      roles: ["attendee"],
      activeRole: "attendee",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    await ctx.db.patch(user._id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.email !== undefined && { email: args.email }),
      ...(args.image !== undefined && { image: args.image }),
      updatedAt: Date.now(),
    });
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return;

    await ctx.db.patch(user._id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const addRole = mutation({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!isValidRole(args.role)) {
      throw new ConvexError(`Invalid role: "${args.role}"`);
    }

    if (!(SELF_ASSIGNABLE_ROLES as readonly string[]).includes(args.role)) {
      throw new ConvexError(
        `The "${args.role}" role cannot be self-assigned. Contact an administrator.`
      );
    }

    if (user.roles.includes(args.role)) {
      return; // Already has this role
    }

    await ctx.db.patch(user._id, {
      roles: [...user.roles, args.role],
      updatedAt: Date.now(),
    });
  },
});

export const switchRole = mutation({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    if (!isValidRole(args.role)) {
      throw new ConvexError(`Invalid role: "${args.role}"`);
    }

    if (!user.roles.includes(args.role)) {
      throw new ConvexError(
        `You don't have the "${args.role}" role. Available roles: ${user.roles.join(", ")}`
      );
    }

    await ctx.db.patch(user._id, {
      activeRole: args.role,
      updatedAt: Date.now(),
    });
  },
});
