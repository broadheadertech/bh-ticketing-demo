import { mutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { internal } from "./_generated/api";

// Registers (or re-points) this device's Expo push token to the signed-in user.
// Called by the mobile app's NotificationsProvider after permission is granted.
export const savePushToken = mutation({
  args: {
    token: v.string(),
    platform: v.optional(v.string()),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: user._id,
        platform: args.platform,
        deviceName: args.deviceName,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("pushTokens", {
      userId: user._id,
      token: args.token,
      platform: args.platform,
      deviceName: args.deviceName,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Unregister this device (e.g. on sign-out).
export const removePushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

export const getTokensForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.map((r) => r.token);
  },
});

// Delivers a push to all of a user's devices via the Expo push service.
// Scheduled by notifications:createNotification, so every in-app notification
// also fires a device push. Best-effort — never throws into the caller.
export const sendToUser = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tokens: string[] = await ctx.runQuery(internal.push.getTokensForUser, {
      userId: args.userId,
    });
    const valid = tokens.filter((t) => t.startsWith("ExponentPushToken"));
    if (valid.length === 0) return;

    const data = {
      entityType: args.entityType,
      entityId: args.entityId,
      type: args.type,
    };
    const messages = valid.map((to) => ({
      to,
      sound: "default",
      title: args.title,
      body: args.body,
      data,
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.error("[push] Expo send failed:", err);
    }
  },
});
