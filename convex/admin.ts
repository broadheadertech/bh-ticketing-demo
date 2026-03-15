import { query, mutation, MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireRole, VALID_ROLES } from "./lib/roles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function logAuditEvent(
  ctx: MutationCtx,
  entry: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: unknown;
  }
) {
  await ctx.db.insert("auditLogs", {
    actorId: entry.actorId as never, // Id<"users"> at runtime
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata,
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getAdminDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allUsers = await ctx.db.query("users").collect();
    const allEvents = await ctx.db.query("events").collect();
    const allTiers = await ctx.db.query("ticketTiers").collect();

    // Event status breakdown
    const eventsByStatus = {
      draft: allEvents.filter((e) => e.status === "draft").length,
      published: allEvents.filter((e) => e.status === "published").length,
      cancelled: allEvents.filter((e) => e.status === "cancelled").length,
    };

    // Exclude tiers from cancelled events (consistent with venue dashboard)
    const cancelledEventIds = new Set(
      allEvents
        .filter((e) => e.status === "cancelled")
        .map((e) => e._id)
    );
    const activeTiers = allTiers.filter((t) => !cancelledEventIds.has(t.eventId));

    // Revenue and tickets from non-cancelled event tiers
    const totalTicketsSold = activeTiers.reduce((sum, t) => sum + t.soldCount, 0);
    const totalRevenue = activeTiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );

    // Active creators = distinct creatorIds from non-draft events
    const activeCreatorIds = new Set(
      allEvents
        .filter((e) => e.status !== "draft")
        .map((e) => e.creatorId)
    );

    return {
      totalUsers: allUsers.length,
      totalEvents: allEvents.length,
      eventsByStatus,
      totalTicketsSold,
      totalRevenue, // centavos — frontend uses formatCurrency()
      activeCreators: activeCreatorIds.size,
    };
  },
});

export const listEventsForModeration = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allEvents = await ctx.db.query("events").collect();

    const eventsWithCreator = await Promise.all(
      allEvents.map(async (event) => {
        const creator = await ctx.db.get(event.creatorId);
        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          eventType: event.eventType,
          date: event.date,
          time: event.time,
          venueName: event.venueName,
          status: event.status,
          moderationStatus: event.moderationStatus,
          moderationReason: event.moderationReason,
          createdAt: event.createdAt,
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "Unknown",
        };
      })
    );

    return eventsWithCreator;
  },
});

export const getEventForModeration = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const creator = await ctx.db.get(event.creatorId);
    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      date: event.date,
      time: event.time,
      venueName: event.venueName,
      status: event.status,
      moderationStatus: event.moderationStatus,
      moderationReason: event.moderationReason,
      createdAt: event.createdAt,
      creatorName: creator?.name ?? "Unknown",
      creatorEmail: creator?.email ?? "Unknown",
    };
  },
});

const PLATFORM_FEE_RATE = 0.05;
const INFRASTRUCTURE_COST_CENTAVOS = 210000; // ₱2,100/month

export const getFinancialMetrics = query({
  args: {
    dateRange: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const validRanges = ["all_time", "this_month", "last_month"];
    if (!validRanges.includes(args.dateRange)) {
      throw new ConvexError(
        `Invalid date range: ${args.dateRange}. Must be one of: ${validRanges.join(", ")}`
      );
    }

    const allEvents = await ctx.db.query("events").collect();
    const allTiers = await ctx.db.query("ticketTiers").collect();

    // Date range boundaries
    const now = new Date();
    const currentMonthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    ).getTime();
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    ).getTime();

    // Filter events by date range
    let filteredEvents = allEvents;
    if (args.dateRange === "this_month") {
      filteredEvents = allEvents.filter(
        (e) => e.date >= currentMonthStart && e.date < currentMonthEnd
      );
    } else if (args.dateRange === "last_month") {
      filteredEvents = allEvents.filter(
        (e) => e.date >= previousMonthStart && e.date < currentMonthStart
      );
    }

    // Exclude cancelled events
    const cancelledEventIds = new Set(
      filteredEvents
        .filter((e) => e.status === "cancelled")
        .map((e) => e._id)
    );
    const activeEvents = filteredEvents.filter(
      (e) => e.status !== "cancelled"
    );
    const filteredEventIds = new Set(filteredEvents.map((e) => e._id));
    const activeTiers = allTiers.filter(
      (t) =>
        filteredEventIds.has(t.eventId) && !cancelledEventIds.has(t.eventId)
    );

    // GMV and ticket calculations
    const gmv = activeTiers.reduce(
      (sum, t) => sum + t.price * t.soldCount,
      0
    );
    const totalTicketsSold = activeTiers.reduce(
      (sum, t) => sum + t.soldCount,
      0
    );
    const platformFees = Math.round(gmv * PLATFORM_FEE_RATE);

    // Scale infrastructure cost by number of months in range
    let infraMonths = 1;
    if (args.dateRange === "all_time" && allEvents.length > 0) {
      const earliestEvent = allEvents.reduce(
        (min, e) => (e.date < min ? e.date : min),
        allEvents[0].date
      );
      const monthsSpan =
        (now.getFullYear() - new Date(earliestEvent).getFullYear()) * 12 +
        (now.getMonth() - new Date(earliestEvent).getMonth()) +
        1;
      infraMonths = Math.max(1, monthsSpan);
    }
    const infrastructureCosts = INFRASTRUCTURE_COST_CENTAVOS * infraMonths;
    const netRevenue = platformFees - infrastructureCosts;

    // Per-event breakdown
    const eventBreakdown = activeEvents.map((event) => {
      const eventTiers = activeTiers.filter((t) => t.eventId === event._id);
      const ticketsSold = eventTiers.reduce(
        (sum, t) => sum + t.soldCount,
        0
      );
      const revenue = eventTiers.reduce(
        (sum, t) => sum + t.price * t.soldCount,
        0
      );
      return {
        eventId: event._id,
        title: event.title,
        status: event.status,
        ticketsSold,
        revenue,
      };
    });
    // Remove events with no revenue, then sort by revenue desc
    const filteredBreakdown = eventBreakdown.filter(
      (e) => e.revenue > 0 || e.ticketsSold > 0
    );
    filteredBreakdown.sort((a, b) => b.revenue - a.revenue);

    // Month-over-month (always compute regardless of filter)
    const cmIds = new Set(
      allEvents
        .filter(
          (e) =>
            e.date >= currentMonthStart &&
            e.date < currentMonthEnd &&
            e.status !== "cancelled"
        )
        .map((e) => e._id)
    );
    const pmIds = new Set(
      allEvents
        .filter(
          (e) =>
            e.date >= previousMonthStart &&
            e.date < currentMonthStart &&
            e.status !== "cancelled"
        )
        .map((e) => e._id)
    );

    const currentMonthGmv = allTiers
      .filter((t) => cmIds.has(t.eventId))
      .reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const currentMonthTickets = allTiers
      .filter((t) => cmIds.has(t.eventId))
      .reduce((sum, t) => sum + t.soldCount, 0);
    const previousMonthGmv = allTiers
      .filter((t) => pmIds.has(t.eventId))
      .reduce((sum, t) => sum + t.price * t.soldCount, 0);
    const previousMonthTickets = allTiers
      .filter((t) => pmIds.has(t.eventId))
      .reduce((sum, t) => sum + t.soldCount, 0);

    return {
      gmv,
      platformFees,
      infrastructureCosts,
      netRevenue,
      totalTicketsSold,
      eventBreakdown: filteredBreakdown,
      monthOverMonth: {
        currentMonthGmv,
        currentMonthTickets,
        previousMonthGmv,
        previousMonthTickets,
        gmvDiff: currentMonthGmv - previousMonthGmv,
        ticketsDiff: currentMonthTickets - previousMonthTickets,
      },
    };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const allUsers = await ctx.db.query("users").collect();
    return allUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      activeRole: u.activeRole,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const disableUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    if (admin._id === args.userId) {
      throw new ConvexError("Cannot disable your own account");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");
    if (!targetUser.isActive) throw new ConvexError("User is already disabled");

    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.user_disabled",
      targetType: "user",
      targetId: args.userId,
    });
  },
});

export const enableUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");
    if (targetUser.isActive) throw new ConvexError("User is already active");

    await ctx.db.patch(args.userId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.user_enabled",
      targetType: "user",
      targetId: args.userId,
    });
  },
});

export const adminUpdateUserRoles = mutation({
  args: {
    userId: v.id("users"),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    const uniqueRoles = [...new Set(args.roles)];

    for (const role of uniqueRoles) {
      if (!VALID_ROLES.includes(role as never)) {
        throw new ConvexError(`Invalid role: ${role}`);
      }
    }

    if (uniqueRoles.length === 0) {
      throw new ConvexError("User must have at least one role");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new ConvexError("User not found");

    const previousRoles = targetUser.roles;
    const newActiveRole = uniqueRoles.includes(targetUser.activeRole)
      ? targetUser.activeRole
      : uniqueRoles[0];

    await ctx.db.patch(args.userId, {
      roles: uniqueRoles,
      activeRole: newActiveRole,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.roles_updated",
      targetType: "user",
      targetId: args.userId,
      metadata: { previousRoles, newRoles: uniqueRoles },
    });
  },
});

export const getEventRefundSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireRole(user, "admin");

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    const refundedTickets = tickets.filter((t) => t.refundStatus === "refunded");
    const failedCount = tickets.filter((t) => t.refundStatus === "failed").length;
    const skippedCount = tickets.filter((t) => t.refundStatus === "not_applicable").length;

    // Sum tier prices for refunded tickets
    const tierPrices = await Promise.all(
      refundedTickets.map(async (t) => {
        const tier = await ctx.db.get(t.tierId);
        return tier?.price ?? 0;
      })
    );
    const totalRefundAmount = tierPrices.reduce((sum, p) => sum + p, 0);

    return {
      totalTickets: tickets.length,
      refundedCount: refundedTickets.length,
      failedCount,
      skippedCount,
      totalRefundAmount,
    };
  },
});

export const adminUnpublishEvent = mutation({
  args: {
    eventId: v.id("events"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    if (!args.reason.trim()) {
      throw new ConvexError("Reason is required");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.status !== "published") {
      throw new ConvexError("Only published events can be unpublished");
    }

    await ctx.db.patch(args.eventId, {
      status: "draft",
      moderationStatus: "flagged",
      moderationReason: args.reason,
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.event_unpublished",
      targetType: "event",
      targetId: args.eventId,
      metadata: { reason: args.reason },
    });
  },
});

export const adminApproveEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const admin = await getAuthenticatedUser(ctx);
    requireRole(admin, "admin");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");

    await ctx.db.patch(args.eventId, {
      moderationStatus: "approved",
      updatedAt: Date.now(),
    });

    await logAuditEvent(ctx, {
      actorId: admin._id,
      action: "admin.event_approved",
      targetType: "event",
      targetId: args.eventId,
    });
  },
});
