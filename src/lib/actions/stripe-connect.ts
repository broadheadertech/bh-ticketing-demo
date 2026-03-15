"use server";

import { stripe } from "@/lib/stripe/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createConnectAccount(email: string): Promise<{
  success: boolean;
  data?: { stripeAccountId: string; url: string };
  error?: string;
}> {
  try {
    const account = await stripe.accounts.create({ type: "express", email });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${APP_URL}/dashboard/settings?stripe_refresh=true`,
      return_url: `${APP_URL}/dashboard/settings?stripe_success=true`,
      type: "account_onboarding",
    });
    return { success: true, data: { stripeAccountId: account.id, url: link.url } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create Stripe account",
    };
  }
}

export async function getStripeAccountStatus(stripeAccountId: string): Promise<{
  success: boolean;
  data?: { chargesEnabled: boolean; detailsSubmitted: boolean };
  error?: string;
}> {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return {
      success: true,
      data: {
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to retrieve account",
    };
  }
}

export async function createDashboardLink(stripeAccountId: string): Promise<{
  success: boolean;
  data?: { url: string };
  error?: string;
}> {
  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return { success: true, data: { url: link.url } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create dashboard link",
    };
  }
}
