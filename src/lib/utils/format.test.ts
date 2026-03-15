import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate } from "./format";

describe("formatCurrency", () => {
  it('returns "Free" for 0 centavos', () => {
    expect(formatCurrency(0)).toBe("Free");
  });

  it("formats centavos to PHP currency", () => {
    const result = formatCurrency(30000);
    // Should contain "300" and PHP symbol
    expect(result).toContain("300");
    expect(result).toMatch(/PHP|₱/);
  });

  it("formats small amounts correctly", () => {
    const result = formatCurrency(150);
    expect(result).toContain("1.50");
  });
});

describe("formatCurrency revenue scenarios", () => {
  it("formats large revenue totals correctly", () => {
    // 25,000 PHP = 2,500,000 centavos
    const result = formatCurrency(2500000);
    expect(result).toContain("25,000");
    expect(result).toMatch(/PHP|₱/);
  });

  it("formats tier revenue (price * soldCount) correctly", () => {
    const price = 50000; // 500 PHP in centavos
    const soldCount = 30;
    const tierRevenue = price * soldCount; // 1,500,000 centavos = 15,000 PHP
    const result = formatCurrency(tierRevenue);
    expect(result).toContain("15,000");
  });
});

describe("formatDate", () => {
  it("formats a timestamp to a readable date", () => {
    // Jan 15, 2026 UTC
    const timestamp = new Date("2026-01-15T00:00:00Z").getTime();
    const result = formatDate(timestamp);
    expect(result).toContain("2026");
    expect(result).toContain("15");
  });
});
