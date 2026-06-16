// lib/linking.ts — the single source of truth for deep linking in PHLive.
//
// SCHEME: "phlive" (declared in app.json -> expo.scheme). Every deep link below
// resolves to `phlive://<path>` on a device, or an `exp://…/--/<path>` URL while
// running in Expo Go / a dev client. ALWAYS build URLs with `Linking.createURL`
// (re-exported here as `deepLink`) so the right prefix is chosen automatically —
// never hand-concatenate "phlive://".
//
// WHO USES THIS
//   1. Stripe checkout return — checkout/[id].tsx opens the hosted Stripe page
//      with WebBrowser.openAuthSessionAsync(stripeUrl, returnUrl). `returnUrl`
//      MUST be a phlive deep link so the in-app browser dismisses and hands
//      control back. Use `checkoutReturnUrl(eventId)` for that argument.
//   2. Push notification taps — a notifications handler reads the data payload
//      and calls `routeForNotification(data)` to get an in-app route to push.
//   3. Anywhere a sharable / external link to in-app content is needed.
//
// EXPO ROUTER NOTE: expo-router auto-maps the deep-link PATH to the matching
// file route under app/. We do NOT register a manual `linking` config; instead
// this file documents that mapping and gives typed builders so callers stay in
// sync with the file tree. The path strings here MUST match the app/ routes.

import * as Linking from "expo-linking";
import type { Href } from "expo-router";

/** The app's URL scheme. Mirror of app.json -> expo.scheme. Keep in sync. */
export const SCHEME = "phlive" as const;

// ---------------------------------------------------------------------------
// LINK MAP
// ---------------------------------------------------------------------------
// Left column  = deep-link PATH (what lands as `phlive://<path>`).
// Right column = the app/ file route expo-router renders for it.
//
//   PATH                              ROUTE FILE
//   ───────────────────────────────  ───────────────────────────────────────
//   (tabs)                            app/(tabs)/index.tsx        (Home)
//   browse                            app/(tabs)/browse.tsx       (Browse)
//   tickets                           app/(tabs)/tickets.tsx      (Wallet)
//   profile                           app/(tabs)/profile.tsx      (Profile)
//   event/:id                         app/event/[id].tsx          (Event detail)
//   event/:id/buy                     app/event/[id]/buy.tsx      (Ticket select)
//   ticket/:id                        app/ticket/[id].tsx         (Ticket + QR)
//   checkout/:id                      app/checkout/[id].tsx       (Order review)
//   checkout/:id/return               app/checkout/[id].tsx*      (Stripe return)
//   checkout/success                  app/checkout/success.tsx    (Confirmation)
//   artist/:id                        app/artist/[id].tsx
//   organizer/:id                     app/organizer/[id].tsx
//   certificate/:id                   app/certificate/[id].tsx
//   leaderboard/:id                   app/leaderboard/[id].tsx
//   settings                          app/settings.tsx
//
// * checkout/:id/return is the Stripe `returnUrl` sentinel. It is handled by the
//   WebBrowser.openAuthSessionAsync result (type === "success") inside
//   checkout/[id].tsx — control returns BEFORE a screen is mounted, so no
//   dedicated route file is required. Kept as a stable, parseable path so the
//   web success_url can redirect to it.
// ---------------------------------------------------------------------------

/**
 * Build a fully-qualified deep link for the current runtime (phlive:// on a
 * device, exp://…/--/ in dev). Thin re-export of Linking.createURL so callers
 * import one module.
 */
export function deepLink(
  path: string,
  options?: Linking.CreateURLOptions,
): string {
  return Linking.createURL(path, options);
}

// --- In-app route builders (for router.push/replace) -----------------------
// These return expo-router Href objects (typedRoutes-friendly), NOT deep links.

export const routes = {
  home: (): Href => "/(tabs)",
  browse: (): Href => "/(tabs)/browse",
  tickets: (): Href => "/(tabs)/tickets",
  profile: (): Href => "/(tabs)/profile",
  settings: (): Href => "/settings",
  event: (id: string): Href => ({ pathname: "/event/[id]", params: { id } }),
  eventBuy: (id: string): Href => ({ pathname: "/event/[id]/buy", params: { id } }),
  ticket: (id: string): Href => ({ pathname: "/ticket/[id]", params: { id } }),
  checkout: (id: string): Href => ({ pathname: "/checkout/[id]", params: { id } }),
  checkoutSuccess: (eventId: string, demo?: boolean): Href => ({
    pathname: "/checkout/success",
    params: demo ? { id: eventId, demo: "1" } : { id: eventId },
  }),
  artist: (id: string): Href => ({ pathname: "/artist/[id]", params: { id } }),
  organizer: (id: string): Href => ({ pathname: "/organizer/[id]", params: { id } }),
  certificate: (id: string): Href => ({ pathname: "/certificate/[id]", params: { id } }),
  leaderboard: (id: string): Href => ({ pathname: "/leaderboard/[id]", params: { id } }),
} as const;

// --- External / sharable deep links (phlive://…) ---------------------------
// Use these when an URL must leave the app (share sheet, web success_url, etc.).

export const links = {
  home: () => deepLink(""),
  event: (id: string) => deepLink(`event/${id}`),
  eventBuy: (id: string) => deepLink(`event/${id}/buy`),
  ticket: (id: string) => deepLink(`ticket/${id}`),
  checkout: (id: string) => deepLink(`checkout/${id}`),
  checkoutSuccess: (eventId: string) => deepLink(`checkout/success?id=${eventId}`),
  artist: (id: string) => deepLink(`artist/${id}`),
  organizer: (id: string) => deepLink(`organizer/${id}`),
  certificate: (id: string) => deepLink(`certificate/${id}`),
  leaderboard: (id: string) => deepLink(`leaderboard/${id}`),
} as const;

/**
 * The Stripe Checkout `returnUrl`. Pass this as the second argument to
 * WebBrowser.openAuthSessionAsync(stripeUrl, returnUrl). The in-app browser
 * closes and returns control as soon as Stripe redirects to a URL on this
 * scheme. Stable path: phlive://checkout/<eventId>/return.
 */
export function checkoutReturnUrl(eventId: string): string {
  return deepLink(`checkout/${eventId}/return`);
}

// ---------------------------------------------------------------------------
// PUSH NOTIFICATION ROUTING
// ---------------------------------------------------------------------------
// Convention for the data payload attached to a push notification:
//   { type: "event" | "ticket" | "order" | "organizer" | "artist"
//          | "certificate" | "leaderboard",
//     id?: string,            // the relevant document id
//     url?: string }          // OPTIONAL explicit deep link; wins over type/id
//
// A notifications handler should call routeForNotification(data) and, if it
// returns a non-null Href, router.push() it when the user taps the notification.

export type NotificationData = {
  type?: string;
  id?: string;
  /** Optional fully-qualified deep link; takes precedence over type/id. */
  url?: string;
};

/**
 * Resolve a tapped push notification's data payload to an in-app route, or null
 * if it carries nothing actionable (caller should then no-op / stay put).
 */
export function routeForNotification(
  data: NotificationData | null | undefined,
): Href | null {
  if (!data) return null;

  // An explicit deep link wins. Parse it back into a route.
  if (data.url) {
    const parsed = parseDeepLink(data.url);
    if (parsed) return parsed;
  }

  const { type, id } = data;
  switch (type) {
    case "event":
      return id ? routes.event(id) : routes.home();
    case "ticket":
      return id ? routes.ticket(id) : routes.tickets();
    case "order":
      // A completed/updated order routes the buyer to their wallet.
      return routes.tickets();
    case "organizer":
      return id ? routes.organizer(id) : null;
    case "artist":
      return id ? routes.artist(id) : null;
    case "certificate":
      return id ? routes.certificate(id) : null;
    case "leaderboard":
      return id ? routes.leaderboard(id) : null;
    default:
      return null;
  }
}

/**
 * Parse an incoming deep link (phlive://… or exp://…/--/…) into an in-app Href.
 * Used by routeForNotification when a payload ships an explicit `url`, and handy
 * for any custom Linking.addEventListener cold/warm-start handling.
 */
export function parseDeepLink(url: string): Href | null {
  const { path, queryParams } = Linking.parse(url);
  if (!path) return routes.home();
  const segs = path.replace(/^\/+|\/+$/g, "").split("/");
  const [head, a, b] = segs;

  switch (head) {
    case "event":
      if (!a) return null;
      return b === "buy" ? routes.eventBuy(a) : routes.event(a);
    case "ticket":
      return a ? routes.ticket(a) : routes.tickets();
    case "checkout":
      if (a === "success") {
        const eid = (queryParams?.id as string) ?? "";
        return routes.checkoutSuccess(eid);
      }
      // checkout/:id and checkout/:id/return both land on the checkout screen.
      return a ? routes.checkout(a) : null;
    case "artist":
      return a ? routes.artist(a) : null;
    case "organizer":
      return a ? routes.organizer(a) : null;
    case "certificate":
      return a ? routes.certificate(a) : null;
    case "leaderboard":
      return a ? routes.leaderboard(a) : null;
    case "settings":
      return routes.settings();
    case "browse":
      return routes.browse();
    case "tickets":
      return routes.tickets();
    case "profile":
      return routes.profile();
    default:
      return routes.home();
  }
}
