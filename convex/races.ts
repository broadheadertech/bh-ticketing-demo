import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthenticatedUser } from "./lib/auth";

// Creator OR assigned staff may manage a race event's waiver + results.
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

// ---------------------------------------------------------------------------
// Waivers
// ---------------------------------------------------------------------------

// Organizer sets (or clears) the liability waiver text attendees must sign.
export const setWaiverText = mutation({
  args: { eventId: v.id("events"), waiverText: v.string() },
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);
    const text = args.waiverText.trim();
    await ctx.db.patch(args.eventId, { waiverText: text || undefined });
  },
});

// Organizer roster: every attendee ticket joined with its signature (if any).
export const listSignaturesForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const { event } = await requireEventAccess(ctx, args.eventId);

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const waivers = await ctx.db
      .query("waivers")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const byTicket = new Map(waivers.map((w) => [String(w.ticketId), w]));

    return {
      waiverText: event.waiverText ?? "",
      rows: tickets.map((t) => {
        const w = byTicket.get(String(t._id));
        return {
          ticketId: t._id,
          buyerEmail: t.buyerEmail,
          signedAt: w?.signedAt ?? null,
          signerName: w?.signerName ?? null,
        };
      }),
    };
  },
});

// Attendee view: their tickets whose event requires a waiver, with signed state + the text.
export const getMyWaivers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const email = identity.email;
    if (!email) return [];

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_buyer_email", (q) => q.eq("buyerEmail", email))
      .collect();

    const out = [];
    for (const t of tickets) {
      const event = await ctx.db.get(t.eventId);
      if (!event?.waiverText) continue;
      const signed = await ctx.db
        .query("waivers")
        .withIndex("by_ticket", (q) => q.eq("ticketId", t._id))
        .unique();
      out.push({
        ticketId: t._id,
        eventTitle: event.title,
        waiverText: event.waiverText,
        signed: !!signed,
        signerName: signed?.signerName ?? null,
      });
    }
    return out;
  },
});

// Attendee signs the waiver for one of their tickets (typed name = signature).
export const signWaiver = mutation({
  args: { ticketId: v.id("tickets"), signerName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const email = identity.email;
    if (!email) throw new ConvexError("No email in identity");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new ConvexError("Ticket not found");
    if (ticket.buyerEmail !== email) {
      throw new ConvexError("This ticket is not yours");
    }
    const name = args.signerName.trim();
    if (!name) throw new ConvexError("Signature (name) is required");

    const existing = await ctx.db
      .query("waivers")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("waivers", {
      ticketId: args.ticketId,
      eventId: ticket.eventId,
      signerName: name,
      signerEmail: email,
      signedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Results / leaderboard
// ---------------------------------------------------------------------------

const resultRow = v.object({
  bib: v.string(),
  name: v.string(),
  timeText: v.optional(v.string()),
  rank: v.optional(v.number()),
  note: v.optional(v.string()),
});

// Returns leaderboard rows ordered by rank (then finish time text) for ranking ties.
function ordered<T extends { rank?: number; timeText?: string; sortOrder: number }>(
  rows: T[]
) {
  return [...rows].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.sortOrder - b.sortOrder;
  });
}

// Organizer view of current results (for the editor).
export const getResultsForEditor = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);
    const rows = await ctx.db
      .query("raceResults")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return ordered(rows).map((r) => ({
      bib: r.bib,
      name: r.name,
      timeText: r.timeText ?? "",
      rank: r.rank ?? null,
      note: r.note ?? "",
    }));
  },
});

// Replace-all save of the leaderboard. Creator/staff only.
export const saveResults = mutation({
  args: { eventId: v.id("events"), rows: v.array(resultRow) },
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);

    const existing = await ctx.db
      .query("raceResults")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const r of existing) await ctx.db.delete(r._id);

    let i = 0;
    for (const row of args.rows) {
      const name = row.name.trim();
      const bib = row.bib.trim();
      if (!name && !bib) continue; // skip blank lines
      await ctx.db.insert("raceResults", {
        eventId: args.eventId,
        bib,
        name,
        timeText: row.timeText?.trim() || undefined,
        rank: row.rank ?? undefined,
        note: row.note?.trim() || undefined,
        sortOrder: i++,
      });
    }
  },
});

// Public leaderboard view — anyone can see race results.
export const getResultsPublic = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const rows = await ctx.db
      .query("raceResults")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    return {
      eventTitle: event.title,
      eventDate: event.date,
      rows: ordered(rows).map((r) => ({
        bib: r.bib,
        name: r.name,
        timeText: r.timeText ?? "",
        rank: r.rank ?? null,
        note: r.note ?? "",
      })),
    };
  },
});
