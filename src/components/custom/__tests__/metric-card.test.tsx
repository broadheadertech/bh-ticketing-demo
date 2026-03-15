import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MetricCard } from "../metric-card";

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(
      <MetricCard icon={<span data-testid="icon">IC</span>} label="Total Events" value={42} />
    );
    expect(screen.getByText("Total Events")).toBeDefined();
    expect(screen.getByText("42")).toBeDefined();
  });

  it("renders string value", () => {
    render(
      <MetricCard icon={<span>IC</span>} label="Revenue" value="$1,234" />
    );
    expect(screen.getByText("$1,234")).toBeDefined();
  });

  it("renders optional subtitle when provided", () => {
    render(
      <MetricCard
        icon={<span>IC</span>}
        label="Tickets Sold"
        value={100}
        subtitle="Across all events"
      />
    );
    expect(screen.getByText("Across all events")).toBeDefined();
  });

  it("does not render subtitle when omitted", () => {
    render(
      <MetricCard icon={<span>IC</span>} label="Events" value={5} />
    );
    expect(screen.queryByText("Across all events")).toBeNull();
  });

  it("renders the icon", () => {
    render(
      <MetricCard icon={<span data-testid="metric-icon">IC</span>} label="Test" value={0} />
    );
    expect(screen.getByTestId("metric-icon")).toBeDefined();
  });
});
