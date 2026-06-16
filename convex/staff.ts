import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];

export const assignStaff = mutation({
  args: {
    eventId: v.id("events"),
    staffEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only manage staff for your own events");
    }

    // Look up staff user by email
    const staffUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.staffEmail.trim().toLowerCase()))
      .unique();
    if (!staffUser) {
      throw new ConvexError("No user found with that email address");
    }

    // Prevent assigning self
    if (staffUser._id === user._id) {
      throw new ConvexError("You cannot assign yourself as staff");
    }

    // Check duplicate assignment
    const existingAssignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const alreadyAssigned = existingAssignments.some(
      (a) => a.userId === staffUser._id
    );
    if (alreadyAssigned) {
      throw new ConvexError("This user is already assigned to this event");
    }

    // Add "staff" role if not present
    if (!staffUser.roles.includes("staff")) {
      await ctx.db.patch(staffUser._id, {
        roles: [...staffUser.roles, "staff"],
        updatedAt: Date.now(),
      });
    }

    // Create assignment
    await ctx.db.insert("staffAssignments", {
      userId: staffUser._id,
      eventId: args.eventId,
      assignedBy: user._id,
      createdAt: Date.now(),
    });
  },
});

export const removeStaff = mutation({
  args: {
    eventId: v.id("events"),
    staffUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only manage staff for your own events");
    }

    // Find the assignment
    const assignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const assignment = assignments.find((a) => a.userId === args.staffUserId);
    if (!assignment) {
      throw new ConvexError("Staff assignment not found");
    }

    // Delete the assignment
    await ctx.db.delete(assignment._id);

    // Check if user has any remaining assignments
    const remainingAssignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_user_id", (q) => q.eq("userId", args.staffUserId))
      .collect();

    // Remove "staff" role if no more assignments
    if (remainingAssignments.length === 0) {
      const staffUser = await ctx.db.get(args.staffUserId);
      if (staffUser && staffUser.roles.includes("staff")) {
        const updatedRoles = staffUser.roles.filter((r) => r !== "staff");
        const newActiveRole =
          staffUser.activeRole === "staff" ? updatedRoles[0] ?? "attendee" : staffUser.activeRole;
        await ctx.db.patch(args.staffUserId, {
          roles: updatedRoles,
          activeRole: newActiveRole,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const getEventStaff = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found");
    if (event.creatorId !== user._id) {
      throw new ConvexError("You can only view staff for your own events");
    }

    const assignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();

    return Promise.all(
      assignments.map(async (a) => {
        const staffUser = await ctx.db.get(a.userId);
        return {
          userId: a.userId,
          name: staffUser?.name ?? "Unknown",
          email: staffUser?.email ?? "Unknown",
          assignedAt: a.createdAt,
        };
      })
    );
  },
});

export const canScanEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) return { authorized: false as const };

    // Multi-day events expose their day list so the scanner can pick which day to check in.
    const days = event.days ?? [];

    // Creator always has access
    if (event.creatorId === user._id) {
      return { authorized: true as const, eventTitle: event.title, days };
    }

    // Check staff assignment
    const assignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .collect();
    const isAssigned = assignments.some((a) => a.userId === user._id);

    if (isAssigned) {
      return { authorized: true as const, eventTitle: event.title, days };
    }

    return { authorized: false as const };
  },
});

export const getMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);

    const assignments = await ctx.db
      .query("staffAssignments")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    return Promise.all(
      assignments.map(async (a) => {
        const event = await ctx.db.get(a.eventId);
        return {
          eventId: a.eventId,
          eventTitle: event?.title ?? "Unknown Event",
          eventDate: event?.date ?? 0,
          eventTime: event?.time ?? "",
          eventStatus: event?.status ?? "draft",
        };
      })
    );
  },
});
