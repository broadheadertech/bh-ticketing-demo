import { describe, it, expect } from "vitest";
import {
  filterEventsByDateRange,
  filterEventsByType,
  filterEventsByStatus,
} from "./event-filters";

// ---------------------------------------------------------------------------
// filterEventsByDateRange
// ---------------------------------------------------------------------------

describe("filterEventsByDateRange", () => {
  // Fixed reference date: Wednesday, 2026-03-11 12:00:00 UTC (day=3, weekday)
  // Use a Thursday so "this_weekend" targets Fri-Sun of same week
  const refDate = new Date(2026, 2, 12, 12, 0, 0).getTime(); // Thursday March 12 2026 noon local

  // Boundaries based on refDate (Thursday March 12)
  const todayStart = new Date(2026, 2, 12, 0, 0, 0).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const fridayStart = new Date(2026, 2, 13, 0, 0, 0).getTime(); // March 13 Fri
  const sundayEnd = new Date(2026, 2, 15, 23, 59, 59, 999).getTime(); // March 15 Sun end
  const monthStart = new Date(2026, 2, 1, 0, 0, 0).getTime();
  const monthEnd = new Date(2026, 2, 31, 23, 59, 59, 999).getTime();

  const makeEvent = (date: number) => ({ date });

  it("null range returns all events", () => {
    const events = [makeEvent(refDate), makeEvent(refDate + 1)];
    expect(filterEventsByDateRange(events, null, refDate)).toHaveLength(2);
  });

  it('"all" range returns all events', () => {
    const events = [makeEvent(refDate), makeEvent(refDate + 1)];
    expect(filterEventsByDateRange(events, "all", refDate)).toHaveLength(2);
  });

  it("empty array returns empty for any range", () => {
    expect(filterEventsByDateRange([], "today", refDate)).toHaveLength(0);
    expect(filterEventsByDateRange([], "this_weekend", refDate)).toHaveLength(0);
    expect(filterEventsByDateRange([], "this_month", refDate)).toHaveLength(0);
  });

  describe("today filter", () => {
    it("includes events within today's range", () => {
      const midday = todayStart + 12 * 60 * 60 * 1000;
      const events = [makeEvent(midday)];
      expect(filterEventsByDateRange(events, "today", refDate)).toHaveLength(1);
    });

    it("includes event at start of day", () => {
      expect(
        filterEventsByDateRange([makeEvent(todayStart)], "today", refDate)
      ).toHaveLength(1);
    });

    it("includes event at end of day", () => {
      expect(
        filterEventsByDateRange([makeEvent(todayEnd)], "today", refDate)
      ).toHaveLength(1);
    });

    it("excludes events before today", () => {
      const yesterday = todayStart - 1;
      expect(
        filterEventsByDateRange([makeEvent(yesterday)], "today", refDate)
      ).toHaveLength(0);
    });

    it("excludes events after today", () => {
      const tomorrow = todayEnd + 1;
      expect(
        filterEventsByDateRange([makeEvent(tomorrow)], "today", refDate)
      ).toHaveLength(0);
    });
  });

  describe("this_weekend filter", () => {
    it("includes events on Friday of this weekend", () => {
      const fridayNoon = fridayStart + 12 * 60 * 60 * 1000;
      expect(
        filterEventsByDateRange([makeEvent(fridayNoon)], "this_weekend", refDate)
      ).toHaveLength(1);
    });

    it("includes events on Saturday of this weekend", () => {
      const saturdayNoon = new Date(2026, 2, 14, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange(
          [makeEvent(saturdayNoon)],
          "this_weekend",
          refDate
        )
      ).toHaveLength(1);
    });

    it("includes events on Sunday of this weekend", () => {
      const sundayNoon = new Date(2026, 2, 15, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange(
          [makeEvent(sundayNoon)],
          "this_weekend",
          refDate
        )
      ).toHaveLength(1);
    });

    it("excludes events on Thursday (today, weekday)", () => {
      const thursdayEvent = makeEvent(todayStart + 12 * 60 * 60 * 1000);
      expect(
        filterEventsByDateRange([thursdayEvent], "this_weekend", refDate)
      ).toHaveLength(0);
    });

    it("excludes events on Monday after weekend", () => {
      const mondayNoon = new Date(2026, 2, 16, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange(
          [makeEvent(mondayNoon)],
          "this_weekend",
          refDate
        )
      ).toHaveLength(0);
    });
  });

  describe("this_month filter", () => {
    it("includes events within current month", () => {
      const midMonth = new Date(2026, 2, 15, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange([makeEvent(midMonth)], "this_month", refDate)
      ).toHaveLength(1);
    });

    it("includes event at start of month", () => {
      expect(
        filterEventsByDateRange([makeEvent(monthStart)], "this_month", refDate)
      ).toHaveLength(1);
    });

    it("includes event at end of month", () => {
      expect(
        filterEventsByDateRange([makeEvent(monthEnd)], "this_month", refDate)
      ).toHaveLength(1);
    });

    it("excludes events in prior month", () => {
      const febEvent = new Date(2026, 1, 28, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange([makeEvent(febEvent)], "this_month", refDate)
      ).toHaveLength(0);
    });

    it("excludes events in next month", () => {
      const aprilEvent = new Date(2026, 3, 1, 12, 0, 0).getTime();
      expect(
        filterEventsByDateRange([makeEvent(aprilEvent)], "this_month", refDate)
      ).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// filterEventsByType
// ---------------------------------------------------------------------------

describe("filterEventsByType", () => {
  const events = [
    { eventType: "concert" },
    { eventType: "racing" },
    { eventType: "seminar" },
  ];

  it('"all" returns all events', () => {
    expect(filterEventsByType(events, "all")).toHaveLength(3);
  });

  it("null returns all events", () => {
    expect(filterEventsByType(events, null)).toHaveLength(3);
  });

  it("specific type filters correctly", () => {
    const result = filterEventsByType(events, "concert");
    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("concert");
  });

  it("non-matching type returns empty", () => {
    expect(filterEventsByType(events, "class")).toHaveLength(0);
  });

  it("empty array returns empty", () => {
    expect(filterEventsByType([], "concert")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// filterEventsByStatus
// ---------------------------------------------------------------------------

describe("filterEventsByStatus", () => {
  const events = [
    { status: "published" },
    { status: "on_sale" },
    { status: "draft" },
  ];

  it('"all" returns all events', () => {
    expect(filterEventsByStatus(events, "all")).toHaveLength(3);
  });

  it("null returns all events", () => {
    expect(filterEventsByStatus(events, null)).toHaveLength(3);
  });

  it("specific status filters correctly", () => {
    const result = filterEventsByStatus(events, "published");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("published");
  });

  it("non-matching status returns empty", () => {
    expect(filterEventsByStatus(events, "sold_out")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Location filter logic — pure contract
// ---------------------------------------------------------------------------

function filterEventsByLocation<T extends { venueName?: string }>(
  events: T[],
  location: string
): T[] {
  if (!location.trim()) return events;
  const loc = location.toLowerCase();
  return events.filter((e) => e.venueName?.toLowerCase().includes(loc) ?? false);
}

describe("location filter contract", () => {
  const events = [
    { venueName: "Araneta Coliseum" },
    { venueName: "SM Mall of Asia Arena" },
    { venueName: "BGC Amphitheater" },
    { venueName: undefined },
  ];

  it("empty location returns all events", () => {
    expect(filterEventsByLocation(events, "")).toHaveLength(4);
  });

  it("whitespace-only location returns all events", () => {
    expect(filterEventsByLocation(events, "   ")).toHaveLength(4);
  });

  it("exact match returns the event", () => {
    const result = filterEventsByLocation(events, "Araneta Coliseum");
    expect(result).toHaveLength(1);
  });

  it("partial match (case-insensitive) returns the event", () => {
    const result = filterEventsByLocation(events, "araneta");
    expect(result).toHaveLength(1);
    expect(result[0].venueName).toBe("Araneta Coliseum");
  });

  it("partial match across multiple events", () => {
    const result = filterEventsByLocation(events, "a");
    // Araneta, Mall of Asia, BGC Amphitheater — all contain 'a'
    expect(result.length).toBeGreaterThan(1);
  });

  it("no match returns empty", () => {
    expect(filterEventsByLocation(events, "Rizal Park")).toHaveLength(0);
  });

  it("event with undefined venueName is excluded when location filter is active", () => {
    const result = filterEventsByLocation(events, "arena");
    result.forEach((e) => {
      expect(e.venueName).toBeDefined();
    });
  });
});
