# Sprint Change Proposal: Auth.js + Drizzle/Neon -> Clerk + Convex

**Date:** 2026-03-06
**Triggered by:** User decision to switch authentication and database technologies
**Scope Classification:** Major
**Story in progress:** 1-1-project-setup-core-infrastructure (in-progress, no code written yet)

## Section 1: Issue Summary

The user has decided to replace two foundational technology choices before any implementation code has been written:

1. **Auth.js v5 + Drizzle Adapter** -> **Clerk** (managed authentication)
2. **Drizzle ORM + Neon PostgreSQL** -> **Convex** (reactive backend platform)

All other technology choices remain unchanged: Next.js 16.1.6, React 19.2.3, Tailwind CSS 4, shadcn/ui, Stripe Connect, Zod, Vitest, Vercel deployment.

**Timing:** Optimal - Story 1.1 is in-progress but `node_modules` was just deleted and no implementation code exists. This is the lowest-cost moment to make this change.

## Section 2: Impact Analysis

### Epic Impact

**All 7 epics affected** - every epic touches database or authentication in some way.

| Epic | Impact Level | Details |
|------|-------------|---------|
| Epic 1: Foundation & Auth | CRITICAL | Auth.js -> Clerk, Drizzle schema -> Convex schema, all ACs rewritten |
| Epic 2: Event Management | HIGH | All DB queries/mutations change from Drizzle to Convex functions |
| Epic 3: Payments | HIGH | Stripe webhook handling changes (Convex HTTP actions vs Server Actions) |
| Epic 4: QR Ticketing | MEDIUM | QR signing stays, but ticket lookup changes to Convex queries |
| Epic 5: Discovery | MEDIUM | Search changes from PostgreSQL FTS to Convex search indexes |
| Epic 6: Venue Management | MEDIUM | CRUD operations change to Convex mutations |
| Epic 7: Admin | MEDIUM | Admin queries change to Convex queries with role checks |

### Artifact Impact

| Artifact | Sections Affected | Changes Needed |
|----------|------------------|----------------|
| **architecture.md** | ~50 core references across decisions, patterns, structure | Rewrite auth, database, API pattern, directory structure, env vars sections |
| **epics.md** | ~14 story acceptance criteria reference Auth.js/Drizzle | Update all ACs mentioning Drizzle, Auth.js, Server Actions for DB |
| **prd.md** | ~9 references to Neon, Auth.js, PostgreSQL | Update tech stack references (minimal - PRD is requirements, not implementation) |
| **ux-design-specification.md** | 0 references | No changes needed |
| **Story 1.1** | Complete rewrite of tasks, dev notes | Rewrite for Clerk + Convex setup |

### Key Technical Differences

#### Clerk vs Auth.js v5

| Aspect | Auth.js v5 (OLD) | Clerk (NEW) |
|--------|-----------------|-------------|
| Setup | Self-configured, Drizzle adapter | Managed service, `@clerk/nextjs` |
| UI | Custom sign-in/sign-up pages | Pre-built `<SignIn/>`, `<SignUp/>` components (customizable) |
| Session | JWT in cookie, custom callbacks | Clerk session, `auth()` helper |
| Middleware | Custom middleware.ts with JWT check | `clerkMiddleware()` with `protectRoute()` |
| User storage | users/accounts/sessions tables in DB | Managed by Clerk, sync to Convex via webhook |
| Role management | Custom roles[] field in users table | Clerk `publicMetadata` or Convex users table |
| Google OAuth | Manual provider config | Dashboard toggle |
| Env vars | NEXTAUTH_SECRET, GOOGLE_ID, GOOGLE_SECRET | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY |

#### Convex vs Drizzle + Neon PostgreSQL

| Aspect | Drizzle + Neon (OLD) | Convex (NEW) |
|--------|---------------------|-------------|
| Schema | `pgTable()` in TypeScript, SQL migrations | `defineSchema()` + `defineTable()` with `v` validators |
| Queries | `db.select().from(table).where()` | `ctx.db.query("table").filter()` in query functions |
| Mutations | Server Actions with `db.insert()` | Convex `mutation()` functions |
| Real-time | Polling (MVP) -> SSE (future) | Built-in reactive subscriptions via `useQuery()` |
| File storage | Vercel Blob | Convex file storage (built-in) |
| Search | PostgreSQL FTS | Convex search indexes |
| RLS | Database-level RLS policies | Application-level auth checks in Convex functions |
| Migrations | `drizzle-kit generate/push` | Automatic schema push (`npx convex dev`) |
| Hosting | Neon serverless PostgreSQL | Convex cloud (backend functions + DB) |
| Directory | `src/lib/db/schema.ts` | `convex/schema.ts`, `convex/*.ts` |
| Types | Drizzle inferred types | Convex `Doc<"table">`, `Id<"table">` |
| Server Actions | ALL mutations via Server Actions | Server Actions only for external APIs (Stripe, email); DB ops via Convex |

### Pattern Changes

#### ActionResult<T> Pattern

**Keeps but scope narrows.** Server Actions are still used for:
- Stripe operations (checkout, webhook processing)
- Email sending (Resend)
- File uploads to Convex storage
- Any non-Convex external API call

Convex mutations handle their own error pattern (throw on error, caught by client).

**New pattern for Convex operations:**
```typescript
// Convex mutation (convex/events.ts)
export const createEvent = mutation({
  args: { title: v.string(), ... },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    return await ctx.db.insert("events", { ...args, creatorId: identity.subject });
  },
});

// Client usage - Convex handles errors via useQuery/useMutation hooks
const createEvent = useMutation(api.events.createEvent);
```

#### Directory Structure Changes

```
OLD:                              NEW:
src/lib/db/schema.ts        ->   convex/schema.ts
src/lib/db/index.ts          ->   (removed - Convex client auto-configured)
src/lib/db/migrations/       ->   (removed - Convex auto-migrates)
src/lib/auth/config.ts       ->   (removed - Clerk managed)
src/lib/auth/middleware.ts   ->   (removed - Clerk middleware)
src/lib/actions/events.ts    ->   convex/events.ts (Convex mutations/queries)
src/lib/actions/tickets.ts   ->   convex/tickets.ts
src/lib/actions/venues.ts    ->   convex/venues.ts
src/lib/actions/users.ts     ->   convex/users.ts
src/lib/actions/admin.ts     ->   convex/admin.ts
src/app/api/auth/[...nextauth]/ -> (removed - Clerk handles)
drizzle.config.ts            ->   (removed)

NEW directories:
convex/                      ->   Convex functions, schema, auth config
convex/_generated/           ->   Auto-generated types and API
```

#### Environment Variables

```
REMOVED:
- DATABASE_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- GOOGLE_ID
- GOOGLE_SECRET

ADDED:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- CLERK_WEBHOOK_SECRET (for user sync)
- CONVEX_DEPLOYMENT
- NEXT_PUBLIC_CONVEX_URL

UNCHANGED:
- STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- QR_SIGNING_SECRET
- RESEND_API_KEY
- NEXT_PUBLIC_APP_URL
```

## Section 3: Recommended Approach

**Selected: Direct Adjustment** - Modify existing documents and Story 1.1 in place.

**Rationale:**
- No code has been written yet - zero rollback cost
- Epic structure and story count remain the same (7 epics, 31 stories)
- User value propositions don't change - only implementation details
- The change simplifies several areas (Clerk handles auth UI, Convex handles real-time)

**Effort:** Medium - document updates only, no code to rewrite
**Risk:** Low - both Clerk and Convex are well-documented, production-ready services with excellent Next.js integration
**Timeline impact:** None - we're at the start of implementation

## Section 4: Detailed Change Proposals

### 4.1 Architecture Document Changes

The architecture.md needs these sections updated:

**A. Tech Stack Table (line ~152):**
```
OLD:
| Database | drizzle-orm, @neondatabase/serverless | PostgreSQL ORM + Neon serverless driver |
| Auth | next-auth@5 (Auth.js v5) | Authentication with Google OAuth + credentials |

NEW:
| Database | convex | Reactive backend platform with built-in database |
| Auth | @clerk/nextjs | Managed authentication with Google OAuth |
```

**B. Data Architecture section (~line 194-234):** Replace Drizzle ORM decision with Convex decision. Remove RLS section (replaced by Convex function-level auth checks).

**C. Authentication section (~line 239-254):** Replace Auth.js v5 with Clerk. Remove Drizzle adapter, JWT strategy details. Add Clerk middleware, webhook user sync.

**D. API Pattern section (~line 267-281):** Update to reflect Convex queries/mutations for DB ops, Server Actions retained for Stripe/email/external APIs only.

**E. Directory Structure (~line 700-850):** Remove `src/lib/db/`, `src/lib/auth/`, `drizzle.config.ts`. Add `convex/` directory. Update `src/lib/actions/` to only contain Stripe/email actions.

**F. Environment Variables (~line 337):** Update per env var changes listed above.

**G. Implementation Sequence (~line 371):** Update to reflect Convex setup + Clerk config instead of Drizzle + Auth.js.

### 4.2 Epics Document Changes

**Story 1.1 Acceptance Criteria:**
```
OLD:
- When dependencies are installed (Drizzle ORM, Auth.js, Zod, shadcn/ui, Sonner, Vitest)
- And Drizzle connects to Neon PostgreSQL via HTTP driver
- And the users table schema is created with id, name, email, image, roles, active_role...
- And the accounts and sessions tables support Auth.js Drizzle adapter

NEW:
- When dependencies are installed (Convex, @clerk/nextjs, Zod, shadcn/ui, Sonner, Vitest)
- And Convex is initialized with schema defining users, and dev server connects successfully
- And the users table schema includes id, name, email, image, roles, activeRole, stripeAccountId, isActive
- And Clerk is configured with Google OAuth and ClerkProvider wraps the app
- And Clerk middleware protects dashboard routes
```

**Story 1.2 (Auth):** Replace Auth.js config with Clerk `<SignIn/>`, `<SignUp/>` components. Remove JWT/cookie ACs. Add Clerk webhook for user sync to Convex.

**Story 1.3 (Roles):** Replace `roles[] in JWT token` with Clerk publicMetadata or Convex users table approach.

**Stories 2.x-7.x:** Replace "Server Action" DB references with "Convex mutation/query" where applicable. Keep Server Action references for Stripe/email operations.

### 4.3 PRD Changes (Minimal)

Update tech stack line (~line 37):
```
OLD: PostgreSQL (Neon), Auth.js v5
NEW: Convex, Clerk
```

Update infrastructure cost references to reflect Convex + Clerk pricing instead of Neon.

### 4.4 Story 1.1 File (Complete Rewrite)

The current story file must be rewritten to reflect Clerk + Convex setup tasks instead of Auth.js + Drizzle + Neon.

## Section 5: Implementation Handoff

**Scope:** Major - fundamental technology change affecting all planning artifacts.

**Action Plan:**
1. **Architect agent** updates `architecture.md` with Clerk + Convex decisions (run `/bmad:bmm:workflows:create-architecture` in edit mode, or manual edits)
2. **PM agent** updates `epics.md` acceptance criteria for all affected stories
3. **SM agent** rewrites Story 1.1 file for Clerk + Convex
4. **Dev agent** implements updated Story 1.1

**Recommended shortcut (since no code exists):** Apply all document edits directly, then rewrite Story 1.1 and proceed with implementation. Skip re-running full workflows since the changes are targeted substitutions, not redesigns.

## Checklist Status

- [x] 1.1 Trigger identified: User tech stack preference change
- [x] 1.2 Core problem: Technology substitution (Clerk + Convex for Auth.js + Drizzle/Neon)
- [x] 1.3 Evidence: User explicit request, no code written yet
- [x] 2.1-2.5 Epic impact assessed: All 7 epics affected, structure unchanged
- [x] 3.1 PRD conflicts: Minimal - tech stack line updates only
- [x] 3.2 Architecture conflicts: ~50 core references need updating
- [x] 3.3 UI/UX conflicts: None
- [x] 3.4 Other artifacts: Story 1.1 file needs rewrite
- [x] 4.1-4.4 Path forward: Direct Adjustment selected
- [x] 5.1-5.5 Proposal components complete
