import { describe, it, expect } from "vitest";
import { getStatusBadgeVariant } from "../event-status";

describe("getStatusBadgeVariant", () => {
  it("returns secondary variant for draft", () => {
    const config = getStatusBadgeVariant("draft");
    expect(config.variant).toBe("secondary");
    expect(config.className).toBeUndefined();
  });

  it("returns default variant for published", () => {
    const config = getStatusBadgeVariant("published");
    expect(config.variant).toBe("default");
    expect(config.className).toBeUndefined();
  });

  it("returns green custom class for on_sale", () => {
    const config = getStatusBadgeVariant("on_sale");
    expect(config.className).toContain("green");
  });

  it("returns destructive variant for sold_out", () => {
    const config = getStatusBadgeVariant("sold_out");
    expect(config.variant).toBe("destructive");
  });

  it("returns secondary variant for completed", () => {
    const config = getStatusBadgeVariant("completed");
    expect(config.variant).toBe("secondary");
  });

  it("returns outline variant with destructive styling for cancelled", () => {
    const config = getStatusBadgeVariant("cancelled");
    expect(config.variant).toBe("outline");
    expect(config.className).toContain("destructive");
  });

  it("returns secondary for unknown status", () => {
    const config = getStatusBadgeVariant("unknown_status");
    expect(config.variant).toBe("secondary");
  });
});
