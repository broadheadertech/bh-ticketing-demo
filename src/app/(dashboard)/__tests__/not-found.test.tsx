import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardNotFound from "../not-found";

describe("DashboardNotFound (dashboard 404)", () => {
  it("renders 404 heading", () => {
    render(<DashboardNotFound />);
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText("Page Not Found")).toBeDefined();
  });

  it('renders "Go to Dashboard" link pointing to /dashboard', () => {
    render(<DashboardNotFound />);
    const link = screen.getByRole("link", { name: "Go to Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it('renders "Go Home" link pointing to /', () => {
    render(<DashboardNotFound />);
    const link = screen.getByRole("link", { name: "Go Home" });
    expect(link.getAttribute("href")).toBe("/");
  });
});
