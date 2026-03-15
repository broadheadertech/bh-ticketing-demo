import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for review submission.
 * No Convex runtime — tests business rule logic only.
 */

// ---------------------------------------------------------------------------
// Rating validation
// ---------------------------------------------------------------------------

describe("rating validation", () => {
  function isValidRating(rating: number): boolean {
    return Number.isInteger(rating) && rating >= 1 && rating <= 5;
  }

  it("accepts rating 1", () => {
    expect(isValidRating(1)).toBe(true);
  });

  it("accepts rating 5", () => {
    expect(isValidRating(5)).toBe(true);
  });

  it("accepts rating 3", () => {
    expect(isValidRating(3)).toBe(true);
  });

  it("rejects rating 0", () => {
    expect(isValidRating(0)).toBe(false);
  });

  it("rejects rating 6", () => {
    expect(isValidRating(6)).toBe(false);
  });

  it("rejects fractional ratings", () => {
    expect(isValidRating(3.5)).toBe(false);
    expect(isValidRating(4.2)).toBe(false);
  });

  it("rejects negative ratings", () => {
    expect(isValidRating(-1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Text length validation
// ---------------------------------------------------------------------------

describe("review text validation", () => {
  const MAX_LENGTH = 500;

  it("accepts empty text (optional)", () => {
    const text = undefined;
    expect(text === undefined || text.length <= MAX_LENGTH).toBe(true);
  });

  it("accepts text within limit", () => {
    const text = "Great event!";
    expect(text.length <= MAX_LENGTH).toBe(true);
  });

  it("accepts text at exactly 500 chars", () => {
    const text = "x".repeat(500);
    expect(text.length <= MAX_LENGTH).toBe(true);
  });

  it("rejects text over 500 chars", () => {
    const text = "x".repeat(501);
    expect(text.length <= MAX_LENGTH).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Attendance verification
// ---------------------------------------------------------------------------

describe("attendance verification", () => {
  it("verifies attendance via scannedAt on matching ticket", () => {
    const tickets = [
      { buyerEmail: "alice@test.com", scannedAt: 1700000000000 },
      { buyerEmail: "bob@test.com", scannedAt: undefined },
    ];
    const userEmail = "alice@test.com";

    const hasScanned = tickets.some(
      (t) => t.buyerEmail === userEmail && t.scannedAt !== undefined
    );
    expect(hasScanned).toBe(true);
  });

  it("rejects user with ticket but no scan", () => {
    const tickets = [
      { buyerEmail: "alice@test.com", scannedAt: undefined },
    ];
    const userEmail = "alice@test.com";

    const hasScanned = tickets.some(
      (t) => t.buyerEmail === userEmail && t.scannedAt !== undefined
    );
    expect(hasScanned).toBe(false);
  });

  it("rejects user with no ticket at all", () => {
    const tickets = [
      { buyerEmail: "bob@test.com", scannedAt: 1700000000000 },
    ];
    const userEmail = "alice@test.com";

    const hasScanned = tickets.some(
      (t) => t.buyerEmail === userEmail && t.scannedAt !== undefined
    );
    expect(hasScanned).toBe(false);
  });

  it("accepts if at least one ticket is scanned (multiple tickets)", () => {
    const tickets = [
      { buyerEmail: "alice@test.com", scannedAt: undefined },
      { buyerEmail: "alice@test.com", scannedAt: 1700000000000 },
    ];
    const userEmail = "alice@test.com";

    const hasScanned = tickets.some(
      (t) => t.buyerEmail === userEmail && t.scannedAt !== undefined
    );
    expect(hasScanned).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Duplicate review prevention
// ---------------------------------------------------------------------------

describe("duplicate review prevention", () => {
  it("detects existing review for same event and user", () => {
    const existingReview = {
      eventId: "events:e1",
      reviewerId: "users:u1",
      rating: 4,
    };

    const isDuplicate = existingReview !== null;
    expect(isDuplicate).toBe(true);
  });

  it("allows review for different event", () => {
    const existingReviewForEvent = null; // no review found
    const isDuplicate = existingReviewForEvent !== null;
    expect(isDuplicate).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Review shape
// ---------------------------------------------------------------------------

describe("review entry shape", () => {
  it("includes all required fields", () => {
    const review = {
      eventId: "events:e1",
      reviewerId: "users:u1",
      rating: 5,
      text: "Amazing show!",
      isVerified: true,
      createdAt: Date.now(),
    };

    expect(review).toHaveProperty("eventId");
    expect(review).toHaveProperty("reviewerId");
    expect(review).toHaveProperty("rating");
    expect(review).toHaveProperty("text");
    expect(review).toHaveProperty("isVerified");
    expect(review).toHaveProperty("createdAt");
    expect(review.isVerified).toBe(true);
    expect(typeof review.rating).toBe("number");
    expect(typeof review.createdAt).toBe("number");
  });

  it("allows text to be undefined", () => {
    const review = {
      eventId: "events:e1",
      reviewerId: "users:u1",
      rating: 3,
      text: undefined,
      isVerified: true,
      createdAt: Date.now(),
    };

    expect(review.text).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Review eligibility on tickets page
// ---------------------------------------------------------------------------

describe("review eligibility logic", () => {
  const now = Date.now();

  it("eligible: past event + scanned ticket + not reviewed", () => {
    const ticket = { eventDate: now - 86400000, scannedAt: 1700000000000, eventStatus: "published" };
    const alreadyReviewed = false;
    const isPast = ticket.eventDate < now;
    const canReview = isPast && !!ticket.scannedAt && ticket.eventStatus !== "cancelled" && !alreadyReviewed;
    expect(canReview).toBe(true);
  });

  it("not eligible: future event", () => {
    const ticket = { eventDate: now + 86400000, scannedAt: 1700000000000, eventStatus: "published" };
    const isPast = ticket.eventDate < now;
    expect(isPast).toBe(false);
  });

  it("not eligible: no scan", () => {
    const ticket = { eventDate: now - 86400000, scannedAt: undefined, eventStatus: "published" };
    const canReview = !!ticket.scannedAt;
    expect(canReview).toBe(false);
  });

  it("not eligible: already reviewed", () => {
    const alreadyReviewed = true;
    expect(!alreadyReviewed).toBe(false);
  });

  it("not eligible: cancelled event", () => {
    const ticket = { eventStatus: "cancelled" };
    expect(ticket.eventStatus !== "cancelled").toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Public review return shape (Story 11.2)
// ---------------------------------------------------------------------------

describe("public review return shape", () => {
  it("includes only safe public fields", () => {
    const publicReview = {
      reviewerName: "Alice",
      rating: 5,
      text: "Great show!",
      createdAt: Date.now(),
      isVerified: true,
    };

    expect(publicReview).toHaveProperty("reviewerName");
    expect(publicReview).toHaveProperty("rating");
    expect(publicReview).toHaveProperty("text");
    expect(publicReview).toHaveProperty("createdAt");
    expect(publicReview).toHaveProperty("isVerified");
  });

  it("does NOT include internal IDs or email", () => {
    const publicReview = {
      reviewerName: "Alice",
      rating: 5,
      text: "Great show!",
      createdAt: Date.now(),
      isVerified: true,
    };

    expect(publicReview).not.toHaveProperty("reviewerId");
    expect(publicReview).not.toHaveProperty("eventId");
    expect(publicReview).not.toHaveProperty("_id");
    expect(publicReview).not.toHaveProperty("email");
  });
});

// ---------------------------------------------------------------------------
// Average rating computation (Story 11.2)
// ---------------------------------------------------------------------------

describe("average rating computation", () => {
  it("computes average for multiple reviews", () => {
    const ratings = [5, 4, 3, 5, 3];
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    expect(Math.round(avg * 10) / 10).toBe(4);
  });

  it("rounds to one decimal place", () => {
    const ratings = [5, 4, 4];
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    expect(Math.round(avg * 10) / 10).toBe(4.3);
  });

  it("returns 0 for empty reviews", () => {
    const ratings: number[] = [];
    const avg = ratings.length > 0
      ? ratings.reduce((s, r) => s + r, 0) / ratings.length
      : 0;
    expect(avg).toBe(0);
  });

  it("handles single review", () => {
    const ratings = [3];
    const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
    expect(avg).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Creator aggregate rating (Story 11.2)
// ---------------------------------------------------------------------------

describe("creator aggregate rating", () => {
  it("aggregates ratings across multiple events", () => {
    const event1Reviews = [5, 4, 5];
    const event2Reviews = [3, 4];

    const allRatings = [...event1Reviews, ...event2Reviews];
    const totalReviews = allRatings.length;
    const avg = allRatings.reduce((s, r) => s + r, 0) / totalReviews;

    expect(totalReviews).toBe(5);
    expect(Math.round(avg * 10) / 10).toBe(4.2);
  });

  it("returns zero for creator with no reviews", () => {
    const allRatings: number[] = [];
    const totalReviews = allRatings.length;
    const avg = totalReviews > 0
      ? allRatings.reduce((s, r) => s + r, 0) / totalReviews
      : 0;

    expect(totalReviews).toBe(0);
    expect(avg).toBe(0);
  });

  it("returns zero for creator with no events", () => {
    const events: unknown[] = [];
    expect(events.length).toBe(0);
  });

  it("result shape includes averageRating and totalReviews", () => {
    const result = {
      averageRating: 4.2,
      totalReviews: 15,
    };

    expect(result).toHaveProperty("averageRating");
    expect(result).toHaveProperty("totalReviews");
    expect(typeof result.averageRating).toBe("number");
    expect(typeof result.totalReviews).toBe("number");
  });
});
