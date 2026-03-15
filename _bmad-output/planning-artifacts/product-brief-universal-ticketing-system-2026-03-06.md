---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflow_completed: true
inputDocuments:
  - '_bmad-output/analysis/brainstorming-session-2026-03-06.md'
  - '_bmad-output/planning-artifacts/research/technical-platform-architecture-research-2026-03-06.md'
date: '2026-03-06'
author: 'ringmaster'
---

# Product Brief: universal-ticketing-system

## Executive Summary

universal-ticketing-system is a multi-sided event marketplace platform that unifies event creation, ticketing, discovery, and venue management into a single ecosystem. It serves independent artists, event organizers, attendees, and venue managers across diverse event types — concerts, racing, seminars, classes, and more.

The platform is designed as three interconnected systems: a Creator Economy Stack (the operating system for event creators), an Attendee Lifestyle Platform (personalized discovery and social event experiences), and a Venue Optimization Engine (data-driven venue management and booking). These three sides are connected by an Event Ecosystem Flywheel where each user type strengthens the others through network effects.

Built on Next.js 16 with PostgreSQL, Stripe Connect, and a serverless-first architecture, the platform starts as an MVP focused on core ticketing and creator tools, then expands into social features, advanced venue management, and platform intelligence.

---

## Core Vision

### Problem Statement

Event creators — independent artists, small organizers, racing leagues, seminar companies — manage their events through a fragmented patchwork of tools: Facebook for promotion, GCash/bank transfers for payments, spreadsheets for guest lists, DM confirmations for bookings, and manual cash counting at the door. No single platform handles the full event lifecycle from creation through post-event analytics, forcing creators into hours of manual work while losing revenue to disorganization.

### Problem Impact

- **For creators:** Lost revenue from manual payment tracking, no data to grow their business, hours wasted on administrative tasks instead of creating great events
- **For attendees:** Fragmented discovery (checking multiple sources), risky payment methods (direct transfers), no digital tickets, and zero post-event engagement
- **For venues:** No visibility into demand patterns, manual booking coordination, no tools to optimize space utilization across event types
- **For the market:** A thriving local event scene held back by infrastructure gaps — events that could happen don't because the tools are too hard

### Why Existing Solutions Fall Short

- **Eventbrite** — Simple event listing and ticketing but no creator economy tools, no merch integration, no venue marketplace, and no adaptation to event type. Treats a jazz concert the same as a racing event.
- **Ticketmaster** — Built for massive venues and established promoters. Independent artists and small organizers are priced out and invisible. Not localized for emerging markets.
- **Facebook Events** — Free discovery but zero commerce infrastructure. No ticketing, no seat selection, no analytics, no QR validation.
- **Manual/DIY tools** — The current reality for most small-to-mid creators. GCash payments, spreadsheet guest lists, DM-based bookings. Works until it doesn't — double bookings, lost payments, no data, no scalability.

No existing platform treats event creators as full entrepreneurs with a business to run, adapts to diverse event types, or connects all three sides (creators, attendees, venues) into a reinforcing ecosystem.

### Proposed Solution

A universal event platform designed as three interconnected systems:

1. **Creator Economy Stack** — The operating system for event creators. Profiles with role switching, dynamic portfolios, ticket sales with customizable tiers, merch integration, fan management, revenue splits, and growth analytics. Positions the platform as "Shopify for live events."

2. **Attendee Lifestyle Platform** — Reframes from "buy tickets" to "what should I do this weekend?" Personalized event discovery, social features (who's going, group bookings, event crews), digital ticket keepsakes, event memories timeline, and loyalty rewards.

3. **Venue Optimization Engine** — Venues as first-class platform citizens with profiles, availability calendars, flexible layout configurations, booking marketplace, revenue dashboards, and demand forecasting.

These three sides connect through the **Event Ecosystem Flywheel**: Artists attract fans → Fans discover events → Events need venues → Venues attract organizers → Organizers book artists → The cycle accelerates.

### Key Differentiators

- **Adaptive Event Schema** — The platform morphs to fit the event type. Concert: GA, VIP, backstage. Racing: pit access, grandstand zones, paddock passes. Seminar: standard, VIP with lunch, virtual attendance. One platform that genuinely feels purpose-built for each event type.
- **Event Ecosystem Flywheel** — Architecture designed around network effects. Each user type (creator, attendee, venue) strengthens the others, creating compounding value that single-sided platforms cannot replicate.
- **Creator-First Design** — Treats artists and organizers as entrepreneurs running a business, not just hosts listing events. Growth trajectory insights, co-headline matchmaking, scaling promotion tools, and automated press kits.
- **Full Lifecycle Platform** — Events move through a state machine (Draft → Published → On Sale → Live → Post-Event → Archived), and the platform adapts features at each stage. Living tickets evolve from countdown to check-in to memory keepsake.
- **Zero-to-Scale Architecture** — Serverless-first design (Vercel + Neon + Upstash) means near-zero cost at launch, linear scaling with growth, and no infrastructure management overhead.

---

## Target Users

### Primary Users

#### 1. The Independent Artist / Creator
**Persona: Marco, 28 — Independent musician in Cebu**

Marco plays 2-3 gigs a month at local bars and small venues. He promotes through Instagram and Facebook, collects payments via GCash, and tracks his guest list in a Notes app. He has no idea how many unique fans he has, which promos drove the most sales, or whether he should book a bigger venue. He spends more time on admin than on music.

- **Goals:** Sell tickets without the DM chaos, build a fan base he can actually see and communicate with, grow from 100-person bar gigs to 500-person venue shows
- **Pain points:** No centralized dashboard, manual payment tracking, zero business intelligence, can't sell merch alongside tickets
- **Success moment:** Opens the app the morning after a show and sees: 247 tickets sold, 12,400 PHP revenue, 18 merch pre-orders, and "34% of tonight's audience also came to your March show"
- **Platform role:** Creates events, manages ticket tiers, builds portfolio, tracks growth, sells merch

#### 2. The Event Organizer (Organization)
**Persona: Dianne, 35 — Operations manager for a regional racing league**

Dianne runs a 12-round racing series plus occasional special events. Each round has complex ticketing — grandstand zones, pit access passes, paddock VIP, team entries. She clones events from templates but still spends hours on setup, manually reconciles payments across multiple organizers and sponsors, and has no cross-event analytics to optimize pricing or scheduling.

- **Goals:** Manage an entire event portfolio from one dashboard, automate revenue splits between venues/sponsors/teams, compare performance across events and seasons
- **Pain points:** Repetitive event setup, manual financial reconciliation, no cross-event intelligence, coordinating staff and volunteers across gates and zones
- **Success moment:** Creates Round 7 in 30 seconds by cloning Round 6, adjusts the date and venue, and the system auto-generates the correct ticket tiers, gate assignments, and sponsor placements
- **Platform role:** Creates/manages multiple events, configures complex ticket tiers, manages staff roles, runs cross-event analytics, handles sponsorship tracking

#### 3. The Attendee
**Persona: Jai, 24 — Young professional in Manila**

Jai goes to 2-3 events a month — concerts, food festivals, the occasional workshop. She finds events through friend recommendations and Instagram stories, but often misses things she'd love because there's no central place to browse. Buying tickets usually means DM-ing someone or doing a bank transfer and hoping for confirmation.

- **Goals:** Discover events easily ("what's happening this weekend?"), buy tickets instantly with confidence, go with friends, collect memories of events attended
- **Pain points:** Fragmented discovery, risky payment methods, no digital tickets (screenshots of GCash receipts), can't easily coordinate with friends, no post-event engagement
- **Success moment:** Opens the app on a Friday afternoon, sees a personalized feed, spots a jazz night 3 friends are attending, buys 2 tickets in 30 seconds, and the QR code is in her Apple Wallet before she leaves the office
- **Platform role:** Discovers events, purchases tickets (single and multi), follows artists/orgs, writes verified reviews, builds event history

#### 4. The Venue Manager
**Persona: Carlos, 42 — Owner of a 300-capacity multi-purpose event space in Makati**

Carlos rents his venue for concerts, corporate seminars, workshops, and private events. He manages bookings through a Google Calendar, negotiates with organizers over Viber, and has no data on which event types fill his space best or what his peak demand periods are.

- **Goals:** Fill the calendar efficiently, understand which event types perform best in his space, attract quality organizers, maximize revenue per square meter
- **Pain points:** Manual booking coordination, no demand visibility, can't showcase the venue to new organizers, no analytics on space utilization, different layouts needed for different event types
- **Success moment:** Platform shows him that comedy nights average 95% capacity on Fridays while seminars average 60% on Tuesdays — and suggests he raise Friday rates and offer Tuesday discounts. Three new organizers find his venue through the marketplace this month.
- **Platform role:** Manages venue profile and availability, configures layout presets, tracks revenue and utilization, receives booking requests from organizers

### Secondary Users

#### 5. Platform Administrator
**Persona: The ringmaster — Platform owner and operator**

Oversees the entire ecosystem — user management, content moderation, financial oversight, platform configuration, and dispute resolution. Needs visibility into platform health, growth metrics, and the ability to intervene when issues arise.

- **Goals:** Grow the platform sustainably, ensure trust and safety, monitor financial flows, manage platform-wide settings and policies
- **Pain points:** Need full visibility without micromanaging, fraud detection, dispute resolution between parties, platform growth tracking
- **Success moment:** Dashboard shows GMV growing 15% month-over-month, zero unresolved disputes, and the flywheel metrics (new creators attracting new attendees attracting new venues) all trending up
- **Platform role:** User management, content moderation, financial oversight, platform configuration, analytics, dispute resolution, feature flags

#### 6. Event Staff & Volunteers
Temporary roles assigned by organizers — door scanning, registration desk, zone management. They need simple, role-limited access (e.g., "can scan tickets but can't see revenue").

#### 7. Sponsors
Organizations that sponsor events or event series. They need visibility into deliverables (logo placement, mentions) and performance reports. Secondary to core platform but important for the revenue ecosystem.

### User Journey

#### Creator Journey (Marco)
1. **Discovery:** Hears about the platform from another artist or sees an event page shared on social media
2. **Onboarding:** Signs up, creates artist profile, connects Stripe Express account for payouts
3. **First Event:** Creates his first event — selects "Concert" type, platform suggests relevant ticket tiers (GA, VIP), uploads event artwork, sets prices, publishes
4. **Core Usage:** Shares event link on socials, monitors real-time sales on dashboard, adds merch items for pre-order
5. **Event Day:** Door staff scan QR codes, real-time entry count on dashboard
6. **Post-Event:** Views attendance report, revenue breakdown, fan demographics. Uploads photos to Content Hub. Fans get "rate this show" prompt
7. **Growth:** Over 6 months, portfolio builds. Platform shows growth trajectory. Suggests bigger venues when shows consistently sell out
8. **Aha! Moment:** "I can see exactly which fans come to every show, and my revenue is up 40% because I stopped losing sales to manual tracking"

#### Attendee Journey (Jai)
1. **Discovery:** Friend shares an event link, or she browses the "For You" feed
2. **Onboarding:** Signs up with Google OAuth in 10 seconds
3. **First Purchase:** Finds an event, sees "3 friends attending," selects 2 tickets (one for a friend), pays with card, QR appears in Apple Wallet
4. **Event Day:** Walks in, QR scanned in 2 seconds, seamless entry
5. **Post-Event:** Gets prompt to rate, writes verified review, event appears in her memories timeline
6. **Ongoing:** Follows favorite artists, gets notified of new events, builds event history, earns loyalty points
7. **Aha! Moment:** "I found 3 amazing events I never would have known about, and buying tickets was as easy as ordering food delivery"

---

## Success Metrics

### User Success Metrics

| User Type | Success Indicator | Target | Measurement |
|-----------|------------------|--------|-------------|
| **Creator (Marco)** | Creates and publishes first event | <15 minutes from signup to published event | Time-to-first-event tracking |
| **Creator (Marco)** | Sells tickets without manual tracking | 100% of sales tracked in dashboard | Zero off-platform payment requests |
| **Organizer (Dianne)** | Manages multi-event portfolio | 3+ events managed from single dashboard | Active events per organization |
| **Attendee (Jai)** | Discovers and purchases ticket | <2 minutes from browse to confirmed ticket | Checkout completion rate >85% |
| **Attendee (Jai)** | Seamless event entry | <5 seconds QR scan to confirmation | Scan success rate >99% |
| **Venue (Carlos)** | Venue profile attracts organizers | 1+ inbound booking inquiry per month | Booking request count |
| **Admin (ringmaster)** | Full visibility into platform health | Real-time dashboard with key metrics | Admin dashboard completeness |

### Business Objectives

**Strategy: Growth-First — Build the network, monetize later.**

The platform's value comes from network effects (the flywheel). Priority is getting creators and events on the platform, which attracts attendees, which attracts more creators. Revenue optimization comes after the network is established.

**Timeline: MVP by Day 1, usable platform within 1-2 months.**

**3-Month Objectives:**
- 10-20 live events on the platform (first milestone)
- 5-10 active creators (artists + organizers) publishing events
- 50-200 tickets sold through the platform
- 1-3 venues with active profiles
- Client satisfaction: creators say "this is easier than what I was doing before"

**6-Month Objectives:**
- 50+ total events (cumulative)
- 20-30 active creators
- 1,000+ tickets sold
- 5+ venues onboarded
- Repeat creators: 60%+ of early creators publish a second event
- Attendee return rate: 30%+ buy tickets to a second event

**12-Month Objectives:**
- 200+ total events
- Flywheel evidence: creators joining because of attendee base, not just marketing
- Revenue sustainability: platform fees cover infrastructure costs
- Geographic expansion beyond initial city/region

### Key Performance Indicators

**Flywheel Health (Primary KPIs):**

| KPI | What It Measures | Target (3mo) | Target (12mo) |
|-----|-----------------|--------------|----------------|
| **Events Created** | Supply side growth | 10-20 | 200+ |
| **Tickets Sold** | Transaction volume | 50-200 | 10,000+ |
| **Active Creators** | Creator adoption | 5-10 | 50+ |
| **Creator Retention** | Creators who publish 2+ events | 50% | 70% |
| **Attendee Return Rate** | Attendees who buy 2+ times | 20% | 40% |
| **Organic Creator Signups** | Creators joining without direct outreach | 0% | 30%+ |

**Product Health (Secondary KPIs):**

| KPI | What It Measures | Target |
|-----|-----------------|--------|
| **Time to First Event** | Onboarding friction | <15 minutes |
| **Checkout Completion Rate** | Purchase funnel health | >85% |
| **QR Scan Success Rate** | Event-day reliability | >99% |
| **Page Load (LCP)** | Technical performance | <1.5s |
| **API Response Time** | Backend performance | <200ms p95 |
| **Uptime** | Platform reliability | 99.9% |

**North Star Metric: Tickets Sold per Month** — This single number captures whether creators are creating events, attendees are finding and buying them, and the platform is delivering value. Everything else feeds into this.

**Anti-Metrics (What We're NOT Optimizing For Yet):**
- Revenue/profit (growth-first phase)
- Total registered users (vanity metric — active creators and ticket sales matter more)
- Feature count (ship less, validate more)

---

## MVP Scope

### Core Features

**Authentication & Profiles**
- User signup/login (Auth.js v5 — Google OAuth + email/password)
- Multi-role profiles: attendee (default), artist, organization, venue_manager, admin
- Role switching — one account, multiple roles
- Basic creator profile page (name, bio, photo, links)
- Basic venue profile page (name, location, capacity, photos, description)

**Event Management**
- Event creation with adaptive event type selection (concert, racing, seminar, class, other)
- Event-type-aware ticket tier builder (GA, VIP, custom tiers with names/prices/quantities)
- Event artwork/banner upload
- Event details: date, time, venue (select existing or enter new), description
- Event lifecycle: Draft → Published → On Sale → Sold Out → Completed
- Creator dashboard: list of my events with status and sales summary

**Ticket Sales**
- Stripe Connect integration (Separate Charges and Transfers)
- Creator onboarding via Stripe Express connected accounts
- Single and multi-ticket purchase in one checkout
- Stripe Checkout session for payment
- Free event registration (no Stripe, just RSVP)
- Email confirmation with ticket details

**QR Ticketing**
- QR code generation on successful purchase (HMAC-SHA256 signed)
- QR delivered via email and viewable in-app
- Scanner/validation page for door staff
- Duplicate scan detection with timestamp
- Real-time entry count for event creator

**Event Discovery**
- Public event listing page with filters (event type, date, location)
- Search (PostgreSQL Full-Text Search)
- Individual event detail pages (public, shareable URL)
- Event categories and basic filtering

**Venue Management**
- Venue profile creation and editing
- Venue location, capacity, photos, amenities
- Venue availability calendar (basic — mark dates as available/booked)
- Organizers can select existing venues when creating events
- Venue dashboard: events hosted, basic stats

**Admin Panel**
- User management (view, disable, role assignment)
- Event moderation (view, flag, unpublish)
- Platform overview dashboard (total users, events, tickets sold, revenue)
- Financial oversight (Stripe dashboard link + platform-level summary)

### Out of Scope for MVP

| Feature | Why Deferred | Target Phase |
|---------|-------------|-------------|
| **Seat selection / seat maps** | Complex UI + Redis locking; GA tickets sufficient for launch | Phase 2 |
| **Merch integration** | Requires additional Stripe product catalog setup | Phase 2 |
| **Social features** (who's going, groups, crews) | Network needs users first before social is valuable | Phase 2 |
| **Advanced analytics** (cross-event, growth trajectory) | Basic dashboard sufficient; need data first | Phase 2 |
| **Recommendations / personalized feed** | Requires user behavior data to be meaningful | Phase 3 |
| **Content hub** (post-event photos, recaps) | Nice-to-have, not core to ticketing flow | Phase 3 |
| **Automated refunds** | Handle manually via Stripe dashboard for now | Phase 2 |
| **Season passes / recurring events** | Event cloning sufficient for v1 | Phase 3 |
| **Sponsorship management** | Manual coordination sufficient initially | Phase 3 |
| **Event staff role-limited access** | Creator can share scanner page URL for now | Phase 2 |
| **Apple/Google Wallet passes** | QR via email and in-app sufficient for launch | Phase 2 |
| **Revenue split automation** | Platform collects, manual payout splits for now | Phase 2 |
| **Reviews & ratings** | Need completed events first | Phase 2 |
| **Multi-currency / multi-language** | Single currency (PHP) and English for launch | Phase 3 |
| **Dynamic pricing** | Fixed pricing sufficient for launch | Phase 3 |
| **Waiting queue / high-traffic on-sale** | Not needed until events hit 1000+ demand | Phase 3 |

### MVP Success Criteria

**The MVP is successful when:**

1. **A creator can go from signup to published event in under 15 minutes** — the onboarding is smooth enough that creators don't need hand-holding
2. **An attendee can discover an event and buy a ticket in under 2 minutes** — the purchase flow is fast and trustworthy
3. **QR validation works reliably at the door** — >99% scan success rate, duplicate detection works
4. **10-20 events are live on the platform within 3 months** — creators are actually using it
5. **Client says "this is easier than what I was doing before"** — qualitative validation that the core problem is solved
6. **A venue manager has a profile that organizers can find and select** — the venue side of the flywheel is seeded

**Go/No-Go Decision Point (Month 2):**
- If 5+ creators have published events and at least 1 event has sold tickets → proceed to Phase 2
- If creators are signing up but not publishing → investigate onboarding friction
- If no traction → pivot scope or marketing approach before building more features

### Future Vision

**Phase 2 — Enhanced Platform (Months 3-4):**
- Seat map support (section-based)
- Merch integration at checkout
- Email notifications (Resend)
- Reviews with verified attendance badges
- Automated refund handling
- Event cloning / templates
- Basic social: follow artists, event sharing
- Staff role-limited scanner access
- Revenue split automation via Stripe

**Phase 3 — Growth Features (Months 5-8):**
- Individual seat selection with real-time availability (Redis + SSE)
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

**The Long-Term Vision:**
The platform evolves from a ticketing tool into the "Shopify for live events" — the default infrastructure for anyone creating, attending, or hosting events. The flywheel compounds: more creators → more events → more attendees → more venues → more creators. Each phase adds a layer that makes the ecosystem stickier and harder to replicate.
