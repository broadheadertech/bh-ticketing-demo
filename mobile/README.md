# TIX.PH / PHLive — Expo mobile app

The native (iOS + Android) client for the Universal Ticketing System. It reuses
the **same Convex backend** and **Clerk auth** as the web app, so it talks to the
exact data the web dashboard manages — no separate API.

- **Framework:** Expo SDK 52, React Native 0.76, React 18.3.1, TypeScript (strict)
- **Routing:** expo-router (file-based, `app/`), deep-link scheme `phlive://`
- **Backend:** shared Convex (`../convex`) via `@/lib/convex`
- **Auth:** Clerk (`@clerk/clerk-expo`) + `ConvexProviderWithClerk`
- **Theme:** token-driven Plaza theme + per-event "worlds" (`@/theme/*`)

## Project layout

```
mobile/
  app/                 expo-router routes
    _layout.tsx        root providers (Clerk > Convex > Theme > Notifications > Stack)
    index.tsx          cold-start gate: signed-in -> (tabs), else -> (auth)/onboarding
    (auth)/            onboarding, sign-in, sign-up
    (tabs)/            Home (index), Browse, Tickets, Profile
    event/[id].tsx     event detail; event/[id]/buy.tsx  purchase flow
    ticket/[id].tsx    ticket / QR keepsake
    checkout/[id].tsx  checkout; checkout/success.tsx
    certificate/[id], leaderboard/[id], artist/[id], organizer/[id], settings.tsx
  components/          ui primitives (@/components/ui) + feature components
  theme/              tokens.ts, events.ts, ThemeProvider.tsx
  lib/                convex re-export, format, push, offline cache, linking, clerk token cache
```

## Prerequisites

- **Node 18+** and a package manager (pnpm recommended; npm/yarn also fine)
- **Expo CLI** is invoked via `npx expo` (no global install needed)
- For device runs: the **Expo Go** app, or an EAS **dev client** build
- This app lives inside the monorepo and imports the repo-root `../convex`
  codegen. Metro is configured (`metro.config.js`) to watch the repo root and
  dedupe a single copy of react / react-native, so install runs **inside
  `mobile/`** (it does not require the root workspace to be installed, but the
  root `convex/_generated` must exist — run the web app's `convex dev`/`codegen`
  at least once if it's missing).

## Environment variables

Copy `.env.example` to `.env` and fill both values:

```
EXPO_PUBLIC_CONVEX_URL=            # the Convex deployment URL, e.g. https://your-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY= # Clerk publishable key, pk_test_... or pk_live_...
```

Both are `EXPO_PUBLIC_` so they are inlined into the client bundle at build time.
Use the **same Convex deployment** the web app points at so the two clients share
data. The Clerk instance must have a JWT template named **`convex`** (this is what
`ConvexProviderWithClerk` requests) and the OAuth providers you want enabled
(Apple / Google) turned on in the Clerk dashboard.

## Install

From this `mobile/` directory:

```bash
pnpm install      # or: npm install   /   yarn
```

> `node_modules/` is not committed and not yet installed. Run install before the
> first `expo start` or imports like `expo-router`, `@react-native-async-storage/
> async-storage`, and `expo-device` will not resolve.

## Run (development)

```bash
cp .env.example .env   # then edit .env
npx expo start         # press i (iOS sim), a (Android emulator), or scan QR in Expo Go
```

If you use native modules not in Expo Go (push on a device, etc.), build a dev
client:

```bash
npx expo run:ios       # or: npx expo run:android   (needs Xcode / Android SDK)
```

## Production builds (EAS)

```bash
npm install -g eas-cli         # once
eas login
eas build:configure            # creates eas.json (first time)
eas build --platform ios       # or android / all
eas submit --platform ios      # upload to App Store / Play Console
```

EAS build requires an **EAS project id** in `app.json` (`extra.eas.projectId`,
added by `eas build:configure`) — this is also what lets push tokens mint on a
real device. Store submission requires your **Apple Developer** and **Google
Play** accounts and their signing credentials.

## Known blockers / not-yet-wired

These are configuration or backend gaps, not app bugs — the code is written to
degrade gracefully (silent no-ops / fallbacks) until they're addressed:

1. **Clerk + Convex config required to actually authenticate.** You must set
   `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CONVEX_URL` in `.env`,
   create the Clerk JWT template named `convex`, and enable Apple/Google OAuth
   providers in the Clerk dashboard. This is config, not code.

2. **Fonts not bundled yet.** `theme/tokens.ts` names BricolageGrotesque /
   Manrope / SpaceMono, but no font files are loaded via `expo-font` yet, so RN
   falls back to the system font (acceptable; cosmetic only).

3. **Per-event theming user toggle is a no-op.** Screens read a `themedEvents`
   preference defensively (default ON), but `ThemeProvider` does not yet surface
   a real opt-out flag in its context. If a real toggle is required,
   `ThemeProvider` needs a `themedEvents` boolean added to its value. Today event
   theming simply always applies on detail surfaces.

4. **Push notifications — server half missing.** `lib/push.ts` does the full
   client side (permission, token, channel, tap routing) and uploads the token
   via `api.push.savePushToken`, but that Convex mutation does **not exist yet**
   (`convex/push.ts`). The upload is a guarded no-op until it's added — see
   `PUSH_SETUP.md`. A real push also needs `extra.eas.projectId` in `app.json`
   and a **physical device** with APNs/FCM credentials; token minting returns
   `null` on simulators and web by design.

5. **Stripe live keys / payments.** Checkout flows assume the shared backend's
   payment integration; live Stripe keys must be configured on the backend, not
   in this app.

6. **No type-check has been run here.** `mobile/node_modules` was not installed
   when this app was assembled, so `tsc` / `expo` could not run. Run
   `pnpm install` then `npx tsc --noEmit` (or `npx expo start`) to surface any
   remaining type issues. Static review found all `@/` imports, theme/convex
   references, route files, and npm dependencies consistent.

7. **Store submission needs the user's developer accounts** (Apple Developer
   Program, Google Play Console) and their credentials configured in EAS.
