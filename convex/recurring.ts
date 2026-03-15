import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { requireAnyRole } from "./lib/roles";

const CREATOR_ROLES = ["artist", "organization"];
const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly"];

function getNextDates(
  frequency: string,
  dayOfWeek: number,
  count: number,
  startAfter: number = Date.now()
): number[] {
  const dates: number[] = [];
  const start = new Date(startAfter);

  // Find next occurrence of the target day
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);
  while (current.getDay() !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }
  // If current day matches but is today/past, move to next
  if (current.getTime() <= startAfter) {
    current.setDate(current.getDate() + (frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 7));
  }

  for (let i = 0; i < count; i++) {
    dates.push(current.getTime());
    if (frequency === "weekly") {
      current = new Date(current.getTime() + 7 * 86400000);
    } else if (frequency === "biweekly") {
      current = new Date(current.getTime() + 14 * 86400000);
    } else {
      // monthly: same day of week, next month
      current.setMonth(current.getMonth() + 1);
    }
  }

  return dates;
}

export const createRecurringEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    eventType: v.string(),
    time: v.string(),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    frequency: v.string(),
    dayOfWeek: v.number(),
    occurrences: v.number(),
    tiers: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        description: v.optional(v.string()),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    if (!VALID_FREQUENCIES.includes(args.frequency)) {
      throw new ConvexError(`Invalid frequency: ${args.frequency}`);
    }
    if (args.dayOfWeek < 0 || args.dayOfWeek > 6) {
      throw new ConvexError("Day of week must be 0-6 (Sun-Sat)");
    }
    if (args.occurrences < 1 || args.occurrences > 52) {
      throw new ConvexError("Occurrences must be 1-52");
    }
    if (args.tiers.length === 0) {
      throw new ConvexError("At least one tier is required");
    }

    const now = Date.now();

    // Create template
    const templateId = await ctx.db.insert("recurringTemplates", {
      creatorId: user._id,
      title: args.title,
      description: args.description,
      eventType: args.eventType,
      time: args.time,
      venueName: args.venueName,
      venueId: args.venueId,
      frequency: args.frequency,
      dayOfWeek: args.dayOfWeek,
      endAfterOccurrences: args.occurrences,
      tierTemplate: args.tiers,
      createdAt: now,
    });

    // Generate first batch of instances (up to 4 weeks ahead)
    const maxInstances = Math.min(args.occurrences, 4);
    const dates = getNextDates(args.frequency, args.dayOfWeek, maxInstances);

    const eventIds: string[] = [];
    for (const date of dates) {
      const eventId = await ctx.db.insert("events", {
        creatorId: user._id,
        eventType: args.eventType,
        title: args.title,
        description: args.description,
        date,
        time: args.time,
        venueName: args.venueName,
        venueId: args.venueId,
        status: "draft",
        recurringTemplateId: templateId,
        createdAt: now,
        updatedAt: now,
      });

      // Create tiers for each instance
      for (const tier of args.tiers) {
        await ctx.db.insert("ticketTiers", {
          eventId,
          name: tier.name,
          price: tier.price,
          quantity: tier.quantity,
          description: tier.description,
          sortOrder: tier.sortOrder,
          soldCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      eventIds.push(eventId);
    }

    return { templateId, eventIds, instancesCreated: eventIds.length };
  },
});

export const getMyRecurringTemplates = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const templates = await ctx.db
      .query("recurringTemplates")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .collect();

    return Promise.all(
      templates.map(async (t) => {
        // Count instances
        const events = await ctx.db
          .query("events")
          .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
          .collect();
        const instances = events.filter(
          (e) => e.recurringTemplateId === t._id
        );

        return {
          _id: t._id,
          title: t.title,
          eventType: t.eventType,
          frequency: t.frequency,
          dayOfWeek: t.dayOfWeek,
          totalInstances: instances.length,
          draftInstances: instances.filter((e) => e.status === "draft").length,
          publishedInstances: instances.filter((e) => e.status === "published").length,
          createdAt: t.createdAt,
        };
      })
    );
  },
});

export const generateMoreInstances = mutation({
  args: {
    templateId: v.id("recurringTemplates"),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    requireAnyRole(user, CREATOR_ROLES);

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new ConvexError("Template not found");
    if (template.creatorId !== user._id) {
      throw new ConvexError("You can only manage your own recurring events");
    }

    if (args.count < 1 || args.count > 12) {
      throw new ConvexError("Can generate 1-12 instances at a time");
    }

    // Find the latest instance date
    const existingEvents = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", user._id))
      .collect();
    const instances = existingEvents.filter(
      (e) => e.recurringTemplateId === args.templateId
    );
    const latestDate = instances.length > 0
      ? Math.max(...instances.map((e) => e.date))
      : Date.now();

    const dates = getNextDates(
      template.frequency,
      template.dayOfWeek ?? new Date().getDay(),
      args.count,
      latestDate
    );

    const now = Date.now();
    const newEventIds: string[] = [];

    for (const date of dates) {
      const eventId = await ctx.db.insert("events", {
        creatorId: user._id,
        eventType: template.eventType,
        title: template.title,
        description: template.description,
        date,
        time: template.time,
        venueName: template.venueName,
        venueId: template.venueId,
        status: "draft",
        recurringTemplateId: args.templateId,
        createdAt: now,
        updatedAt: now,
      });

      for (const tier of template.tierTemplate) {
        await ctx.db.insert("ticketTiers", {
          eventId,
          name: tier.name,
          price: tier.price,
          quantity: tier.quantity,
          description: tier.description,
          sortOrder: tier.sortOrder,
          soldCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      newEventIds.push(eventId);
    }

    return { generated: newEventIds.length };
  },
});
