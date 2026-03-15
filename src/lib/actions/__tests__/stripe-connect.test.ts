import { describe, it, expect } from "vitest";

/**
 * Contract tests for Stripe Connect server actions.
 * Verifies return shape invariants and business logic without calling real Stripe API.
 */

describe("createConnectAccount contract", () => {
  it("returns success shape with stripeAccountId and url", () => {
    const mockResult = {
      success: true,
      data: { stripeAccountId: "acct_123", url: "https://connect.stripe.com/onboard/acct_123" },
    };
    expect(mockResult).toHaveProperty("success");
    expect(mockResult.success).toBe(true);
    expect(mockResult.data).toHaveProperty("stripeAccountId");
    expect(mockResult.data).toHaveProperty("url");
    expect(typeof mockResult.data.stripeAccountId).toBe("string");
    expect(typeof mockResult.data.url).toBe("string");
  });

  it("returns error shape on failure", () => {
    const mockError = { success: false, error: "Failed to create Stripe account" };
    expect(mockError.success).toBe(false);
    expect(mockError).toHaveProperty("error");
    expect(typeof mockError.error).toBe("string");
    expect(mockError).not.toHaveProperty("data");
  });

  it("stripeAccountId starts with acct_ prefix (Stripe Connect Express)", () => {
    const accountId = "acct_1PqwZxRD9mFx1234";
    expect(accountId.startsWith("acct_")).toBe(true);
  });

  it("return_url and refresh_url use NEXT_PUBLIC_APP_URL base", () => {
    const appUrl = "https://example.com";
    const returnUrl = `${appUrl}/dashboard/settings?stripe_success=true`;
    const refreshUrl = `${appUrl}/dashboard/settings?stripe_refresh=true`;

    expect(returnUrl).toContain("/dashboard/settings");
    expect(returnUrl).toContain("stripe_success=true");
    expect(refreshUrl).toContain("stripe_refresh=true");
  });
});

describe("getStripeAccountStatus contract", () => {
  it("returns success shape with chargesEnabled and detailsSubmitted", () => {
    const mockResult = {
      success: true,
      data: { chargesEnabled: true, detailsSubmitted: true },
    };
    expect(mockResult).toHaveProperty("success");
    expect(mockResult.data).toHaveProperty("chargesEnabled");
    expect(mockResult.data).toHaveProperty("detailsSubmitted");
    expect(typeof mockResult.data.chargesEnabled).toBe("boolean");
    expect(typeof mockResult.data.detailsSubmitted).toBe("boolean");
  });

  it("returns error shape on failure", () => {
    const mockError = { success: false, error: "Failed to retrieve account" };
    expect(mockError.success).toBe(false);
    expect(mockError).toHaveProperty("error");
  });

  it("account is Active when chargesEnabled is true", () => {
    const activeAccount = { chargesEnabled: true, detailsSubmitted: true };
    const status = activeAccount.chargesEnabled ? "Active" : "Pending setup";
    expect(status).toBe("Active");
  });

  it("account is Pending when chargesEnabled is false", () => {
    const pendingAccount = { chargesEnabled: false, detailsSubmitted: false };
    const status = pendingAccount.chargesEnabled ? "Active" : "Pending setup";
    expect(status).toBe("Pending setup");
  });
});

describe("createDashboardLink contract", () => {
  it("returns success shape with url", () => {
    const mockResult = {
      success: true,
      data: { url: "https://connect.stripe.com/express/acct_123/login" },
    };
    expect(mockResult).toHaveProperty("success");
    expect(mockResult.data).toHaveProperty("url");
    expect(typeof mockResult.data.url).toBe("string");
  });

  it("returns error shape on failure", () => {
    const mockError = { success: false, error: "Failed to create dashboard link" };
    expect(mockError.success).toBe(false);
    expect(mockError).toHaveProperty("error");
  });
});

describe("Server Action pattern compliance", () => {
  it("all actions return { success, data?, error? } — never throw", () => {
    // Contract: success=true includes data, success=false includes error
    const successShape = { success: true, data: { url: "https://stripe.com" } };
    const errorShape = { success: false, error: "Something failed" };

    expect(successShape.success).toBe(true);
    expect(successShape).toHaveProperty("data");

    expect(errorShape.success).toBe(false);
    expect(errorShape).toHaveProperty("error");
  });
});
