import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "../error";

describe("ErrorPage (global error boundary)", () => {
  const mockReset = vi.fn();
  const testError = Object.assign(new Error("Test error message"), {
    digest: "abc123",
  });

  it("renders error heading", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders generic error message in non-development environments", () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(
      screen.getByText("An unexpected error occurred. Please try again.")
    ).toBeDefined();
  });

  it('renders "Try Again" button that calls reset()', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const tryAgain = screen.getByRole("button", { name: "Try Again" });
    expect(tryAgain).toBeDefined();
    fireEvent.click(tryAgain);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('renders "Go Home" link pointing to /', () => {
    render(<ErrorPage error={testError} reset={mockReset} />);
    const goHome = screen.getByRole("link", { name: "Go Home" });
    expect(goHome).toBeDefined();
    expect(goHome.getAttribute("href")).toBe("/");
  });

  it("logs error via console.error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorPage error={testError} reset={mockReset} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Unhandled error:",
      "Test error message",
      "abc123"
    );
    consoleSpy.mockRestore();
  });
});
