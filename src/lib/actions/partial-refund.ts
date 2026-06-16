"use server";

import { getProvider } from "@/lib/payments";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { sendRefundConfirmation } from "./email";
import { formatCurrency } from "@/lib/utils/format";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const WEBHOOK_SECRET = process.env.CONVEX_WEBHOOK_SECRET!;

type PartialRefundResult = {
  success: boolean;
  error?: string;
};

export async function refundSingleTicket(
  ticketId: string,
  eventTitle: string
): Promise<PartialRefundResult> {
  try {
    // Fetch ticket
    const ticket = await convex.query(api.tickets.getTicketByIdForScan, {
      ticketId,
      querySecret: WEBHOOK_SECRET,
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    if (ticket.refundStatus === "refunded") {
      return { success: false, error: "This ticket has already been refunded" };
    }

    if (ticket.refundStatus === "not_applicable") {
      return { success: false, error: "No refund needed — this was a free ticket" };
    }

    // Get tier price
    const tierPrice = (ticket as { tierPrice?: number }).tierPrice;

    // For free tickets (price 0), just mark as voided
    if (!tierPrice || tierPrice === 0) {
      await convex.mutation(api.tickets.updateTicketRefundStatus, {
        webhookSecret: WEBHOOK_SECRET,
        ticketId: ticketId as never,
        refundStatus: "not_applicable",
      });
      return { success: true };
    }

    // Partial refund of this ticket's amount via the provider that took it.
    const t = ticket as {
      paymentProvider?: string;
      paymentRef?: string;
      stripeSessionId: string;
    };
    const provider = getProvider(
      t.paymentProvider === "paymongo" ? "paymongo" : "stripe",
    );
    const ref = t.paymentRef ?? t.stripeSessionId;
    const result = await provider.refund(ref, tierPrice);
    if (!result.ok) {
      return { success: false, error: "Refund could not be processed" };
    }

    // Update ticket status
    await convex.mutation(api.tickets.updateTicketRefundStatus, {
      webhookSecret: WEBHOOK_SECRET,
      ticketId: ticketId as never,
      refundStatus: "refunded",
      refundedAt: Date.now(),
    });

    // Send refund email (fire-and-forget)
    sendRefundConfirmation({
      buyerEmail: ticket.buyerEmail,
      eventTitle,
      refundAmount: formatCurrency(tierPrice),
    }).catch((err) =>
      console.error("Partial refund email failed:", err)
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refund failed",
    };
  }
}
