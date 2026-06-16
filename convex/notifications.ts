import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);

    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entityType,
      entityId: n.entityId,
      read: n.read,
      createdAt: n.createdAt,
    }));
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("Notification not found");
    if (notification.userId !== user._id) {
      throw new ConvexError("Not your notification");
    }

    if (!notification.read) {
      await ctx.db.patch(args.notificationId, { read: true });
    }
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", user._id).eq("read", false)
      )
      .collect();

    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

// ---------------------------------------------------------------------------
// Internal mutation (called by other Convex functions, not exposed as API)
// ---------------------------------------------------------------------------

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      entityType: args.entityType,
      entityId: args.entityId,
      read: false,
      createdAt: Date.now(),
    });

    // Also deliver a device push (best-effort; no-op if the user has no tokens).
    await ctx.scheduler.runAfter(0, internal.push.sendToUser, {
      userId: args.userId,
      title: args.title,
      body: args.message,
      entityType: args.entityType,
      entityId: args.entityId,
      type: args.type,
    });
  },
});
