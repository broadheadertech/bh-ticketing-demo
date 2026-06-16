export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { paymongoProvider } from "@/lib/payments/paymongo";
import { issuePaidOrder } from "@/lib/payments/issue";

// PayMongo posts `checkout_session.payment.paid` here. We verify the signature,
// then issue tickets + record the payout ledger via the shared pipeline.
export async function POST(request: Request) {
  const rawBody = await request.text();

  const evt = paymongoProvider.verifyWebhook(rawBody, request.headers);
  if (!evt) {
    // Bad signature or an event type we don't act on.
    return NextResponse.json({ error: "Invalid or ignored" }, { status: 400 });
  }

  try {
    await issuePaidOrder({
      provider: "paymongo",
      ref: evt.ref,
      metadata: evt.metadata,
      amountCollected: evt.amountCollected,
    });
  } catch (err) {
    console.error("PayMongo webhook processing error:", err);
    // 200 so PayMongo doesn't hammer retries on a non-signature failure;
    // ticket creation is idempotent, so a manual replay is safe.
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
