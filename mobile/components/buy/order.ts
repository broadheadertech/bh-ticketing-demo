// order.ts — the shared shape passed from the buy screen to checkout, plus the
// Stripe-checkout client. All money values are CENTAVOS (integers).
//
// CHECKOUT URL CONTRACT (web side):
//   The web app creates the Stripe Checkout Session in a Next.js server action
//   (src/lib/actions/stripe-checkout.ts -> purchaseTickets), which is NOT
//   reachable over HTTP from the mobile app. To wire real payments, expose a
//   thin JSON endpoint that calls that action, e.g.:
//
//     POST {EXPO_PUBLIC_APP_URL}/api/checkout
//     Content-Type: application/json
//     {
//       "eventId": "<events id>",
//       "tierSelections": [{ "tierId": "<ticketTiers id>", "quantity": 2 }],
//       "buyerEmail": "juan@email.ph",
//       "promoCode": "PLAZA10"            // optional
//     }
//     -> 200 { "success": true, "data": { "url": "https://checkout.stripe.com/..." } }
//     -> 200 { "success": false, "error": "..." }
//
//   The Session is created with:
//     success_url = {APP_URL}/events/{eventId}/success?session_id={CHECKOUT_SESSION_ID}
//     cancel_url  = {APP_URL}/events/{eventId}
//   Mobile opens `data.url` with WebBrowser.openAuthSessionAsync(url, returnUrl)
//   where returnUrl uses the "phlive" deep-link scheme so the in-app browser
//   dismisses and control returns to the app after pay/cancel.
//
//   If EXPO_PUBLIC_APP_URL is unset (no live Stripe), checkout falls back to a
//   local DEMO-PAY path that issues nothing server-side and just routes the user
//   to a success screen — useful for design/dev without a Stripe account.

export type OrderLine = {
  /** tier id for GA lines (used by the real Stripe call); absent for seats. */
  tierId?: string;
  name: string;
  price: number; // centavos, per-unit
  qty: number;
  /** seat id for reserved-seat lines. */
  seat?: string;
};

export type Order = {
  type: "ga" | "seated";
  lines: OrderLine[];
  subtotal: number; // centavos
};

export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
/** True only when a live Stripe-backed web endpoint has been configured. */
export const HAS_LIVE_CHECKOUT = APP_URL.length > 0;

export type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

/** POST the order to the web app's /api/checkout endpoint to mint a Stripe URL. */
export async function createCheckoutUrl(input: {
  eventId: string;
  tierSelections: { tierId: string; quantity: number }[];
  buyerEmail: string;
  promoCode?: string;
}): Promise<CheckoutResult> {
  if (!HAS_LIVE_CHECKOUT) {
    return { success: false, error: "Live checkout is not configured" };
  }
  try {
    const res = await fetch(`${APP_URL}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { url: string };
      error?: string;
    };
    if (json.success && json.data?.url) {
      return { success: true, url: json.data.url };
    }
    return { success: false, error: json.error ?? "Checkout failed" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
