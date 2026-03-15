import { describe, it, expect } from "vitest";
import { canPublishEvent } from "../event-publish";

describe("canPublishEvent", () => {
  const futureDate = Date.now() + 86400000 * 30; // 30 days from now

  it("should allow publishing a draft event with tiers and future date", () => {
    const result = canPublishEvent({ status: "draft", date: futureDate }, 2);
    expect(result.canPublish).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should reject publishing without tiers", () => {
    const result = canPublishEvent({ status: "draft", date: futureDate }, 0);
    expect(result.canPublish).toBe(false);
    expect(result.reason).toContain("ticket tier");
  });

  it("should reject publishing with past date", () => {
    const pastDate = new Date("2020-01-01").getTime();
    const result = canPublishEvent({ status: "draft", date: pastDate }, 1);
    expect(result.canPublish).toBe(false);
    expect(result.reason).toContain("past date");
  });

  it("should reject publishing non-draft events", () => {
    const result = canPublishEvent({ status: "published", date: futureDate }, 1);
    expect(result.canPublish).toBe(false);
    expect(result.reason).toContain("draft");
  });

  it("should reject cancelled events", () => {
    const result = canPublishEvent({ status: "cancelled", date: futureDate }, 1);
    expect(result.canPublish).toBe(false);
    expect(result.reason).toContain("draft");
  });
});
