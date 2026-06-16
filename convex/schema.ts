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
    // Payments (multi-provider). Organizer's default provider + platform fee.
    paymentProvider: v.optional(v.string()), // "paymongo" (default) | "stripe"
    feePercent: v.optional(v.number()), // platform service fee %; defaults to 5 in code
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
    theme: v.optional(v.string()), // visual theme preset id (aurora | grandprix | cosmic | tropical | fiesta)
    lineupArtistIds: v.optional(v.array(v.id("users"))), // legacy: artist-account lineup
    participantIds: v.optional(v.array(v.id("participants"))), // generic lineup (speakers/racers/teams/…)
    title: v.string(),
    tagline: v.optional(v.string()), // short subtitle for cards/hero
    description: v.string(),
    date: v.number(), // primary date (= Day 1 for multi-day)
    time: v.string(), // start time "HH:mm"
    endTime: v.optional(v.string()), // "HH:mm"
    doorsTime: v.optional(v.string()), // "HH:mm"
    // Multi-day events: each day has its own date/times. Empty/absent = single-day.
    days: v.optional(
      v.array(
        v.object({
          id: v.string(), // stable per-event day id e.g. "d1"
          label: v.string(),
          date: v.number(),
          startTime: v.optional(v.string()),
          endTime: v.optional(v.string()),
        })
      )
    ),
    venueName: v.optional(v.string()),
    venueId: v.optional(v.string()),
    city: v.optional(v.string()),
    locationType: v.optional(v.string()), // "venue" | "online" | "hybrid"
    onlineUrl: v.optional(v.string()),
    seatMapId: v.optional(v.id("venueMaps")), // attached seat map
    onSaleStart: v.optional(v.number()), // ticket sales window (ms)
    onSaleEnd: v.optional(v.number()),
    maxPerOrder: v.optional(v.number()),
    visibility: v.optional(v.string()), // "public" | "unlisted"
    refundPolicy: v.optional(v.string()),
    ageRestriction: v.optional(v.string()),
    goodToKnow: v.optional(v.string()),
    waiverText: v.optional(v.string()), // liability waiver (races) attendees must sign; absent = none
    paymentProvider: v.optional(v.string()), // per-event override of the organizer's provider
    // Custom questions asked at registration/checkout (dietary, t-shirt, vehicle class…)
    registrationQuestions: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          type: v.string(), // "text" | "select" | "checkbox"
          options: v.optional(v.array(v.string())),
          required: v.boolean(),
        })
      )
    ),
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
    dayId: v.optional(v.string()), // which event day this admits; absent = full-event pass
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
    stripeSessionId: v.string(), // kept for back-compat; = paymentRef for Stripe
    // Multi-provider payment reference (PayMongo / Stripe). New code reads these.
    paymentProvider: v.optional(v.string()), // "paymongo" | "stripe"
    paymentRef: v.optional(v.string()), // provider checkout-session / payment id
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
    .index("by_payment_ref", ["paymentRef"])
    .index("by_event_id", ["eventId"])
    .index("by_buyer_email", ["buyerEmail"]),

  // Payout ledger (platform-collect model). One row per paid order: records the
  // gross, the platform fee, and what the organizer is owed, plus settlement state.
  // PayMongo has no Connect-style auto-split, so organizer payouts are settled
  // out-of-band and tracked here. (Stripe Connect orders may also be logged.)
  payouts: defineTable({
    eventId: v.id("events"),
    organizerId: v.id("users"),
    provider: v.string(), // "paymongo" | "stripe"
    paymentRef: v.string(), // provider session/payment id (idempotency)
    grossAmount: v.number(), // centavos collected
    feeAmount: v.number(), // centavos platform fee
    netAmount: v.number(), // centavos owed to organizer
    status: v.string(), // "pending" | "settled"
    settledAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_event_id", ["eventId"])
    .index("by_payment_ref", ["paymentRef"]),

  // Per-day check-in records for multi-day events. One row per (ticket, day) admitted.
  // Single-day events keep using tickets.scannedAt; multi-day events use this table so a
  // full-event pass can be scanned once per day while a day-pass admits only its own day.
  ticketScans: defineTable({
    ticketId: v.id("tickets"),
    eventId: v.id("events"),
    dayId: v.string(), // event day id this scan admitted entry for
    scannedAt: v.number(),
    scannedBy: v.string(),
  })
    .index("by_ticket", ["ticketId"])
    .index("by_ticket_day", ["ticketId", "dayId"])
    .index("by_event_day", ["eventId", "dayId"]),

  // Certificates of completion (seminars / classes). One per attendee ticket; the organizer
  // (or assigned staff) issues it, the attendee downloads/shares a public printable copy.
  // Fields are snapshots so the certificate stays correct even if the event is later edited.
  certificates: defineTable({
    ticketId: v.id("tickets"),
    eventId: v.id("events"),
    attendeeName: v.string(),
    attendeeEmail: v.string(),
    eventTitle: v.string(), // snapshot of event title at issue time
    completionDate: v.number(), // ms — the date of completion shown on the certificate
    certNumber: v.string(), // human-friendly unique verification code
    issuedBy: v.id("users"),
    issuedAt: v.number(),
  })
    .index("by_ticket", ["ticketId"])
    .index("by_event_id", ["eventId"])
    .index("by_email", ["attendeeEmail"]),

  // Signed liability waivers (races). One per attendee ticket. The typed name is the signature.
  waivers: defineTable({
    ticketId: v.id("tickets"),
    eventId: v.id("events"),
    signerName: v.string(),
    signerEmail: v.string(),
    signedAt: v.number(),
  })
    .index("by_ticket", ["ticketId"])
    .index("by_event_id", ["eventId"])
    .index("by_email", ["signerEmail"]),

  // Race results / leaderboard rows entered by the organizer; publicly viewable.
  raceResults: defineTable({
    eventId: v.id("events"),
    bib: v.string(),
    name: v.string(),
    timeText: v.optional(v.string()), // free-form finish time e.g. "00:21:14"
    rank: v.optional(v.number()), // finishing position; used for ordering when present
    note: v.optional(v.string()), // e.g. category / DNF
    sortOrder: v.number(),
  }).index("by_event_id", ["eventId"]),

  // Expo push tokens per device (mobile app). One row per device token; a token
  // is re-pointed to the latest user that registered it. Fed by push:savePushToken.
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(), // "ExponentPushToken[...]"
    platform: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

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

  // Sponsorships, fundraisers, and concert requests — one "campaign" model with
  // a kind discriminator and a shared status lifecycle.
  // A creator's reusable roster of people/teams attachable to any event as the
  // "lineup" — speakers, racers, teams, hosts, performers — addable on the fly.
  participants: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    role: v.optional(v.string()), // free-text: "Speaker", "Headliner", "Team", "Driver"…
    bio: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),

  campaigns: defineTable({
    kind: v.string(), // "sponsorship" | "fundraiser" | "concert_request"
    creatorId: v.id("users"), // who opened it (or the requester for concert_request)
    title: v.string(),
    description: v.string(),
    goalAmount: v.optional(v.number()), // centavos (sponsorship/fundraiser)
    raisedAmount: v.number(), // centavos
    supporterCount: v.number(), // backers, or interest votes for concert_request
    targetCity: v.optional(v.string()), // concert_request
    targetArtistId: v.optional(v.id("users")), // concert_request → which artist
    status: v.string(), // "pending" | "active" | "funded" | "rejected" | "closed"
    deadline: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_kind", ["kind"])
    .index("by_kind_status", ["kind", "status"])
    .index("by_target_artist", ["targetArtistId"]),

  campaignContributions: defineTable({
    campaignId: v.id("campaigns"),
    supporterId: v.optional(v.id("users")),
    supporterEmail: v.string(),
    amount: v.number(), // centavos (0 = an interest vote)
    message: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_campaign_supporter", ["campaignId", "supporterId"]),

  // Purchasable extras beyond ticket tiers (parking, merch, meals, materials, pit pass).
  eventAddOns: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    price: v.number(), // centavos
    description: v.optional(v.string()),
    quantity: v.optional(v.number()), // absent = unlimited
    soldCount: v.number(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_event_id", ["eventId"]),

  venueMaps: defineTable({
    ownerId: v.id("users"),
    kind: v.string(), // "venue" (organizer map) | "template" (admin blueprint)
    name: v.string(),
    data: v.any(), // serialized { stage, sections } geometry from the editor
    capacity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_kind", ["kind"]),

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
