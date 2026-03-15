import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGuard } from "../role-guard";

const mockUseQuery = vi.fn();
const mockSwitchRole = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockSwitchRole,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "getCurrentUser",
      switchRole: "switchRole",
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

describe("RoleGuard", () => {
  it("renders loading skeleton when user is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("renders nothing when user is null", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders children when user has the required role", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "artist",
      roles: ["attendee", "artist"],
    });
    render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("renders children when user has any of the required roles", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "organization",
      roles: ["organization"],
    });
    render(
      <RoleGuard requiredRoles={["artist", "organization"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("renders access denied when user lacks the required role", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "attendee",
      roles: ["attendee"],
    });
    render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.queryByText("Protected Content")).toBeNull();
    expect(screen.getByText("Access Restricted")).toBeDefined();
    expect(screen.getByText(/Add Artist Role/)).toBeDefined();
  });

  it("shows multiple role names in access denied message", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "attendee",
      roles: ["attendee"],
    });
    render(
      <RoleGuard requiredRoles={["artist", "organization"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText(/Artist or Organization/)).toBeDefined();
  });

  it("shows Switch button when user has required role but not active", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "attendee",
      roles: ["attendee", "artist"],
    });
    render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText(/Switch to Artist/)).toBeDefined();
  });

  it("shows Add Role button when user lacks the required role entirely", () => {
    mockUseQuery.mockReturnValue({
      activeRole: "attendee",
      roles: ["attendee"],
    });
    render(
      <RoleGuard requiredRoles={["artist"]}>
        <div>Protected Content</div>
      </RoleGuard>
    );
    expect(screen.getByText(/Add Artist Role/)).toBeDefined();
  });
});
