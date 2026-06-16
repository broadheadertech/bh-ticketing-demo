import { ConvexHttpClient } from "convex/browser";

// Lazy, server-side Convex HTTP client.
//
// WHY LAZY: creating the client at module top-level evaluates at import. In a
// production build, NEXT_PUBLIC_CONVEX_URL is INLINED at build time — if the
// build host doesn't have it (e.g. .env.local is gitignored and absent in CI),
// it bakes in as `undefined` and `new ConvexHttpClient(undefined)` throws at
// boot ("Client created with undefined deployment address"), taking down the
// whole server. Creating it on first use instead keeps the server bootable and
// turns a missing URL into a contained, per-request error.
//
// WHY THE CONVEX_URL FALLBACK: NEXT_PUBLIC_* is build-time-inlined, but a plain
// CONVEX_URL is read from the runtime environment. Self-hosted/server deploys can
// set CONVEX_URL in the runtime env and it works even if the build never inlined
// the public var.
let _client: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
  if (!_client) {
    const url =
      process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
    if (!url) {
      throw new Error(
        "Convex deployment URL is not set. Provide NEXT_PUBLIC_CONVEX_URL at build time, or CONVEX_URL in the runtime environment.",
      );
    }
    _client = new ConvexHttpClient(url);
  }
  return _client;
}
