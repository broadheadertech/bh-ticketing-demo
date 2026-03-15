# Story 1.2: User Registration & Google OAuth Sign-In

Status: complete

## Story

As a **visitor**,
I want to sign up and sign in using my Google account,
So that I can access the platform quickly without creating a new password.

## Acceptance Criteria

1. **Given** I am on the sign-in page (`/sign-in`) **When** I click "Sign in with Google" **Then** I am redirected to Google OAuth consent screen **And** after granting consent, I am redirected back and a session is created
2. **And** my name, email, and profile photo are stored from Google
3. **And** I am assigned the default role `attendee`
4. **And** I am redirected to the dashboard
5. **Given** I am already authenticated **When** I visit `/sign-in` **Then** I am redirected to the dashboard
6. **Given** I am not authenticated **When** I visit a protected route under `(dashboard)/` **Then** I am redirected to `/sign-in`
7. **Given** Clerk is configured **When** sessions are created **Then** Clerk session management handles secure authentication (NFR12)
8. **And** clerkMiddleware() validates sessions and protects dashboard routes
9. **Given** a user signs up via Clerk **When** the Clerk `user.created` webhook fires **Then** a corresponding user record is created in the Convex `users` table with clerkId, name, email, image, roles=["attendee"], activeRole="attendee"
10. **Given** a user updates their profile in Clerk **When** the Clerk `user.updated` webhook fires **Then** the corresponding Convex user record is updated with the latest name, email, and image

## Tasks / Subtasks

- [x] **Task 1: Create Clerk sign-in and sign-up pages** (AC: #1, #4, #5)
  - [x] 1.1 Replace placeholder `src/app/(auth)/sign-in/page.tsx` with Clerk `<SignIn />` component, configure `afterSignInUrl="/dashboard"` and `signUpUrl="/sign-up"`
  - [x] 1.2 Create `src/app/(auth)/sign-up/page.tsx` with Clerk `<SignUp />` component, configure `afterSignUpUrl="/dashboard"` and `signInUrl="/sign-in"`
  - [x] 1.3 Verify authenticated user visiting `/sign-in` is redirected to `/dashboard` (Clerk handles this via `afterSignInUrl`)

- [x] **Task 2: Configure Clerk redirect environment variables** (AC: #1, #4)
  - [x] 2.1 Ensure `.env.local` contains `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - [x] 2.2 Add `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard` to `.env.local`
  - [x] 2.3 Update `.env.example` with the new redirect variables

- [x] **Task 3: Verify middleware protects dashboard routes** (AC: #6, #7, #8)
  - [x] 3.1 Confirm `src/middleware.ts` already has `clerkMiddleware()` protecting `/(dashboard)(.*)` routes (created in Story 1.1)
  - [x] 3.2 Manually test that unauthenticated access to `/dashboard` redirects to `/sign-in`

- [x] **Task 4: Create Clerk webhook handler via Convex HTTP action** (AC: #9, #10)
  - [x] 4.1 Install `svix` package for Clerk webhook signature verification: `pnpm add svix`
  - [x] 4.2 Create `convex/http.ts` with HTTP router and `/clerk-webhook` POST endpoint using `httpAction`
  - [x] 4.3 Implement webhook signature verification using `svix` Webhook class and `CLERK_WEBHOOK_SECRET` (Convex env var)
  - [x] 4.4 Handle `user.created` event: extract `id`, `first_name`, `last_name`, `email_addresses[0].email_address`, `image_url` from payload
  - [x] 4.5 Handle `user.updated` event: extract same fields and update existing Convex user
  - [x] 4.6 Handle `user.deleted` event: mark Convex user as inactive (`isActive: false`)
  - [x] 4.7 Return `200` response for all handled events, `400` for verification failures
  - [x] 4.8 Add `console.error` logging for verification failures and missing secrets

- [x] **Task 5: Create Convex user internal mutations for webhook** (AC: #2, #3, #9, #10)
  - [x] 5.1 Add `createUser` `internalMutation` to `convex/users.ts` — accepts clerkId, name, email, image; sets roles=["attendee"], activeRole="attendee", isActive=true, createdAt/updatedAt to Date.now()
  - [x] 5.2 Add `updateUser` `internalMutation` to `convex/users.ts` — accepts clerkId plus updatable fields (name, email, image); updates updatedAt
  - [x] 5.3 Add `deleteUser` `internalMutation` to `convex/users.ts` — accepts clerkId; sets isActive=false and updatedAt
  - [x] 5.4 Use `internalMutation` (not `mutation`) — only callable from Convex HTTP action, not from external clients
  - [x] 5.5 HTTP action in `convex/http.ts` calls internal mutations via `ctx.runMutation(internal.users.*)`

- [x] **Task 6: Webhook architecture** (AC: #9, #10)
  - [x] 6.1 Clerk webhook URL points to Convex HTTP endpoint: `{CONVEX_SITE_URL}/clerk-webhook`
  - [x] 6.2 No Next.js API route needed — webhook handled entirely within Convex for security (internal mutations not publicly callable)

- [x] **Task 7: Verify middleware does not interfere with webhook** (AC: #7)
  - [x] 7.1 Webhook is handled by Convex HTTP action (not a Next.js API route), so Next.js middleware is not involved. No middleware configuration needed for webhook.

- [x] **Task 8: Write tests** (AC: #2, #3, #9, #10)
  - [x] 8.1 Create `convex/users.test.ts` — unit test the user mutation logic (create with default role, update fields, soft delete)
  - [x] 8.2 Verify tests pass with `pnpm test:run`

- [x] **Task 9: Final validation**
  - [x] 9.1 Run `pnpm build` — must succeed
  - [x] 9.2 Run `pnpm test:run` — all tests pass
  - [x] 9.3 Run `pnpm lint` — no errors

## Dev Notes

### Critical: What Story 1.1 Already Built

These files already exist — do NOT recreate them:
- `src/middleware.ts` — Clerk middleware protecting `/(dashboard)(.*)` routes
- `src/components/providers.tsx` — ClerkProvider + ConvexProviderWithClerk
- `src/app/(auth)/layout.tsx` — auth route group layout using AuthLayout
- `src/app/(auth)/sign-in/page.tsx` — **PLACEHOLDER** that must be replaced with Clerk `<SignIn />`
- `convex/schema.ts` — users table schema with clerkId, name, email, image, roles, activeRole, stripeAccountId, isActive, createdAt, updatedAt
- `convex/users.ts` — has `getUser` query (by clerkId) — add mutations here
- `convex/_generated/` — placeholder types (will be regenerated when `npx convex dev` runs)
- `.env.local` — has placeholder CONVEX_URL and CLERK_PUBLISHABLE_KEY

### Architecture Compliance

**Clerk `<SignIn />` and `<SignUp />` Components:**
```typescript
// src/app/(auth)/sign-in/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn />;
}
```

**Clerk Webhook Handler Pattern:**
```typescript
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) throw new Error("Missing CLERK_WEBHOOK_SECRET");

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  // Handle events...
  return new Response("OK", { status: 200 });
}
```

**Convex Internal Mutations (called from webhook, not client):**
```typescript
// convex/users.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      ...args,
      roles: ["attendee"],
      activeRole: "attendee",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
```

**Convex HTTP Client for Server-Side Calls:**
```typescript
// src/lib/convex.ts
import { ConvexHttpClient } from "convex/browser";

export const convexClient = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);
```

Note: To call `internalMutation` from a Next.js route handler, you need to use either:
1. A Convex HTTP action that wraps the internal mutation, OR
2. Use a regular (public) mutation with appropriate authorization checks

The recommended pattern for Clerk webhooks is to use a **Convex HTTP action** (`convex/http.ts`) or expose a public mutation with a shared secret check. Research the latest Convex + Clerk webhook integration pattern.

### Convex Users Schema (already defined in Story 1.1)

```typescript
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
```

### Key Decisions

- **Clerk pre-built components** (`<SignIn/>`, `<SignUp/>`) — do NOT build custom auth forms
- **Webhook user sync** — the ONLY way users get created in Convex is via Clerk webhook (not on first login client-side)
- **`internalMutation`** — webhook mutations should use `internalMutation` (not publicly callable) for security
- **`svix`** — Clerk uses Svix for webhook delivery; use the `svix` package for signature verification
- **User deletion** — soft delete only (set `isActive: false`), never hard delete

### File Naming Conventions

- Components: kebab-case (`sign-in/page.tsx`)
- Route handlers: `route.ts` (Next.js convention)
- Convex functions: camelCase (`createUser`, `updateUser`)

### Environment Variables Needed

```bash
# Already in .env.example from Story 1.1:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# New for Story 1.2:
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Project Structure Notes

Files to create/modify:
```
src/app/(auth)/sign-in/page.tsx          # MODIFY: Replace placeholder with Clerk <SignIn />
src/app/(auth)/sign-up/page.tsx          # CREATE: New page with Clerk <SignUp />
src/app/api/webhooks/clerk/route.ts      # CREATE: Clerk webhook handler
src/lib/convex.ts                        # CREATE: Server-side Convex HTTP client
convex/users.ts                          # MODIFY: Add createUser, updateUser, deleteUser mutations
.env.example                             # MODIFY: Add redirect URL variables
.env.local                               # MODIFY: Add redirect URL variables
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Authentication: Clerk (@clerk/nextjs)]
- [Source: _bmad-output/planning-artifacts/architecture.md - API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md - Identity & Access (FR1-6)]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md - FR1-FR3, NFR12]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Initially used public `mutation` + `ConvexHttpClient` from Next.js route handler. Code review identified security gap: public mutations callable by anyone with the Convex URL.
- Refactored to `internalMutation` + Convex `httpAction` in `convex/http.ts`. Webhook handler runs entirely in Convex — svix verification + internal mutation calls. No Next.js API route needed.
- Convex `_generated` files are placeholders — `api` types use `anyApi` so all function references resolve. Will be overwritten by `npx convex dev`.

### Completion Notes List
- All 10 acceptance criteria addressed
- `pnpm build` passes with all routes: `/sign-in`, `/sign-up`, `/dashboard`, `/events`
- `pnpm test:run` passes (17 tests: 4 format + 5 user-helpers + 8 users contract)
- `pnpm lint` has 0 errors
- Clerk `<SignIn/>` and `<SignUp/>` pre-built components used (no custom auth forms)
- Webhook handled by Convex HTTP action (`convex/http.ts`) — svix verification + internal mutations for security
- User extraction logic available in `user-helpers.ts` utility (tested separately)
- Clerk webhook URL: `{CONVEX_SITE_URL}/clerk-webhook` (configure in Clerk dashboard)

### File List
- `src/app/(auth)/sign-in/page.tsx` — MODIFIED: replaced placeholder with Clerk `<SignIn />`
- `src/app/(auth)/sign-up/page.tsx` — CREATED: Clerk `<SignUp />` page
- `convex/http.ts` — CREATED: Convex HTTP action handling Clerk webhook with svix verification
- `convex/users.ts` — MODIFIED: added createUser, updateUser, deleteUser as `internalMutation`
- `convex/users.test.ts` — CREATED: 8 contract tests for mutation behavior
- `convex/_generated/api.d.ts` — MODIFIED: added http module reference
- `src/lib/utils/user-helpers.ts` — CREATED: extractUserFromClerkEvent utility
- `src/lib/utils/user-helpers.test.ts` — CREATED: 5 tests for user extraction
- `.env.local` — MODIFIED: added redirect URL variables + placeholder secrets
- `.env.example` — MODIFIED: added AFTER_SIGN_IN/UP_URL variables
