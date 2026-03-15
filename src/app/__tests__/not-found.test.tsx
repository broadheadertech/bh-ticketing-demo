import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "../not-found";

describe("NotFound (global 404)", () => {
  it("renders 404 heading", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText("Page Not Found")).toBeDefined();
  });

  it("renders descriptive message", () => {
    render(<NotFound />);
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has been moved."
      )
    ).toBeDefined();
  });

  it('renders "Go Home" link pointing to /', () => {
    render(<NotFound />);
    const goHome = screen.getByRole("link", { name: "Go Home" });
    expect(goHome).toBeDefined();
    expect(goHome.getAttribute("href")).toBe("/");
  });

  it('renders "Go to Dashboard" link pointing to /dashboard', () => {
    render(<NotFound />);
    const goDashboard = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(goDashboard).toBeDefined();
    expect(goDashboard.getAttribute("href")).toBe("/dashboard");
  });
});
