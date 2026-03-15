import { describe, it, expect } from "vitest";
import { filterEventsByStatus, filterEventsByType } from "../event-filters";

describe("filterEventsByStatus", () => {
  const events = [
    { _id: "1", status: "draft", title: "Draft Event" },
    { _id: "2", status: "published", title: "Published Event" },
    { _id: "3", status: "cancelled", title: "Cancelled Event" },
    { _id: "4", status: "draft", title: "Another Draft" },
  ];

  it("returns all events when status is 'all'", () => {
    const result = filterEventsByStatus(events, "all");
    expect(result.length).toBe(4);
  });

  it("returns all events when status is null", () => {
    const result = filterEventsByStatus(events, null);
    expect(result.length).toBe(4);
  });

  it("filters events by draft status", () => {
    const result = filterEventsByStatus(events, "draft");
    expect(result.length).toBe(2);
    expect(result.every((e) => e.status === "draft")).toBe(true);
  });

  it("filters events by published status", () => {
    const result = filterEventsByStatus(events, "published");
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Published Event");
  });

  it("filters events by cancelled status", () => {
    const result = filterEventsByStatus(events, "cancelled");
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Cancelled Event");
  });

  it("returns empty array when no events match", () => {
    const result = filterEventsByStatus(events, "completed");
    expect(result.length).toBe(0);
  });

  it("returns empty array for empty input", () => {
    const result = filterEventsByStatus([], "draft");
    expect(result.length).toBe(0);
  });
});

describe("filterEventsByType", () => {
  const events = [
    { _id: "1", eventType: "concert", title: "Rock Night" },
    { _id: "2", eventType: "racing", title: "Race 1" },
    { _id: "3", eventType: "racing", title: "Race 2" },
    { _id: "4", eventType: "seminar", title: "Workshop" },
    { _id: "5", eventType: "class", title: "Training Session" },
  ];

  it("returns all events when type is 'all'", () => {
    expect(filterEventsByType(events, "all").length).toBe(5);
  });

  it("returns all events when type is null", () => {
    expect(filterEventsByType(events, null).length).toBe(5);
  });

  it("returns all events when type is empty string", () => {
    expect(filterEventsByType(events, "").length).toBe(5);
  });

  it("filters by exact eventType match", () => {
    const result = filterEventsByType(events, "racing");
    expect(result.length).toBe(2);
    expect(result.every((e) => e.eventType === "racing")).toBe(true);
  });

  it("filters single-result type correctly", () => {
    const result = filterEventsByType(events, "concert");
    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Rock Night");
  });

  it("returns empty array when no events match type", () => {
    expect(filterEventsByType(events, "other").length).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterEventsByType([], "racing").length).toBe(0);
  });

  it("works when chained with filterEventsByStatus", () => {
    const withStatus = [
      { _id: "1", eventType: "racing", status: "published" },
      { _id: "2", eventType: "racing", status: "draft" },
      { _id: "3", eventType: "concert", status: "published" },
    ];
    const result = filterEventsByType(
      filterEventsByStatus(withStatus, "published"),
      "racing"
    );
    expect(result.length).toBe(1);
    expect(result[0]._id).toBe("1");
  });
});
