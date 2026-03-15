import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StripeConnectButton } from "../stripe-connect-button";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockSaveStripeAccountId = vi.fn();
const mockGetStripeAccountStatus = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => {
    mockUseMutation();
    return mockSaveStripeAccountId;
  },
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "getCurrentUser",
    },
    stripeConnect: {
      saveStripeAccountId: "saveStripeAccountId",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
    toString: () => "",
  }),
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock("@/lib/actions/stripe-connect", () => ({
  createConnectAccount: vi.fn(),
  createDashboardLink: vi.fn(),
  getStripeAccountStatus: (...args: unknown[]) => mockGetStripeAccountStatus(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStripeAccountStatus.mockResolvedValue({
    success: true,
    data: { chargesEnabled: false, detailsSubmitted: false },
  });
});

describe("StripeConnectButton", () => {
  it("renders loading skeleton when user is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<StripeConnectButton />);
    expect(screen.queryByText("Connect with Stripe")).toBeNull();
    expect(screen.queryByText("Open Stripe Dashboard")).toBeNull();
    expect(container.firstChild).not.toBeNull();
  });

  it("renders Connect with Stripe button when not connected", () => {
    mockUseQuery.mockReturnValue({
      _id: "users:abc",
      email: "artist@example.com",
      stripeAccountId: undefined,
    });
    render(<StripeConnectButton />);
    expect(screen.getByText("Connect with Stripe")).toBeDefined();
  });

  it("renders Open Stripe Dashboard button when connected", async () => {
    mockUseQuery.mockReturnValue({
      _id: "users:abc",
      email: "artist@example.com",
      stripeAccountId: "acct_123",
    });
    await act(async () => {
      render(<StripeConnectButton />);
    });
    expect(screen.getByText("Open Stripe Dashboard")).toBeDefined();
  });

  it("does not render Connect button when already connected", async () => {
    mockUseQuery.mockReturnValue({
      _id: "users:abc",
      email: "artist@example.com",
      stripeAccountId: "acct_123",
    });
    await act(async () => {
      render(<StripeConnectButton />);
    });
    expect(screen.queryByText("Connect with Stripe")).toBeNull();
  });

  it("does not render Dashboard button when not connected", () => {
    mockUseQuery.mockReturnValue({
      _id: "users:abc",
      email: "artist@example.com",
      stripeAccountId: null,
    });
    render(<StripeConnectButton />);
    expect(screen.queryByText("Open Stripe Dashboard")).toBeNull();
  });

  it("shows Unknown badge when getStripeAccountStatus fails", async () => {
    mockGetStripeAccountStatus.mockResolvedValue({ success: false, error: "Stripe API error" });
    mockUseQuery.mockReturnValue({
      _id: "users:abc",
      email: "artist@example.com",
      stripeAccountId: "acct_123",
    });
    await act(async () => {
      render(<StripeConnectButton />);
    });
    expect(screen.getByText("Unknown")).toBeDefined();
  });
});
