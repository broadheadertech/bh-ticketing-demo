import { describe, it, expect } from "vitest";
import {
  eventTypeSchema,
  eventDetailsSchema,
  createEventSchema,
} from "../event";

describe("eventTypeSchema", () => {
  it("accepts valid event types", () => {
    expect(eventTypeSchema.parse("concert")).toBe("concert");
    expect(eventTypeSchema.parse("racing")).toBe("racing");
    expect(eventTypeSchema.parse("seminar")).toBe("seminar");
    expect(eventTypeSchema.parse("class")).toBe("class");
    expect(eventTypeSchema.parse("other")).toBe("other");
  });

  it("rejects invalid event type", () => {
    expect(() => eventTypeSchema.parse("party")).toThrow();
    expect(() => eventTypeSchema.parse("")).toThrow();
  });
});

describe("eventDetailsSchema", () => {
  const validDetails = {
    title: "My Concert",
    description: "A great event",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "19:00",
    venueName: "The Venue",
  };

  it("accepts valid event details", () => {
    const result = eventDetailsSchema.safeParse(validDetails);
    expect(result.success).toBe(true);
  });

  it("accepts details without venueName", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { venueName: _, ...withoutVenue } = validDetails;
    const result = eventDetailsSchema.safeParse(withoutVenue);
    expect(result.success).toBe(true);
  });

  it("accepts empty string venueName", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      venueName: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 chars", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 5000 chars", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects past date", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      date: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      date: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      time: "7pm",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing time", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      time: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects venueName over 200 chars", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      venueName: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

describe("createEventSchema", () => {
  const validEvent = {
    eventType: "concert" as const,
    title: "My Concert",
    description: "A great event",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "19:00",
    venueName: "The Venue",
  };

  it("accepts valid full event data", () => {
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("rejects invalid event type in full schema", () => {
    const result = createEventSchema.safeParse({
      ...validEvent,
      eventType: "party",
    });
    expect(result.success).toBe(false);
  });
});
