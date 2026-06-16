import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthenticatedUser } from "./lib/auth";

// Creator OR assigned gate/desk staff may manage an event's certificates.
async function requireEventAccess(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
) {
  const user = await getAuthenticatedUser(ctx);
  const event = await ctx.db.get(eventId);
  if (!event) throw new ConvexError("Event not found");
  if (event.creatorId !== user._id) {
    const assignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .collect();
    if (!assignments.some((a) => a.userId === user._id)) {
      throw new ConvexError("You do not have access to this event");
    }
  }
  return { user, event };
}

// Builds a human-friendly, unique-per-ticket verification code, e.g. "PHL-3F9A2C7B".
function certNumberFor(ticketId: Id<"tickets">) {
  const tail = String(ticketId).replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  return `PHL-${tail}`;
}

// Organizer roster: every attendee ticket for the event joined with its certificate (if issued).
export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const certByTicket = new Map(certs.map((c) => [String(c.ticketId), c]));

    return await Promise.all(
      tickets.map(async (t) => {
        const tier = await ctx.db.get(t.tierId);
        const cert = certByTicket.get(String(t._id));
        return {
          ticketId: t._id,
          buyerEmail: t.buyerEmail,
          tierName: tier?.name ?? "Unknown Tier",
          scannedAt: t.scannedAt,
          refundStatus: t.refundStatus,
          certificate: cert
            ? {
                _id: cert._id,
                certNumber: cert.certNumber,
                attendeeName: cert.attendeeName,
                completionDate: cert.completionDate,
              }
            : null,
        };
      })
    );
  },
});

// Issues (or updates) a certificate of completion for an attendee ticket. Idempotent per ticket.
export const issue = mutation({
  args: {
    ticketId: v.id("tickets"),
    attendeeName: v.string(),
    completionDate: v.number(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new ConvexError("Ticket not found");
    const { event } = await requireEventAccess(ctx, ticket.eventId);

    const name = args.attendeeName.trim();
    if (!name) throw new ConvexError("Attendee name is required");

    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        attendeeName: name,
        completionDate: args.completionDate,
      });
      return existing._id;
    }

    return await ctx.db.insert("certificates", {
      ticketId: args.ticketId,
      eventId: ticket.eventId,
      attendeeName: name,
      attendeeEmail: ticket.buyerEmail,
      eventTitle: event.title,
      completionDate: args.completionDate,
      certNumber: certNumberFor(args.ticketId),
      issuedBy: (await getAuthenticatedUser(ctx))._id,
      issuedAt: Date.now(),
    });
  },
});

// Revokes (deletes) a certificate. Creator/staff of the event only.
export const revoke = mutation({
  args: { certificateId: v.id("certificates") },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certificateId);
    if (!cert) throw new ConvexError("Certificate not found");
    await requireEventAccess(ctx, cert.eventId);
    await ctx.db.delete(args.certificateId);
  },
});

// Attendee view: certificates issued to the signed-in user (matched by email).
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const email = identity.email;
    if (!email) return [];

    const certs = await ctx.db
      .query("certificates")
      .withIndex("by_email", (q) => q.eq("attendeeEmail", email))
      .collect();
    return certs.map((c) => ({
      _id: c._id,
      ticketId: c.ticketId,
      certNumber: c.certNumber,
      eventTitle: c.eventTitle,
      completionDate: c.completionDate,
    }));
  },
});

// Public printable / verification view — a certificate is a shareable credential.
export const getPublic = query({
  args: { certificateId: v.id("certificates") },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certificateId);
    if (!cert) return null;
    return {
      attendeeName: cert.attendeeName,
      eventTitle: cert.eventTitle,
      completionDate: cert.completionDate,
      certNumber: cert.certNumber,
      issuedAt: cert.issuedAt,
    };
  },
});
