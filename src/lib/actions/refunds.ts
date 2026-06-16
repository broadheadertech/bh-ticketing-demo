"use server";

import { getProvider } from "@/lib/payments";
import { api } from "../../../convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-http";
import { sendRefundConfirmation } from "./email";
import { formatCurrency } from "@/lib/utils/format";

const WEBHOOK_SECRET = process.env.CONVEX_WEBHOOK_SECRET!;

type RefundResult = {
  success: boolean;
  data?: { refunded: number; failed: number; skipped: number };
  error?: string;
};

export async function processEventRefunds(
  eventId: string,
  eventTitle?: string
): Promise<RefundResult> {
  try {
    // Fetch tickets with tier prices
    const tickets = await getConvexHttpClient().query(
      api.tickets.getTicketsByEventForRefund,
      { eventId: eventId as never, querySecret: WEBHOOK_SECRET }
    );

    if (tickets.length === 0) {
      return { success: true, data: { refunded: 0, failed: 0, skipped: 0 } };
    }

    // Use provided event title, or fall back to "your event" (public query
    // won't find cancelled events so we avoid it)
    const resolvedTitle = eventTitle ?? "your event";

    // Group by payment reference (one charge per checkout session, any provider)
    const sessionGroups = new Map<string, typeof tickets>();
    for (const ticket of tickets) {
      const key = ticket.paymentRef;
      const group = sessionGroups.get(key) ?? [];
      group.push(ticket);
      sessionGroups.set(key, group);
    }

    let refunded = 0;
    let failed = 0;
    let skipped = 0;

    // Track refunded buyers for email notifications (email → total centavos)
    const refundedBuyers = new Map<string, number>();

    for (const [sessionId, sessionTickets] of sessionGroups) {
      // Skip sessions where all tickets are already processed
      if (sessionTickets.every((t) => !!t.refundStatus)) {
        continue;
      }

      const allFree = sessionTickets.every((t) => t.tierPrice === 0);

      if (allFree) {
        for (const ticket of sessionTickets) {
          await getConvexHttpClient().mutation(
            api.tickets.updateTicketRefundStatus,
            {
              webhookSecret: WEBHOOK_SECRET,
              ticketId: ticket._id,
              refundStatus: "not_applicable",
            }
          );
        }
        skipped += sessionTickets.length;
        continue;
      }

      try {
        // Full refund of the charge via the provider that took it (sessionId
        // here is the paymentRef — Stripe session id or PayMongo checkout id).
        const provider = getProvider(
          sessionTickets[0].paymentProvider === "paymongo" ? "paymongo" : "stripe",
        );
        const result = await provider.refund(sessionId);
        if (!result.ok) throw new Error("Provider refund failed");

        // Mark tickets as refunded
        for (const ticket of sessionTickets) {
          await getConvexHttpClient().mutation(
            api.tickets.updateTicketRefundStatus,
            {
              webhookSecret: WEBHOOK_SECRET,
              ticketId: ticket._id,
              refundStatus: "refunded",
              refundedAt: Date.now(),
            }
          );

          // Aggregate refund amount per buyer email
          const existing = refundedBuyers.get(ticket.buyerEmail) ?? 0;
          refundedBuyers.set(ticket.buyerEmail, existing + ticket.tierPrice);
        }
        refunded += sessionTickets.length;
      } catch (err) {
        // Mark tickets as failed, continue processing others
        for (const ticket of sessionTickets) {
          await getConvexHttpClient().mutation(
            api.tickets.updateTicketRefundStatus,
            {
              webhookSecret: WEBHOOK_SECRET,
              ticketId: ticket._id,
              refundStatus: "failed",
            }
          );
        }
        failed += sessionTickets.length;
        console.error(`Refund failed for session ${sessionId}:`, err);
      }
    }

    // Send refund confirmation emails (fire-and-forget)
    for (const [email, totalCentavos] of refundedBuyers) {
      sendRefundConfirmation({
        buyerEmail: email,
        eventTitle: resolvedTitle,
        refundAmount: formatCurrency(totalCentavos),
      }).catch((err) =>
        console.error(`Refund email failed for ${email}:`, err)
      );
    }

    return { success: true, data: { refunded, failed, skipped } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refund processing failed",
    };
  }
}
