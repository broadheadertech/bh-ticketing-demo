import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarNav } from "../sidebar-nav";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    users: {
      getCurrentUser: "getCurrentUser",
    },
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/tickets",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SidebarNav", () => {
  it("renders loading skeletons when user data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<SidebarNav />);
    const skeletons = document.querySelectorAll(".h-9.w-full");
    expect(skeletons.length).toBe(3);
  });

  it("renders nothing when user is null", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(<SidebarNav />);
    expect(container.innerHTML).toBe("");
  });

  it("renders attendee nav items for attendee role", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee"],
      activeRole: "attendee",
    });
    render(<SidebarNav />);
    expect(screen.getByText("My Tickets")).toBeDefined();
    expect(screen.getByText("Discover Events")).toBeDefined();
  });

  it("renders artist nav items for artist role", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee", "artist"],
      activeRole: "artist",
    });
    render(<SidebarNav />);
    expect(screen.getByText("My Events")).toBeDefined();
    expect(screen.getByText("Create Event")).toBeDefined();
    expect(screen.getByText("Revenue")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders organization nav items with Settings link", () => {
    mockUseQuery.mockReturnValue({
      roles: ["attendee", "organization"],
      activeRole: "organization",
    });
    render(<SidebarNav />);
    expect(screen.getByText("My Events")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("renders admin nav items for admin role", () => {
    mockUseQuery.mockReturnValue({
      roles: ["admin"],
      activeRole: "admin",
    });
    render(<SidebarNav />);
    expect(screen.getByText("Overview")).toBeDefined();
    expect(screen.getByText("Users")).toBeDefined();
    expect(screen.getByText("Moderation")).toBeDefined();
    expect(screen.getByText("Financial")).toBeDefined();
  });

  it("falls back to attendee nav for unknown role", () => {
    mockUseQuery.mockReturnValue({
      roles: ["unknown_role"],
      activeRole: "unknown_role",
    });
    render(<SidebarNav />);
    expect(screen.getByText("My Tickets")).toBeDefined();
  });
});
