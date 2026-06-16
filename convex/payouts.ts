import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole } from "./lib/roles";

const DEFAULT_FEE_PERCENT = 5;

// Records one payout-ledger row per paid order (platform-collect model). Called
// from a payment webhook (server-to-server, guarded by CONVEX_WEBHOOK_SECRET).
// Idempotent per paymentRef. Computes the platform fee from the organizer's
// feePercent (default 5%) and what the organizer is owed.
export const recordPayout = mutation({
  args: {
    webhookSecret: v.string(),
    eventId: v.string(),
    provider: v.string(),
    paymentRef: v.string(),
    grossAmount: v.number(), // centavos collected
  },
  handler: async (ctx, args) => {
    if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }

    const existing = await ctx.db
      .query("payouts")
      .withIndex("by_payment_ref", (q) => q.eq("paymentRef", args.paymentRef))
      .first();
    if (existing) return existing._id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = (await ctx.db.get(args.eventId as any)) as any;
    if (!event) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organizer = (await ctx.db.get(event.creatorId)) as any;
    const feePercent = organizer?.feePercent ?? DEFAULT_FEE_PERCENT;
    const feeAmount = Math.round((args.grossAmount * feePercent) / 100);
    const netAmount = args.grossAmount - feeAmount;

    return await ctx.db.insert("payouts", {
      eventId: event._id,
      organizerId: event.creatorId,
      provider: args.provider,
      paymentRef: args.paymentRef,
      grossAmount: args.grossAmount,
      feeAmount,
      netAmount,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// --- Admin settlement (platform-collect) -----------------------------------

// All payouts across the platform, newest first, with event + organizer names.
// Admin-only — this is the desk that pays organizers out and marks rows settled.
export const listPayoutsForAdmin = query({
  args: { status: v.optional(v.string()) }, // "pending" | "settled" | undefined (all)
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");
    let rows = await ctx.db.query("payouts").order("desc").collect();
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    return await Promise.all(
      rows.map(async (r) => {
        const event = await ctx.db.get(r.eventId);
        const organizer = await ctx.db.get(r.organizerId);
        return {
          _id: r._id,
          eventTitle: event?.title ?? "Unknown event",
          organizerName: organizer?.name ?? "Unknown",
          organizerEmail: organizer?.email ?? "",
          provider: r.provider,
          grossAmount: r.grossAmount,
          feeAmount: r.feeAmount,
          netAmount: r.netAmount,
          status: r.status,
          settledAt: r.settledAt ?? null,
          createdAt: r.createdAt,
        };
      }),
    );
  },
});

// Mark a payout row as settled once the organizer has been paid out-of-band.
export const settlePayout = mutation({
  args: { payoutId: v.id("payouts") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");
    const row = await ctx.db.get(args.payoutId);
    if (!row) throw new ConvexError("Payout not found");
    if (row.status === "settled") return row._id;
    await ctx.db.patch(args.payoutId, { status: "settled", settledAt: Date.now() });
    return row._id;
  },
});

// Organizer's payout ledger (their events), most recent first, with event titles.
export const listMyPayouts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const rows = await ctx.db
      .query("payouts")
      .withIndex("by_organizer", (q) => q.eq("organizerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (r) => {
        const event = await ctx.db.get(r.eventId);
        return {
          _id: r._id,
          eventId: r.eventId,
          eventTitle: event?.title ?? "Unknown event",
          provider: r.provider,
          grossAmount: r.grossAmount,
          feeAmount: r.feeAmount,
          netAmount: r.netAmount,
          status: r.status,
          settledAt: r.settledAt ?? null,
          createdAt: r.createdAt,
        };
      }),
    );
  },
});
