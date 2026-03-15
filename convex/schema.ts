import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    roles: v.array(v.string()),
    activeRole: v.string(),
    stripeAccountId: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  creatorProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    bio: v.optional(v.string()),
    profilePhotoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    spotifyUrl: v.optional(v.string()),
    facebookUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  events: defineTable({
    creatorId: v.id("users"),
    eventType: v.string(),
    title: v.string(),
    description: v.string(),
    date: v.number(),
    time: v.string(),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    status: v.string(),
    artworkStorageId: v.optional(v.id("_storage")),
    cancellationReason: v.optional(v.string()),
    moderationStatus: v.optional(v.string()),
    moderationReason: v.optional(v.string()),
    recurringTemplateId: v.optional(v.id("recurringTemplates")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator_id", ["creatorId"])
    .index("by_status", ["status"])
    .index("by_venue_id", ["venueId"])
    .searchIndex("search_events", {
      searchField: "title",
      filterFields: ["status", "eventType"],
    }),

  ticketTiers: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    price: v.number(),
    quantity: v.number(),
    soldCount: v.number(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event_id", ["eventId"]),

  venues: defineTable({
    managerId: v.id("users"),
    name: v.string(),
    location: v.string(),
    capacity: v.number(),
    description: v.optional(v.string()),
    amenities: v.array(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_manager_id", ["managerId"]),

  venueAvailability: defineTable({
    venueId: v.id("venues"),
    date: v.string(), // ISO "YYYY-MM-DD" — only tentative/booked stored; available = no record
    status: v.string(), // "tentative" | "booked"
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_venue_id", ["venueId"])
    .index("by_venue_date", ["venueId", "date"]),

  tickets: defineTable({
    tierId: v.id("ticketTiers"),
    eventId: v.id("events"),
    stripeSessionId: v.string(),
    buyerEmail: v.string(),
    buyerUserId: v.optional(v.string()),
    qrCode: v.string(),
    qrSignature: v.string(),
    scannedAt: v.optional(v.number()),
    scannedBy: v.optional(v.string()),
    refundStatus: v.optional(v.string()),
    refundedAt: v.optional(v.number()),
    stripeRefundId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_stripe_session_id", ["stripeSessionId"])
    .index("by_event_id", ["eventId"])
    .index("by_buyer_email", ["buyerEmail"]),

  auditLogs: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_target", ["targetType", "targetId"]),

  follows: defineTable({
    followerId: v.id("users"),
    entityType: v.string(),
    entityId: v.string(),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_follower_entity", ["followerId", "entityType", "entityId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),

  reviews: defineTable({
    eventId: v.id("events"),
    reviewerId: v.id("users"),
    rating: v.number(),
    text: v.optional(v.string()),
    isVerified: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_reviewer_id", ["reviewerId"])
    .index("by_event_reviewer", ["eventId", "reviewerId"]),

  staffAssignments: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    assignedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_user_id", ["userId"]),

  recurringTemplates: defineTable({
    creatorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    eventType: v.string(),
    time: v.string(),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    frequency: v.string(), // "weekly" | "biweekly" | "monthly"
    dayOfWeek: v.optional(v.number()), // 0=Sun, 1=Mon, ..., 6=Sat
    endAfterOccurrences: v.optional(v.number()),
    endDate: v.optional(v.number()),
    tierTemplate: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
        description: v.optional(v.string()),
        sortOrder: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_creator_id", ["creatorId"]),

  waitlistEntries: defineTable({
    eventId: v.id("events"),
    email: v.string(),
    userId: v.optional(v.id("users")),
    position: v.number(),
    status: v.string(), // "waiting" | "notified" | "purchased" | "expired"
    notifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_event_email", ["eventId", "email"]),

  promoCodes: defineTable({
    eventId: v.id("events"),
    code: v.string(),
    discountType: v.string(), // "percentage" | "fixed"
    discountValue: v.number(),
    maxUses: v.optional(v.number()),
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_event_code", ["eventId", "code"]),
});
