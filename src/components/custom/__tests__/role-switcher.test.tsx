import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleSwitcher } from "../role-switcher";

// Mock convex/react hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockSwitchRole = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => {
    mockUseMutation();
    return mockSwitchRole;
  },
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "getCurrentUser",
      switchRole: "switchRole",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RoleSwitcher", () => {
  it("renders loading skeleton when user data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<RoleSwitcher />);
    // Skeleton has the className we set
    const skeleton = document.querySelector(".h-9.w-36");
    expect(skeleton).not.toBeNull();
  });

  it("renders nothing when user is null (not authenticated)", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(<RoleSwitcher />);
    expect(container.innerHTML).toBe("");
  });

  it("renders static text for single-role user (no dropdown)", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee"],
      activeRole: "attendee",
    });
    render(<RoleSwitcher />);
    expect(screen.getByText("Attendee")).toBeDefined();
    // No dropdown trigger (no chevron button)
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders dropdown trigger for multi-role user", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee", "artist"],
      activeRole: "attendee",
    });
    render(<RoleSwitcher />);
    // Should show current role label
    expect(screen.getByText("Attendee")).toBeDefined();
    // Should have a trigger button with aria-haspopup
    const trigger = document.querySelector('[aria-haspopup="listbox"]');
    expect(trigger).not.toBeNull();
  });

  it("shows aria-live region with current role", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee", "artist"],
      activeRole: "artist",
    });
    render(<RoleSwitcher />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.textContent).toContain("Artist");
  });
});
