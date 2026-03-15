---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 5
workflow_completed: true
research_type: 'technical'
research_topic: 'Payment integration and multi-tenant data architecture patterns for event marketplace platforms'
research_goals: 'Evaluate foundational technical patterns for building a multi-sided event marketplace - payment splitting, multi-tenant data modeling, QR ticketing, and search infrastructure'
user_name: 'ringmaster'
date: '2026-03-06'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical - Platform Architecture for Event Marketplace

**Date:** 2026-03-06
**Author:** ringmaster
**Research Type:** Technical

---

## Research Overview

This technical research evaluates foundational architecture patterns for building a multi-sided event marketplace platform. The research covers payment integration (split payments, multi-party transactions), multi-tenant data modeling, QR ticketing infrastructure, and technology stack selection. All findings are verified against current web sources.

---

## Technical Research Scope Confirmation

**Research Topic:** Payment integration and multi-tenant data architecture patterns for event marketplace platforms
**Research Goals:** Evaluate foundational technical patterns for building a multi-sided event marketplace - payment splitting, multi-tenant data modeling, QR ticketing, and search infrastructure

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-03-06

---

## Technology Stack Analysis

### Programming Languages & Runtime

**TypeScript + Node.js** is the clear choice for this platform, given the existing Next.js 16 scaffold. [High Confidence]

- **TypeScript** provides type safety critical for financial transactions (payment splits, refund calculations) and complex entity relationships (artists, venues, organizers, attendees)
- **Node.js** excels at I/O-heavy operations: payment webhooks, real-time notifications, QR validation, concurrent ticket purchases
- The Next.js + TypeScript combination is identified as one of the dominant tech stacks for 2025-2026, particularly for full-stack applications

_Source: [The 2025 Tech Stack Shake-Up - DEV Community](https://dev.to/usman_awan/the-2025-tech-stack-shake-up-why-nextjs-python-postgres-are-taking-over-the-world-4d6p)_
_Source: [12 Tech Stacks for Software Development in 2026](https://www.blog.darwinapps.com/blog/12-tech-stacks-for-software-development-in-2025)_

### Development Frameworks and Libraries

**Next.js 16 (App Router)** is already in place and is the right choice for this platform. [High Confidence]

_Major Frameworks:_
- **Next.js 16** - Server Components, Server Actions, API routes, middleware, ISR/SSG for event pages. The App Router provides a natural separation between public pages (event discovery, listings) and authenticated dashboards (artist/org management)
- **React 19** - Already installed. Server Components reduce client bundle size for event listing pages. Concurrent features improve perceived performance during seat selection and checkout

_Key Libraries for Event Marketplace:_
- **Stripe SDK (@stripe/stripe-js, stripe)** - Payment processing, Connect marketplace features
- **node-qrcode / qr-code.js** - QR ticket generation with styling capabilities. The `qr-code.js` library offers sophisticated styling with shapes, colors, gradients, and embedded images for branded tickets
- **Zod** - Runtime validation for payment amounts, ticket quantities, event schemas
- **React Hook Form** - Complex multi-step forms (event creation, checkout)
- **date-fns / Luxon** - Timezone-aware date handling critical for events across regions

_Source: [Best Tech Stack for a Startup in 2026](https://www.squareboat.com/blog/best-tech-stack-for-a-startup)_
_Source: [node-qrcode - GitHub](https://github.com/soldair/node-qrcode)_
_Source: [QR Code.js - GitHub](https://github.com/qr-platform/qr-code.js/)_

### Database and Storage Technologies

**PostgreSQL** is the recommended primary database. [High Confidence]

_Relational Database - PostgreSQL:_
- Most desired and admired database in developer surveys
- Row-Level Security (RLS) provides tenant isolation at the database level - critical for multi-org data separation
- JSONB columns enable flexible event schemas (different event types have different metadata) without sacrificing query performance
- Full-text search capabilities reduce need for external search infrastructure in early phases
- PostGIS extension enables geo-spatial queries for "events near me" and area explorer features

_Multi-Tenancy Pattern Recommendation:_ **Shared Database, Shared Schema with RLS** [High Confidence]
- All tenants (artists, orgs, venues) share the same database and tables with a `tenant_id` / `organization_id` column
- PostgreSQL RLS policies enforce data isolation at the database level
- Most cost-effective and operationally simple for a startup
- Can scale to thousands of tenants before needing more complex patterns
- Only transition to database-per-tenant if compliance or extreme customization requires it

_Source: [Designing Your Postgres Database for Multi-tenancy - Crunchy Data](https://www.crunchydata.com/blog/designing-your-postgres-database-for-multi-tenancy)_
_Source: [Multi-Tenant Database Architecture Patterns Explained - Bytebase](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)_
_Source: [Multi-tenancy and Database-per-User Design in Postgres - Neon](https://neon.com/blog/multi-tenancy-and-database-per-user-design-in-postgres)_

_In-Memory / Caching - Redis:_
- Session management and authentication tokens
- Seat reservation locking (temporary holds during checkout with TTL expiry)
- Real-time ticket availability counters
- Rate limiting for ticket purchase endpoints (prevent bot purchases)
- Caching event listings, search results, and analytics dashboards

_File/Media Storage:_
- **Cloud object storage** (S3, Cloudflare R2, or Vercel Blob) for event images, artist photos, venue layouts, ticket designs, uploaded content

### ORM Selection: Drizzle vs Prisma

**Recommendation: Drizzle ORM** for this project. [Medium-High Confidence]

| Criteria | Drizzle | Prisma |
|----------|---------|--------|
| Bundle size | ~7.4kb (minimal) | Larger (Prisma 7 removed Rust engine) |
| Serverless fit | Excellent - built for edge/serverless | Improved with Prisma 7 (late 2025) |
| SQL control | SQL-like TypeScript queries | Abstracted query builder |
| Schema definition | TypeScript code-first | Prisma Schema Language (PSL) |
| PostgreSQL features | Direct access to RLS, JSONB, PostGIS | Requires raw queries for advanced features |
| Learning curve | Steeper (SQL knowledge needed) | Gentler for newcomers |

Drizzle is preferred because:
- Smaller bundle size matters for serverless/edge deployment on Vercel
- Direct SQL-like control is important for complex queries (cross-event analytics, geo-spatial search, revenue reporting)
- Code-first schema in TypeScript keeps everything in one language
- Better access to PostgreSQL-specific features (RLS, JSONB operations) needed for multi-tenancy
- 25,000+ GitHub stars and growing production adoption as of 2026

_Source: [Drizzle ORM vs Prisma: Which TypeScript ORM in 2026? - Bytebase](https://www.bytebase.com/blog/drizzle-vs-prisma/)_
_Source: [Drizzle vs Prisma in 2026 - MakerKit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)_
_Source: [Prisma vs Drizzle - Design Revision](https://designrevision.com/blog/prisma-vs-drizzle)_

### Cloud Infrastructure and Deployment

**Recommendation: Vercel (primary) + managed PostgreSQL** [High Confidence]

_Deployment Platform - Vercel:_
- Native Next.js integration with zero-config deployment
- Serverless functions for API routes (payment webhooks, ticket validation)
- Edge functions for low-latency operations (seat availability checks, QR validation)
- Auto-scaling handles traffic spikes around popular event on-sales (35-40% cost reduction through auto-scaling vs fixed infrastructure)
- Preview deployments for development workflow
- Built-in CDN for static event pages and images

_Database Hosting Options:_
- **Neon** - Serverless PostgreSQL with branching (great for dev/staging), auto-scaling, and Drizzle-native support
- **Supabase** - PostgreSQL with built-in auth, real-time subscriptions, RLS policies, and storage. Provides additional features that could accelerate development
- **Vercel Postgres** - Tightly integrated but less flexible

_Caching/Real-time:_
- **Upstash Redis** - Serverless Redis for seat locking, rate limiting, session management
- **Vercel KV** - Alternative serverless Redis option

_Considerations:_
- Vercel serverless functions have cold start times (mitigated by edge functions for critical paths)
- For high-throughput operations (on-sale events with thousands of concurrent purchases), consider dedicated compute behind Vercel for the payment/ticketing API
- External services (database, Redis, file storage) incur separate costs

_Source: [10 Vercel Alternatives for Deploying Apps in 2026 - DigitalOcean](https://www.digitalocean.com/resources/articles/vercel-alternatives)_
_Source: [Serverless Architecture in 2025 - 247 Labs](https://247labs.com/serverless-architecture-in-2025/)_
_Source: [The Road Ahead for the Cloud: Preparing for 2026](https://resolvetech.com/cloud-native-serverless-edge-architectures-redefining-enterprise-agility-in-2026/)_

### Technology Adoption Trends

_Current Dominant Pattern (2025-2026):_
- **Next.js + PostgreSQL + Vercel** is the most common full-stack startup stack
- API-driven interoperability is the defining feature of modern event tech stacks
- Intent-based development (AI-assisted code generation) is emerging but not yet mainstream for complex domain logic

_Emerging Technologies Relevant to This Platform:_
- **Drizzle ORM** surpassing Prisma in serverless/edge adoption
- **Server Components** reducing client-side JavaScript for content-heavy pages
- **Edge computing** for latency-sensitive operations (ticket validation, availability checks)
- **WebSocket alternatives** (Server-Sent Events, HTTP streaming) for real-time seat selection updates

_Source: [The Ultimate 2026 Event Tech Stack - Event Technology Portal](https://eventtechnology.org/2026/03/01/the-ultimate-2026-event-tech-stack-must-have-software-integrations-for-seamless-end-to-end-planning/)_
_Source: [How to Build a Modern Event Tech Stack in 2026 - Event Tech Live](https://eventtechlive.com/how-to-build-a-modern-event-tech-stack-in-2026/)_

### Recommended Technology Stack Summary

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 16 + React 19 | Already in place, App Router, Server Components |
| **Language** | TypeScript | Type safety for financial logic, complex schemas |
| **ORM** | Drizzle ORM | Serverless-first, SQL control, small bundle |
| **Database** | PostgreSQL (Neon or Supabase) | RLS, JSONB, PostGIS, proven reliability |
| **Cache** | Upstash Redis | Seat locking, rate limiting, sessions |
| **Auth** | NextAuth.js / Supabase Auth | Multi-provider, role-based access |
| **Payments** | Stripe Connect | Marketplace splits, multi-currency |
| **QR Tickets** | node-qrcode + custom validation | Generation + anti-fraud validation |
| **File Storage** | Cloudflare R2 / Vercel Blob | Event images, ticket designs, media |
| **Deployment** | Vercel | Native Next.js, edge functions, auto-scale |
| **Search** | PostgreSQL FTS (v1), Meilisearch (v2) | Start simple, upgrade when needed |
| **Real-time** | Server-Sent Events / Upstash | Seat availability, live updates |

---

## Integration Patterns Analysis

### Payment Integration: Stripe Connect

**Recommendation: Separate Charges and Transfers** for this marketplace. [High Confidence]

Stripe Connect offers two primary charge types for marketplaces:

**Destination Charges** - Platform creates a charge, funds go to one connected account. Best for simple 1:1 marketplaces (rideshare, rental).

**Separate Charges and Transfers** - Platform creates a charge, then splits funds to multiple connected accounts independently. Best for complex marketplaces needing multi-party splits.

**Why Separate Charges and Transfers for this platform:**
- A festival with 3 artists, a venue, and sponsors needs funds split 5+ ways
- Revenue split automation (#74) requires decoupled charge and transfer logic
- Platform can hold funds and release on custom schedules (post-event payouts)
- Refund handling is more flexible - can refund attendee without clawing back from all parties
- Supports the Hybrid Monetization Engine (#83) where tickets + merch + sponsorship all combine

**Payment Flow Architecture:**

```
Attendee Purchase
    |
    v
Platform Stripe Account (charge created)
    |
    +---> Artist Connected Account (performance fee - X%)
    +---> Venue Connected Account (venue rental share)
    +---> Platform (commission/service fee)
    +---> [Optional] Sponsor credit applied
```

**Key Implementation Details:**
- Connected accounts use **Stripe Express** (simplest onboarding for artists/orgs/venues)
- Platform collects fees by reducing transfer amounts, not explicit application_fee
- Webhook events (`payment_intent.succeeded`, `transfer.created`, `charge.refunded`) drive state updates
- For free events (#54): skip Stripe entirely, use platform registration only

_Source: [Stripe Connect Charges Documentation](https://docs.stripe.com/connect/charges)_
_Source: [Separate Charges and Transfers - Stripe Docs](https://docs.stripe.com/connect/separate-charges-and-transfers)_
_Source: [Build a Marketplace - Stripe Docs](https://docs.stripe.com/connect/marketplace)_

### Webhook Architecture

**Pattern: Next.js API Route + Queue-Based Processing** [High Confidence]

Critical best practices for Stripe webhooks in Next.js:

1. **Raw body parsing** - Stripe signature verification requires the raw request body. In Next.js App Router, use `request.text()` to get the raw body before passing to `stripe.webhooks.constructEvent()`
2. **Signature verification** - Always verify webhook signatures using the webhook secret to prevent tampering
3. **Idempotent processing** - Store processed event IDs to prevent duplicate handling
4. **Async processing** - Return 200 immediately, process webhook payload asynchronously to avoid timeouts
5. **Server-side price validation** - Never trust client-side price calculations. Always compute ticket prices, fees, and splits on the server

**Webhook Events to Handle:**
- `checkout.session.completed` - Ticket purchase confirmed
- `payment_intent.succeeded` - Payment captured
- `charge.refunded` - Refund processed, update ticket status
- `account.updated` - Connected account (artist/venue) verification status changed
- `transfer.created` - Payout to connected account completed

_Source: [Stripe Checkout and Webhook in Next.js 15 - Medium](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e)_
_Source: [Stripe Next.js Best Practices](https://nextjsstarter.com/blog/stripe-nextjs-best-practices-revealed/)_
_Source: [Verify Stripe Webhook Signature in Next.js](https://maxkarlsson.dev/blog/verify-stripe-webhook-signature-in-next-js-api-routes)_

### Seat Reservation & Concurrency Control

**Pattern: Redis Distributed Locks with TTL** [High Confidence]

The biggest technical challenge in ticketing is preventing double-booking under high concurrency. The proven architecture:

**Reservation Flow:**
```
1. User selects seat(s)
2. API checks Redis: seat available?
3. If yes: SET lock with TTL (e.g., 10 minutes)
   If no: Return "seat unavailable"
4. User proceeds to checkout
5. On successful payment:
   - Write confirmed booking to PostgreSQL
   - Remove Redis lock
   - Publish "SeatBooked" event
6. On timeout/abandonment:
   - Redis TTL auto-expires the lock
   - Seat becomes available again
```

**Architecture Components:**
- **Redis** - Temporary seat locks with automatic expiry (TTL of 5-10 minutes)
- **PostgreSQL** - Canonical seat state (confirmed bookings only)
- **Atomic operations** - Use Redis `SET NX` (set if not exists) for race-condition-safe locking
- **Real-time updates** - When a seat is locked/unlocked, push updates via Server-Sent Events to other users viewing the seat map

**Scaling Considerations:**
- For most events (<10,000 concurrent users), a single Redis instance handles this easily
- For high-demand on-sales (concerts, racing), implement a virtual waiting queue (Redis sorted set with timestamps) to throttle concurrent checkout attempts
- Rate limiting on the ticket purchase API prevents bot purchases

_Source: [Building a Ticketing System: Concurrency, Locks, and Race Conditions - Medium](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)_
_Source: [Designing an E-Ticketing/Booking System - Design Gurus](https://www.designgurus.io/blog/design-ticketing-system)_
_Source: [Design a Ticket Booking Site Like Ticketmaster - Hello Interview](https://www.hellointerview.com/learn/system-design/problem-breakdowns/ticketmaster)_
_Source: [Avoiding Double Booking with Redis - Medium](https://cgorale111.medium.com/avoiding-double-booking-with-redis-aca66fefcce3)_

### Authentication & Authorization (RBAC)

**Pattern: Auth.js v5 with Multi-Role RBAC** [High Confidence]

Your platform has 4 distinct user types with different permissions. Auth.js v5 (formerly NextAuth.js) supports this natively.

**Role Structure:**
```
User
  |-- roles: ["attendee"]           (default)
  |-- roles: ["attendee", "artist"] (creator)
  |-- roles: ["attendee", "org"]    (organization)
  |-- roles: ["venue_manager"]      (venue)
  |-- roles: ["admin"]              (platform)
```

**Implementation Pattern:**
1. Store roles in the user record (PostgreSQL)
2. Include roles in the JWT token via Auth.js callbacks
3. Middleware checks roles before route access:
   - `/dashboard/artist/*` requires "artist" role
   - `/dashboard/org/*` requires "org" role
   - `/dashboard/venue/*` requires "venue_manager" role
   - `/admin/*` requires "admin" role
   - Public routes (event pages, discovery) require no auth
4. Server Components check session roles for conditional UI rendering
5. API routes validate roles before processing requests

**Key Detail:** Auth.js v5 middleware execution order is `middleware -> jwt -> session`. Define callbacks in `auth.config.ts` to ensure session data is populated before middleware runs.

_Source: [Auth.js Role Based Access Control](https://authjs.dev/guides/role-based-access-control)_
_Source: [NextAuth.js 2025: Secure Authentication - Strapi](https://strapi.io/blog/nextauth-js-secure-authentication-next-js-guide)_
_Source: [RBAC in Next.js with NextAuth - Medium](https://medium.com/@mkilincaslan/rbac-in-next-js-with-nextauth-b438fe59eeeb)_

### QR Ticket Generation & Validation

**Pattern: Signed QR Tokens with Server-Side Validation** [High Confidence]

**Generation Flow:**
1. On successful payment, generate a unique ticket token: `HMAC-SHA256(ticketId + eventId + userId + secret)`
2. Encode token + metadata into QR code using `node-qrcode`
3. Store ticket record in PostgreSQL with status: `valid`
4. Deliver QR via email, in-app, and Apple/Google Wallet pass

**Validation Flow (at the door):**
1. Scanner app reads QR code
2. API receives token, verifies HMAC signature (proves token wasn't forged)
3. Database lookup: check ticket status (`valid`, `used`, `refunded`, `transferred`)
4. If valid: mark as `used`, return success with attendee name and tier
5. If already used: return "DUPLICATE" with timestamp of first scan
6. Real-time dashboard updates entry count

**Anti-Fraud Measures:**
- HMAC signature prevents QR code forgery
- One-time use flag prevents screenshot sharing
- Duplicate detection with first-scan timestamp
- Rate limiting on validation endpoint
- Each QR code has a unique ID preventing duplication; scanning shows validity status

_Source: [QR Code Tickets Complete Guide - Ticket Generator](https://ticket-generator.com/blog/qr-code-tickets-complete-guide-to-smart-event-entry)_
_Source: [Event Ticket Validation With QR Codes](https://ticket-generator.com/blog/event-ticket-validation-with-qr-codes)_

### API Design Pattern

**Recommendation: Next.js API Routes (REST) with future GraphQL option** [Medium-High Confidence]

For v1, Next.js API Routes provide a pragmatic REST API:

**Route Structure:**
```
/api/events          - CRUD events
/api/events/[id]/tickets  - Ticket operations
/api/tickets/[id]/validate - QR validation
/api/payments/checkout     - Stripe checkout session
/api/payments/webhook      - Stripe webhook handler
/api/profiles/[type]/[id] - Artist/Org/Venue profiles
/api/venues/[id]/availability - Venue calendar
/api/search           - Cross-dimensional search
```

**Key Patterns:**
- Server Actions for mutations (create event, purchase ticket) - reduces boilerplate
- API Routes for external integrations (webhooks, QR validation, mobile app)
- Middleware for auth checks, rate limiting, and request validation
- Zod schemas for request/response validation at all boundaries

### Integration Security

**OAuth 2.0 + JWT** for API authentication. [High Confidence]

- Auth.js v5 handles OAuth providers (Google, Facebook, email/password)
- JWT tokens include user ID, roles, and organization context
- API routes validate JWT on every request
- Stripe webhook signatures verified separately
- Environment variables for all secrets (never `NEXT_PUBLIC_` prefix for server secrets)
- HTTPS enforced for all API communication (Vercel handles this by default)

---

## Architectural Patterns and Design

### System Architecture Pattern: Modular Monolith

**Recommendation: Modular Monolith with Event-Driven Readiness** [High Confidence]

For this event marketplace platform, a **Modular Monolith** is the optimal starting architecture. Industry consensus in 2025-2026 confirms that 42% of organizations that initially adopted microservices have consolidated services back into larger units due to debugging complexity and operational overhead (CNCF 2025 survey). The modular monolith provides the best of both worlds.

**Why Modular Monolith over Microservices:**
- Single deployment unit on Vercel - no orchestration overhead (Kubernetes, service mesh)
- Next.js App Router naturally supports modular organization via route groups
- Team size (likely 1-3 developers initially) doesn't justify distributed system complexity
- Each module can be extracted to a microservice later if needed
- Shared database simplifies transactions (critical for payment + ticket creation atomicity)

**Why Not Pure Monolith:**
- Clear module boundaries prevent spaghetti code as features grow
- Domain isolation makes it easier to reason about each business context
- Prepares codebase for future extraction without rewrites

**Module Structure (Domain-Driven):**
```
src/
  modules/
    events/        - Event CRUD, lifecycle state machine, scheduling
    tickets/       - Ticket creation, QR generation, validation
    payments/      - Stripe integration, refunds, payouts
    profiles/      - Artist, Org, Venue profiles and portfolios
    venues/        - Venue management, seat maps, availability
    discovery/     - Search, recommendations, feed algorithms
    notifications/ - Email, push, in-app notifications
    analytics/     - Dashboard data, sales reports, insights
```

**Inter-Module Communication:**
- **Synchronous** (v1): Direct function calls between modules within the same process
- **Event-Ready** (v2): Internal event bus (simple pub/sub) for decoupled communication
- **Future** (v3): If a module needs independent scaling, extract it with a message queue

_Source: [The Emerging Post-Monolith Architecture for 2025](https://dzone.com/articles/post-monolith-architecture-2025)_
_Source: [Modular Monolith - The Architecture Balancing Simplicity and Scalability](https://dev.to/naveens16/behold-the-modular-monolith-the-architecture-balancing-simplicity-and-scalability-2d4)_
_Source: [Marketplace Software Architecture Trends 2025](https://ulansoftware.com/blog/marketplace-software-architecture-trends-2025)_
_Source: [Microservices vs Monoliths in 2026 - Java Code Geeks](https://www.javacodegeeks.com/2025/12/microservices-vs-monoliths-in-2026-when-each-architecture-wins.html)_

### Design Principles and Best Practices

**Domain-Driven Design (DDD) with Bounded Contexts** [High Confidence]

The platform's "three platforms in one" nature (Creator Economy + Attendee Lifestyle + Venue Optimization) maps perfectly to DDD bounded contexts:

**Bounded Contexts:**
| Context | Core Domain | Key Entities |
|---------|-------------|-------------|
| **Event Management** | Event lifecycle, scheduling | Event, Schedule, EventSeries |
| **Ticketing** | Purchase, validation, entry | Ticket, Order, Reservation |
| **Payments** | Money flow, splits, payouts | Payment, Transfer, Refund |
| **Identity** | Users, roles, profiles | User, ArtistProfile, OrgProfile, VenueProfile |
| **Venue** | Space management, seat maps | Venue, SeatMap, Section, Seat |
| **Discovery** | Search, recommendations | SearchIndex, Category, Tag |

**Key Design Principles Applied:**
1. **Aggregate Roots** - Event is the aggregate root for event management; Order is the aggregate root for ticketing (an Order contains multiple Tickets)
2. **Value Objects** - Money (amount + currency), SeatLocation (section + row + seat), TicketTier (name + price + quantity)
3. **Domain Events** - `EventPublished`, `TicketPurchased`, `PaymentCompleted`, `SeatReserved` drive cross-module reactions
4. **Repository Pattern** - Drizzle ORM queries abstracted behind repository interfaces per module

**Next.js App Router Alignment:**
- Route Groups map to bounded contexts: `(events)`, `(tickets)`, `(dashboard)`
- Server Components handle read-heavy pages (event listings, profiles)
- Server Actions handle mutations within each bounded context
- Middleware enforces cross-cutting concerns (auth, rate limiting)

_Source: [Next.js Architecture Patterns - Medium](https://pavlo-lompas.medium.com/exploring-architecture-patterns-for-next-js-applications-f5550562c63b)_
_Source: [From Next.js Monolith to Event-Driven Architecture](https://dev.to/goniszewski/from-nextjs-monolith-to-event-driven-architecture-why-we-started-and-what-we-built-167h)_

### Scalability and Performance Patterns

**Multi-Layer Caching Strategy** [High Confidence]

Event ticketing has extreme traffic patterns - thousands of users hitting "buy" simultaneously when tickets go on sale. The caching strategy must handle both steady-state browsing and spike traffic.

**Caching Layers:**

| Layer | Technology | What's Cached | TTL |
|-------|-----------|---------------|-----|
| **Edge/CDN** | Vercel Edge Network | Static pages, images, event listings | 60s (ISR) |
| **API Cache** | Upstash Redis | Search results, popular event data | 30-120s |
| **Database Query** | Drizzle query cache | Aggregated analytics, venue availability | 5-60s |
| **Client-Side** | React Query / SWR | User-specific data, cart state | Session |

**Incremental Static Regeneration (ISR) Strategy:**
- **Event listing pages**: Revalidate every 60 seconds (ticket counts update)
- **Event detail pages**: Revalidate every 30 seconds during on-sale periods, 5 minutes otherwise
- **Artist/Org profiles**: Revalidate every 10 minutes (rarely change)
- **Static content** (about, FAQ, terms): Build-time generation, manual revalidation

**High-Traffic On-Sale Pattern:**
```
1. Virtual Waiting Queue (Redis Sorted Set)
   - Users enter queue when on-sale begins
   - Queue processes users in FIFO order
   - Throttles concurrent checkout to ~500/minute

2. Dynamic Cache Invalidation
   - Seat availability: SSE push (no polling)
   - Ticket count: Redis counter (atomic increment/decrement)
   - Event page: On-demand revalidation when sold out

3. Edge Middleware
   - Rate limiting: 10 requests/second per IP
   - Bot detection: CAPTCHA challenge on suspicious patterns
   - Geographic routing: Serve from nearest edge
```

**Performance Targets:**
- Event page load: <1.5s (LCP) via SSG + edge caching
- Seat selection response: <200ms via Redis
- Checkout flow: <3s total (reservation to payment redirect)
- QR validation: <500ms (scanner to confirmation)

_Source: [Advanced Caching Strategies in Next.js 2025](https://medium.com/@itsamanyadav/advanced-caching-strategies-in-next-js-2025-edition-6805939cf163)_
_Source: [Scaling Next.js Apps: Strategies for Handling High Traffic](https://clouddevs.com/next/scaling-apps/)_
_Source: [Next.js Caching for Large-Scale Applications](https://www.oblivious.com/blog/next-js-caching-for-large-scale-applications)_
_Source: [Next.js Caching Guide](https://nextjs.org/docs/app/guides/caching)_

### Security Architecture Patterns

**Defense-in-Depth for Event Marketplace** [High Confidence]

OWASP 2025 emphasizes designing security in from the start rather than retrofitting. The platform handles financial transactions and personal data, requiring comprehensive security layers.

**Security Layers:**

**1. Authentication & Session Security**
- Auth.js v5 with secure session handling (HTTP-only cookies, SameSite=Strict)
- OAuth 2.0 for social login (Google, Facebook)
- Email/password with bcrypt hashing (cost factor 12)
- Session rotation on privilege escalation (e.g., entering checkout)

**2. Authorization & Access Control**
- Role-based middleware on all protected routes
- Row-Level Security (RLS) at the PostgreSQL level - even if application logic fails, data doesn't leak
- Organization-scoped queries: `current_setting('session.current_organization_id')` injected via Drizzle middleware
- API routes validate both authentication AND authorization before processing

**3. Payment Security**
- PCI compliance handled by Stripe (platform never touches raw card data)
- Stripe webhook signature verification on every incoming webhook
- Server-side price validation - never trust client-side amounts
- Idempotency keys on all payment operations to prevent duplicate charges

**4. Ticket Fraud Prevention**
- HMAC-SHA256 signed QR tokens (forgery prevention)
- One-time-use validation with duplicate scan detection
- Rate limiting on validation endpoint (prevent brute-force scanning)
- Real-time anomaly detection: flag accounts buying >X tickets in rapid succession
- Graph-based fraud detection (v2): identify connected fraudulent accounts

**5. Application Security (OWASP Top 10 2025)**
- Input validation with Zod schemas on all API boundaries
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's built-in escaping + Content Security Policy headers
- CSRF protection via SameSite cookies + origin checking
- Rate limiting on all public endpoints (Upstash Redis ratelimit)

_Source: [Preventing Ticketing Fraud in 2026 - Softjourn](https://softjourn.com/insights/prevent-ticketing-fraud)_
_Source: [OWASP Top 10:2025](https://owasp.org/Top10/2025/)_
_Source: [OWASP Automated Threats to Web Applications](https://owasp.org/www-project-automated-threats-to-web-applications/)_

### Data Architecture Patterns

**Shared Schema Multi-Tenancy with Row-Level Security** [High Confidence]

The platform's multi-tenant nature (multiple artists, orgs, venues sharing the same infrastructure) requires careful data isolation.

**Tenancy Model:**
- All tenants share the same PostgreSQL database and schema
- Every tenant-scoped table includes an `organization_id` column
- PostgreSQL RLS policies enforce data isolation at the database engine level
- Session-level variable `session.current_organization_id` set on each request

**RLS Implementation Pattern:**
```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's events
CREATE POLICY org_isolation ON events
  USING (organization_id = current_setting('session.current_organization_id')::uuid);

-- Restrictive policy for additional constraints
CREATE POLICY published_only ON events AS RESTRICTIVE
  FOR SELECT USING (status = 'published' OR organization_id = current_setting('session.current_organization_id')::uuid);
```

**Data Access Patterns:**
| Data Type | Isolation Level | Access Pattern |
|-----------|----------------|----------------|
| Events (published) | Public | No RLS, visible to all |
| Events (draft) | Organization | RLS by organization_id |
| Tickets/Orders | User + Organization | RLS by user_id OR organization_id |
| Financial data | Organization | Strict RLS by organization_id |
| User profiles | User | RLS by user_id |
| Venue data | Venue organization | RLS by venue's organization_id |
| Analytics | Organization | Aggregated, RLS by organization_id |

**Testing Protocol:**
- Integration tests for every access pattern to verify data isolation
- Cross-tenant access attempts must fail (negative testing)
- RLS policies audited quarterly

_Source: [Multi-tenant Data Isolation with PostgreSQL RLS - AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)_
_Source: [Row Level Security for Tenants - Crunchy Data](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)_
_Source: [Shipping Multi-tenant SaaS using Postgres RLS - Nile](https://www.thenile.dev/blog/multi-tenant-rls)_
_Source: [Postgres RLS Implementation Guide - Permit.io](https://www.permit.io/blog/postgres-rls-implementation-guide)_

### Deployment and Operations Architecture

**Vercel-Native Deployment with Edge Optimization** [High Confidence]

The deployment architecture leverages Vercel's platform capabilities for zero-config scaling.

**Deployment Architecture:**
```
                    Vercel Edge Network (CDN)
                          |
            +-------------+-------------+
            |             |             |
    Edge Middleware   Static Assets   ISR Pages
    (auth, rate limit) (images, JS)  (event listings)
            |
            v
    Vercel Serverless Functions
    (API routes, Server Actions)
            |
    +-------+-------+-------+
    |       |       |       |
  Neon    Upstash  Stripe  Resend
  (Postgres) (Redis) (Payments) (Email)
```

**Environment Strategy:**
| Environment | Purpose | Database | URL |
|-------------|---------|----------|-----|
| **Production** | Live platform | Neon main branch | phlive.com |
| **Preview** | PR previews | Neon preview branch | pr-*.vercel.app |
| **Development** | Local dev | Local PostgreSQL | localhost:3000 |

**Operational Patterns:**
- **Database migrations**: Drizzle Kit generates SQL migrations, applied via CI/CD pipeline
- **Feature flags**: Simple database-backed flags for gradual rollouts (no third-party service needed for v1)
- **Monitoring**: Vercel Analytics + Sentry for error tracking + Upstash Redis for custom metrics
- **Logging**: Structured JSON logs via Vercel Log Drains to a log aggregator
- **Backup**: Neon automated point-in-time recovery (PITR) with 7-day retention

**CI/CD Pipeline:**
1. Push to branch -> Vercel Preview Deployment
2. Run tests (Vitest unit + Playwright E2E)
3. Drizzle migration check (no breaking changes)
4. PR review + merge to main
5. Auto-deploy to production
6. Post-deploy health checks

_Source: [Next.js Performance Optimization 2025](https://pagepro.co/blog/nextjs-performance-optimization-in-9-steps/)_
_Source: [Next.js Advanced Patterns: App Router and Caching Strategies for 2026](https://johal.in/next-js-15-advanced-patterns-app-router-server-actions-and-caching-strategies-for-2026/)_

---

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategy

**Recommendation: Incremental MVP with Phased Feature Rollout** [High Confidence]

The platform should follow a Now-Next-Later phased approach, validating assumptions early with MVP releases and using feature flags to isolate failures.

**Phase 1 - MVP Core (Weeks 1-6):**
- User auth (Auth.js v5 with email + Google OAuth)
- Artist/Org profile creation (basic)
- Event creation with ticket tiers (general admission only)
- Stripe Connect onboarding for creators
- Ticket purchase flow (single + multi-ticket)
- QR ticket generation and basic validation
- Event discovery page (list view with filters)

**Phase 2 - Enhanced Platform (Weeks 7-12):**
- Venue management and venue profiles
- Seat map support (section-based, not individual seats)
- Event portfolio pages for artists/orgs
- Dashboard with sales analytics
- Email notifications (Resend)
- Search with PostgreSQL Full-Text Search
- Refund handling

**Phase 3 - Growth Features (Weeks 13-20):**
- Individual seat selection with real-time availability (Redis + SSE)
- Advanced analytics dashboard
- Social features (follow artists, event sharing)
- Merch integration for artists
- Event series and recurring events
- Apple/Google Wallet pass generation

**Phase 4 - Scale & Optimize (Weeks 21+):**
- Meilisearch migration for advanced search
- Recommendation engine
- Virtual waiting queue for high-demand on-sales
- Advanced fraud detection
- Mobile-optimized PWA experience
- API for third-party integrations

_Source: [Launching Your MVP Marketplace - Rigby](https://www.rigbyjs.com/blog/mvp-marketplace)_
_Source: [2026 Platform Roadmap Guide](https://www.ai-infra-link.com/how-to-spot-realistic-vs-unrealistic-platform-roadmaps-in-2026/)_

### Development Workflows and Tooling

**Solo/Small-Team Full-Stack Workflow** [High Confidence]

The Next.js + Drizzle ORM stack is optimized for solo or small-team development, where a single developer manages front-end, back-end, and database in one codebase.

**Development Environment:**
- **IDE**: VS Code with ESLint, Prettier, Tailwind IntelliSense, Drizzle snippets
- **Local DB**: Docker PostgreSQL container (matches Neon production)
- **Hot reload**: Next.js Turbopack for sub-second rebuilds
- **Type safety**: End-to-end TypeScript from Drizzle schema to React components
- **Schema changes**: `drizzle-kit push` for development, `drizzle-kit generate` for production migrations

**Git Workflow:**
```
main (production)
  |
  +-- feature/event-creation
  +-- feature/stripe-integration
  +-- fix/ticket-validation-bug
```

- Feature branches off `main`
- Vercel Preview Deployments on every push (automatic)
- PR review (self-review for solo dev, or AI-assisted review)
- Squash merge to `main` -> auto-deploy to production

**Developer Experience Tooling:**
| Tool | Purpose | Why |
|------|---------|-----|
| **Turbopack** | Dev server bundler | Sub-second HMR, native Next.js |
| **Drizzle Kit** | Schema migrations | Type-safe, SQL-first, visual Studio |
| **Drizzle Studio** | Database GUI | Browse/edit data during development |
| **Zod** | Validation | Shared schemas between client and server |
| **TypeScript strict mode** | Type safety | Catch errors at compile time |

_Source: [Building Full-Stack with Next.js, Drizzle ORM, Neon - Medium](https://medium.com/@abgkcode/building-a-full-stack-application-with-next-js-drizzle-orm-neon-postgresql-and-better-auth-6d7541fba48a)_
_Source: [Production-Grade CI/CD with GitHub Actions - Medium](https://medium.com/@lakshaykapoor08/%EF%B8%8F-production-grade-ci-cd-with-github-actions-for-full-stack-projects-715781fd0b84)_

### Testing and Quality Assurance

**Testing Strategy: Vitest + Playwright + Drizzle Test Utils** [High Confidence]

Next.js App Router requires a layered testing approach because async Server Components aren't fully supported in unit test frameworks.

**Testing Pyramid:**

| Layer | Tool | What to Test | Target Coverage |
|-------|------|-------------|-----------------|
| **Unit** | Vitest | Utility functions, Zod schemas, business logic, price calculations | 80%+ |
| **Component** | Vitest + React Testing Library | Client components, form validation, UI interactions | Key flows |
| **Integration** | Vitest + Drizzle test DB | API routes, Server Actions, database queries, RLS policies | All endpoints |
| **E2E** | Playwright | Full user flows: signup -> create event -> purchase ticket -> validate QR | Critical paths |

**Critical Test Scenarios:**
1. **Payment flow**: Complete checkout with Stripe test mode, verify ticket creation
2. **Seat reservation**: Concurrent users selecting same seat, verify only one succeeds
3. **RLS isolation**: Verify org A cannot access org B's data (negative testing)
4. **QR validation**: Valid ticket scanned, duplicate scan detected, invalid token rejected
5. **Role access**: Attendee cannot access artist dashboard, venue manager cannot see other venues

**Testing Configuration:**
- Vitest with `@vitejs/plugin-react` for JSX support in tests
- Playwright tests run against Vercel Preview Deployments in CI
- Separate test database (Neon branch) for integration tests
- Stripe test mode webhooks via Stripe CLI for local development

_Source: [Testing: Vitest - Next.js Docs](https://nextjs.org/docs/app/guides/testing/vitest)_
_Source: [Unit and E2E Tests with Vitest & Playwright - Strapi](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)_
_Source: [Test Strategy in Next.js App Router Era](https://shinagawa-web.com/en/blogs/nextjs-app-router-testing-setup)_

### Cost Optimization and Resource Management

**Serverless-First Cost Model** [High Confidence]

The entire stack is designed for pay-per-use pricing, keeping costs near zero during development and scaling linearly with traffic.

**Monthly Cost Estimates:**

| Service | Free Tier | Early Stage (1K users) | Growth (10K users) |
|---------|-----------|----------------------|-------------------|
| **Vercel** (Hobby -> Pro) | $0 | $20/mo | $20/mo + usage |
| **Neon** (PostgreSQL) | $0 (100 CU-hrs) | $19/mo (Launch plan) | $69/mo (Scale plan) |
| **Upstash** (Redis) | $0 (10K cmds/day) | $0 (free tier sufficient) | $10/mo (Pay-as-you-go) |
| **Stripe** | 2.9% + $0.30/txn | ~$30/mo (on $1K GMV) | ~$300/mo (on $10K GMV) |
| **Resend** (Email) | $0 (100 emails/day) | $0 | $20/mo |
| **Sentry** (Error tracking) | $0 (5K events) | $0 | $26/mo |
| **Domain** | - | $12/year | $12/year |
| **Total** | ~$0 | ~$70/mo + Stripe fees | ~$445/mo + Stripe fees |

**Cost Optimization Strategies:**
- **Neon auto-suspend**: Database scales to zero when inactive (saves compute during off-peak hours)
- **Neon branch-based previews**: No separate staging database cost, branches are nearly free
- **Vercel ISR**: Reduces serverless function invocations by serving cached pages from edge
- **Upstash per-request pricing**: Only pay for actual Redis commands used
- **Image optimization**: Vercel Image Optimization included, no external CDN needed

**Neon Post-Acquisition Pricing (Aug 2025):**
- Compute costs reduced 15-25% after Databricks acquisition
- Storage reduced 80% (from $1.75 to $0.35/GB)
- Free tier doubled to 100 CU-hours/month (enough for 400 hours at 0.25 CU)
- Auto-scaling ceiling configurable per branch for cost control

_Source: [Neon Serverless Postgres Pricing 2026](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/)_
_Source: [Neon Pricing Calculator 2026](https://www.buildmvpfast.com/tools/api-pricing-estimator/neon)_
_Source: [Upstash Redis New Pricing](https://upstash.com/blog/redis-new-pricing)_
_Source: [Neon for Vercel](https://vercel.com/marketplace/neon)_

### Risk Assessment and Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Stripe Connect onboarding friction** | Medium | High | Simplify with Express accounts; provide clear setup guide |
| **High-concurrency seat booking failures** | Medium | High | Redis locks + virtual queue; load test before launch |
| **PostgreSQL RLS performance overhead** | Low | Medium | Benchmark RLS queries; add composite indexes on tenant columns |
| **Neon cold start latency** | Low | Medium | Keep minimum compute active during business hours |
| **Scope creep beyond MVP** | High | High | Strict phase boundaries; only ship Phase 1 features first |
| **Single developer bottleneck** | Medium | Medium | Modular architecture allows parallel AI-assisted development |
| **Stripe fee impact on margins** | Low | Medium | Platform service fee covers Stripe costs; evaluate volume discounts |

---

## Technical Research Recommendations

### Implementation Roadmap Summary

```
Phase 1 (MVP):     Auth -> Profiles -> Events -> Tickets -> Payments -> QR
Phase 2 (Enhanced): Venues -> Seat Maps -> Analytics -> Search -> Refunds
Phase 3 (Growth):   Real-time Seats -> Social -> Merch -> Event Series
Phase 4 (Scale):    Advanced Search -> Recommendations -> Fraud Detection
```

**Start with Phase 1. Ship. Get real users. Let feedback drive Phase 2 priorities.**

### Technology Stack Recommendations (Final)

| Layer | Technology | Confidence |
|-------|-----------|------------|
| Framework | Next.js 16 (App Router) | High |
| Language | TypeScript (strict mode) | High |
| ORM | Drizzle ORM | High |
| Database | Neon PostgreSQL with RLS | High |
| Cache/Locks | Upstash Redis | High |
| Auth | Auth.js v5 (multi-role RBAC) | High |
| Payments | Stripe Connect (Separate Charges & Transfers) | High |
| Email | Resend | Medium-High |
| Deployment | Vercel | High |
| Testing | Vitest + Playwright | High |
| QR Codes | node-qrcode + HMAC-SHA256 | High |
| Search (v1) | PostgreSQL Full-Text Search | Medium-High |
| Search (v2) | Meilisearch | Medium |
| Real-time | Server-Sent Events | Medium-High |

### Success Metrics and KPIs

**Technical KPIs:**
- Page load (LCP): <1.5s for event pages
- API response time: <200ms p95
- Checkout completion rate: >85%
- QR scan-to-confirm: <500ms
- Zero cross-tenant data leaks
- 99.9% uptime (Vercel SLA)

**Business KPIs to Track:**
- Events created per week
- Tickets sold per event
- Creator onboarding completion rate
- Attendee return rate
- Gross Merchandise Value (GMV) growth
- Platform take rate vs. competitor benchmarks
