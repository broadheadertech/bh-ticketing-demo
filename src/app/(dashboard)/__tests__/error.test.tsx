import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "../error";

describe("DashboardError (dashboard error boundary)", () => {
  const mockReset = vi.fn();
  const mockError = Object.assign(new Error("Dashboard error"), {
    digest: "dash123",
  });

  it("renders error heading", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it('renders "Try Again" button that calls reset()', () => {
    render(<DashboardError error={mockError} reset={mockReset} />);
    const tryAgain = screen.getByRole("button", { name: "Try Again" });
    fireEvent.click(tryAgain);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('renders "Go to Dashboard" link pointing to /dashboard', () => {
    render(<DashboardError error={mockError} reset={mockReset} />);
    const link = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("logs error via console.error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardError error={mockError} reset={mockReset} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Dashboard error:",
      "Dashboard error",
      "dash123"
    );
    consoleSpy.mockRestore();
  });
});
