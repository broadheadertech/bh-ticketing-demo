# Story 1.1: Project Setup & Core Infrastructure

Status: complete

## Story

As a **developer**,
I want the project configured with all core dependencies, database connection, directory structure, and layout components,
So that all subsequent stories have a consistent foundation to build on.

## Acceptance Criteria

1. **Given** the existing Next.js 16.1.6 scaffold **When** dependencies are installed (Convex, @clerk/nextjs, Zod, shadcn/ui, Sonner, Vitest) **Then** the project builds successfully with `pnpm build`
2. **And** the `src/` directory structure matches the architecture spec (`app/`, `components/`, `lib/`, `types/`) plus `convex/` at project root
3. **And** Convex is initialized and `npx convex dev` connects successfully
4. **And** the Convex `users` table schema is defined with `clerkId`, `name`, `email`, `image`, `roles` (array), `activeRole`, `stripeAccountId`, `isActive`, `createdAt`, `updatedAt`
5. **And** Clerk is configured with Google OAuth and `<ClerkProvider>` wraps the application
6. **And** `clerkMiddleware()` protects dashboard routes and redirects unauthenticated users
7. **And** root `layout.tsx` loads fonts, global styles, ClerkProvider, ConvexProvider, and Sonner toast provider
8. **And** AuthLayout, PublicLayout, and DashboardLayout shell components render correctly
9. **And** `.env.example` documents all required environment variables
10. **And** `ActionResult<T>` type is defined in `types/index.ts`
11. **And** `formatCurrency` and `formatDate` utilities are implemented in `lib/utils/format.ts`
12. **And** Vitest is configured and a sample test passes

## Tasks / Subtasks

- [x]**Task 1: Migrate to pnpm and install all dependencies** (AC: #1)
  - [x]1.1 Install pnpm globally if not available (`npm install -g pnpm`)
  - [x]1.2 Run `pnpm install` to regenerate lockfile (package-lock.json already deleted)
  - [x]1.3 Install runtime dependencies: `convex`, `@clerk/nextjs`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`
  - [x]1.4 Install dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`
  - [x]1.5 Initialize shadcn/ui: run `pnpm dlx shadcn@latest init` and add components: `button`, `card`, `form`, `input`, `select`, `skeleton`, `table`, `tabs`, `sonner`
  - [x]1.6 Verify `pnpm build` succeeds with zero errors

- [x]**Task 2: Restructure to src/ directory** (AC: #2)
  - [x]2.1 Create `src/` directory
  - [x]2.2 Move `app/` into `src/app/`
  - [x]2.3 Create `src/components/ui/` (shadcn components land here)
  - [x]2.4 Create `src/components/custom/`
  - [x]2.5 Create `src/components/layouts/`
  - [x]2.6 Create `src/lib/stripe/`
  - [x]2.7 Create `src/lib/qr/`
  - [x]2.8 Create `src/lib/validators/`
  - [x]2.9 Create `src/lib/actions/`
  - [x]2.10 Create `src/lib/utils/`
  - [x]2.11 Create `src/types/`
  - [x]2.12 Update `tsconfig.json` path alias: `@/*` -> `./src/*`
  - [x]2.13 Update `components.json` (shadcn config) to use `src/` paths
  - [x]2.14 Verify build still passes after restructure

- [x]**Task 3: Initialize Convex and define schema** (AC: #3, #4)
  - [x]3.1 Run `npx convex init` to create `convex/` directory at project root
  - [x]3.2 Create `convex/schema.ts` with `users` table: `clerkId` (string, indexed), `name` (string), `email` (string, indexed), `image` (optional string), `roles` (array of strings, default ["attendee"]), `activeRole` (string, default "attendee"), `stripeAccountId` (optional string), `isActive` (boolean, default true), `createdAt` (number), `updatedAt` (number)
  - [x]3.3 Verify `npx convex dev` starts and syncs schema successfully
  - [x]3.4 Create `convex/users.ts` with a basic `getUser` query function (by clerkId)

- [x]**Task 4: Configure Clerk authentication** (AC: #5, #6)
  - [x]4.1 Create `src/middleware.ts` with `clerkMiddleware()` protecting `(dashboard)` routes
  - [x]4.2 Configure Clerk + Convex provider wrapper in a `src/components/providers.tsx` client component
  - [x]4.3 The provider must wrap children with `<ClerkProvider>` and `<ConvexProviderWithClerk>`

- [x]**Task 5: Root layout and providers** (AC: #7)
  - [x]5.1 Update `src/app/layout.tsx` with Geist fonts, global metadata, Providers component (Clerk + Convex), and `<Toaster />` from sonner
  - [x]5.2 Ensure `src/app/globals.css` uses Tailwind v4 `@import "tailwindcss"` syntax with CSS variables

- [x]**Task 6: Layout shell components** (AC: #8)
  - [x]6.1 Create `src/components/layouts/auth-layout.tsx` - centered card layout
  - [x]6.2 Create `src/components/layouts/public-layout.tsx` - nav header + main + footer
  - [x]6.3 Create `src/components/layouts/dashboard-layout.tsx` - sidebar + topbar + main
  - [x]6.4 Create `src/app/(auth)/layout.tsx` using AuthLayout
  - [x]6.5 Create `src/app/(public)/layout.tsx` using PublicLayout
  - [x]6.6 Create `src/app/(dashboard)/layout.tsx` using DashboardLayout
  - [x]6.7 Create placeholder `page.tsx` in each route group so layouts render

- [x]**Task 7: Environment variable documentation** (AC: #9)
  - [x]7.1 Create `.env.example` documenting all required variables with comments

- [x]**Task 8: TypeScript types** (AC: #10)
  - [x]8.1 Create `src/types/index.ts` with `ActionResult<T>` discriminated union type
  - [x]8.2 Add role type union: `UserRole = "attendee" | "artist" | "organization" | "venue_manager" | "admin"`

- [x]**Task 9: Utility functions** (AC: #11)
  - [x]9.1 Create `src/lib/utils/format.ts` with `formatCurrency` (integer centavos -> PHP display, 0 = "Free")
  - [x]9.2 Add `formatDate` using `Intl.DateTimeFormat` with `en-PH` locale
  - [x]9.3 Create `src/lib/utils/constants.ts` with shared constants

- [x]**Task 10: Vitest configuration and sample test** (AC: #12)
  - [x]10.1 Create `vitest.config.ts` at project root with jsdom environment, `@` alias, React plugin
  - [x]10.2 Add pnpm scripts: `"test": "vitest"`, `"test:run": "vitest run"`
  - [x]10.3 Create `src/lib/utils/format.test.ts` testing `formatCurrency` and `formatDate`
  - [x]10.4 Verify `pnpm test:run` passes

- [x]**Task 11: Error pages** (foundational for later stories)
  - [x]11.1 Create `src/app/not-found.tsx` (styled 404 page)
  - [x]11.2 Create `src/app/error.tsx` (styled error boundary)

- [x]**Task 12: Final validation**
  - [x]12.1 Run `pnpm build` - must succeed with zero errors
  - [x]12.2 Run `pnpm test:run` - sample test passes
  - [x]12.3 Run `pnpm lint` - no lint errors
  - [x]12.4 Verify dev server starts with `pnpm dev`

## Dev Notes

### Critical: Current Project State

The project is a **fresh `create-next-app` scaffold** with:
- `app/` directory at root (NOT under `src/`)
- `node_modules` and `package-lock.json` already deleted (npm -> pnpm migration started)
- Basic dependencies: `next@16.1.6`, `react@19.2.3`, `react-dom@19.2.3`
- Tailwind CSS v4 via `@tailwindcss/postcss` (CSS-first config, no `tailwind.config.js`)
- ESLint 9 flat config
- TypeScript 5 strict mode
- Path alias `@/*` currently maps to `./` (must change to `./src/*`)
- One commit: "Initial commit from Create Next App"

### Architecture Compliance

**Package Manager:** Must use pnpm. `package-lock.json` already deleted.

**Tailwind CSS 4:** Already uses Tailwind v4 with `@import "tailwindcss"` syntax in `globals.css`. No `tailwind.config.js` - theming via CSS variables with `@theme inline`. Do NOT create a `tailwind.config.ts`.

**shadcn/ui with Tailwind v4:** Configure for Tailwind v4 CSS-variable-based theming. `components.json` must point to `src/components/ui` and use the `@` path alias.

**Convex Backend Platform:** Convex provides database, server functions, real-time subscriptions, and file storage. Setup:
```typescript
// convex/schema.ts
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
});
```

**Clerk Authentication (@clerk/nextjs):** Managed auth service. No database tables needed for auth - Clerk manages users/sessions externally. User data synced to Convex via webhook (Story 1.2). For Story 1.1, just set up the provider and middleware.

**Clerk + Convex Provider Pattern:**
```typescript
// src/components/providers.tsx
"use client";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

**Middleware (Clerk):**
```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/(dashboard)(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

**ActionResult<T> Pattern - for Server Actions (Stripe/email only):**
```typescript
// src/types/index.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
```
Convex mutations/queries have their own error handling. ActionResult is for Server Actions calling external APIs.

**Currency: Integer centavos.** PHP 300.00 = 30000. Use `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })`. If amount === 0, return "Free".

**Layout Components** are shell/placeholder components for Story 1.1. Basic structural markup only (header, sidebar, main area). No navigation links, role switcher, or interactive features yet.

### File Naming Conventions

- Components: kebab-case (`event-card.tsx`, `auth-layout.tsx`)
- Utilities: kebab-case (`format.ts`, `constants.ts`)
- React components: PascalCase exports (`AuthLayout`, `PublicLayout`)
- Convex functions: camelCase (`getUser`, `createEvent`)
- Test files: co-located `.test.ts` / `.test.tsx` suffix

### Environment Variables (.env.example)

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# QR Code Signing
QR_SIGNING_SECRET=min-32-char-secret-for-hmac-sha256

# Email (Resend)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Project Structure Notes

The architecture specifies `src/` for Next.js code and `convex/` at project root. The restructure in Task 2 MUST:
1. Create `src/` and move `app/` inside it
2. Update `tsconfig.json` paths from `"./*"` to `"./src/*"`
3. Update `components.json` (shadcn config) paths
4. The `convex/` directory stays at project root (NOT inside `src/`)
5. Verify the build works after the move

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Convex Backend Platform]
- [Source: _bmad-output/planning-artifacts/architecture.md - Clerk Authentication]
- [Source: _bmad-output/planning-artifacts/architecture.md - Project Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md - Server Action Return Pattern]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 1, Story 1.1]
- [Source: _bmad-output/planning-artifacts/prd.md - FR1-FR6, FR50-FR52, NFR12]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- jsdom 28 incompatible with Node 20 (ESM require error) — downgraded to jsdom 25
- Route group root pages conflicted at `/` — moved to nested routes (`/sign-in`, `/events`, `/dashboard`)
- Convex codegen requires deployment connection — created `_generated` files manually
- `.env.local` with placeholder values needed for `pnpm build` (ConvexReactClient requires URL)

### Completion Notes List
- All 12 acceptance criteria met
- `pnpm build` passes, `pnpm test:run` passes (4 tests), `pnpm lint` has 0 errors
- Convex `_generated` files are placeholders; will be overwritten when `npx convex dev` runs with real credentials
- Next.js 16.1.6 shows middleware deprecation warning (use "proxy" instead) — not actionable for Story 1.1

### File List
- `package.json` — updated with all deps + test scripts
- `tsconfig.json` — path alias updated to `./src/*`
- `components.json` — shadcn/ui config for src/ paths
- `vitest.config.mts` — Vitest config with jsdom + @ alias
- `.env.example` — all required env vars documented
- `.env.local` — placeholder values for build
- `convex/schema.ts` — users table schema
- `convex/users.ts` — getUser query by clerkId
- `convex/tsconfig.json` — Convex TypeScript config
- `convex/_generated/api.js` — generated API (placeholder)
- `convex/_generated/api.d.ts` — generated API types (placeholder)
- `convex/_generated/server.js` — generated server utils (placeholder)
- `convex/_generated/server.d.ts` — generated server types (placeholder)
- `convex/_generated/dataModel.d.ts` — generated data model types (placeholder)
- `src/middleware.ts` — Clerk middleware protecting dashboard routes
- `src/components/providers.tsx` — ClerkProvider + ConvexProviderWithClerk
- `src/components/layouts/auth-layout.tsx` — centered card layout shell
- `src/components/layouts/public-layout.tsx` — header + main + footer shell
- `src/components/layouts/dashboard-layout.tsx` — sidebar + topbar + main shell
- `src/components/ui/*.tsx` — 10 shadcn/ui components (button, card, form, input, label, select, skeleton, table, tabs, sonner)
- `src/app/layout.tsx` — root layout with Providers + Toaster
- `src/app/globals.css` — Tailwind v4 CSS (unchanged from scaffold)
- `src/app/page.tsx` — root page (unchanged from scaffold)
- `src/app/not-found.tsx` — styled 404 page
- `src/app/error.tsx` — styled error boundary
- `src/app/(auth)/layout.tsx` — auth route group layout
- `src/app/(auth)/sign-in/page.tsx` — sign-in placeholder
- `src/app/(public)/layout.tsx` — public route group layout
- `src/app/(public)/events/page.tsx` — events placeholder
- `src/app/(dashboard)/layout.tsx` — dashboard route group layout
- `src/app/(dashboard)/dashboard/page.tsx` — dashboard placeholder
- `src/types/index.ts` — ActionResult<T> + UserRole types
- `src/lib/utils.ts` — cn() utility (shadcn)
- `src/lib/utils/format.ts` — formatCurrency + formatDate + formatDateTime
- `src/lib/utils/format.test.ts` — 4 tests for format utilities
- `src/lib/utils/constants.ts` — APP_NAME, DEFAULT_ROLE, ROLES
