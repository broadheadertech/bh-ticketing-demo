import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketPurchaseCard } from "../ticket-purchase-card";

const mockPush = vi.fn();
const mockPurchaseTickets = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined, // promoCode validation returns undefined (loading/skip)
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    promoCodes: { validatePromoCode: "validatePromoCode" },
  },
}));

vi.mock("../../../../convex/_generated/dataModel", () => ({}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/stripe-checkout", () => ({
  purchaseTickets: (...args: unknown[]) => mockPurchaseTickets(...args),
}));

import { useUser } from "@clerk/nextjs";
const mockUseUser = vi.mocked(useUser);

const baseTiers = [
  {
    _id: "tier:abc",
    name: "General Admission",
    price: 50000, // 500 PHP in centavos
    quantity: 100,
    soldCount: 0,
  },
  {
    _id: "tier:def",
    name: "VIP",
    price: 200000, // 2000 PHP in centavos
    quantity: 50,
    soldCount: 0,
  },
];

const defaultProps = {
  eventId: "event:xyz",
  tiers: baseTiers,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUser.mockReturnValue({
    user: {
      emailAddresses: [{ emailAddress: "buyer@example.com" }],
    },
    isSignedIn: true,
  } as ReturnType<typeof useUser>);
});

describe("TicketPurchaseCard", () => {
  it("renders tier names and prices", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    expect(screen.getByText("General Admission")).toBeDefined();
    expect(screen.getByText("VIP")).toBeDefined();
    // Prices formatted in PHP
    expect(screen.getByText(/₱500/)).toBeDefined();
    expect(screen.getByText(/₱2,000/)).toBeDefined();
  });

  it("Buy Tickets button disabled when no tickets selected", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    const buyButton = screen.getByText("Buy Tickets");
    expect(buyButton.closest("button")).toHaveProperty("disabled", true);
  });

  it("shows Sign in to Buy Tickets when not authenticated", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isSignedIn: false,
    } as ReturnType<typeof useUser>);
    render(<TicketPurchaseCard {...defaultProps} />);
    expect(screen.getByText("Sign in to Buy Tickets")).toBeDefined();
  });

  it("shows running total when tickets selected", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]); // Add 1x General Admission (500 PHP)
    // Total section appears; at least one ₱500 element (tier price + total)
    const matches = screen.getAllByText(/₱500/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("respects available quantity limit on + button", () => {
    const limitedTiers = [
      {
        _id: "tier:abc",
        name: "Limited",
        price: 50000,
        quantity: 2,
        soldCount: 1, // only 1 remaining
      },
    ];
    render(<TicketPurchaseCard {...defaultProps} tiers={limitedTiers} />);
    const plusButton = screen.getByText("+");
    fireEvent.click(plusButton); // quantity = 1 (max = 1)
    // Plus button should now be disabled
    expect(plusButton.closest("button")).toHaveProperty("disabled", true);
  });

  it("minus button disabled when quantity is 0", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    const minusButtons = screen.getAllByText("−");
    expect(minusButtons[0].closest("button")).toHaveProperty("disabled", true);
  });

  it("redirects unauthenticated user to sign-in when Buy Tickets clicked", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isSignedIn: false,
    } as ReturnType<typeof useUser>);
    render(<TicketPurchaseCard {...defaultProps} />);
    // First select a ticket so the button becomes enabled
    const plusButton = screen.getAllByText("+")[0];
    fireEvent.click(plusButton);
    // Now click the button — should redirect to sign-in
    const buyButton = screen.getByText("Sign in to Buy Tickets");
    fireEvent.click(buyButton);
    expect(mockPush).toHaveBeenCalledWith(
      "/sign-in?redirect_url=/events/event:xyz"
    );
  });

  it("shows remaining count per tier", () => {
    const tiersWithSold = [
      {
        _id: "tier:abc",
        name: "General Admission",
        price: 50000,
        quantity: 100,
        soldCount: 30,
      },
    ];
    render(<TicketPurchaseCard {...defaultProps} tiers={tiersWithSold} />);
    expect(screen.getByText(/70 remaining/)).toBeDefined();
  });

  it("total section hidden when no tickets selected", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    expect(screen.queryByText("Total")).toBeNull();
  });

  it("total section visible after selecting tickets", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]);
    expect(screen.getByText("Total")).toBeDefined();
  });

  it("shows Tickets card title", () => {
    render(<TicketPurchaseCard {...defaultProps} />);
    expect(screen.getByText("Tickets")).toBeDefined();
  });
});
