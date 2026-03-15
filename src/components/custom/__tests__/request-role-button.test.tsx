import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestRoleButton } from "../request-role-button";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockAddRole = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => {
    mockUseMutation();
    return mockAddRole;
  },
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "getCurrentUser",
      addRole: "addRole",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RequestRoleButton", () => {
  it("renders nothing when user is null", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(<RequestRoleButton />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when user has all roles", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee", "artist", "organization", "venue_manager", "admin", "staff"],
      activeRole: "attendee",
    });
    const { container } = render(<RequestRoleButton />);
    expect(container.innerHTML).toBe("");
  });

  it("renders Add Role button when user has fewer than all roles", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee"],
      activeRole: "attendee",
    });
    render(<RequestRoleButton />);
    expect(screen.getByText("Add Role")).toBeDefined();
  });

  it("renders nothing when user data is loading", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<RequestRoleButton />);
    // undefined is falsy, so returns null
    expect(container.innerHTML).toBe("");
  });
});
