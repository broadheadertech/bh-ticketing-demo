// types.ts — shared shapes for the home feed. The home cards are driven by the
// public `events.listPublicEvents` query (an array of event docs + artworkUrl)
// and the `ticketTiers.getPriceRangeByEventIds` price map (centavos).
import type { Doc } from "@/lib/convex";

/** One row from api.events.listPublicEvents (event doc + resolved artwork). */
export type PublicEvent = Doc<"events"> & { artworkUrl: string | null };

/** eventId -> { minPrice, maxPrice } in CENTAVOS, from getPriceRangeByEventIds. */
export type PriceMap = Record<string, { minPrice: number; maxPrice: number }>;

/** The "from" price (cheapest tier) for an event, in centavos, or null. */
export function fromPrice(ev: PublicEvent, prices: PriceMap | undefined): number | null {
  const r = prices?.[ev._id];
  return r ? r.minPrice : null;
}

/** A short, single-line location label for a card. */
export function eventPlace(ev: PublicEvent): string {
  return ev.city || ev.venueName || (ev.locationType === "online" ? "Online" : "TBA");
}
