import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketTierBuilder } from "../ticket-tier-builder";

const mockSaveTiers = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockSaveTiers,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    ticketTiers: {
      saveTiers: "saveTiers",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("convex/values", () => ({
  ConvexError: class ConvexError extends Error {
    data: unknown;
    constructor(data: unknown) {
      super(typeof data === "string" ? data : "ConvexError");
      this.data = data;
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TicketTierBuilder", () => {
  const defaultProps = {
    eventId: "event123",
    eventType: "concert" as const,
  };

  it("renders with empty tiers showing empty state message", () => {
    render(<TicketTierBuilder {...defaultProps} />);
    expect(screen.getByText("No ticket tiers configured yet.")).toBeDefined();
  });

  it("renders Suggest Tiers button for concert event type", () => {
    render(<TicketTierBuilder {...defaultProps} />);
    expect(screen.getByTestId("suggest-tiers-btn")).toBeDefined();
    expect(screen.getByText("Suggest Tiers")).toBeDefined();
  });

  it("does not render Suggest Tiers button for 'other' event type", () => {
    render(<TicketTierBuilder {...defaultProps} eventType="other" />);
    expect(screen.queryByTestId("suggest-tiers-btn")).toBeNull();
  });

  it("clicking Add Tier adds a tier row", () => {
    render(<TicketTierBuilder {...defaultProps} />);
    fireEvent.click(screen.getByTestId("add-tier-btn"));
    expect(screen.getByTestId("tier-row")).toBeDefined();
    expect(screen.getByTestId("tier-name-input")).toBeDefined();
    expect(screen.getByTestId("tier-price-input")).toBeDefined();
    expect(screen.getByTestId("tier-quantity-input")).toBeDefined();
  });

  it("renders tier fields with initial data", () => {
    render(
      <TicketTierBuilder
        {...defaultProps}
        initialTiers={[
          { name: "GA", price: 30000, quantity: 100 },
          { name: "VIP", price: 80000, quantity: 20 },
        ]}
      />
    );
    const nameInputs = screen.getAllByTestId("tier-name-input");
    expect(nameInputs).toHaveLength(2);
    expect((nameInputs[0] as HTMLInputElement).value).toBe("GA");
    expect((nameInputs[1] as HTMLInputElement).value).toBe("VIP");
  });

  it("remove button removes a tier row", () => {
    render(<TicketTierBuilder {...defaultProps} />);
    fireEvent.click(screen.getByTestId("add-tier-btn"));
    expect(screen.getByTestId("tier-row")).toBeDefined();

    fireEvent.click(screen.getByTestId("remove-tier-btn"));
    expect(screen.queryByTestId("tier-row")).toBeNull();
  });

  it("displays running totals when tiers exist", () => {
    render(
      <TicketTierBuilder
        {...defaultProps}
        initialTiers={[
          { name: "GA", price: 30000, quantity: 100 },
          { name: "VIP", price: 80000, quantity: 20 },
        ]}
      />
    );
    expect(screen.getByTestId("total-capacity")).toBeDefined();
    expect(screen.getByTestId("total-capacity").textContent).toBe("120 tickets");
    expect(screen.getByTestId("total-revenue")).toBeDefined();
  });

  // Note: Full form submission/save tests are skipped — react-hook-form interactions hang in jsdom.
  // Validation is thoroughly covered in src/lib/validators/__tests__/ticket-tier.test.ts
  // Convex mutation contracts are covered in convex/ticketTiers.test.ts
});
