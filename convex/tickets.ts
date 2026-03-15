import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const createTicketsFromWebhook = mutation({
  args: {
    webhookSecret: v.string(),
    stripeSessionId: v.string(),
    eventId: v.string(),
    tierSelections: v.array(
      v.object({ tierId: v.string(), quantity: v.number() })
    ),
    buyerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Guard: only the webhook route handler (which knows CONVEX_WEBHOOK_SECRET) may call this
    if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }

    // Idempotency: if tickets already exist for this session, skip
    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_stripe_session_id", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId)
      )
      .first();
    if (existing) return;

    const now = Date.now();

    for (const selection of args.tierSelections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tier = (await ctx.db.get(selection.tierId as any)) as any;
      if (!tier) continue;

      // Insert one ticket document per physical ticket
      for (let i = 0; i < selection.quantity; i++) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        await ctx.db.insert("tickets", {
          tierId: selection.tierId as any,
          eventId: args.eventId as any,
          stripeSessionId: args.stripeSessionId,
          buyerEmail: args.buyerEmail,
          qrCode: "",
          qrSignature: "",
          createdAt: now,
        });
        /* eslint-enable @typescript-eslint/no-explicit-any */
      }

      // Increment soldCount atomically
      await ctx.db.patch(tier._id, {
        soldCount: tier.soldCount + selection.quantity,
        updatedAt: now,
      });
    }

    // Check if all tiers for this event are now sold out
    const allTiers = await ctx.db
      .query("ticketTiers")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
      .collect();

    const allSoldOut =
      allTiers.length > 0 &&
      allTiers.every((t) => t.soldCount >= t.quantity);

    if (allSoldOut) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = (await ctx.db.get(args.eventId as any)) as any;
      if (event) {
        await ctx.db.patch(event._id, { status: "soldOut", updatedAt: now });
      }
    }
  },
});

export const registerFreeTickets = mutation({
  args: {
    registrationSecret: v.string(),
    eventId: v.string(),
    tierSelections: v.array(
      v.object({ tierId: v.string(), quantity: v.number() })
    ),
    buyerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Guard: only the Server Action (which knows CONVEX_WEBHOOK_SECRET) may call this
    if (args.registrationSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }

    // Idempotency: synthetic session ID prevents duplicate registration (same email + event)
    const syntheticSessionId = `free_${args.eventId}_${args.buyerEmail}`;
    const existing = await ctx.db
      .query("tickets")
      .withIndex("by_stripe_session_id", (q) =>
        q.eq("stripeSessionId", syntheticSessionId)
      )
      .first();
    if (existing) return;

    // Fetch all selected tiers once, then validate price and capacity before any writes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tierMap = new Map<string, any>();
    for (const selection of args.tierSelections) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tier = (await ctx.db.get(selection.tierId as any)) as any;
      if (!tier) throw new ConvexError("Invalid tier");
      // Verify price = 0 (server-side security — never trust client)
      if (tier.price !== 0)
        throw new ConvexError("Only free tiers can be registered without payment");
      // Capacity check
      if (tier.soldCount + selection.quantity > tier.quantity)
        throw new ConvexError("Registration is full");
      tierMap.set(selection.tierId, tier);
    }

    const now = Date.now();

    for (const selection of args.tierSelections) {
      const tier = tierMap.get(selection.tierId);
      if (!tier) continue;

      // Insert one ticket document per physical ticket
      for (let i = 0; i < selection.quantity; i++) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        await ctx.db.insert("tickets", {
          tierId: selection.tierId as any,
          eventId: args.eventId as any,
          stripeSessionId: syntheticSessionId,
          buyerEmail: args.buyerEmail,
          qrCode: "",
          qrSignature: "",
          createdAt: now,
        });
        /* eslint-enable @typescript-eslint/no-explicit-any */
      }

      // Increment soldCount atomically
      await ctx.db.patch(tier._id, {
        soldCount: tier.soldCount + selection.quantity,
        updatedAt: now,
      });
    }

    // Check if all tiers for this event are now at capacity
    const allTiers = await ctx.db
      .query("ticketTiers")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
      .collect();

    const allFull =
      allTiers.length > 0 && allTiers.every((t) => t.soldCount >= t.quantity);

    if (allFull) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = (await ctx.db.get(args.eventId as any)) as any;
      if (event) {
        await ctx.db.patch(event._id, { status: "soldOut", updatedAt: now });
      }
    }
  },
});

// Returns all ticket documents for a Stripe session ID (including synthetic free IDs).
// Secured with querySecret to prevent unauthenticated ticket data access.
// Used internally by webhook/free-registration handlers to fetch ticket IDs for QR generation.
export const getTicketsByStripeSessionId = query({
  args: {
    stripeSessionId: v.string(),
    querySecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    return await ctx.db
      .query("tickets")
      .withIndex("by_stripe_session_id", (q) =>
        q.eq("stripeSessionId", args.stripeSessionId)
      )
      .collect();
  },
});

// Batch-updates qrCode and qrSignature on ticket documents after QR generation.
// Called by webhook handler and free-registration action (two-phase: create → generate QR → patch).
export const patchTicketsQrCodes = mutation({
  args: {
    webhookSecret: v.string(),
    updates: v.array(
      v.object({
        ticketId: v.string(),
        qrCode: v.string(),
        qrSignature: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    for (const update of args.updates) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.db.patch(update.ticketId as any, {
        qrCode: update.qrCode,
        qrSignature: update.qrSignature,
      });
    }
  },
});

// Returns all tickets for the authenticated buyer, enriched with event and tier display names.
// Uses Clerk auth identity to get buyer email — no extra secret arg needed.
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const email = identity.email;
    if (!email) throw new ConvexError("No email in Clerk identity");

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_buyer_email", (q) => q.eq("buyerEmail", email))
      .order("desc")
      .collect();

    return await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        const tier = await ctx.db.get(ticket.tierId);
        return {
          _id: ticket._id,
          eventId: ticket.eventId,
          qrCode: ticket.qrCode,
          scannedAt: ticket.scannedAt,
          createdAt: ticket.createdAt,
          refundStatus: ticket.refundStatus,
          eventTitle: event?.title ?? "Unknown Event",
          eventDate: event?.date ?? 0,
          eventTime: event?.time ?? "",
          eventStatus: event?.status ?? "draft",
          venueName: event?.venueName,
          tierName: tier?.name ?? "Unknown Tier",
        };
      })
    );
  },
});

// Returns a single ticket document for scanner verification, enriched with tier name.
// Secured with querySecret (CONVEX_WEBHOOK_SECRET) — server-to-server only.
export const getTicketByIdForScan = query({
  args: {
    ticketId: v.string(),
    querySecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticket = (await ctx.db.get(args.ticketId as any)) as any;
    if (!ticket) return null;
    const tier = await ctx.db.get(ticket.tierId);
    return {
      ...ticket,
      // H1 fix: join tier name so scan API can return it to scanner UI (AC#2 requires tier name)
      tierName: (tier as any)?.name ?? "Unknown Tier",
    };
  },
});

// Marks a ticket as scanned by setting scannedAt timestamp and scannedBy email.
// Secured with scanSecret (CONVEX_WEBHOOK_SECRET) — called only from /api/scan route.
export const markTicketScanned = mutation({
  args: {
    scanSecret: v.string(),
    ticketId: v.string(),
    scannedBy: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.scanSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.db.patch(args.ticketId as any, {
      scannedAt: Date.now(),
      scannedBy: args.scannedBy,
    });
  },
});

// Returns entry stats for an event: number of tickets scanned vs total sold.
// Uses Clerk auth (called from authenticated client component via useQuery).
// Reactive Convex subscription — auto-updates when markTicketScanned runs.
export const getEntryStats = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    // Creator authorization: only the event creator can view entry stats (FR29)
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new ConvexError("Unauthorized");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = (await ctx.db.get(args.eventId as any)) as any;
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("Unauthorized: only the event creator can view entry stats");
    }

    const tickets = await ctx.db
      .query("tickets")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
      .collect();
    const total = tickets.length;
    const scanned = tickets.filter((t) => t.scannedAt !== undefined).length;
    return { scanned, total };
  },
});

// Returns deduplicated buyer emails for all tickets at an event.
// Secured with querySecret to prevent unauthenticated PII enumeration.
export const getUniqueEmailsByEventId = query({
  args: {
    eventId: v.string(),
    querySecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    const tickets = await ctx.db
      .query("tickets")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId as any))
      .collect();
    return [...new Set(tickets.map((t) => t.buyerEmail))];
  },
});

// Returns individual ticket list for creator's event (for partial refund UI)
export const getEventTicketsForCreator = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new ConvexError("Unauthorized");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id && user.activeRole !== "admin") {
      throw new ConvexError("You do not have access to this event");
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return Promise.all(
      tickets.map(async (t) => {
        const tier = await ctx.db.get(t.tierId);
        return {
          _id: t._id,
          buyerEmail: t.buyerEmail,
          tierName: tier?.name ?? "Unknown",
          tierPrice: tier?.price ?? 0,
          refundStatus: t.refundStatus,
          scannedAt: t.scannedAt,
          createdAt: t.createdAt,
        };
      })
    );
  },
});

// ---------------------------------------------------------------------------
// Internal functions (for refund processing — not API-exposed)
// ---------------------------------------------------------------------------

export const getTicketsByEventForRefund = query({
  args: {
    eventId: v.id("events"),
    querySecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.querySecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return Promise.all(
      tickets.map(async (t) => {
        const tier = await ctx.db.get(t.tierId);
        return {
          _id: t._id,
          stripeSessionId: t.stripeSessionId,
          tierId: t.tierId,
          tierPrice: tier?.price ?? 0,
          buyerEmail: t.buyerEmail,
          refundStatus: t.refundStatus,
        };
      })
    );
  },
});

export const updateTicketRefundStatus = mutation({
  args: {
    webhookSecret: v.string(),
    ticketId: v.id("tickets"),
    refundStatus: v.string(),
    refundedAt: v.optional(v.number()),
    stripeRefundId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.webhookSecret !== process.env.CONVEX_WEBHOOK_SECRET) {
      throw new ConvexError("Unauthorized");
    }
    await ctx.db.patch(args.ticketId, {
      refundStatus: args.refundStatus,
      refundedAt: args.refundedAt,
      stripeRefundId: args.stripeRefundId,
    });
  },
});
