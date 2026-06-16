"use server";

import { api } from "../../../convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-http";
import { freeRegistrationSchema } from "@/lib/validators/ticket";
import { sendPurchaseConfirmation } from "@/lib/actions/email";
import { generateQrCodeData } from "@/lib/qr/generate";

export async function registerFreeEvent(input: {
  eventId: string;
  tierSelections: { tierId: string; quantity: number }[];
  buyerEmail: string;
}): Promise<{
  success: boolean;
  data?: { registrationId: string };
  error?: string;
}> {
  try {
    // Validate input shape
    const parsed = freeRegistrationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Fetch tiers server-side — NEVER trust client-supplied price data
    const tiers = await getConvexHttpClient().query(api.ticketTiers.getPublicTiersByEventId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventId: input.eventId as any,
    });

    // Verify all selected tiers: price = 0 and sufficient capacity
    for (const selection of input.tierSelections) {
      const tier = tiers.find((t) => t._id === selection.tierId);
      if (!tier) return { success: false, error: "Invalid tier selected" };
      if (tier.price !== 0)
        return { success: false, error: "This event requires payment" };
      if (tier.quantity - tier.soldCount < selection.quantity)
        return { success: false, error: "Some registration slots are no longer available" };
    }

    await getConvexHttpClient().mutation(api.tickets.registerFreeTickets, {
      registrationSecret: process.env.CONVEX_WEBHOOK_SECRET!,
      eventId: input.eventId,
      tierSelections: input.tierSelections,
      buyerEmail: input.buyerEmail,
    });

    // Generate and store QR codes for the registered tickets
    try {
      const syntheticSessionId = `free_${input.eventId}_${input.buyerEmail}`;
      const tickets = await getConvexHttpClient().query(
        api.tickets.getTicketsByStripeSessionId,
        {
          stripeSessionId: syntheticSessionId,
          querySecret: process.env.CONVEX_WEBHOOK_SECRET!,
        }
      );
      const qrUpdates = tickets.map((ticket) => ({
        ticketId: ticket._id,
        ...generateQrCodeData({
          ticketId: ticket._id,
          eventId: ticket.eventId,
          tierId: ticket.tierId,
          buyerEmail: ticket.buyerEmail,
        }),
      }));
      if (qrUpdates.length > 0) {
        await getConvexHttpClient().mutation(api.tickets.patchTicketsQrCodes, {
          webhookSecret: process.env.CONVEX_WEBHOOK_SECRET!,
          updates: qrUpdates,
        });
      }
    } catch (err) {
      // QR failure must NOT block registration — tickets already created
      console.error("QR code generation failed for free registration:", err);
    }

    // Fire-and-forget — email failure must NOT block registration response
    sendPurchaseConfirmation({
      eventId: input.eventId,
      tierSelections: input.tierSelections,
      buyerEmail: input.buyerEmail,
      totalAmountCentavos: "free",
      stripeSessionId: `free_${input.eventId}_${input.buyerEmail}`,
    }).catch((err) => console.error("Confirmation email failed:", err));

    const registrationId = `free_${input.eventId}_${input.buyerEmail}`;
    return { success: true, data: { registrationId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}
