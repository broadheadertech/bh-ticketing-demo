import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole, requireRole } from "./lib/roles";

const KINDS = ["sponsorship", "fundraiser", "concert_request"];
const CREATOR_ROLES = ["artist", "organization", "admin"];

async function enrich(ctx: QueryCtx, rows: Doc<"campaigns">[]) {
  const users = await ctx.db.query("users").collect();
  const nameById = new Map(users.map((u) => [u._id as string, u.name]));
  return rows.map((r) => ({
    ...r,
    creatorName: nameById.get(r.creatorId as string) ?? "Unknown",
    targetArtistName: r.targetArtistId ? nameById.get(r.targetArtistId as string) ?? null : null,
  }));
}

export const create = mutation({
  args: {
    kind: v.string(),
    title: v.string(),
    description: v.string(),
    goalAmount: v.optional(v.number()),
    targetCity: v.optional(v.string()),
    targetArtistId: v.optional(v.id("users")),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!KINDS.includes(args.kind)) throw new ConvexError("Invalid campaign kind");
    // Sponsorships & fundraisers are creator-run; anyone may request a concert.
    if (args.kind !== "concert_request") requireAnyRole(user, CREATOR_ROLES);

    const title = args.title.trim();
    if (!title) throw new ConvexError("Title is required");
    const now = Date.now();
    return await ctx.db.insert("campaigns", {
      kind: args.kind,
      creatorId: user._id,
      title,
      description: args.description.trim(),
      goalAmount: args.goalAmount,
      raisedAmount: 0,
      supporterCount: 0,
      targetCity: args.targetCity,
      targetArtistId: args.targetArtistId,
      status: "pending", // admin approves before it goes active
      deadline: args.deadline,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Campaigns the signed-in user created (organizer/artist view).
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .order("desc")
      .collect();
    return enrich(ctx, rows);
  },
});

// Concert requests targeting the signed-in artist (demand inbox).
export const listForArtist = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_target_artist", (q) => q.eq("targetArtistId", user._id))
      .order("desc")
      .collect();
    return enrich(ctx, rows);
  },
});

// All campaigns for admin moderation.
export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");
    const rows = await ctx.db.query("campaigns").order("desc").collect();
    return enrich(ctx, rows);
  },
});

// Active campaigns of a kind (public-facing list, any signed-in user).
export const listActive = query({
  args: { kind: v.string() },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);
    const rows = await ctx.db
      .query("campaigns")
      .withIndex("by_kind_status", (q) => q.eq("kind", args.kind).eq("status", "active"))
      .order("desc")
      .collect();
    return enrich(ctx, rows);
  },
});

export const support = mutation({
  args: { campaignId: v.id("campaigns"), amount: v.number(), message: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const c = await ctx.db.get(args.campaignId);
    if (!c) throw new ConvexError("Campaign not found");
    if (c.status !== "active") throw new ConvexError("This campaign isn't accepting support yet");
    if (args.amount < 0) throw new ConvexError("Invalid amount");

    await ctx.db.insert("campaignContributions", {
      campaignId: args.campaignId,
      supporterId: user._id,
      supporterEmail: user.email,
      amount: args.amount,
      message: args.message,
      createdAt: Date.now(),
    });
    const raised = c.raisedAmount + args.amount;
    await ctx.db.patch(args.campaignId, {
      raisedAmount: raised,
      supporterCount: c.supporterCount + 1,
      status: c.goalAmount && raised >= c.goalAmount ? "funded" : c.status,
      updatedAt: Date.now(),
    });
  },
});

// One interest vote per user for a concert request.
export const vote = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const c = await ctx.db.get(args.campaignId);
    if (!c) throw new ConvexError("Campaign not found");
    const existing = await ctx.db
      .query("campaignContributions")
      .withIndex("by_campaign_supporter", (q) =>
        q.eq("campaignId", args.campaignId).eq("supporterId", user._id)
      )
      .unique();
    if (existing) return; // already voted
    await ctx.db.insert("campaignContributions", {
      campaignId: args.campaignId,
      supporterId: user._id,
      supporterEmail: user.email,
      amount: 0,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.campaignId, {
      supporterCount: c.supporterCount + 1,
      updatedAt: Date.now(),
    });
  },
});

// Admin moderation: approve (→ active), reject, or close.
export const setStatus = mutation({
  args: { campaignId: v.id("campaigns"), status: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");
    const valid = ["pending", "active", "funded", "rejected", "closed"];
    if (!valid.includes(args.status)) throw new ConvexError("Invalid status");
    const c = await ctx.db.get(args.campaignId);
    if (!c) throw new ConvexError("Campaign not found");
    await ctx.db.patch(args.campaignId, { status: args.status, updatedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      action: `admin.campaign_${args.status}`,
      targetType: "campaign",
      targetId: args.campaignId as string,
      createdAt: Date.now(),
    });
  },
});
