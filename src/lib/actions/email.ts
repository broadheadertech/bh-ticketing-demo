"use server";

import { api } from "../../../convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-http";
import { getResend, FROM_EMAIL } from "@/lib/email/config";
import TicketConfirmationEmail from "@/lib/email/templates/ticket-confirmation";
import EventCancellationEmail from "@/lib/email/templates/event-cancellation";
import RefundConfirmationEmail from "@/lib/email/templates/refund-confirmation";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import QRCode from "qrcode";

/** Formats first 8 chars of a Convex ticket ID as a human-readable code: e.g. "JX7A-BC12"
 * MUST stay in sync with formatTextCode in src/components/custom/ticket-qr-display.tsx */
function formatTextCode(ticketId: string): string {
  const code = ticketId.slice(0, 8).toUpperCase();
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export async function sendPurchaseConfirmation(params: {
  eventId: string;
  tierSelections: { tierId: string; quantity: number }[];
  buyerEmail: string;
  totalAmountCentavos: number | "free";
  /** Stripe session ID (or synthetic free session ID) — used to fetch QR codes for email */
  stripeSessionId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const [event, tiers] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getConvexHttpClient().query(api.events.getPublicEventById, { eventId: params.eventId as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getConvexHttpClient().query(api.ticketTiers.getPublicTiersByEventId, { eventId: params.eventId as any }),
    ]);

    const tierRows = params.tierSelections
      .map((sel) => {
        const tier = tiers.find((t) => t._id === sel.tierId);
        return tier ? { name: tier.name, quantity: sel.quantity } : null;
      })
      .filter((t): t is { name: string; quantity: number } => t !== null);

    const totalDisplay =
      params.totalAmountCentavos === "free"
        ? "Free"
        : formatCurrency(params.totalAmountCentavos);

    // Fetch QR codes for each ticket and generate data URLs for email embedding
    let qrItems: { qrDataUrl: string; textCode: string }[] = [];
    if (params.stripeSessionId) {
      try {
        const tickets = await getConvexHttpClient().query(
          api.tickets.getTicketsByStripeSessionId,
          {
            stripeSessionId: params.stripeSessionId,
            querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
          }
        );
        qrItems = await Promise.all(
          tickets
            .filter((t) => t.qrCode !== "")
            .map(async (t) => ({
              qrDataUrl: await QRCode.toDataURL(t.qrCode, {
                errorCorrectionLevel: "M",
                width: 200,
                margin: 2,
              }),
              textCode: formatTextCode(t._id),
            }))
        );
      } catch (err) {
        // QR generation failure must NOT block the confirmation email — degrade gracefully
        console.error("Failed to generate QR codes for email:", err);
      }
    }

    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [params.buyerEmail],
      subject: `Your tickets for ${event.title}`,
      react: TicketConfirmationEmail({
        eventTitle: event.title,
        eventDate: formatDate(event.date),
        eventTime: event.time,
        venueName: event.venueName ?? undefined,
        tiers: tierRows,
        totalDisplay,
        buyerEmail: params.buyerEmail,
        qrItems,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("sendPurchaseConfirmation error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Email failed",
    };
  }
}

export async function sendEventCancellation(params: {
  eventId: string;
  cancellationReason?: string;
}): Promise<{ success: boolean; error?: string; emailsSent?: number }> {
  try {
    const [event, emails] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getConvexHttpClient().query(api.events.getPublicEventById, { eventId: params.eventId as any }),
      getConvexHttpClient().query(api.tickets.getUniqueEmailsByEventId, {
        eventId: params.eventId,
        querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
      }),
    ]);

    if (emails.length === 0) {
      return { success: true, emailsSent: 0 };
    }

    const eventDate = formatDate(event.date);

    const results = await Promise.allSettled(
      emails.map((email) =>
        getResend().emails.send({
          from: FROM_EMAIL,
          to: [email],
          subject: `Important: ${event.title} has been cancelled`,
          react: EventCancellationEmail({
            eventTitle: event.title,
            eventDate,
            cancellationReason: params.cancellationReason,
          }),
        })
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && !r.value.error
    ).length;
    const failed = results.length - sent;

    if (failed > 0) {
      console.error(`sendEventCancellation: ${failed} of ${results.length} emails failed`);
    }

    return { success: true, emailsSent: sent };
  } catch (err) {
    console.error("sendEventCancellation error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Cancellation email failed",
    };
  }
}

export async function sendRefundConfirmation(params: {
  buyerEmail: string;
  eventTitle: string;
  refundAmount: string; // Already formatted with formatCurrency()
  eventDate?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: [params.buyerEmail],
      subject: `Refund processed for ${params.eventTitle}`,
      react: RefundConfirmationEmail({
        eventTitle: params.eventTitle,
        refundAmount: params.refundAmount,
        eventDate: params.eventDate,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("sendRefundConfirmation error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refund email failed",
    };
  }
}
