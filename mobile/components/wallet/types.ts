// types.ts — the shape returned by convex tickets:getMyTickets, mirrored here
// so wallet components share one definition. Keep in sync with
// convex/tickets.ts getMyTickets handler return.
import type { Id } from "@/lib/convex";

export type MyTicket = {
  _id: Id<"tickets">;
  eventId: Id<"events">;
  qrCode: string;
  scannedAt?: number;
  createdAt: number;
  refundStatus?: string;
  eventTitle: string;
  eventDate: number;
  eventTime: string;
  eventStatus: string;
  eventTheme: string | null;
  eventType: string | null;
  venueName?: string;
  tierName: string;
};

/** A ticket is "past" once its event date has passed or it was already scanned. */
export function isPastTicket(tk: MyTicket): boolean {
  if (tk.scannedAt) return true;
  return tk.eventDate > 0 && tk.eventDate < Date.now();
}
