// PayMongo provider — the PH-primary lane (GCash / Maya / GrabPay / cards, PHP).
// Implements PaymentProvider via PayMongo's Checkout Sessions API + webhooks.
//
// createCheckout + auth are VERIFIED against the PayMongo sandbox (returns data.id
// + data.attributes.checkout_url, with metadata/payments/payment_intent present).
// verifyWebhook parsing is per PayMongo docs and still pending a real webhook
// delivery to confirm the event envelope. No native SDK — just fetch + HMAC.
import crypto from "crypto";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  WebhookEvent,
} from "./types";

const API = "https://api.paymongo.com/v1";

function authHeader(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not set");
  // Basic auth: base64("sk_...:")
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export const paymongoProvider: PaymentProvider = {
  id: "paymongo",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    // Platform-collect: no per-organizer split (PayMongo has no Connect). The 5%
    // fee is recorded in the payouts ledger by the webhook, not split here.
    const res = await fetch(`${API}/checkout_sessions`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: input.lineItems.map((li) => ({
              name: li.name,
              amount: li.amount, // centavos
              currency: "PHP",
              quantity: li.quantity,
            })),
            payment_method_types: ["gcash", "paymaya", "grab_pay", "card"],
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            description: `Tickets — event ${input.eventId}`,
            metadata: input.metadata,
            send_email_receipt: false,
          },
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`PayMongo checkout failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    const url = json?.data?.attributes?.checkout_url as string | undefined;
    const ref = json?.data?.id as string | undefined;
    if (!url || !ref) throw new Error("PayMongo checkout: missing checkout_url/id");
    return { url, ref };
  },

  verifyWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const sigHeader = headers.get("paymongo-signature");
    if (!secret || !sigHeader) return null;

    // Header format: "t=<ts>,te=<test_sig>,li=<live_sig>"
    const parts: Record<string, string> = {};
    for (const seg of sigHeader.split(",")) {
      const [k, val] = seg.split("=");
      if (k && val) parts[k.trim()] = val.trim();
    }
    const t = parts.t;
    const sig = parts.li || parts.te;
    if (!t || !sig) return null;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${t}.${rawBody}`)
      .digest("hex");
    // constant-time compare
    if (
      expected.length !== sig.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      return null;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return null;
    }
    // event: data.attributes.type === "checkout_session.payment.paid"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const evt = payload as any;
    const evtType = evt?.data?.attributes?.type;
    if (evtType !== "checkout_session.payment.paid" && evtType !== "payment.paid") {
      return null;
    }
    const resource = evt.data.attributes.data; // checkout_session or payment
    const attrs = resource?.attributes ?? {};
    const ref = resource?.id ?? "";
    const metadata = attrs.metadata ?? {};
    // Amount collected: prefer the first payment on the session.
    let amountCollected = 0;
    if (Array.isArray(attrs.payments) && attrs.payments[0]?.attributes?.amount) {
      amountCollected = attrs.payments[0].attributes.amount;
    } else if (typeof attrs.amount === "number") {
      amountCollected = attrs.amount;
    }
    return { type: "paid", ref, metadata, amountCollected };
  },

  async refund(paymentRef: string, amount?: number, reason?: string) {
    // paymentRef is the checkout_session id → resolve its payment id + amount.
    const sess = await fetch(`${API}/checkout_sessions/${paymentRef}`, {
      headers: { Authorization: authHeader() },
    });
    if (!sess.ok) return { ok: false };
    const sj = await sess.json();
    const payment = sj?.data?.attributes?.payments?.[0];
    const paymentId = payment?.id as string | undefined;
    if (!paymentId) return { ok: false };
    // PayMongo refunds require an amount — default to the full paid amount.
    const refundAmount = amount ?? (payment?.attributes?.amount as number | undefined);
    if (refundAmount == null) return { ok: false };
    const res = await fetch(`${API}/refunds`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: refundAmount,
            payment_id: paymentId,
            reason: reason ?? "requested_by_customer",
          },
        },
      }),
    });
    return { ok: res.ok };
  },
};
