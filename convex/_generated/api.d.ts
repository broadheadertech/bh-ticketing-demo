/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addOns from "../addOns.js";
import type * as admin from "../admin.js";
import type * as analytics from "../analytics.js";
import type * as campaigns from "../campaigns.js";
import type * as certificates from "../certificates.js";
import type * as creatorProfiles from "../creatorProfiles.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_roles from "../lib/roles.js";
import type * as notifications from "../notifications.js";
import type * as participants from "../participants.js";
import type * as payments from "../payments.js";
import type * as payouts from "../payouts.js";
import type * as promoCodes from "../promoCodes.js";
import type * as push from "../push.js";
import type * as races from "../races.js";
import type * as recurring from "../recurring.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as staff from "../staff.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as ticketTiers from "../ticketTiers.js";
import type * as tickets from "../tickets.js";
import type * as users from "../users.js";
import type * as venueAvailability from "../venueAvailability.js";
import type * as venueMaps from "../venueMaps.js";
import type * as venues from "../venues.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addOns: typeof addOns;
  admin: typeof admin;
  analytics: typeof analytics;
  campaigns: typeof campaigns;
  certificates: typeof certificates;
  creatorProfiles: typeof creatorProfiles;
  events: typeof events;
  files: typeof files;
  follows: typeof follows;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/roles": typeof lib_roles;
  notifications: typeof notifications;
  participants: typeof participants;
  payments: typeof payments;
  payouts: typeof payouts;
  promoCodes: typeof promoCodes;
  push: typeof push;
  races: typeof races;
  recurring: typeof recurring;
  reviews: typeof reviews;
  seed: typeof seed;
  staff: typeof staff;
  stripeConnect: typeof stripeConnect;
  ticketTiers: typeof ticketTiers;
  tickets: typeof tickets;
  users: typeof users;
  venueAvailability: typeof venueAvailability;
  venueMaps: typeof venueMaps;
  venues: typeof venues;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
