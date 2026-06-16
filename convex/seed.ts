import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Sample data seeding (dev only — run via `npx convex run seed:seedSampleData`).
//
// Public pages (home / browse / event detail) don't require auth, so seeded
// events become visible immediately without logging in. A login-able account
// still needs a real Clerk identity, so use `seed:promoteToCreator` to grant
// YOUR signed-in account the creator/admin dashboard roles.
// ---------------------------------------------------------------------------

const SEED_CLERK_ID = "seed:tixph-presents";
const DAY = 24 * 60 * 60 * 1000;

type SeedTier = {
  name: string;
  price: number; // centavos
  quantity: number;
  sold?: number;
  description?: string;
};

type SeedEvent = {
  title: string;
  eventType: string;
  theme: string;
  status: string;
  inDays: number;
  time: string;
  venueName: string;
  description: string;
  tiers: SeedTier[];
};

const SAMPLE_EVENTS: SeedEvent[] = [
  {
    title: "Aurora Music Festival 2026",
    eventType: "concert",
    theme: "aurora",
    status: "on_sale",
    inDays: 21,
    time: "16:00",
    venueName: "Mall of Asia Arena, Pasay",
    description:
      "Three stages, twenty acts, one glowing night under the northern-lights canopy. The flagship festival returns with the country's biggest indie and electronic line-up.",
    tiers: [
      { name: "General Admission", price: 150000, quantity: 2000, sold: 640 },
      { name: "Gold", price: 320000, quantity: 600, sold: 210, description: "Elevated viewing deck" },
      { name: "VIP", price: 650000, quantity: 150, sold: 80, description: "Front pit + lounge access" },
    ],
  },
  {
    title: "Manila Grand Prix",
    eventType: "racing",
    theme: "grandprix",
    status: "on_sale",
    inDays: 35,
    time: "13:00",
    venueName: "Clark International Speedway, Pampanga",
    description:
      "Pole position, carbon and speed. A full weekend of wheel-to-wheel racing capped by the headline night sprint under the lights.",
    tiers: [
      { name: "Grandstand", price: 120000, quantity: 1500, sold: 300 },
      { name: "Paddock Club", price: 480000, quantity: 200, sold: 60, description: "Pit-lane access + hospitality" },
      { name: "VIP Trackside", price: 900000, quantity: 50, sold: 12, description: "Garage tour + premium seating" },
    ],
  },
  {
    title: "Cosmoverse Convention",
    eventType: "seminar",
    theme: "cosmic",
    status: "published",
    inDays: 48,
    time: "10:00",
    venueName: "SMX Convention Center, Pasay",
    description:
      "A neon-lit gathering for builders, creators and dreamers. Two days of talks, demos and a starfield expo floor.",
    tiers: [
      { name: "Day Pass", price: 90000, quantity: 1200, sold: 150 },
      { name: "Full Weekend", price: 160000, quantity: 800, sold: 90 },
      { name: "VIP Pass", price: 350000, quantity: 100, sold: 20, description: "Reserved seating + speaker mixer" },
    ],
  },
  {
    title: "Sunset Sessions: Island Edition",
    eventType: "concert",
    theme: "tropical",
    status: "on_sale",
    inDays: 14,
    time: "17:00",
    venueName: "La Union Beachfront, San Juan",
    description:
      "Golden-hour sets by the shore with island DJs, food stalls and a sundowner bar. Bring your sandals.",
    tiers: [
      { name: "Beach Pass", price: 80000, quantity: 900, sold: 410 },
      { name: "Cabana", price: 250000, quantity: 60, sold: 24, description: "Shared cabana for 4 + drinks" },
    ],
  },
  {
    title: "Barangay Fiesta Nights",
    eventType: "other",
    theme: "fiesta",
    status: "published",
    inDays: 9,
    time: "18:00",
    venueName: "Plaza Independencia, Cebu City",
    description:
      "A free community fiesta — banderitas, street food, live rondalla and a town-plaza dance till midnight. Everyone's welcome.",
    tiers: [{ name: "Free Entry", price: 0, quantity: 3000, sold: 1200 }],
  },
  {
    title: "Indie Rising: Gig Night",
    eventType: "concert",
    theme: "aurora",
    status: "on_sale",
    inDays: 6,
    time: "20:00",
    venueName: "12 Monkeys Music Hall, Mandaluyong",
    description:
      "Five rising bands, one sweaty room, zero filler. The monthly showcase for the best new acts on the scene.",
    tiers: [
      { name: "Standing", price: 60000, quantity: 350, sold: 180 },
      { name: "Early Bird", price: 45000, quantity: 100, sold: 100, description: "Sold out — limited release" },
    ],
  },
  {
    title: "Tech Future Summit",
    eventType: "seminar",
    theme: "cosmic",
    status: "published",
    inDays: 62,
    time: "09:00",
    venueName: "PICC Forum, Pasay",
    description:
      "The year's definitive summit on AI, fintech and the Philippine startup landscape. Keynotes, panels and a demo arena.",
    tiers: [
      { name: "Standard", price: 250000, quantity: 700, sold: 110 },
      { name: "Founder", price: 550000, quantity: 150, sold: 30, description: "Investor lounge + workshops" },
    ],
  },
  {
    title: "Speed Kings Karting Cup",
    eventType: "racing",
    theme: "grandprix",
    status: "sold_out",
    inDays: 28,
    time: "14:00",
    venueName: "City Kart Racing, Parañaque",
    description:
      "The amateur karting championship finale. Grandstand seats only — the grid is full and so are the stands.",
    tiers: [{ name: "Grandstand", price: 50000, quantity: 400, sold: 400 }],
  },
];

export const seedSampleData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Upsert the display creator account that "hosts" the sample events.
    let creator = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", SEED_CLERK_ID))
      .unique();
    let creatorId;
    if (creator) {
      creatorId = creator._id;
    } else {
      creatorId = await ctx.db.insert("users", {
        clerkId: SEED_CLERK_ID,
        name: "TIX.PH Presents",
        email: "presents@tixph.example",
        roles: ["attendee", "organization"],
        activeRole: "organization",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Upsert its creator profile (shown in the "Hosted by" line).
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", creatorId))
      .unique();
    if (!profile) {
      await ctx.db.insert("creatorProfiles", {
        userId: creatorId,
        displayName: "TIX.PH Presents",
        bio: "The house promoter for sample events across the Philippines.",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Clear any previously-seeded events (+ their tiers) so re-running is idempotent.
    const prior = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", creatorId))
      .collect();
    for (const e of prior) {
      const tiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event_id", (q) => q.eq("eventId", e._id))
        .collect();
      for (const t of tiers) await ctx.db.delete(t._id);
      await ctx.db.delete(e._id);
    }

    // Insert the sample events + their tiers.
    for (const ev of SAMPLE_EVENTS) {
      const eventId = await ctx.db.insert("events", {
        creatorId,
        eventType: ev.eventType,
        theme: ev.theme,
        title: ev.title,
        description: ev.description,
        date: now + ev.inDays * DAY,
        time: ev.time,
        venueName: ev.venueName,
        status: ev.status,
        createdAt: now,
        updatedAt: now,
      });
      for (let i = 0; i < ev.tiers.length; i++) {
        const t = ev.tiers[i];
        await ctx.db.insert("ticketTiers", {
          eventId,
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          soldCount: t.sold ?? 0,
          description: t.description,
          sortOrder: i,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { creatorId, eventsCreated: SAMPLE_EVENTS.length };
  },
});

// Grant the signed-in account creator + admin roles so the dashboard side is
// visible. Sign in once first (so the Clerk webhook syncs the user), then run:
//   npx convex run seed:promoteToCreator '{"email":"you@example.com"}'
export const promoteToCreator = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) {
      throw new ConvexError(
        `No user with email "${args.email}". Sign in once first so the account syncs, then re-run.`
      );
    }
    const roles = Array.from(
      new Set([...user.roles, "organization", "admin"])
    );
    await ctx.db.patch(user._id, {
      roles,
      activeRole: "organization",
      updatedAt: Date.now(),
    });
    return { email: args.email, roles };
  },
});

// Upsert demo accounts (created in Clerk by scripts/create-demo-users.mjs) into
// Convex with their roles, and optionally hand the seeded events to the organizer
// so their dashboard is populated. Idempotent.
export const setupDemoAccounts = internalMutation({
  args: {
    accounts: v.array(
      v.object({
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        roles: v.array(v.string()),
        claimSeedEvents: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { accounts }) => {
    const now = Date.now();
    const results: Array<{ email: string; roles: string[]; activeRole: string }> = [];

    for (const a of accounts) {
      const roles = Array.from(new Set(["attendee", ...a.roles]));
      const activeRole = a.roles[0] ?? "attendee";

      let user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", a.clerkId))
        .unique();

      if (user) {
        await ctx.db.patch(user._id, {
          name: a.name,
          email: a.email,
          roles,
          activeRole,
          isActive: true,
          updatedAt: now,
        });
      } else {
        const id = await ctx.db.insert("users", {
          clerkId: a.clerkId,
          name: a.name,
          email: a.email,
          roles,
          activeRole,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        user = await ctx.db.get(id);
      }

      if (a.claimSeedEvents && user) {
        const existingProfile = await ctx.db
          .query("creatorProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", user!._id))
          .unique();
        if (!existingProfile) {
          await ctx.db.insert("creatorProfiles", {
            userId: user._id,
            displayName: a.name,
            bio: "Demo organizer account for the presentation.",
            createdAt: now,
            updatedAt: now,
          });
        }
        const seedCreator = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", SEED_CLERK_ID))
          .unique();
        if (seedCreator) {
          const evs = await ctx.db
            .query("events")
            .withIndex("by_creator_id", (q) => q.eq("creatorId", seedCreator._id))
            .collect();
          for (const e of evs) {
            await ctx.db.patch(e._id, { creatorId: user._id, updatedAt: now });
          }
        }
      }

      results.push({ email: a.email, roles, activeRole });
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// Venue seeding — a "small concert / mall tour" template applied to a circuit
// of Philippine mall activity centers. Venues are publicly listed regardless of
// owner; managing them in the dashboard needs the venue_manager role, so this
// also grants that role to the chosen manager account.
//   npx convex run seed:seedVenues '{"managerEmail":"organizer@phlive-demo.com"}'
// ---------------------------------------------------------------------------

// Default amenity template for a small-concert / mall-tour stop.
const MALL_TOUR_TEMPLATE = [
  "PA System",
  "Air Conditioning",
  "Parking",
  "WiFi",
  "Loading Dock",
];

type SeedVenue = {
  name: string;
  location: string;
  capacity: number;
  description: string;
  extraAmenities?: string[];
};

const SAMPLE_VENUES: SeedVenue[] = [
  {
    name: "SM Megamall — Mega Trade Hall",
    location: "Mandaluyong City",
    capacity: 2000,
    description:
      "Indoor trade hall configured for mall-tour concerts and album launches. Central foot traffic, full stage power, and mall security included.",
    extraAmenities: ["Green Room"],
  },
  {
    name: "SM Mall of Asia — Music Hall",
    location: "Pasay City",
    capacity: 1500,
    description:
      "Purpose-built music hall beside the bay. A reliable flagship stop for small-concert tours with a proper stage and FOH position.",
    extraAmenities: ["Green Room", "Bar Service"],
  },
  {
    name: "TriNoma — Activity Center",
    location: "Quezon City",
    capacity: 1200,
    description:
      "Open atrium activity center ideal for meet-and-greets and acoustic mall-tour sets. High visibility across three levels of foot traffic.",
    extraAmenities: ["Outdoor Space"],
  },
  {
    name: "Robinsons Galleria — Veranda Hall",
    location: "Quezon City",
    capacity: 1000,
    description:
      "Enclosed function hall for ticketed mall shows and fan events. Easy load-in and a controlled, air-conditioned room.",
  },
  {
    name: "SM City Cebu — Northwing Atrium",
    location: "Cebu City",
    capacity: 1500,
    description:
      "The Visayas anchor for mall tours. Spacious atrium stage with strong regional draw and full mall amenities.",
    extraAmenities: ["Outdoor Space"],
  },
  {
    name: "Ayala Center Cebu — Activity Center",
    location: "Cebu City",
    capacity: 1300,
    description:
      "Central activity center for album launches and acoustic stops in Cebu. Bright, open, and built for crowds.",
  },
  {
    name: "SM Lanang Premier — Atrium",
    location: "Davao City",
    capacity: 1400,
    description:
      "The Mindanao leg of the circuit. A large premier atrium with room for a full stage and standing crowd.",
    extraAmenities: ["Outdoor Space"],
  },
  {
    name: "Glorietta — Activity Center",
    location: "Makati City",
    capacity: 1100,
    description:
      "Makati's go-to mall stage for intimate mall-tour shows. Premium location with steady weekday and weekend traffic.",
  },
];

const SEED_VENUE_NAMES = new Set(SAMPLE_VENUES.map((v) => v.name));

export const seedVenues = internalMutation({
  args: { managerEmail: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const manager = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.managerEmail))
      .unique();
    if (!manager) {
      throw new ConvexError(
        `No user with email "${args.managerEmail}". Create the demo accounts first.`
      );
    }

    // Ensure the manager can manage venues (they switch to this role in the UI).
    if (!manager.roles.includes("venue_manager")) {
      await ctx.db.patch(manager._id, {
        roles: [...manager.roles, "venue_manager"],
        updatedAt: now,
      });
    }

    // Idempotent: remove previously-seeded venues owned by this manager.
    const owned = await ctx.db
      .query("venues")
      .withIndex("by_manager_id", (q) => q.eq("managerId", manager._id))
      .collect();
    for (const v of owned) {
      if (SEED_VENUE_NAMES.has(v.name)) await ctx.db.delete(v._id);
    }

    for (const venue of SAMPLE_VENUES) {
      await ctx.db.insert("venues", {
        managerId: manager._id,
        name: venue.name,
        location: venue.location,
        capacity: venue.capacity,
        description: venue.description,
        amenities: Array.from(
          new Set([...MALL_TOUR_TEMPLATE, ...(venue.extraAmenities ?? [])])
        ),
        photoStorageIds: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return { managerEmail: args.managerEmail, venuesCreated: SAMPLE_VENUES.length };
  },
});

export const clearVenues = internalMutation({
  args: { managerEmail: v.string() },
  handler: async (ctx, args) => {
    const manager = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.managerEmail))
      .unique();
    if (!manager) return { deletedVenues: 0 };

    const owned = await ctx.db
      .query("venues")
      .withIndex("by_manager_id", (q) => q.eq("managerId", manager._id))
      .collect();
    let deleted = 0;
    for (const v of owned) {
      if (SEED_VENUE_NAMES.has(v.name)) {
        await ctx.db.delete(v._id);
        deleted++;
      }
    }
    return { deletedVenues: deleted };
  },
});

// Give an account every back-office role so the role switcher shows all four
// tabs (Admin / Organizer / Artist / Customer) — handy for a single demo login.
//   npx convex run seed:grantAllRoles '{"email":"organizer@phlive-demo.com"}'
export const grantAllRoles = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) {
      throw new ConvexError(`No user with email "${args.email}".`);
    }
    const roles = ["attendee", "artist", "organization", "venue_manager", "admin"];
    await ctx.db.patch(user._id, { roles, activeRole: "organization", updatedAt: Date.now() });
    return { email: args.email, roles };
  },
});

// Insert sample purchased tickets so the customer wallet, "My events" calendar,
// and the Top-customers (promo) leaderboard populate without live Stripe. The
// demo customer (attendee@phlive-demo.com) is seeded as a frequent buyer.
//   npx convex run seed:seedSampleTickets
const SAMPLE_BUYERS = [
  "attendee@phlive-demo.com",
  "liza.cruz@email.ph",
  "marco.reyes@email.ph",
  "anna.lim@email.ph",
  "joce.tan@email.ph",
  "kim.reyes@email.ph",
  "ben.uy@email.ph",
  "paolo.diaz@email.ph",
];

export const seedSampleTickets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Idempotent: clear previously-seeded tickets first.
    const prior = await ctx.db.query("tickets").collect();
    for (const t of prior) {
      if (t.stripeSessionId.startsWith("seed-session-")) await ctx.db.delete(t._id);
    }

    const events = await ctx.db.query("events").collect();
    let n = 0;
    let evIdx = 0;
    for (const ev of events) {
      // sellable events only
      if (ev.status === "cancelled" || ev.status === "draft") continue;
      const tiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event_id", (q) => q.eq("eventId", ev._id))
        .collect();
      if (!tiers.length) continue;

      const count = 4 + (evIdx % 6); // 4–9 tickets per event
      for (let i = 0; i < count; i++) {
        const tier = tiers[i % tiers.length];
        // bias the demo customer to recur so they top the leaderboard + have a wallet
        const buyer = i % 3 === 0 ? SAMPLE_BUYERS[0] : SAMPLE_BUYERS[(evIdx + i) % SAMPLE_BUYERS.length];
        const scanned = i % 4 === 0;
        await ctx.db.insert("tickets", {
          tierId: tier._id,
          eventId: ev._id,
          stripeSessionId: `seed-session-${n}`,
          buyerEmail: buyer,
          qrCode: `seed-qr-${n}`,
          qrSignature: `seed-sig-${n}`,
          scannedAt: scanned ? now - (i % 5) * 86400000 : undefined,
          scannedBy: scanned ? "seed-scanner" : undefined,
          createdAt: now - i * 3600000 - (evIdx % 20) * 86400000,
        });
        n++;
      }
      evIdx++;
    }

    return { ticketsCreated: n };
  },
});

export const clearSampleTickets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("tickets").collect();
    let deleted = 0;
    for (const t of all) {
      if (t.stripeSessionId.startsWith("seed-session-")) {
        await ctx.db.delete(t._id);
        deleted++;
      }
    }
    return { deleted };
  },
});

// Seed sample sponsorships / fundraisers / concert requests (demo). Clears all
// existing campaigns first (demo reset).
//   npx convex run seed:seedCampaigns
export const seedCampaigns = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const c of await ctx.db.query("campaigns").collect()) await ctx.db.delete(c._id);
    for (const c of await ctx.db.query("campaignContributions").collect()) await ctx.db.delete(c._id);

    const organizer = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "organizer@phlive-demo.com"))
      .unique();
    const attendee = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "attendee@phlive-demo.com"))
      .unique();
    if (!organizer) throw new ConvexError("Run seed:setupDemoAccounts first.");
    const requester = attendee?._id ?? organizer._id;

    const rows = [
      { kind: "sponsorship", creatorId: organizer._id, title: "Stage sponsor — Aurora Fest", description: "Title sponsor slot for the main stage: logo on the backdrop, banner placements, and a VIP table.", goalAmount: 50000000, raisedAmount: 32000000, supporterCount: 14, status: "active" },
      { kind: "fundraiser", creatorId: organizer._id, title: "Tour van fund", description: "Help us buy a reliable van for the regional mall tour.", goalAmount: 20000000, raisedAmount: 8500000, supporterCount: 63, status: "active" },
      { kind: "fundraiser", creatorId: organizer._id, title: "Community stage rebuild", description: "Rebuild the plaza stage after the storm — for free community fiestas.", goalAmount: 30000000, raisedAmount: 30000000, supporterCount: 120, status: "funded" },
      { kind: "sponsorship", creatorId: organizer._id, title: "Brand booth — Cosmoverse", description: "Premium expo-floor booth + app feature for a tech sponsor.", goalAmount: 15000000, raisedAmount: 0, supporterCount: 0, status: "pending" },
      { kind: "concert_request", creatorId: requester, targetArtistId: organizer._id, targetCity: "Cebu City", title: "Bring The Ridges to Cebu", description: "Cebu fans want a full show — there's huge demand here!", raisedAmount: 0, supporterCount: 412, status: "active" },
      { kind: "concert_request", creatorId: requester, targetArtistId: organizer._id, targetCity: "Davao City", title: "Davao show please!", description: "Mindanao deserves a stop on the tour.", raisedAmount: 0, supporterCount: 188, status: "pending" },
    ];

    for (const r of rows) {
      await ctx.db.insert("campaigns", {
        kind: r.kind,
        creatorId: r.creatorId,
        title: r.title,
        description: r.description,
        goalAmount: r.goalAmount,
        raisedAmount: r.raisedAmount,
        supporterCount: r.supporterCount,
        targetCity: r.targetCity,
        targetArtistId: r.targetArtistId,
        status: r.status,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { campaignsCreated: rows.length };
  },
});

// Attach a sample lineup (the demo organizer, who also holds the artist role) to
// the first few events so the calendar "Artists involved" shows real names.
//   npx convex run seed:seedLineups
export const seedLineups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const artist = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "organizer@phlive-demo.com"))
      .unique();
    if (!artist) throw new ConvexError("Run seed:setupDemoAccounts first.");

    const events = await ctx.db
      .query("events")
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();
    let n = 0;
    for (const e of events.slice(0, 4)) {
      await ctx.db.patch(e._id, { lineupArtistIds: [artist._id], updatedAt: Date.now() });
      n++;
    }
    return { eventsUpdated: n };
  },
});

// Danger (demo only): deletes ALL events + ticketTiers + tickets. Use to clear
// orphaned/duplicate seed events left behind by earlier deployment wipes, then
// re-run seed:seedSampleData and seed:seedSampleTickets for a clean dataset.
export const clearAllEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    let tiers = 0;
    for (const t of await ctx.db.query("ticketTiers").collect()) {
      await ctx.db.delete(t._id);
      tiers++;
    }
    let tickets = 0;
    for (const tk of await ctx.db.query("tickets").collect()) {
      await ctx.db.delete(tk._id);
      tickets++;
    }
    let events = 0;
    for (const e of await ctx.db.query("events").collect()) {
      await ctx.db.delete(e._id);
      events++;
    }
    return { events, tiers, tickets };
  },
});

export const clearSampleData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const creator = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", SEED_CLERK_ID))
      .unique();
    if (!creator) return { deletedEvents: 0 };

    const events = await ctx.db
      .query("events")
      .withIndex("by_creator_id", (q) => q.eq("creatorId", creator._id))
      .collect();
    for (const e of events) {
      const tiers = await ctx.db
        .query("ticketTiers")
        .withIndex("by_event_id", (q) => q.eq("eventId", e._id))
        .collect();
      for (const t of tiers) await ctx.db.delete(t._id);
      await ctx.db.delete(e._id);
    }

    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", creator._id))
      .unique();
    if (profile) await ctx.db.delete(profile._id);

    await ctx.db.delete(creator._id);
    return { deletedEvents: events.length };
  },
});
