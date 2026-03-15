/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as creatorProfiles from "../creatorProfiles.js";
import type * as events from "../events.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as stripeConnect from "../stripeConnect.js";
import type * as ticketTiers from "../ticketTiers.js";
import type * as tickets from "../tickets.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  creatorProfiles: typeof creatorProfiles;
  events: typeof events;
  files: typeof files;
  http: typeof http;
  stripeConnect: typeof stripeConnect;
  ticketTiers: typeof ticketTiers;
  tickets: typeof tickets;
  users: typeof users;
}>;
declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export { internal };
