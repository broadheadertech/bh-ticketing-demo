// Payment provider resolver. Picks PayMongo (default) or Stripe based on the
// event override then the organizer default. See PAYMENTS-ARCHITECTURE.md.
import type { PaymentProvider, Provider } from "./types";
import { stripeProvider } from "./stripe";
import { paymongoProvider } from "./paymongo";

export * from "./types";

/** Default platform service fee (%). Phase 3: organizers will be able to override. */
export const DEFAULT_FEE_PERCENT = 5;

/** Default provider when neither event nor organizer specifies one. */
export const DEFAULT_PROVIDER: Provider = "paymongo";

/** Resolve the provider id from an event override → organizer default → platform default. */
export function resolveProviderId(
  eventProvider?: string | null,
  organizerProvider?: string | null,
): Provider {
  const id = eventProvider ?? organizerProvider ?? DEFAULT_PROVIDER;
  return id === "stripe" ? "stripe" : "paymongo";
}

/** Get the provider implementation for an id. */
export function getProvider(id: Provider): PaymentProvider {
  return id === "stripe" ? stripeProvider : paymongoProvider;
}
