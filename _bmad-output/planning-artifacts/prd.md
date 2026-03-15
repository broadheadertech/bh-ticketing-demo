---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
workflow_completed: true
classification:
  projectType: 'web_app'
  domain: 'e-commerce/marketplace'
  complexity: 'medium-high'
  projectContext: 'greenfield'
inputDocuments:
  - '_bmad-output/planning-artifacts/product-brief-universal-ticketing-system-2026-03-06.md'
  - '_bmad-output/planning-artifacts/research/technical-platform-architecture-research-2026-03-06.md'
  - '_bmad-output/analysis/brainstorming-session-2026-03-06.md'
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 1
  projectDocs: 0
  projectContext: 0
date: '2026-03-06'
author: 'ringmaster'
---

# Product Requirements Document - universal-ticketing-system

**Author:** ringmaster
**Date:** 2026-03-06

## Executive Summary

universal-ticketing-system is a multi-sided event marketplace that unifies event creation, ticketing, discovery, and venue management into a single platform. It serves four primary user types — independent artists/creators, event organizers, attendees, and venue managers — connected through an Event Ecosystem Flywheel where each side strengthens the others.

The platform is built as three interconnected systems: a **Creator Economy Stack** (the operating system for event creators), an **Attendee Lifestyle Platform** (personalized discovery and frictionless ticket purchasing), and a **Venue Optimization Engine** (data-driven venue management and booking).

**Key differentiators:** Adaptive Event Schema (platform morphs to fit event type — concert, racing, seminar), Event Ecosystem Flywheel (multi-sided network effects), creator-first design (treats artists as entrepreneurs), and full event lifecycle management (Draft through Post-Event).

**Tech stack:** Next.js 16, Convex, Stripe Connect, Clerk, deployed on Vercel. Modular monolith architecture with serverless-first infrastructure targeting near-zero cost at launch.

**Strategy:** Growth-first. Build the network, monetize later. North Star Metric: Tickets Sold per Month.

## Success Criteria

### User Success

| User Type | Success Indicator | MVP Target | Growth Target |
|-----------|------------------|------------|---------------|
| **Creator** | Signup to published event | <15 minutes | <10 minutes |
| **Creator** | All sales tracked in dashboard | 100% — zero off-platform payments | 100% |
| **Organizer** | Multi-event management | 3+ events from one dashboard | 10+ with templates |
| **Attendee** | Browse to confirmed ticket | <2 minutes | <1 minute |
| **Attendee** | QR scan to entry | <5 seconds, >99% success | <3 seconds |
| **Venue Manager** | Venue attracts organizers | 1+ inbound inquiry/month | 3+ inquiries/month |
| **Admin** | Platform health visibility | Real-time dashboard | Automated alerts |

### Business Success

**Strategy: Growth-First** — build the network, monetize later. The flywheel (creators -> events -> attendees -> venues -> creators) is the engine. Revenue optimization comes after network establishment.

**North Star Metric: Tickets Sold per Month**

| Milestone | Timeline | Criteria |
|-----------|----------|----------|
| **Smoke Test** | Day 1 | Complete flow works: signup -> create event -> buy ticket -> QR validates |
| **First Real Usage** | Week 1 | 1 real creator lists a real event (not internal testing) |
| **Early Traction** | Month 1 | 3-5 live events, at least 1 with actual ticket sales |
| **Go/No-Go Decision** | Month 2 | 5+ creators published, 1+ event sold tickets -> proceed to Phase 2 |
| **First Milestone** | Month 3 | 10-20 live events, 5-10 active creators, 50-200 tickets sold |
| **Network Effects** | Month 6 | 60%+ creator retention, 30%+ attendee return rate |
| **Sustainability** | Month 12 | Platform fees cover infrastructure, organic creator signups at 30%+ |

**Anti-Metrics (Not Optimizing For Yet):**
- Revenue/profit (growth-first phase)
- Total registered users (vanity — active creators and ticket sales matter)
- Feature count (ship less, validate more)

### Technical Success

Progressive performance targets aligned with platform maturity:

| Metric | MVP (Day 1) | Month 1-2 | Month 3+ |
|--------|-------------|-----------|----------|
| **LCP (Largest Contentful Paint)** | <2.5s | <1.5s | <1.2s |
| **API Response Time (p95)** | <500ms | <200ms | <200ms |
| **Uptime** | 99% | 99.5% | 99.9% |
| **QR Scan Success Rate** | >95% | >99% | >99.5% |
| **Checkout Completion Rate** | >75% | >85% | >90% |
| **Zero Critical Bugs** | On launch day | In production | Always |

### Measurable Outcomes

- **"It works"** = A creator publishes an event, an attendee buys a ticket, and QR validates at the door — full lifecycle, no manual intervention
- **"It's better"** = Creators say "this is easier than what I was doing before"
- **"It's growing"** = New creators join because of the attendee base, not just direct outreach
- **"It's sustainable"** = Platform fees cover Vercel + Convex + Stripe costs (~$70/mo early stage)

## User Journeys

### Journey 1: Marco's First Solo Show (Creator — Happy Path)

**Marco, 28 — Independent musician, Cebu**

**Opening Scene:** It's Tuesday night. Marco just finished rehearsal and checks his Instagram DMs — 14 unread messages asking "when's your next show?" He has a venue booked for Saturday but no way to sell tickets except posting his GCash number and hoping people screenshot their receipts. Last time, he lost track of 8 payments and had 12 people claim they paid when he could only confirm 9.

**Rising Action:** A fellow artist tells him about the platform. Marco signs up with Google in 10 seconds, switches to "Artist" role, and creates his profile — name, bio, photo, Spotify link. He hits "Create Event," selects "Concert," and the platform suggests ticket tiers: General Admission and VIP. He sets GA at P300 (100 available) and VIP at P800 (20 available, includes meet & greet). Uploads his event poster, picks Carlos's venue from the venue list, writes a description, and publishes. Total time: 11 minutes.

He copies the event link and drops it in his Instagram story. The first ticket sells within 30 minutes.

**Climax:** Saturday arrives. Marco opens his dashboard on his phone backstage — 87 GA and 18 VIP tickets sold. P40,500 in revenue, all tracked. His door guy opens the scanner page on a tablet. Fans walk up, show QR codes on their phones, scan takes 2 seconds — green checkmark, they're in. The entry counter ticks up in real time on Marco's dashboard. No arguments about "I already paid," no lost GCash screenshots, no spreadsheet chaos.

**Resolution:** Sunday morning, Marco opens the app. Revenue breakdown: P40,500 gross, platform fee clearly shown, Stripe payout pending in 2 days. He can see 105 unique attendees checked in. He thinks: "I spent 11 minutes setting this up instead of 3 hours chasing payments. And I actually know exactly how much I made." He starts planning his next show — a bigger venue this time.

**Requirements revealed:** Event creation flow, ticket tier builder, event artwork upload, creator dashboard, real-time sales tracking, QR scanner page, entry counter, Stripe Connect payouts, shareable event links.

---

### Journey 2: Dianne Runs Round 7 of the Racing Season (Organizer — Complex Event)

**Dianne, 35 — Operations manager, regional racing league**

**Opening Scene:** Dianne manages a 12-round racing series. Each round requires 5 ticket types: Grandstand Zone A (P500, 200 capacity), Grandstand Zone B (P350, 300 capacity), Pit Access (P1,500, 50 capacity), Paddock VIP (P3,000, 20 capacity), and Team Entry (P5,000, 15 slots). She's currently managing this across a shared Google Sheet, a Viber group with 47 unread messages, and three different GCash accounts.

**Rising Action:** Dianne creates an Organization account for the racing league. She builds Round 7 as a "Racing" event type — the platform adapts, offering motorsport-relevant tier suggestions. She customizes the 5 ticket types with names, prices, quantities, and descriptions. She selects the race circuit venue (already on the platform with Carlos's venue profile showing track layout photos and 2,000 capacity). She adds the event details — race day schedule, gate opening times, parking info — and publishes.

She sends the link to the league's Facebook group and the team managers' Viber chat. Ticket sales start immediately. From her organization dashboard, she can see all 12 rounds listed — past rounds show final attendance and revenue, upcoming rounds show current sales progress.

**Climax:** Race day. Dianne has 3 volunteers at 3 different gates, each with the scanner page open on their phones. Zone A entrance scans Zone A tickets only — a fan with a Zone B ticket tries to enter Zone A and gets a red "Wrong Zone" alert. Pit Access holders get scanned at the pit lane gate. Everything routes correctly. Dianne watches the real-time entry dashboard from the operations tent — 437 of 485 sold tickets have scanned in, 48 no-shows.

**Resolution:** After the event, Dianne pulls up the round-by-round view. Round 7 sold 15% more Pit Access passes than Round 6 — the new "Pit Walk" add-on she promoted is working. She creates Round 8 by duplicating Round 7's structure — just updates the date and the venue. Setup time: 4 minutes. She used to spend 2 hours per round on ticket setup alone.

**Requirements revealed:** Organization accounts, multi-event management, complex ticket tiers (5+ types), event type adaptation (racing-specific), event duplication, multi-gate scanning with zone validation, organization dashboard with cross-event view, real-time entry tracking per zone, volunteer/staff scanner access.

---

### Journey 3: Jai's Friday Night Out (Attendee — Social Discovery)

**Jai, 24 — Young professional, Manila**

**Opening Scene:** It's Friday at 4pm. Jai is scrolling her phone at her desk, thinking "I need to do something fun tonight." She's tired of checking 4 different Instagram accounts and 3 Facebook pages to figure out what's happening. Last weekend she missed a jazz night she would have loved because she didn't see the post until Sunday.

**Rising Action:** She opens the platform and browses the event feed — filtered to "This Weekend" and "Manila." She sees a jazz night at a rooftop bar (P400), a food festival in BGC (free entry), and an indie band showcase (P250). The jazz night catches her eye — she taps in and sees the event details: lineup, venue photos, start time, and "2 friends attending" (two of her contacts who also use the platform).

She selects 2 tickets — one for herself, one for her friend Ana. Checkout opens, she pays P800 with her card via Stripe. Confirmation appears instantly — two QR codes, one for each ticket. She forwards Ana's QR via the app's share button.

**Climax:** At 8pm, Jai and Ana arrive at the venue. Jai pulls up her QR code, the door staff scans it — green checkmark, 2-second process, no fumbling with screenshots or "check the list." Ana scans hers too. They're in. The jazz is great, the rooftop view is incredible, and Jai thinks: "Why wasn't it always this easy?"

**Resolution:** The next morning, Jai gets a notification: "How was Jazz on the Roof?" She leaves a quick rating. The event appears in her event history. She follows the jazz venue and the organizer so she'll get notified next time. Two weeks later, she gets a notification about a soul night at the same venue — she buys tickets in 30 seconds because her payment method is already saved.

**Requirements revealed:** Event discovery feed with filters (date, location, type), event detail pages with social proof, multi-ticket purchase, Stripe Checkout, QR code delivery and sharing, fast QR scanning, event history, follow artists/venues, push notifications for followed entities, ratings/reviews (Phase 2).

---

### Journey 4: Carlos Lists His Venue (Venue Manager — Marketplace Entry)

**Carlos, 42 — Venue owner, 300-capacity multi-purpose space, Makati**

**Opening Scene:** Carlos's Google Calendar has 3 colors: red (booked), yellow (tentative — someone asked on Viber but hasn't confirmed), and green (available). He has no idea why Tuesdays are always empty or whether he should raise Friday rates. An organizer he's never heard of just messaged him on Viber asking about next month — Carlos has to dig through old messages to figure out if those dates are actually free.

**Rising Action:** Carlos creates a Venue Manager account and builds his venue profile: "The Loft Makati — 300 capacity, indoor/outdoor, full sound system, bar service available." He uploads 8 photos showing different configurations — concert setup, seminar layout, cocktail reception. He adds amenities: PA system, projector, green room, loading dock. He sets his availability calendar — marking dates as available, tentatively held, or booked.

He publishes the profile. Now when organizers create events on the platform, "The Loft Makati" appears as a selectable venue with photos, capacity, and availability visible before they even reach out.

**Climax:** Within the first month, two organizers Carlos has never met find his venue through the platform and book events — a corporate workshop (Tuesday, P15,000 rental) and a comedy night (Friday, P25,000 rental + bar revenue). Carlos didn't have to answer a single Viber message to make these happen. The bookings show up on his venue dashboard with event details, expected attendance, and organizer contact info.

**Resolution:** After a few months, Carlos's venue dashboard shows him utilization data: Fridays average 90% capacity (mostly concerts), Tuesdays average 45% (seminars and workshops). He can see which event types fill his space best and adjusts his pricing and marketing accordingly. Three new organizers discovered him through the platform this quarter — organizers he never would have found through his Viber network.

**Requirements revealed:** Venue profile creation (photos, amenities, capacity, description), availability calendar, venue search/selection in event creation flow, venue dashboard (bookings, utilization stats), venue discovery for organizers, booking request flow.

---

### Journey 5: Ringmaster Monitors the Platform (Admin — Operations)

**Ringmaster — Platform owner and operator**

**Opening Scene:** It's Monday morning. The platform has been live for 6 weeks. Ringmaster opens the admin dashboard to check the weekend's activity — 4 events happened over the weekend, 312 tickets were sold across them, and one organizer flagged a support issue.

**Rising Action:** The admin dashboard shows the key metrics at a glance: 23 total events created (14 completed, 6 upcoming, 3 drafts), 47 registered creators, 890 tickets sold lifetime, 1,247 registered users. Flywheel health: 8 creators have published 2+ events (retention signal). No flagged content, no reported issues beyond the one support ticket — a creator can't figure out how to set up their Stripe Connect account.

Ringmaster navigates to User Management, finds the creator, and sees they started Stripe onboarding but didn't complete it. He sends them a quick message with the setup guide link. Issue resolved.

He then checks the Financial Overview — total GMV this month is P187,000, platform fees collected P9,350. Infrastructure costs are P2,100/month (Vercel Pro + Convex). The platform is already revenue-positive on infrastructure.

**Climax:** A moderation alert appears — an event listing has been reported as potentially fraudulent (ticket price seems too low for the claimed artist). Ringmaster reviews the event details, checks the creator's account history (new account, no previous events, unverified), and decides to unpublish the event pending verification. He contacts the creator to verify their identity and event legitimacy before re-publishing.

**Resolution:** By end of week, the creator verified their identity and the event was re-published. Ringmaster adds a note to consider implementing creator verification badges in Phase 2. He reviews the weekly growth trend — events created are up 20% week-over-week. The flywheel is starting to turn.

**Requirements revealed:** Admin dashboard (users, events, tickets, revenue metrics), user management (view, disable, message), event moderation (review, flag, unpublish), financial overview (GMV, fees, costs), content moderation workflow, creator account review, platform health monitoring.

---

### Journey 6: The Failed Payment Recovery (Attendee — Error Path)

**Jai attempts to buy tickets but something goes wrong**

**Opening Scene:** Jai finds a sold-out-soon concert and rushes to buy the last 2 VIP tickets. She enters checkout and her card is declined — insufficient funds on that card.

**Rising Action:** The checkout doesn't crash or lose her place. Stripe Checkout shows the decline message and lets her try a different payment method. She switches to her second card. Payment goes through. Confirmation appears with QR codes.

**What if it fully fails?** If Jai closes the browser mid-checkout, the tickets aren't held — they return to available inventory (no zombie reservations in MVP). If she comes back 5 minutes later and the tickets are gone, she sees "Sold Out" clearly — no ambiguous state.

**At the door — duplicate scan scenario:** Jai's friend screenshots her QR code and tries to enter separately at a different gate. The first scan succeeds — green checkmark. The second scan of the same QR shows a red alert: "Already scanned at 8:47 PM." Door staff asks to see the original ticket holder's phone. The duplicate is caught instantly.

**Resolution:** The system handles failures gracefully at every point — payment retries are seamless, inventory is never in a phantom-held state, and QR security prevents duplicate entry. No manual intervention needed from the creator or admin for any of these scenarios.

**Requirements revealed:** Stripe Checkout error handling, payment retry with different methods, no phantom inventory holds (MVP simplicity), sold-out state display, HMAC-signed QR codes preventing forgery, duplicate scan detection with timestamp, multi-gate scan state synchronization.

---

### Journey Requirements Summary

| Capability Area | Revealed By Journeys | Priority |
|----------------|---------------------|----------|
| **Event Creation & Tiers** | Marco, Dianne | MVP Core |
| **Stripe Connect & Checkout** | Marco, Jai, Failed Payment | MVP Core |
| **QR Generation & Scanning** | Marco, Dianne, Jai, Failed Payment | MVP Core |
| **Creator Dashboard** | Marco, Dianne | MVP Core |
| **Event Discovery & Search** | Jai | MVP Core |
| **Venue Profiles & Calendar** | Carlos | MVP Core |
| **Admin Dashboard & Moderation** | Ringmaster | MVP Core |
| **Multi-ticket Purchase** | Jai | MVP Core |
| **Duplicate Scan Detection** | Dianne, Failed Payment | MVP Core |
| **Organization Accounts** | Dianne | MVP Core |
| **Event Duplication/Cloning** | Dianne | Phase 2 |
| **Zone-specific Scanning** | Dianne | Phase 2 |
| **Follow & Notifications** | Jai | Phase 2 |
| **Ratings & Reviews** | Jai | Phase 2 |
| **Creator Verification** | Ringmaster | Phase 2 |
| **Venue Utilization Analytics** | Carlos | Phase 2 |

## Web App Technical Requirements

### Application Architecture

Next.js 16 App Router hybrid application — server-rendered public pages for SEO and social sharing, client-side interactive dashboards for authenticated users. Mobile-first responsive design targeting attendees who discover and purchase tickets primarily on mobile devices.

### Browser & Device Support

| Target | Support Level |
|--------|-------------|
| **Chrome (latest 2)** | Full support |
| **Firefox (latest 2)** | Full support |
| **Safari (latest 2)** | Full support (critical — iPhone users) |
| **Edge (latest 2)** | Full support |
| **Mobile Chrome/Safari** | Primary target — mobile-first design |
| **IE11** | Not supported |
| **Minimum viewport** | 320px (iPhone SE) |

### Responsive Design Strategy

- **Mobile-first** — Event discovery, ticket purchase, and QR display optimized for mobile viewport
- **Tablet** — Scanner page optimized for tablet use at venue doors
- **Desktop** — Creator dashboards, admin panel, and event creation optimized for desktop
- **Breakpoints:** 320px (mobile), 768px (tablet), 1024px (desktop), 1280px (wide)

### SEO & Social Sharing

| Page Type | Rendering | SEO | Open Graph |
|-----------|-----------|-----|------------|
| **Event detail pages** | SSR/ISR | Full indexing | Yes — title, image, date, venue |
| **Event listing/discovery** | SSR | Full indexing | Yes — platform branding |
| **Creator profiles** | SSR | Indexable | Yes — artist/org info |
| **Venue profiles** | SSR | Indexable | Yes — venue photos, location |
| **Checkout** | CSR | noindex | No |
| **Dashboards** | CSR (auth) | noindex | No |
| **Admin panel** | CSR (auth) | noindex | No |

ISR (Incremental Static Regeneration) for event pages — regenerate on ticket sale or event update for near-real-time content with CDN-cached performance.

### Core Web Vitals Strategy

| Metric | Target | Strategy |
|--------|--------|----------|
| **LCP** | <2.5s (MVP), <1.5s (Month 2) | ISR + CDN caching, optimized images |
| **FID/INP** | <200ms | Minimal client-side JS on public pages |
| **CLS** | <0.1 | Skeleton loaders, image dimension hints |
| **TTI** | <3.5s on 3G | Code splitting, lazy loading dashboards |
| **Bundle size** | <200KB initial JS | Tree shaking, dynamic imports |

### Real-Time Features

| Feature | MVP Approach | Growth Approach |
|---------|-------------|-----------------|
| **Entry counter** | Polling (5s interval) | SSE |
| **Ticket availability** | Optimistic UI + server validation | SSE + Redis pub/sub |
| **Dashboard updates** | Manual refresh + polling | WebSocket |
| **Scanner sync** | Database-backed (Convex) | Redis pub/sub |

### Implementation Considerations

- **Auth pages:** Server-side redirect for authenticated users, client-side guard for protected routes
- **Image optimization:** Next.js Image component with Vercel OG for dynamic social images
- **PWA potential:** Service worker for offline ticket display (Phase 2) — QR codes should work without internet once loaded
- **API routes:** Next.js Route Handlers for Stripe webhooks, QR validation, and data mutations
- **Edge middleware:** Auth session validation, role-based route protection

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP — prove the core ticketing lifecycle works end-to-end (create event -> sell ticket -> validate QR at door) before adding complexity.

**MVP Philosophy:** Growth-first. Ship the minimum that makes creators say "this is easier than what I was doing before." Validate with real events before building more features.

**Resource Requirements:** Solo developer, serverless infrastructure (Vercel + Convex + Stripe). No DevOps overhead. Target: $0 infrastructure cost during development, ~$70/mo at early traction.

### MVP Build Tiers

The MVP is delivered in three progressive tiers to get something working fast and iterate:

#### Tier 1: Smoke Test (Day 1)

The absolute minimum to prove the full lifecycle works end-to-end.

| Feature | Scope |
|---------|-------|
| **Auth** | Google OAuth only (Clerk) |
| **Event Creation** | Single event type, basic ticket tiers (name, price, quantity) |
| **Ticket Purchase** | Stripe Checkout — single ticket purchase |
| **QR Tickets** | HMAC-SHA256 QR generation on purchase, scanner page for validation |
| **Event Page** | Public shareable event detail page |

**Journeys supported:** Marco creates event -> Jai buys ticket -> QR scans at door (simplified)

#### Tier 2: Functional MVP (Week 1-2)

Expand to support real-world usage across primary user types.

| Feature | Scope |
|---------|-------|
| **Auth** | Add email/password, role switching (attendee/artist/org) |
| **Event Creation** | Adaptive event types (concert, racing, seminar, class), event artwork upload |
| **Ticket Purchase** | Multi-ticket purchase, free event RSVP |
| **Creator Dashboard** | My events list, sales summary, real-time entry count |
| **Discovery** | Event listing page with filters (type, date, location), full-text search |
| **Event Lifecycle** | Draft -> Published -> On Sale -> Sold Out -> Completed states |
| **QR Tickets** | Duplicate scan detection, email confirmation with QR |

**Journeys supported:** Full Marco journey, full Jai journey, Jai error path

#### Tier 3: Complete MVP (Month 1)

Add remaining primary user types and admin capabilities.

| Feature | Scope |
|---------|-------|
| **Venue Management** | Venue profiles, availability calendar, venue selection in event creation |
| **Admin Panel** | User management, event moderation, platform overview dashboard, financial summary |
| **Organization Accounts** | Org profiles, multi-event management from org dashboard |
| **Venue Dashboard** | Events hosted, basic booking stats |

**Journeys supported:** All 6 journeys (Marco, Dianne, Jai, Carlos, Ringmaster, Error Path)

### Post-MVP Roadmap

**Phase 2 — Enhanced Platform (Months 3-4):**
- Seat maps (section-based selection)
- Merch integration at checkout
- Email notifications (Resend)
- Verified attendance reviews
- Automated refund handling
- Event cloning/templates
- Social follows (artists, venues)
- Staff role-limited scanner access
- Revenue split automation via Stripe

**Phase 3 — Growth Features (Months 5-8):**
- Individual seat selection (Redis + SSE real-time)
- Advanced analytics dashboard with cross-event intelligence
- Personalized event feed / recommendations
- Content hub (post-event recaps, photos)
- Season passes and recurring events
- Apple/Google Wallet passes
- Sponsorship tracking
- Event crews / group bookings

**Phase 4 — Scale & Ecosystem (Months 9+):**
- Meilisearch migration for advanced search
- Dynamic pricing engine
- Virtual waiting queue for high-demand on-sales
- Fraud detection (graph-based)
- Venue demand forecasting
- White-label option for large organizations
- Universal Event API for third-party integrations
- Multi-currency / multi-language support

**Long-term vision:** The "Shopify for live events" — default infrastructure for creating, attending, and hosting events. The flywheel compounds into an ecosystem that's stickier and harder to replicate with each phase.

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe Connect complexity | Delays payment flow | Use Stripe Checkout (hosted) — offload PCI, payment UI, and error handling to Stripe entirely |
| QR forgery/duplication | Security breach at door | HMAC-SHA256 signed QR codes + server-side duplicate detection — cryptographically secure from day 1 |
| Real-time at scale | Performance degradation | MVP uses polling (simple, reliable). Upgrade to SSE/WebSocket only when needed at scale |
| Database performance | Slow queries as data grows | Convex with proper indexes. Convex scales automatically. Optimize queries if needed |

**Market Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Creators don't adopt | No supply side | Growth-first strategy — onboard creators personally, make setup frictionless (<15 min) |
| Attendees prefer existing methods | No demand side | Focus on shareable event links (social distribution) — attendees don't need to "adopt" the platform, just buy tickets |
| Competing platforms enter market | Feature competition | Flywheel moat — network effects compound. Focus on creator relationships, not feature parity |

**Resource Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer bottleneck | Slow delivery | Tiered MVP approach — ship Tier 1 in 1 day, iterate. Serverless = zero ops overhead |
| Scope creep | Never ships | Strict tier boundaries. Go/No-Go at Month 2. Anti-metrics: don't optimize for feature count |
| Burnout | Project stalls | 3-tier MVP prevents "all or nothing" pressure. Each tier is independently valuable |

## Functional Requirements

### Identity & Access Management

- **FR1:** Users can sign up with Google OAuth or email/password
- **FR2:** Users can sign in and maintain authenticated sessions
- **FR3:** Users can hold multiple roles (attendee, artist, organization, venue_manager, admin) on a single account
- **FR4:** Users can switch between their active roles
- **FR5:** Creators can create and edit a public profile (name, bio, photo, external links)
- **FR6:** Admins can view, disable, and manage user accounts

### Event Management

- **FR7:** Creators can create events with an adaptive event type (concert, racing, seminar, class, other)
- **FR8:** Creators can define custom ticket tiers with name, price, quantity, and description per event
- **FR9:** The platform can suggest relevant ticket tier templates based on event type
- **FR10:** Creators can upload event artwork/banner images
- **FR11:** Creators can set event details (date, time, venue, description)
- **FR12:** Creators can select an existing venue from the platform when creating an event
- **FR13:** Events transition through lifecycle states (Draft -> Published -> On Sale -> Sold Out -> Completed)
- **FR14:** Creators can view and manage all their events from a dashboard
- **FR15:** Creators can view real-time sales and revenue data per event
- **FR16:** Organization accounts can manage multiple events under a single organization profile
- **FR17:** Admins can review, flag, and unpublish events for moderation
- **FR44:** Creators can cancel a published event (triggers notification to ticket holders, initiates refund process)
- **FR45:** Creators can delete draft events that have not been published

### Ticket Sales & Payments

- **FR18:** Attendees can purchase one or multiple tickets in a single checkout
- **FR19:** Attendees can register for free events without payment
- **FR20:** Payments are processed through Stripe Connect (Separate Charges and Transfers)
- **FR21:** Creators can onboard as Stripe Express connected accounts to receive payouts
- **FR22:** Attendees receive email confirmation with ticket details after purchase
- **FR23:** The platform tracks ticket inventory and prevents overselling
- **FR24:** The platform displays sold-out status clearly when tickets are exhausted
- **FR46:** All ticket prices are displayed and processed in Philippine Peso (PHP)
- **FR47:** The platform sends transactional emails (purchase confirmation, QR codes, event cancellation) via an email delivery service

### QR Ticketing & Validation

- **FR25:** The platform generates cryptographically signed (HMAC-SHA256) QR codes for each purchased ticket
- **FR26:** QR codes are delivered via email and viewable in-app
- **FR27:** Door staff can access a scanner page to validate QR codes at event entry
- **FR28:** The scanner detects and rejects duplicate QR code scans with timestamp
- **FR29:** Creators can view real-time entry count during an event
- **FR30:** A text-based ticket code is displayed alongside QR for accessibility

### Event Discovery

- **FR31:** Visitors can browse a public event listing page
- **FR32:** Visitors can filter events by type, date, and location
- **FR33:** Visitors can search for events using text search
- **FR34:** Each event has a public, shareable detail page with full event information
- **FR35:** Event detail pages display venue information and photos when a platform venue is linked

### Venue Management

- **FR36:** Venue managers can create and edit venue profiles (name, location, capacity, photos, amenities, description)
- **FR37:** Venue managers can manage an availability calendar (available, tentatively held, booked)
- **FR38:** Venue managers can view a dashboard of events hosted at their venue
- **FR39:** Organizers can discover and browse venue profiles when planning events

### Platform Administration

- **FR40:** Admins can view a platform overview dashboard (total users, events, tickets sold, revenue)
- **FR41:** Admins can view financial summary (GMV, platform fees, infrastructure costs)
- **FR42:** Admins can moderate content (review reported events, unpublish, contact creators)
- **FR43:** Admins can assign and manage user roles

### File & Media Management

- **FR48:** Creators and venue managers can upload images (event artwork, venue photos) stored in cloud storage
- **FR49:** Uploaded images are automatically optimized for web delivery (resized, compressed, served in modern formats)

### System Feedback & Error Handling

- **FR50:** The platform displays appropriate error pages (404, 500) when pages are not found or system errors occur
- **FR51:** Users receive in-app feedback (success/error indicators) when performing actions (creating events, purchasing tickets, scanning QR codes)
- **FR52:** The platform displays contextual validation messages on form inputs before submission

## Non-Functional Requirements

### Performance

- **NFR1:** Public event pages load with LCP <2.5s on 4G connections (MVP), improving to <1.5s by Month 2
- **NFR2:** Stripe Checkout redirect completes within 3 seconds
- **NFR3:** QR code scanning and validation returns result within 2 seconds
- **NFR4:** Event listing page with filters returns results within 1 second
- **NFR5:** Creator dashboard loads within 3 seconds on desktop
- **NFR6:** API responses complete within 500ms at p95 (MVP), improving to 200ms by Month 2
- **NFR7:** Platform supports 100 concurrent users without degradation (MVP), scaling to 1,000+ at growth phase

### Security

- **NFR8:** All data transmitted over HTTPS/TLS 1.3
- **NFR9:** User passwords hashed with bcrypt (minimum 12 rounds)
- **NFR10:** QR codes are HMAC-SHA256 signed to prevent forgery — invalid signatures are rejected
- **NFR11:** Payment card data never touches platform servers — handled entirely by Stripe
- **NFR12:** Auth sessions use HTTP-only, secure, SameSite cookies
- **NFR13:** Role-based access control enforced at both UI and API level — users cannot access resources outside their role
- **NFR14:** Convex function-level authorization enforced on multi-tenant data (creators only see their own events/revenue)
- **NFR15:** All admin actions are logged with timestamp and actor
- **NFR16:** File uploads validated for type and size — no executable uploads accepted

### Scalability

- **NFR17:** Serverless architecture scales to handle traffic spikes during on-sale periods without manual intervention
- **NFR18:** Database connection pooling supports concurrent checkout sessions without connection exhaustion
- **NFR19:** Static assets served via CDN with edge caching — event pages cached at edge with ISR revalidation
- **NFR20:** Image uploads optimized and served in modern formats (WebP/AVIF) at appropriate sizes
- **NFR21:** Architecture supports migration from polling to SSE/WebSocket for real-time features without system redesign

### Accessibility

- **NFR22:** All public-facing pages meet WCAG 2.1 AA compliance
- **NFR23:** Color contrast ratios meet 4.5:1 minimum for normal text, 3:1 for large text
- **NFR24:** All interactive elements are keyboard accessible with visible focus indicators
- **NFR25:** All images include meaningful alt text; decorative images marked as presentational
- **NFR26:** Form inputs have associated labels and error messages are announced to screen readers
- **NFR27:** Ticket codes displayed as text alongside QR codes for screen reader accessibility
- **NFR28:** Animations respect `prefers-reduced-motion` user preference

### Integration

- **NFR29:** Stripe Connect integration handles webhook delivery with idempotent processing — no duplicate charges on retry
- **NFR30:** Stripe webhook signature verification on all incoming webhooks
- **NFR31:** Clerk integration supports Google OAuth provider with session management
- **NFR32:** Email delivery (confirmation, QR codes) completes within 60 seconds of purchase
- **NFR33:** Open Graph meta tags render correctly when shared on Facebook, Twitter/X, and messaging apps
