---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
completedAt: '2026-03-06'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# universal-ticketing-system - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for universal-ticketing-system, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Identity & Access Management**
- FR1: Users can sign up with Google OAuth or email/password
- FR2: Users can sign in and maintain authenticated sessions
- FR3: Users can hold multiple roles (attendee, artist, organization, venue_manager, admin) on a single account
- FR4: Users can switch between their active roles
- FR5: Creators can create and edit a public profile (name, bio, photo, external links)
- FR6: Admins can view, disable, and manage user accounts

**Event Management**
- FR7: Creators can create events with an adaptive event type (concert, racing, seminar, class, other)
- FR8: Creators can define custom ticket tiers with name, price, quantity, and description per event
- FR9: The platform can suggest relevant ticket tier templates based on event type
- FR10: Creators can upload event artwork/banner images
- FR11: Creators can set event details (date, time, venue, description)
- FR12: Creators can select an existing venue from the platform when creating an event
- FR13: Events transition through lifecycle states (Draft -> Published -> On Sale -> Sold Out -> Completed)
- FR14: Creators can view and manage all their events from a dashboard
- FR15: Creators can view real-time sales and revenue data per event
- FR16: Organization accounts can manage multiple events under a single organization profile
- FR17: Admins can review, flag, and unpublish events for moderation
- FR44: Creators can cancel a published event (triggers notification to ticket holders, initiates refund process)
- FR45: Creators can delete draft events that have not been published

**Ticket Sales & Payments**
- FR18: Attendees can purchase one or multiple tickets in a single checkout
- FR19: Attendees can register for free events without payment
- FR20: Payments are processed through Stripe Connect (Separate Charges and Transfers)
- FR21: Creators can onboard as Stripe Express connected accounts to receive payouts
- FR22: Attendees receive email confirmation with ticket details after purchase
- FR23: The platform tracks ticket inventory and prevents overselling
- FR24: The platform displays sold-out status clearly when tickets are exhausted
- FR46: All ticket prices are displayed and processed in Philippine Peso (PHP)
- FR47: The platform sends transactional emails (purchase confirmation, QR codes, event cancellation) via an email delivery service

**QR Ticketing & Validation**
- FR25: The platform generates cryptographically signed (HMAC-SHA256) QR codes for each purchased ticket
- FR26: QR codes are delivered via email and viewable in-app
- FR27: Door staff can access a scanner page to validate QR codes at event entry
- FR28: The scanner detects and rejects duplicate QR code scans with timestamp
- FR29: Creators can view real-time entry count during an event
- FR30: A text-based ticket code is displayed alongside QR for accessibility

**Event Discovery**
- FR31: Visitors can browse a public event listing page
- FR32: Visitors can filter events by type, date, and location
- FR33: Visitors can search for events using text search
- FR34: Each event has a public, shareable detail page with full event information
- FR35: Event detail pages display venue information and photos when a platform venue is linked

**Venue Management**
- FR36: Venue managers can create and edit venue profiles (name, location, capacity, photos, amenities, description)
- FR37: Venue managers can manage an availability calendar (available, tentatively held, booked)
- FR38: Venue managers can view a dashboard of events hosted at their venue
- FR39: Organizers can discover and browse venue profiles when planning events

**Platform Administration**
- FR40: Admins can view a platform overview dashboard (total users, events, tickets sold, revenue)
- FR41: Admins can view financial summary (GMV, platform fees, infrastructure costs)
- FR42: Admins can moderate content (review reported events, unpublish, contact creators)
- FR43: Admins can assign and manage user roles

**File & Media Management**
- FR48: Creators and venue managers can upload images (event artwork, venue photos) stored in cloud storage
- FR49: Uploaded images are automatically optimized for web delivery (resized, compressed, served in modern formats)

**System Feedback & Error Handling**
- FR50: The platform displays appropriate error pages (404, 500) when pages are not found or system errors occur
- FR51: Users receive in-app feedback (success/error indicators) when performing actions (creating events, purchasing tickets, scanning QR codes)
- FR52: The platform displays contextual validation messages on form inputs before submission

### NonFunctional Requirements

**Performance**
- NFR1: Public event pages load with LCP <2.5s on 4G connections (MVP), improving to <1.5s by Month 2
- NFR2: Stripe Checkout redirect completes within 3 seconds
- NFR3: QR code scanning and validation returns result within 2 seconds
- NFR4: Event listing page with filters returns results within 1 second
- NFR5: Creator dashboard loads within 3 seconds on desktop
- NFR6: API responses complete within 500ms at p95 (MVP), improving to 200ms by Month 2
- NFR7: Platform supports 100 concurrent users without degradation (MVP), scaling to 1,000+ at growth phase

**Security**
- NFR8: All data transmitted over HTTPS/TLS 1.3
- NFR9: User passwords hashed with bcrypt (minimum 12 rounds)
- NFR10: QR codes are HMAC-SHA256 signed to prevent forgery -- invalid signatures are rejected
- NFR11: Payment card data never touches platform servers -- handled entirely by Stripe
- NFR12: Auth sessions use HTTP-only, secure, SameSite cookies
- NFR13: Role-based access control enforced at both UI and API level -- users cannot access resources outside their role
- NFR14: Convex function-level authorization enforced on multi-tenant data (creators only see their own events/revenue)
- NFR15: All admin actions are logged with timestamp and actor
- NFR16: File uploads validated for type and size -- no executable uploads accepted

**Scalability**
- NFR17: Serverless architecture scales to handle traffic spikes during on-sale periods without manual intervention
- NFR18: Database connection pooling supports concurrent checkout sessions without connection exhaustion
- NFR19: Static assets served via CDN with edge caching -- event pages cached at edge with ISR revalidation
- NFR20: Image uploads optimized and served in modern formats (WebP/AVIF) at appropriate sizes
- NFR21: Architecture supports migration from polling to SSE/WebSocket for real-time features without system redesign

**Accessibility**
- NFR22: All public-facing pages meet WCAG 2.1 AA compliance
- NFR23: Color contrast ratios meet 4.5:1 minimum for normal text, 3:1 for large text
- NFR24: All interactive elements are keyboard accessible with visible focus indicators
- NFR25: All images include meaningful alt text; decorative images marked as presentational
- NFR26: Form inputs have associated labels and error messages are announced to screen readers
- NFR27: Ticket codes displayed as text alongside QR codes for screen reader accessibility
- NFR28: Animations respect `prefers-reduced-motion` user preference

**Integration**
- NFR29: Stripe Connect integration handles webhook delivery with idempotent processing -- no duplicate charges on retry
- NFR30: Stripe webhook signature verification on all incoming webhooks
- NFR31: Clerk managed authentication supports Google OAuth provider with session management
- NFR32: Email delivery (confirmation, QR codes) completes within 60 seconds of purchase
- NFR33: Open Graph meta tags render correctly when shared on Facebook, Twitter/X, and messaging apps

### Additional Requirements

**From Architecture:**
- Starter template already initialized: `create-next-app` with Next.js 16.1.6, React 19.2.3, TypeScript 5.x, Tailwind CSS 4, ESLint 9 (impacts Epic 1 Story 1 -- project setup adds dependencies on existing scaffold)
- Convex reactive backend platform for database layer
- Clerk managed authentication with Google OAuth provider
- Stripe Connect v20.4.0 with Separate Charges and Transfers, Express connected accounts
- HMAC-SHA256 QR code signing with `QR_SIGNING_SECRET` environment variable
- Resend for transactional email (3,000 free/month), React Email templates
- Vercel Blob for image storage with CDN ($0.023/GB-month)
- Zod for shared client/server validation schemas
- shadcn/ui component library with Radix UI primitives
- ActionResult<T> discriminated union pattern for Server Action returns (Stripe/email integrations only; Convex has its own error handling for database operations)
- Co-located test files (*.test.ts next to source), Vitest for unit/integration, Playwright for E2E
- Convex function-level authorization for multi-tenant data isolation
- Prices stored as integer centavos (P300 = 30000), displayed with Intl.NumberFormat
- Event lifecycle state machine: Draft -> Published -> OnSale -> SoldOut -> Completed
- src/ directory structure with feature-grouped App Router route groups: (public), (dashboard), (auth)
- 5 layout components: PublicLayout, DashboardLayout, ScannerLayout, AuthLayout, WizardLayout
- clerkMiddleware() for auth session validation and role-based route protection

**From UX Design:**
- Hybrid visual direction: Event-Forward (public) + Dashboard-Forward (authenticated)
- Mobile-first responsive design: 320px (mobile), 768px (tablet), 1024px (desktop), 1280px (wide)
- Bottom tab bar navigation on mobile, sidebar navigation on desktop dashboard
- 5 custom components required: EventCard, TicketTierBuilder, QRScanner, MetricCard, RoleSwitcher
- Full-screen scanner mode with dedicated ScannerLayout
- Skeleton loading states for all async content
- Toast notifications (Sonner) for action feedback
- Multi-step wizard pattern for event creation
- Role switcher in dashboard header/sidebar
- Event type adaptation -- UI morphs based on selected event type (concert, racing, seminar, etc.)
- WCAG 2.1 AA accessibility compliance across all public pages
- Keyboard navigation support with visible focus indicators
- prefers-reduced-motion support for animations

### FR Coverage Map

FR1: Epic 1 - User registration (Google OAuth / email)
FR2: Epic 1 - User sign-in and session management
FR3: Epic 1 - Multi-role support on single account
FR4: Epic 1 - Role switching between active roles
FR5: Epic 1 - Creator public profile (name, bio, photo, links)
FR6: Epic 7 - Admin user management (view, disable, manage)
FR7: Epic 2 - Adaptive event type creation
FR8: Epic 2 - Custom ticket tier definition
FR9: Epic 2 - Ticket tier template suggestions by event type
FR10: Epic 2 - Event artwork/banner upload
FR11: Epic 2 - Event details (date, time, venue, description)
FR12: Epic 2 - Venue selection from platform venues
FR13: Epic 2 - Event lifecycle state transitions
FR14: Epic 2 - Creator events dashboard
FR15: Epic 2 - Real-time sales and revenue data per event
FR16: Epic 2 - Organization multi-event management
FR17: Epic 7 - Admin event moderation (review, flag, unpublish)
FR18: Epic 3 - Multi-ticket purchase in single checkout
FR19: Epic 3 - Free event registration without payment
FR20: Epic 3 - Stripe Connect payment processing
FR21: Epic 3 - Stripe Express connected account onboarding
FR22: Epic 3 - Email confirmation with ticket details
FR23: Epic 3 - Ticket inventory tracking and oversell prevention
FR24: Epic 3 - Sold-out status display
FR25: Epic 4 - HMAC-SHA256 QR code generation
FR26: Epic 4 - QR delivery via email and in-app viewing
FR27: Epic 4 - Scanner page for door staff QR validation
FR28: Epic 4 - Duplicate scan detection with timestamp
FR29: Epic 4 - Real-time entry count during event
FR30: Epic 4 - Text-based ticket code alongside QR
FR31: Epic 5 - Public event listing page
FR32: Epic 5 - Event filtering (type, date, location)
FR33: Epic 5 - Text search for events
FR34: Epic 5 - Shareable event detail page
FR35: Epic 5 - Venue info display on event detail
FR36: Epic 6 - Venue profile creation and editing
FR37: Epic 6 - Venue availability calendar management
FR38: Epic 6 - Venue dashboard (events hosted)
FR39: Epic 6 - Venue discovery and browsing for organizers
FR40: Epic 7 - Admin platform overview dashboard
FR41: Epic 7 - Admin financial summary
FR42: Epic 7 - Admin content moderation workflow
FR43: Epic 7 - Admin role assignment and management
FR44: Epic 2 - Event cancellation (notification + refund)
FR45: Epic 2 - Draft event deletion
FR46: Epic 3 - Philippine Peso (PHP) currency display/processing
FR47: Epic 3 - Transactional email delivery service
FR48: Epic 2 - Image upload to cloud storage
FR49: Epic 2 - Automatic image optimization for web
FR50: Epic 1 - Error pages (404, 500)
FR51: Epic 1 - In-app action feedback (success/error)
FR52: Epic 1 - Contextual form validation messages

## Epic List

### Epic 1: Project Foundation & User Authentication
Users can register, sign in, manage their roles, edit their profiles, and experience consistent error handling and feedback across the platform. Includes project setup (dependencies, DB schema, layouts, middleware).
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR50, FR51, FR52

### Epic 2: Event Creation & Management
Creators can create events with adaptive types, define ticket tiers, upload artwork, manage event lifecycle, view their events dashboard, and track sales data. Organization accounts can manage multiple events under a single profile.
**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR44, FR45, FR48, FR49

### Epic 3: Ticket Sales & Payments
Attendees can purchase one or multiple tickets, register for free events, and pay via Stripe Checkout. Creators onboard as Stripe Express connected accounts to receive payouts. Attendees receive email confirmations. Inventory tracking prevents overselling.
**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR46, FR47

### Epic 4: QR Ticketing & Entry Validation
Purchased tickets receive cryptographically signed QR codes, delivered via email and viewable in-app. Door staff scan QR codes with duplicate detection and timestamp. Creators see real-time entry counts. Text codes provided for accessibility.
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30

### Epic 5: Event Discovery & Public Experience
Visitors can browse, filter, and search for events on public pages. Events have shareable detail pages with venue information and Open Graph meta tags for social sharing.
**FRs covered:** FR31, FR32, FR33, FR34, FR35

### Epic 6: Venue Management
Venue managers can create and edit venue profiles with photos and amenities, manage availability calendars, and view events hosted at their venue. Organizers can discover and browse venue profiles when planning events.
**FRs covered:** FR36, FR37, FR38, FR39

### Epic 7: Platform Administration
Admins can view platform health dashboards, manage users (view, disable, assign roles), moderate content (review, flag, unpublish events), and review financial summaries. All admin actions are audit-logged.
**FRs covered:** FR6, FR17, FR40, FR41, FR42, FR43

## Epic 1: Project Foundation & User Authentication

Users can register, sign in, manage their roles, edit their profiles, and experience consistent error handling and feedback across the platform. Includes project setup (dependencies, DB schema, layouts, middleware).

### Story 1.1: Project Setup & Core Infrastructure

As a **developer**,
I want the project configured with all core dependencies, database connection, directory structure, and layout components,
So that all subsequent stories have a consistent foundation to build on.

**Acceptance Criteria:**

**Given** the existing Next.js 16.1.6 scaffold
**When** dependencies are installed (Convex, @clerk/nextjs, Zod, shadcn/ui, Sonner, Vitest)
**Then** the project builds successfully with `pnpm build`
**And** the `src/` directory structure matches the architecture spec (app/, components/, lib/, types/)
**And** Convex is initialized and `npx convex dev` connects successfully
**And** the Convex `users` table schema is defined with `id`, `name`, `email`, `image`, `roles` (array), `activeRole`, `createdAt`, `updatedAt`
**And** Clerk is configured with Google OAuth and ClerkProvider wraps the application
**And** root layout.tsx loads fonts, global styles, and Sonner toast provider
**And** AuthLayout, PublicLayout, and DashboardLayout shell components render correctly
**And** `.env.example` documents all required environment variables
**And** `ActionResult<T>` type is defined in `types/index.ts`
**And** `formatCurrency` and `formatDate` utilities are implemented in `lib/utils/format.ts`
**And** Vitest is configured and a sample test passes

### Story 1.2: User Registration & Google OAuth Sign-In

As a **visitor**,
I want to sign up and sign in using my Google account,
So that I can access the platform quickly without creating a new password.

**Acceptance Criteria:**

**Given** I am on the sign-in page (`/sign-in`)
**When** I click "Sign in with Google"
**Then** I am redirected to Google OAuth consent screen
**And** after granting consent, I am redirected back and a session is created
**And** my name, email, and profile photo are stored from Google
**And** I am assigned the default role `attendee`
**And** I am redirected to the dashboard

**Given** I am already authenticated
**When** I visit `/sign-in`
**Then** I am redirected to the dashboard

**Given** I am not authenticated
**When** I visit a protected route under `(dashboard)/`
**Then** I am redirected to `/sign-in`

**Given** Clerk is configured
**When** sessions are created
**Then** Clerk session management handles secure authentication (NFR12)
**And** clerkMiddleware() validates sessions and protects dashboard routes

### Story 1.3: Multi-Role User System & Role Switching

As a **user**,
I want to hold multiple roles and switch between them,
So that I can be both an attendee and a creator from the same account.

**Acceptance Criteria:**

**Given** I am authenticated with role `attendee`
**When** I request the `artist` role via a role request action
**Then** my `roles` array is updated to include `artist`
**And** I can now switch my `activeRole` to `artist`

**Given** I have multiple roles
**When** I click the RoleSwitcher component in the dashboard header
**Then** I see a dropdown with all my available roles
**And** selecting a different role updates my `activeRole` in Convex
**And** the dashboard UI adapts to show features for the selected role
**And** a toast confirms "Switched to Artist"

**Given** I have only one role
**When** I view the dashboard
**Then** the RoleSwitcher is hidden or shows my single role without dropdown

**Given** role-based access control (NFR13)
**When** I attempt to access a creator-only feature with `attendee` active role
**Then** I see an appropriate access denied message

### Story 1.4: Creator Profile Management

As a **creator** (artist or organization),
I want to create and edit my public profile with name, bio, photo, and external links,
So that attendees can learn about me and find me on other platforms.

**Acceptance Criteria:**

**Given** I am authenticated with `artist` or `organization` active role
**When** I navigate to `/settings`
**Then** I see a profile editing form with fields for display name, bio, profile photo, and external links (website, Instagram, Spotify, Facebook)

**Given** I fill out the profile form
**When** I submit valid data
**Then** the profile is saved via a Convex mutation and a success toast is shown

**Given** I submit invalid data (e.g., empty display name)
**When** Zod validation runs
**Then** contextual validation errors are shown inline on the form (FR52)
**And** the Convex mutation throws a ConvexError with a descriptive error message

**Given** my profile is saved
**When** an attendee views my event
**Then** my creator name and profile photo are displayed on the event page

### Story 1.5: System Feedback & Error Handling

As a **user**,
I want clear error pages and in-app feedback when things go wrong or succeed,
So that I always know what happened and what to do next.

**Acceptance Criteria:**

**Given** I navigate to a URL that doesn't exist
**When** the page loads
**Then** a styled 404 page is displayed with navigation back to home (FR50)
**And** the page follows the platform's design system

**Given** an unhandled server error occurs
**When** the error boundary catches it
**Then** a styled 500 error page is displayed (FR50)
**And** the error is logged

**Given** I perform any successful action (e.g., save profile)
**When** the action completes
**Then** a Sonner toast notification confirms success (FR51)

**Given** I perform an action that fails
**When** the action returns an error
**Then** a destructive toast notification shows the error message (FR51)

**Given** I am filling out any form
**When** I enter invalid data
**Then** Zod-powered validation messages appear inline below the relevant fields (FR52)
**And** form inputs have associated labels and error messages announced to screen readers (NFR26)
**And** all interactive elements are keyboard accessible with visible focus indicators (NFR24)

## Epic 2: Event Creation & Management

Creators can create events with adaptive types, define ticket tiers, upload artwork, manage event lifecycle, view their events dashboard, and track sales data. Organization accounts can manage multiple events under a single profile.

### Story 2.1: Event Creation Wizard - Basic Details

As a **creator**,
I want to create a new event by entering its type, title, description, date, time, and venue,
So that I can start building my event listing.

**Acceptance Criteria:**

**Given** I am authenticated with `artist` or `organization` active role
**When** I navigate to `/events/create`
**Then** I see a multi-step wizard (WizardLayout) starting with event type selection

**Given** I am on the event type step
**When** I select an event type (concert, racing, seminar, class, other)
**Then** the form adapts to show type-relevant fields and suggestions (FR7)
**And** I proceed to the details step

**Given** I am on the details step
**When** I enter title, description, date, time, and optionally select a venue from existing platform venues (FR11, FR12)
**Then** the form validates inputs with Zod
**And** I can proceed to the next step

**Given** I submit the wizard with valid basic details
**When** the event is saved
**Then** an `events` table record is created with status `Draft` (FR13)
**And** the `events` schema includes `id`, `creator_id`, `title`, `description`, `event_type`, `date`, `time`, `venue_id`, `status`, `created_at`, `updated_at`
**And** I am redirected to the event edit page
**And** a success toast confirms "Event created as draft"

**Given** Convex function-level authorization (NFR14)
**When** I query events
**Then** I only see events where I am the creator

### Story 2.2: Ticket Tier Configuration

As a **creator**,
I want to define custom ticket tiers with name, price, quantity, and description for my event,
So that I can offer different ticket options to attendees.

**Acceptance Criteria:**

**Given** I am editing a draft event
**When** I navigate to the ticket tiers step
**Then** I see the TicketTierBuilder component with suggested tier templates based on event type (FR9)

**Given** I am configuring ticket tiers
**When** I add a tier with name, price (in PHP centavos), quantity, and description
**Then** the tier is validated (name required, price >= 0, quantity >= 1) (FR8)
**And** prices are stored as integer centavos (P300 = 30000)
**And** prices display formatted with `Intl.NumberFormat` as "PHP 300.00" (FR46)

**Given** I want multiple tiers
**When** I add additional tiers
**Then** I can create up to `MAX_TIERS_PER_EVENT` tiers per event
**And** each tier has independent name, price, quantity, and description

**Given** I want a free event
**When** I set all tier prices to 0
**Then** the event is marked as a free event
**And** the tier displays "Free" instead of "PHP 0.00"

**Given** the `ticket_tiers` table schema
**Then** it includes `id`, `event_id`, `name`, `price`, `quantity`, `sold_count` (default 0), `description`, `created_at`

### Story 2.3: Event Artwork Upload & Image Management

As a **creator**,
I want to upload event artwork and banner images,
So that my event listing looks professional and attracts attendees.

**Acceptance Criteria:**

**Given** I am editing an event
**When** I upload an image file
**Then** the file is uploaded to Vercel Blob storage (FR48)
**And** the returned CDN URL is stored in the event record
**And** uploaded images are validated for type (JPEG, PNG, WebP) and size (max 5MB) (NFR16)
**And** a preview of the uploaded image is shown

**Given** an image is uploaded
**When** it is served to users
**Then** it is delivered via Vercel Blob CDN with optimized formats (NFR20)
**And** `next/image` component is used with proper width/height for CLS prevention

**Given** I upload an invalid file (wrong type or too large)
**When** validation fails
**Then** a descriptive error message is shown
**And** the upload is rejected before sending to storage

### Story 2.4: Event Lifecycle Management

As a **creator**,
I want my events to transition through lifecycle states (Draft, Published, On Sale, Sold Out, Completed),
So that I can control when my event is visible and purchasable.

**Acceptance Criteria:**

**Given** I have a draft event with at least one ticket tier
**When** I click "Publish"
**Then** the event status changes to `Published` (FR13)
**And** the event becomes visible on public pages
**And** a success toast confirms "Event published"

**Given** a published event with ticket tiers
**When** the event is published
**Then** the status automatically transitions to `OnSale`

**Given** an on-sale event
**When** all ticket tiers reach sold_count == quantity
**Then** the status automatically transitions to `SoldOut` (FR24)

**Given** an event with a past date
**When** the date has passed
**Then** the status transitions to `Completed`

**Given** I want to cancel a published/on-sale event
**When** I click "Cancel Event" and confirm
**Then** the event status changes to `Cancelled` (FR44)
**And** a cancellation notification is queued for ticket holders
**And** refund processing is initiated

**Given** I have a draft event
**When** I click "Delete Draft"
**Then** the draft event and its tiers are permanently deleted (FR45)
**And** a success toast confirms deletion

### Story 2.5: Creator Events Dashboard

As a **creator**,
I want to view and manage all my events from a dashboard,
So that I can see my event portfolio at a glance.

**Acceptance Criteria:**

**Given** I am authenticated as a creator
**When** I navigate to `/dashboard`
**Then** I see a list of all my events with title, date, status, and ticket sales summary (FR14)
**And** events are sorted by date (upcoming first)
**And** the dashboard loads within 3 seconds (NFR5)
**And** skeleton loading states are shown while data loads

**Given** I view the dashboard
**When** events are displayed
**Then** each event shows: title, event type, date, status badge, tickets sold / total capacity
**And** I can click an event to navigate to its edit/detail page

**Given** I have events in different states
**When** I view the dashboard
**Then** I can filter events by status (Draft, Published, OnSale, Completed, Cancelled)

### Story 2.6: Event Sales & Revenue View

As a **creator**,
I want to view real-time sales and revenue data for each of my events,
So that I can track how my event is performing financially.

**Acceptance Criteria:**

**Given** I am viewing an event I created
**When** I navigate to the event analytics page
**Then** I see MetricCard components displaying: total tickets sold, total revenue (PHP), tickets remaining, and per-tier breakdown (FR15)

**Given** ticket sales data exists
**When** revenue is displayed
**Then** amounts are formatted using `formatCurrency` (PHP centavos -> display format)
**And** per-tier data shows: tier name, price, sold count, remaining count, tier revenue

**Given** no ticket sales exist yet
**When** I view analytics
**Then** metrics show zero values with appropriate empty state messaging

### Story 2.7: Organization Multi-Event Management

As an **organization** account,
I want to manage multiple events under my organization profile,
So that I can run a series of events (like a racing league) from one account.

**Acceptance Criteria:**

**Given** I am authenticated with `organization` active role
**When** I view my dashboard
**Then** I see all events created under my organization profile (FR16)
**And** events are grouped or filterable by series/category

**Given** I create a new event as an organization
**When** the event is saved
**Then** it is associated with my organization profile
**And** the event page shows the organization name and logo

**Given** I am an organization with multiple events
**When** I view my dashboard
**Then** I see aggregate metrics across all events (total tickets sold, total revenue)

## Epic 3: Ticket Sales & Payments

Attendees can purchase one or multiple tickets, register for free events, and pay via Stripe Checkout. Creators onboard as Stripe Express connected accounts to receive payouts. Attendees receive email confirmations. Inventory tracking prevents overselling.

### Story 3.1: Stripe Connect Creator Onboarding

As a **creator**,
I want to connect my Stripe account to receive payouts from ticket sales,
So that I get paid directly when attendees buy my tickets.

**Acceptance Criteria:**

**Given** I am authenticated as a creator without a connected Stripe account
**When** I navigate to `/settings`
**Then** I see a StripeConnectButton prompting me to set up payouts (FR21)

**Given** I click "Connect with Stripe"
**When** the onboarding flow starts
**Then** I am redirected to Stripe Express onboarding
**And** after completing onboarding, I am redirected back to settings
**And** my `stripe_account_id` is stored in the database
**And** a success toast confirms "Stripe account connected"

**Given** my Stripe account is connected
**When** I view settings
**Then** I see my Stripe account status (active/pending) and a link to the Stripe Express dashboard

**Given** I have not connected Stripe
**When** I try to publish an event with paid tiers
**Then** I am prompted to complete Stripe onboarding first

### Story 3.2: Ticket Purchase & Stripe Checkout

As an **attendee**,
I want to select tickets and pay via Stripe Checkout,
So that I can securely purchase tickets for an event.

**Acceptance Criteria:**

**Given** I am viewing an on-sale event with available tickets
**When** I select ticket quantities per tier using the TicketPurchaseCard component
**Then** I see a running total in PHP (formatted with `formatCurrency`) (FR46)
**And** I can select 1 or more tickets across one or more tiers (FR18)

**Given** I click "Buy Tickets"
**When** the purchase Server Action runs
**Then** ticket availability is checked against current inventory (FR23)
**And** a Stripe Checkout Session is created with Separate Charges and Transfers (FR20)
**And** the session uses PHP currency
**And** I am redirected to Stripe Checkout within 3 seconds (NFR2)
**And** payment card data never touches the platform server (NFR11)

**Given** tickets are sold out for a tier I selected
**When** the inventory check runs
**Then** I see an error "Some tickets are no longer available" and am shown updated availability

**Given** I am not authenticated
**When** I try to purchase tickets
**Then** I am redirected to sign in, then returned to the event page after authentication

### Story 3.3: Stripe Webhook & Ticket Creation

As the **platform**,
I want to process Stripe webhook events to create ticket records on successful payment,
So that ticket fulfillment is reliable and idempotent.

**Acceptance Criteria:**

**Given** a Stripe `checkout.session.completed` webhook fires
**When** the webhook handler receives it at `/api/webhooks/stripe`
**Then** the Stripe signature is verified (NFR30)
**And** the webhook is processed idempotently -- duplicate webhooks do not create duplicate tickets (NFR29)

**Given** signature verification passes
**When** the payment is confirmed
**Then** `tickets` table records are created for each purchased ticket
**And** the `tickets` schema includes `id`, `event_id`, `tier_id`, `buyer_id`, `buyer_email`, `qr_code`, `status`, `scanned_at`, `created_at`
**And** `ticket_tiers.sold_count` is incremented atomically
**And** if all tiers are sold out, event status transitions to `SoldOut`

**Given** a payment fails or is cancelled
**When** the webhook fires with a failure event
**Then** no tickets are created
**And** inventory is not affected

**Given** the webhook handler
**When** any processing error occurs
**Then** the handler still returns HTTP 200 to Stripe (to prevent retries)
**And** the error is logged for investigation

### Story 3.4: Free Event Registration

As an **attendee**,
I want to register for free events without going through payment,
So that I can attend free community events easily.

**Acceptance Criteria:**

**Given** I am viewing an event where all ticket tiers have price = 0
**When** I click "Register" (instead of "Buy Tickets")
**Then** ticket records are created directly without Stripe Checkout (FR19)
**And** `sold_count` is incremented on the tier
**And** I see a confirmation page with my ticket details
**And** a success toast confirms registration

**Given** a free event reaches capacity
**When** all tier quantities are exhausted
**Then** the event shows "Registration Full" status
**And** the register button is disabled

### Story 3.5: Purchase Confirmation Email

As an **attendee**,
I want to receive an email confirmation after purchasing tickets,
So that I have a record of my purchase and ticket details.

**Acceptance Criteria:**

**Given** I have successfully purchased tickets (paid or free)
**When** the ticket records are created
**Then** a confirmation email is sent via Resend (FR22, FR47)
**And** the email uses a React Email template
**And** the email includes: event name, date, time, venue, ticket tier, quantity, total amount (or "Free")
**And** the email is delivered within 60 seconds of purchase (NFR32)

**Given** an event is cancelled (FR44)
**When** the creator cancels the event
**Then** a cancellation email is sent to all ticket holders via Resend
**And** the email includes cancellation notice and refund information

## Epic 4: QR Ticketing & Entry Validation

Purchased tickets receive cryptographically signed QR codes, delivered via email and viewable in-app. Door staff scan QR codes with duplicate detection and timestamp. Creators see real-time entry counts. Text codes provided for accessibility.

### Story 4.1: QR Code Generation & Signing

As the **platform**,
I want to generate cryptographically signed QR codes for each purchased ticket,
So that tickets cannot be forged or tampered with.

**Acceptance Criteria:**

**Given** a ticket record is created (via webhook or free registration)
**When** the QR code is generated
**Then** the QR payload contains ticket ID, event ID, tier ID, and buyer ID
**And** the payload is signed using HMAC-SHA256 with `QR_SIGNING_SECRET` (FR25, NFR10)
**And** a QR code image is generated from the signed payload
**And** the QR code value is stored in the `tickets.qr_code` field

**Given** a QR code is generated
**When** the signing library is tested
**Then** valid signatures verify successfully
**And** tampered payloads are rejected
**And** unit tests in `lib/qr/signing.test.ts` cover sign/verify/reject cases

### Story 4.2: QR Code Delivery & In-App Viewing

As an **attendee**,
I want to view my QR codes in-app and receive them via email,
So that I can show my ticket at the event door.

**Acceptance Criteria:**

**Given** I have purchased tickets
**When** I navigate to `/tickets` (My Tickets page)
**Then** I see a list of all my tickets with event name, date, tier, and QR code (FR26)
**And** each ticket displays the QR code image prominently
**And** a text-based ticket code is displayed alongside the QR for accessibility (FR30, NFR27)

**Given** the purchase confirmation email is sent
**When** the email is composed
**Then** the QR code image is included in the email body (FR26)
**And** the text-based ticket code is also included for screen readers

**Given** I am viewing my tickets on mobile
**When** I tap a ticket
**Then** the QR code is displayed full-screen for easy scanning
**And** screen brightness is maximized (if supported by browser)

### Story 4.3: Scanner Page & QR Validation

As a **door staff member**,
I want to scan QR codes at the event entrance and see instant pass/fail results,
So that I can validate tickets quickly and prevent unauthorized entry.

**Acceptance Criteria:**

**Given** I am the event creator or authorized staff
**When** I navigate to `/events/[eventId]/scanner`
**Then** I see the QRScanner component in full-screen ScannerLayout (FR27)
**And** the camera activates and scans for QR codes

**Given** I scan a valid, unused QR code
**When** the scan API at `/api/scan` verifies the HMAC signature and checks the database
**Then** a green "Valid" result is displayed with ticket holder name and tier (FR27)
**And** the ticket's `scanned_at` timestamp is set in the database
**And** the scan completes within 2 seconds (NFR3)

**Given** I scan a QR code that has already been scanned
**When** the duplicate check runs
**Then** a red "Already Scanned" alert is shown with the original scan timestamp (FR28)
**And** the ticket is NOT re-admitted

**Given** I scan an invalid or tampered QR code
**When** HMAC verification fails
**Then** a red "Invalid Ticket" alert is shown (NFR10)

**Given** I scan a QR code for a different event
**When** the event ID check runs
**Then** a red "Wrong Event" alert is shown

### Story 4.4: Real-Time Entry Tracking

As a **creator**,
I want to see how many attendees have entered my event in real time,
So that I can monitor attendance during the event.

**Acceptance Criteria:**

**Given** I am viewing my event's scanner page or analytics page
**When** tickets are being scanned at the door
**Then** I see a real-time entry counter showing scanned / total tickets sold (FR29)
**And** the counter updates via polling (5-second interval for MVP)

**Given** the entry counter is displayed
**When** a new scan occurs
**Then** the counter increments on the next poll
**And** the display shows "87 / 105 checked in" format

**Given** the event has not started yet
**When** I view the entry counter
**Then** it shows "0 / [total sold] checked in"

## Epic 5: Event Discovery & Public Experience

Visitors can browse, filter, and search for events on public pages. Events have shareable detail pages with venue information and Open Graph meta tags for social sharing.

### Story 5.1: Public Event Listing Page

As a **visitor**,
I want to browse upcoming events on a public listing page,
So that I can discover events happening near me.

**Acceptance Criteria:**

**Given** I visit the home page (`/`)
**When** the page loads
**Then** I see a grid of upcoming events using EventCard components (FR31)
**And** each EventCard shows: artwork image, title, date, venue name, price range, event type badge
**And** the page is server-side rendered for SEO (NFR19)
**And** skeleton loading states are shown during data fetch
**And** the page returns results within 1 second (NFR4)

**Given** events are displayed
**When** I view the listing
**Then** only events with status `Published`, `OnSale`, or `SoldOut` are shown
**And** events are sorted by date (soonest first)
**And** sold-out events show a "Sold Out" badge (FR24)

**Given** I am on mobile (320px-767px)
**When** I view the listing
**Then** EventCards display in a single-column layout
**And** the page is mobile-first responsive

### Story 5.2: Event Filtering & Search

As a **visitor**,
I want to filter events by type, date, and location, and search by text,
So that I can find events that interest me quickly.

**Acceptance Criteria:**

**Given** I am on the event listing page
**When** I use the EventFilterBar component
**Then** I can filter by event type (concert, racing, seminar, class, other) (FR32)
**And** I can filter by date range (Today, This Weekend, This Month, custom) (FR32)
**And** I can filter by location (FR32)
**And** filters update the URL query parameters for shareable filtered views

**Given** I type in the search bar
**When** I enter a search query
**Then** events are searched using Convex search indexes (FR33)
**And** results match against event title, description, and creator name
**And** results are displayed within 1 second (NFR4)

**Given** no events match my filters or search
**When** results are empty
**Then** I see a friendly empty state message with suggestion to broaden filters

### Story 5.3: Event Detail Page & Social Sharing

As a **visitor**,
I want to view a detailed event page and share it on social media,
So that I can learn about the event and invite friends.

**Acceptance Criteria:**

**Given** I navigate to `/events/[eventId]`
**When** the page loads
**Then** I see the full event details: artwork, title, description, date, time, venue info, creator profile, ticket tiers with prices and availability (FR34)
**And** the page is server-side rendered with ISR for performance (NFR1, NFR19)

**Given** a venue is linked to the event
**When** the event detail page renders
**Then** venue name, photos, and location are displayed (FR35)

**Given** the event page URL is shared on social media
**When** the link preview is generated
**Then** Open Graph meta tags render correctly with event title, artwork image, date, and venue (NFR33)
**And** meta tags work on Facebook, Twitter/X, and messaging apps

**Given** the event is on sale
**When** I view the ticket tiers
**Then** I see tier name, price (formatted PHP), availability, and a "Buy Tickets" or "Register" button
**And** sold-out tiers show "Sold Out" with the button disabled

**Given** I navigate to a non-existent event
**When** the page loads
**Then** a 404 not-found page is displayed

## Epic 6: Venue Management

Venue managers can create and edit venue profiles with photos and amenities, manage availability calendars, and view events hosted at their venue. Organizers can discover and browse venue profiles when planning events.

### Story 6.1: Venue Profile Creation & Editing

As a **venue manager**,
I want to create and edit my venue profile with photos, amenities, and details,
So that event organizers can discover and choose my venue.

**Acceptance Criteria:**

**Given** I am authenticated with `venue_manager` active role
**When** I navigate to `/venues`
**Then** I see my venue list (or empty state if no venues created)

**Given** I click "Create Venue"
**When** I fill in venue details: name, location, capacity, description, amenities (checkboxes: PA system, projector, green room, bar, parking, etc.)
**Then** the form validates with Zod
**And** the `venues` table record is created with `id`, `manager_id`, `name`, `location`, `capacity`, `description`, `amenities` (JSON array), `photos` (JSON array of URLs), `created_at`, `updated_at` (FR36)

**Given** I want to add venue photos
**When** I upload images
**Then** photos are uploaded to Vercel Blob and CDN URLs stored in the venue record
**And** I can upload up to 8 photos
**And** file validation applies (JPEG, PNG, WebP, max 5MB) (NFR16)

**Given** I want to edit an existing venue
**When** I navigate to `/venues/[venueId]/edit`
**Then** I can update all venue fields and photos
**And** changes are saved with a success toast

### Story 6.2: Venue Availability Calendar

As a **venue manager**,
I want to manage my venue's availability calendar,
So that organizers know which dates are open for booking.

**Acceptance Criteria:**

**Given** I am editing my venue profile
**When** I navigate to the availability section
**Then** I see a calendar view showing date availability (FR37)

**Given** I click a date on the calendar
**When** I set the status
**Then** I can mark dates as: Available, Tentatively Held, or Booked
**And** the `venue_availability` table stores `id`, `venue_id`, `date`, `status`, `notes`

**Given** an organizer views my venue profile
**When** they check availability
**Then** they see which dates are available, tentative, or booked
**And** booked dates show the event name (if public)

### Story 6.3: Venue Dashboard & Discovery

As a **venue manager**,
I want to see events hosted at my venue, and as an organizer, I want to browse available venues,
So that venue managers track usage and organizers find the right space.

**Acceptance Criteria:**

**Given** I am a venue manager
**When** I navigate to my venue dashboard
**Then** I see a list of events that selected my venue, with event name, date, expected attendance, and organizer contact (FR38)

**Given** I am a creator creating an event
**When** I reach the venue selection step
**Then** I can browse available venue profiles with photos, capacity, amenities, and availability (FR39)
**And** I can search/filter venues by capacity and location

**Given** I select a venue for my event
**When** the event is saved
**Then** the event's `venue_id` is set
**And** the event appears on the venue manager's dashboard

**Given** a visitor navigates to `/venues/[venueId]`
**When** the page loads
**Then** the public venue profile is displayed with photos, amenities, capacity, and upcoming events at that venue

## Epic 7: Platform Administration

Admins can view platform health dashboards, manage users (view, disable, assign roles), moderate content (review, flag, unpublish events), and review financial summaries. All admin actions are audit-logged.

### Story 7.1: Admin Dashboard & Platform Overview

As an **admin**,
I want to view a platform overview dashboard with key metrics,
So that I can monitor platform health and growth.

**Acceptance Criteria:**

**Given** I am authenticated with `admin` active role
**When** I navigate to `/admin`
**Then** I see MetricCard components displaying: total registered users, total events created (by status), total tickets sold, total revenue (GMV), and active creators count (FR40)

**Given** the dashboard is loaded
**When** metrics are displayed
**Then** revenue is formatted in PHP using `formatCurrency`
**And** counts are current (queried from database)
**And** the page loads within 3 seconds

### Story 7.2: User Management

As an **admin**,
I want to view, search, and manage user accounts,
So that I can handle user issues and enforce platform policies.

**Acceptance Criteria:**

**Given** I am on the admin users page (`/admin/users`)
**When** the page loads
**Then** I see a paginated table of all users with: name, email, roles, active role, registration date, status (active/disabled) (FR6)

**Given** I search for a user
**When** I enter a name or email in the search field
**Then** the user list filters to matching results

**Given** I want to disable a user account
**When** I click "Disable" on a user row and confirm
**Then** the user's account is disabled (they cannot sign in)
**And** an audit log entry is created with timestamp, admin actor, and action (NFR15)
**And** a success toast confirms the action

**Given** I want to assign or modify user roles
**When** I click "Manage Roles" on a user
**Then** I can add or remove roles from their `roles` array (FR43)
**And** an audit log entry is created

### Story 7.3: Content Moderation

As an **admin**,
I want to review reported events and take moderation actions,
So that I can maintain platform quality and trust.

**Acceptance Criteria:**

**Given** I am on the admin moderation page (`/admin/moderation`)
**When** the page loads
**Then** I see a list of events flagged for review or all events sortable by creation date (FR42)

**Given** I review a flagged event
**When** I click "View Details"
**Then** I see the full event details, creator info, and any reports

**Given** I decide to unpublish an event
**When** I click "Unpublish" and provide a reason
**Then** the event status changes to `Draft` (FR17)
**And** the creator receives a notification with the reason
**And** an audit log entry is created with action, reason, timestamp, and admin actor (NFR15)

**Given** I determine an event is legitimate
**When** I click "Approve"
**Then** the flag is cleared and the event remains published
**And** an audit log entry is created

### Story 7.4: Financial Summary & Reporting

As an **admin**,
I want to view financial summaries including GMV, platform fees, and infrastructure costs,
So that I can track platform financial health.

**Acceptance Criteria:**

**Given** I am on the admin dashboard
**When** I navigate to the financial section
**Then** I see: total GMV (gross merchandise value), platform fees collected, estimated infrastructure costs, and net platform revenue (FR41)

**Given** financial data is displayed
**When** I view the summary
**Then** all amounts are formatted in PHP using `formatCurrency`
**And** I can filter by date range (this month, last month, all time)
**And** per-event revenue breakdown is available

**Given** I want to track specific metrics
**When** I view the financial dashboard
**Then** I see month-over-month trends for GMV and ticket volume

---

## Phase 2 — Enhanced Platform

### Epic 8: Notifications & Social Follows

Users can follow artists and venues to receive notifications about new events. The platform delivers in-app notifications for event updates, cancellations, and new events from followed entities.
**FRs covered:** Phase 2 — Social follows, push notifications, followed entity updates

### Story 8.1: Follow System

As an **attendee**,
I want to follow artists and venues,
So that I stay updated on their new events.

**Acceptance Criteria:**

**Given** I am viewing a creator's public profile or a venue's public page
**When** I click "Follow"
**Then** the entity is added to my following list, the button changes to "Following", and a success toast confirms

**Given** I am following an entity
**When** I click "Following" (unfollow)
**Then** the entity is removed from my following list and the button reverts to "Follow"

**Given** I am on my dashboard
**When** I navigate to a "Following" section
**Then** I see a list of all artists and venues I follow, with links to their profiles

**Given** the `follows` table stores: `followerId` (user), `entityType` ("creator" | "venue"), `entityId` (user or venue ID), `createdAt`
**When** any mutation runs
**Then** auth is required, duplicate follows are prevented, and the follower count is derivable from the table

### Story 8.2: Notification Infrastructure

As a **user**,
I want to receive in-app notifications,
So that I know about important updates without checking manually.

**Acceptance Criteria:**

**Given** the `notifications` table stores: `userId`, `type` (string), `title`, `message`, `entityType`, `entityId`, `read` (boolean), `createdAt`
**When** a notification is created
**Then** it appears in the user's notification list in real-time (Convex reactive query)

**Given** I am on any dashboard page
**When** I have unread notifications
**Then** a notification bell icon in the header shows an unread count badge

**Given** I click the notification bell
**When** the notification panel opens
**Then** I see my recent notifications sorted by date, with unread ones highlighted, and I can mark them as read

**Given** I click a notification
**When** it has an associated entity (event, creator, venue)
**Then** I am navigated to the relevant page and the notification is marked as read

### Story 8.3: Event Notification Triggers

As an **attendee following an artist or venue**,
I want to be notified when they create or update events,
So that I never miss an opportunity.

**Acceptance Criteria:**

**Given** I follow a creator
**When** that creator publishes a new event
**Then** I receive a notification: "New event from [Creator Name]: [Event Title]"

**Given** I hold a ticket for an event
**When** the event is cancelled
**Then** I receive a notification: "[Event Title] has been cancelled" with the cancellation reason

**Given** I hold a ticket for an event
**When** the event details change (date, time, venue)
**Then** I receive a notification: "[Event Title] has been updated — check the new details"

**Given** notifications are triggered by mutations
**When** a creator publishes an event
**Then** the system queries all followers of that creator and batch-inserts notifications (Convex mutation, not email — email is separate)

### Epic 9: Automated Refund Handling

When events are cancelled, ticket holders automatically receive refunds via Stripe. Refund status is tracked and attendees are notified by email.
**FRs covered:** Phase 2 — Automated refund handling, cancellation workflow

### Story 9.1: Stripe Refund on Event Cancellation

As a **ticket holder**,
I want to automatically receive a refund when an event is cancelled,
So that I don't have to request it manually.

**Acceptance Criteria:**

**Given** a creator cancels a published event with ticket sales
**When** the `cancelEvent` mutation completes
**Then** the system retrieves all tickets for the event, groups them by `stripeSessionId`, and initiates a Stripe refund for each unique session

**Given** a Stripe refund is initiated
**When** the refund API call succeeds
**Then** the ticket record is updated with `refundStatus: "refunded"` and `refundedAt: Date.now()`

**Given** a Stripe refund fails (e.g., charge already refunded)
**When** the error is caught
**Then** the ticket is marked `refundStatus: "failed"`, the error is logged, and processing continues for remaining tickets (no halt on single failure)

**Given** a free event is cancelled (tickets with price = 0)
**When** the cancellation processes refunds
**Then** free tickets are skipped (no Stripe refund needed) and marked `refundStatus: "not_applicable"`

### Story 9.2: Refund Notification & Status Tracking

As a **ticket holder**,
I want to know the status of my refund,
So that I can confirm my money is being returned.

**Acceptance Criteria:**

**Given** a refund is successfully processed
**When** the Stripe refund completes
**Then** the ticket holder receives an email via Resend: "Your refund for [Event Title] has been processed. Amount: [₱X.XX]"

**Given** I am on my tickets page
**When** I view a ticket for a cancelled event
**Then** I see the refund status: "Refunded", "Processing", "Failed", or "N/A" (free event)

**Given** an admin views the event in the moderation panel
**When** the event is cancelled
**Then** they see a refund summary: total tickets, refunded count, failed count, total refund amount

### Epic 10: Event Cloning & Templates

Creators can duplicate existing events to quickly set up recurring or similar events, saving setup time.
**FRs covered:** Phase 2 — Event cloning/templates, organizer productivity

### Story 10.1: Clone Event

As a **creator**,
I want to clone an existing event,
So that I can quickly create similar events without re-entering all details.

**Acceptance Criteria:**

**Given** I am on my events dashboard viewing an existing event
**When** I click "Clone Event"
**Then** a new event is created in `draft` status with the same: title (appended " (Copy)"), description, eventType, time, venueName, venueId — but with a blank date and reset sales data

**Given** a cloned event is created
**When** the clone mutation completes
**Then** all ticket tiers from the original event are duplicated with the same name, price, quantity, description, and sortOrder — but with `soldCount: 0`

**Given** I am editing the cloned event
**When** I set the date and publish
**Then** it behaves as a fully independent event with no link to the original

**Given** I clone a cancelled event
**When** the clone is created
**Then** the clone status is `draft` regardless of the original's status

### Epic 11: Verified Reviews & Ratings

Attendees who attended events (verified by ticket scan) can leave ratings and reviews. Reviews are displayed on event detail pages and aggregated on creator profiles.
**FRs covered:** Phase 2 — Verified attendance reviews, post-event ratings

### Story 11.1: Post-Event Review Submission

As an **attendee who attended an event**,
I want to leave a rating and review,
So that I can share my experience with others.

**Acceptance Criteria:**

**Given** I have a ticket that was scanned (verified attendance) for a past event
**When** I navigate to the event detail page or my tickets page
**Then** I see a "Leave a Review" button

**Given** I click "Leave a Review"
**When** a review dialog opens
**Then** I can select a rating (1-5 stars), write optional review text (max 500 chars), and submit

**Given** I submit a review
**When** the `submitReview` mutation runs
**Then** it verifies I have a scanned ticket for this event, stores: `eventId`, `reviewerId` (userId), `rating` (1-5), `text`, `isVerified: true`, `createdAt`. Duplicate reviews from the same user for the same event are rejected.

**Given** I did NOT attend the event (no scanned ticket)
**When** I try to leave a review
**Then** the mutation throws "Only verified attendees can leave reviews"

### Story 11.2: Review Display & Creator Ratings

As a **user browsing events**,
I want to see ratings and reviews,
So that I can make informed decisions about attending.

**Acceptance Criteria:**

**Given** I am on an event detail page for a past event
**When** the page loads
**Then** I see the average rating (stars), review count, and a list of reviews (reviewer name, rating, text, date) — sorted by most recent

**Given** I am on a creator's public profile
**When** the page loads
**Then** I see their aggregate rating (average across all their events) and total review count

**Given** reviews are displayed publicly
**When** the query returns reviews
**Then** only `reviewerName`, `rating`, `text`, `createdAt`, and `isVerified` badge are shown — no internal IDs or email leaked

### Epic 12: Staff Scanner Access

Creators can delegate scanner access to staff members for their events, enabling multi-gate entry management without sharing creator credentials.
**FRs covered:** Phase 2 — Staff role-limited scanner access, per-event delegation

### Story 12.1: Staff Role & Event Assignment

As a **creator**,
I want to assign staff members to scan tickets at my events,
So that I can delegate entry management without sharing my account.

**Acceptance Criteria:**

**Given** I am on my event management page
**When** I click "Manage Staff"
**Then** I see a dialog to add staff by email address, with a list of currently assigned staff

**Given** I add a staff member by email
**When** the mutation runs
**Then** it looks up the user by email, adds `"staff"` to their roles array if not already present, and creates a `staffAssignment` record linking the user to my event. If no user exists with that email, it shows an error.

**Given** I remove a staff member from my event
**When** the mutation runs
**Then** the `staffAssignment` record is deleted. The `staff` role is removed from the user only if they have no other active assignments.

### Story 12.2: Staff Scanner Page

As a **staff member assigned to an event**,
I want to scan tickets at my assigned event,
So that I can manage entry at my gate.

**Acceptance Criteria:**

**Given** I have the `staff` active role
**When** I navigate to my dashboard
**Then** I see a list of events I'm assigned to scan, with event title, date, and a "Scan" button

**Given** I click "Scan" on an assigned event
**When** the scanner page loads
**Then** it works identically to the creator scanner page but is scoped to only that event — I cannot access other events or event management features

**Given** I try to access an event I'm not assigned to
**When** the authorization check runs
**Then** I receive "You are not assigned to scan this event"

**Given** I scan a valid ticket
**When** the scan succeeds
**Then** the same scan validation, QR verification, and real-time entry tracking logic applies as the creator scanner (reuse existing scan infrastructure)

---

## Phase 3 — Growth & Monetization

### Epic 13: Promo Codes & Discounts

Creators can create promotional codes that give buyers discounted ticket pricing, driving sales and enabling marketing campaigns like early bird pricing, influencer partnerships, and group promotions.
**FRs covered:** Phase 3 — Promotional pricing, discount management, checkout integration

### Story 13.1: Promo Code Creation & Management

As a **creator**,
I want to create promo codes for my events,
So that I can offer discounts to drive ticket sales.

**Acceptance Criteria:**

**Given** I am on my event management page for a draft or published event
**When** I click "Manage Promo Codes"
**Then** I see a dialog to create promo codes with: code string (unique per event, alphanumeric, 4-20 chars), discount type (percentage or fixed amount in centavos), discount value, max uses (optional, 0 = unlimited), expiration date (optional), and a list of existing codes with usage stats

**Given** I create a promo code
**When** the `createPromoCode` mutation runs
**Then** it validates: code uniqueness within the event, discount value > 0, percentage ≤ 100, expiration date in future if set. Stores: `eventId`, `code` (uppercase), `discountType` ("percentage" | "fixed"), `discountValue`, `maxUses`, `usedCount: 0`, `expiresAt`, `isActive: true`, `createdAt`

**Given** I want to deactivate a promo code
**When** I toggle the code off
**Then** `isActive` is set to false and the code can no longer be applied at checkout

### Story 13.2: Promo Code Application at Checkout

As an **attendee**,
I want to apply a promo code when purchasing tickets,
So that I can receive a discount.

**Acceptance Criteria:**

**Given** I am on the ticket purchase page
**When** I enter a promo code and click "Apply"
**Then** the system validates: code exists for this event, `isActive` is true, `usedCount < maxUses` (if maxUses > 0), not expired. If valid, the discounted prices are shown with strikethrough on original prices and the discount amount displayed

**Given** I complete checkout with a valid promo code
**When** the Stripe Checkout Session is created
**Then** the `unit_amount` on line items reflects the discounted price (percentage: `Math.round(price * (1 - discountValue/100))`, fixed: `Math.max(0, price - discountValue)`). The platform fee (5%) is calculated on the discounted total. The promo code is stored in session metadata.

**Given** the Stripe webhook processes a successful payment with a promo code
**When** tickets are created
**Then** each ticket record includes `promoCode` field. The promo code's `usedCount` is incremented by the total ticket quantity purchased.

**Given** I enter an invalid or expired promo code
**When** validation runs
**Then** I see a clear error message: "Invalid code", "Code expired", or "Code usage limit reached"

### Epic 14: Waitlist System

When events sell out, interested attendees can join a waitlist and automatically receive tickets if capacity increases or cancellations occur.
**FRs covered:** Phase 3 — Sold-out recovery, waitlist management, automated fulfillment

### Story 14.1: Waitlist Registration & Management

As an **attendee**,
I want to join a waitlist for a sold-out event,
So that I can get tickets if they become available.

**Acceptance Criteria:**

**Given** I am on an event detail page where all tiers are sold out
**When** the page loads
**Then** I see a "Join Waitlist" button instead of ticket purchase options, with the current waitlist position count

**Given** I click "Join Waitlist" and enter my email
**When** the `joinWaitlist` mutation runs
**Then** it validates: event exists, is sold out, user is not already on the waitlist. Creates a `waitlistEntries` record with: `eventId`, `email`, `userId` (if authenticated), `position` (auto-incremented), `status: "waiting"`, `createdAt`. Duplicate email for same event is rejected.

**Given** I am a creator and capacity increases (e.g., tier quantity updated)
**When** new spots become available
**Then** the system does NOT auto-fulfill — the creator sees a "Notify Waitlist" button showing N people waiting. Clicking it sends a notification email to the next N people on the waitlist (FIFO order), marking their status as `"notified"`. Notified users have 48 hours to purchase before their spot expires.

**Given** I am on the waitlist
**When** I want to leave the waitlist
**Then** I can click "Leave Waitlist" and my entry is deleted

### Epic 15: Creator Analytics Dashboard

Creators get insights into their event performance with analytics showing views, conversion rates, revenue trends, and attendee demographics.
**FRs covered:** Phase 3 — Creator analytics, performance insights, data-driven event management

### Story 15.1: Event Analytics Page

As a **creator**,
I want to see detailed analytics for my events,
So that I can understand performance and make data-driven decisions.

**Acceptance Criteria:**

**Given** I navigate to `/dashboard/events/{eventId}/analytics`
**When** the page loads
**Then** I see MetricCards showing: total revenue (formatted ₱), tickets sold vs capacity (with percentage), average ticket price, and total unique buyers

**Given** I am viewing analytics
**When** I scroll to the "Sales by Tier" section
**Then** I see a breakdown table showing each tier's: name, price, sold count, remaining, revenue, and percentage of total sales

**Given** I am viewing analytics
**When** I scroll to the "Sales Timeline" section
**Then** I see tickets sold over time grouped by day (using ticket `createdAt`), displayed as a simple list/table (no charting library needed — keep it lightweight)

**Given** I am viewing analytics for a past event with scanned tickets
**When** I scroll to the "Attendance" section
**Then** I see: scan rate (scanned/total as percentage), and a scan timeline showing when attendees checked in

### Story 15.2: Creator Overview Analytics

As a **creator**,
I want to see aggregate analytics across all my events,
So that I can track my overall performance.

**Acceptance Criteria:**

**Given** I navigate to `/dashboard/analytics`
**When** the page loads
**Then** I see aggregate MetricCards: total lifetime revenue, total tickets sold, total events created, average rating (from reviews). Below, a table of all events sorted by revenue descending showing: title, date, tickets sold, revenue, rating

**Given** I am a new creator with no events
**When** the page loads
**Then** I see an empty state with a message and link to create an event

### Epic 16: Partial Refunds

Creators and admins can issue partial refunds for individual tickets within a multi-ticket purchase, or refund a custom amount.
**FRs covered:** Phase 3 — Flexible refund management, per-ticket refunds

### Story 16.1: Partial Refund Processing

As a **creator**,
I want to issue partial refunds for specific tickets,
So that I can handle refund requests flexibly without cancelling the entire event.

**Acceptance Criteria:**

**Given** I am on the sales page for a published event
**When** I click on a ticket row and select "Refund This Ticket"
**Then** a confirmation dialog shows the ticket details (buyer email, tier name, price) and a "Refund" button

**Given** I confirm the refund
**When** the `refundTicket` server action runs
**Then** it retrieves the ticket's Stripe session → payment intent, creates a partial refund via `stripe.refunds.create({ payment_intent, amount: tierPriceInCentavos })`, updates the ticket's `refundStatus` to "refunded", `refundedAt` to now, sends a refund confirmation email to the buyer, and decrements the tier's `soldCount` by 1

**Given** the ticket is for a free event
**When** I try to refund it
**Then** the system shows "No refund needed — this was a free ticket" and offers to void the ticket instead (mark as `refundStatus: "voided"`)

**Given** a ticket has already been refunded
**When** I try to refund it again
**Then** the system shows "This ticket has already been refunded"

### Epic 17: Recurring Events

Creators can set up recurring events (weekly, monthly) that automatically generate future event instances, reducing setup time for regular classes, meetups, and series.
**FRs covered:** Phase 3 — Recurring event templates, automated instance generation

### Story 17.1: Recurring Event Setup

As a **creator**,
I want to create a recurring event,
So that I don't have to manually clone events each week.

**Acceptance Criteria:**

**Given** I am creating a new event in the wizard
**When** I reach the details step
**Then** I see a "Recurring" toggle. When enabled, I can select: frequency (weekly, biweekly, monthly), end condition (after N occurrences or until a specific date), and which day(s) of the week

**Given** I submit a recurring event
**When** the `createRecurringEvent` mutation runs
**Then** it creates a `recurringEventTemplate` record with the recurrence rule and creates the first N event instances (up to 4 weeks ahead) as regular `events` with `recurringTemplateId` linking back. Each instance has its own date calculated from the rule, status "draft", and duplicated ticket tiers.

**Given** I have a recurring event template
**When** I visit the recurring event management page
**Then** I see the template details, all generated instances (with their statuses), and a "Generate More" button to create additional future instances

**Given** a recurring event instance is 7 days away and still in draft
**When** the system checks (manual trigger by creator, not automated cron)
**Then** the creator sees a reminder on their dashboard: "You have unpublished upcoming events"
