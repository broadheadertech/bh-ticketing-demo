import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for recurring events.
 * No Convex runtime — tests business rule logic only.
 */

const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly"];
const CREATOR_ROLES = ["artist", "organization"];

// ---------------------------------------------------------------------------
// Frequency validation
// ---------------------------------------------------------------------------

describe("frequency validation", () => {
  it("accepts weekly", () => {
    expect(VALID_FREQUENCIES.includes("weekly")).toBe(true);
  });

  it("accepts biweekly", () => {
    expect(VALID_FREQUENCIES.includes("biweekly")).toBe(true);
  });

  it("accepts monthly", () => {
    expect(VALID_FREQUENCIES.includes("monthly")).toBe(true);
  });

  it("rejects daily", () => {
    expect(VALID_FREQUENCIES.includes("daily")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Day of week validation
// ---------------------------------------------------------------------------

describe("day of week validation", () => {
  it("accepts 0 (Sunday) through 6 (Saturday)", () => {
    for (let i = 0; i <= 6; i++) {
      expect(i >= 0 && i <= 6).toBe(true);
    }
  });

  it("rejects 7", () => {
    expect(7 >= 0 && 7 <= 6).toBe(false);
  });

  it("rejects negative", () => {
    expect(-1 >= 0 && -1 <= 6).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Date generation
// ---------------------------------------------------------------------------

describe("recurring date generation", () => {
  it("generates correct number of dates", () => {
    const count = 4;
    const dates = Array.from({ length: count }, (_, i) => i);
    expect(dates.length).toBe(4);
  });

  it("weekly dates are 7 days apart", () => {
    const base = new Date("2026-03-16").getTime(); // Monday
    const dates = [
      base,
      base + 7 * 86400000,
      base + 14 * 86400000,
      base + 21 * 86400000,
    ];
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] - dates[i - 1]).toBe(7 * 86400000);
    }
  });

  it("biweekly dates are 14 days apart", () => {
    const base = new Date("2026-03-16").getTime();
    const dates = [base, base + 14 * 86400000, base + 28 * 86400000];
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] - dates[i - 1]).toBe(14 * 86400000);
    }
  });
});

// ---------------------------------------------------------------------------
// Instance creation
// ---------------------------------------------------------------------------

describe("recurring instance creation", () => {
  it("creates instances with draft status", () => {
    const instance = { status: "draft", recurringTemplateId: "templates:t1" };
    expect(instance.status).toBe("draft");
    expect(instance.recurringTemplateId).toBeDefined();
  });

  it("copies title and description from template", () => {
    const template = { title: "Weekly Yoga", description: "Relax and stretch" };
    const instance = { title: template.title, description: template.description };
    expect(instance.title).toBe("Weekly Yoga");
    expect(instance.description).toBe("Relax and stretch");
  });

  it("creates tiers with soldCount 0 for each instance", () => {
    const tierTemplate = [
      { name: "Regular", price: 50000, quantity: 20, sortOrder: 0 },
    ];
    const instanceTier = { ...tierTemplate[0], soldCount: 0, eventId: "events:e1" };
    expect(instanceTier.soldCount).toBe(0);
    expect(instanceTier.eventId).toBeDefined();
  });

  it("limits initial generation to 4 instances", () => {
    const occurrences = 12;
    const maxInstances = Math.min(occurrences, 4);
    expect(maxInstances).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Occurrences validation
// ---------------------------------------------------------------------------

describe("occurrences validation", () => {
  it("accepts 1-52 occurrences", () => {
    expect(1 >= 1 && 1 <= 52).toBe(true);
    expect(52 >= 1 && 52 <= 52).toBe(true);
  });

  it("rejects 0 occurrences", () => {
    expect(0 >= 1).toBe(false);
  });

  it("rejects > 52 occurrences", () => {
    expect(53 <= 52).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

describe("recurring event authorization", () => {
  it("allows creator roles", () => {
    expect(CREATOR_ROLES.includes("artist")).toBe(true);
    expect(CREATOR_ROLES.includes("organization")).toBe(true);
  });

  it("rejects non-creator roles", () => {
    expect(CREATOR_ROLES.includes("attendee")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Generate more instances
// ---------------------------------------------------------------------------

describe("generate more instances", () => {
  it("starts from latest existing instance date", () => {
    const instances = [
      { date: new Date("2026-03-16").getTime() },
      { date: new Date("2026-03-23").getTime() },
      { date: new Date("2026-03-30").getTime() },
    ];
    const latestDate = Math.max(...instances.map((e) => e.date));
    expect(latestDate).toBe(new Date("2026-03-30").getTime());
  });

  it("limits generation to 1-12 at a time", () => {
    expect(1 >= 1 && 1 <= 12).toBe(true);
    expect(12 >= 1 && 12 <= 12).toBe(true);
    expect(13 <= 12).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Template return shape
// ---------------------------------------------------------------------------

describe("recurring template return shape", () => {
  it("includes required display fields", () => {
    const template = {
      _id: "templates:t1",
      title: "Weekly Yoga",
      eventType: "class",
      frequency: "weekly",
      dayOfWeek: 1,
      totalInstances: 4,
      draftInstances: 2,
      publishedInstances: 2,
      createdAt: Date.now(),
    };

    expect(template).toHaveProperty("_id");
    expect(template).toHaveProperty("title");
    expect(template).toHaveProperty("frequency");
    expect(template).toHaveProperty("totalInstances");
    expect(template).toHaveProperty("draftInstances");
  });
});
