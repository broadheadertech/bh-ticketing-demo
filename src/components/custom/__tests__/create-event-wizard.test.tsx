import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateEventWizard } from "../create-event-wizard";

const mockCreateEvent = vi.fn();
const mockPush = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockCreateEvent,
  useQuery: () => [],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    events: {
      createEvent: "createEvent",
    },
    venues: {
      listPublicVenues: "listPublicVenues",
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("convex/values", () => ({
  ConvexError: class ConvexError extends Error {
    data: unknown;
    constructor(data: unknown) {
      super(typeof data === "string" ? data : "ConvexError");
      this.data = data;
    }
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CreateEventWizard", () => {
  it("renders step 1 with event type cards", () => {
    render(<CreateEventWizard />);
    expect(
      screen.getByText("What type of event are you creating?")
    ).toBeDefined();
    expect(screen.getByTestId("event-type-concert")).toBeDefined();
    expect(screen.getByTestId("event-type-racing")).toBeDefined();
    expect(screen.getByTestId("event-type-seminar")).toBeDefined();
    expect(screen.getByTestId("event-type-class")).toBeDefined();
    expect(screen.getByTestId("event-type-other")).toBeDefined();
  });

  it("renders all event type labels", () => {
    render(<CreateEventWizard />);
    expect(screen.getByText("Concert / Gig")).toBeDefined();
    expect(screen.getByText("Racing Event")).toBeDefined();
    expect(screen.getByText("Seminar / Workshop")).toBeDefined();
    expect(screen.getByText("Class / Course")).toBeDefined();
    expect(screen.getByText("Other")).toBeDefined();
  });

  it("renders step indicator showing step 1", () => {
    render(<CreateEventWizard />);
    expect(screen.getByText("Event Type")).toBeDefined();
    expect(screen.getByText("Details")).toBeDefined();
    expect(screen.getByText("Review")).toBeDefined();
  });

  it("clicking a type card advances to step 2", () => {
    render(<CreateEventWizard />);
    fireEvent.click(screen.getByTestId("event-type-concert"));
    expect(screen.getByText("Event Details")).toBeDefined();
    expect(
      screen.queryByText("What type of event are you creating?")
    ).toBeNull();
  });

  it("step 2 renders form fields", () => {
    render(<CreateEventWizard />);
    fireEvent.click(screen.getByTestId("event-type-concert"));
    expect(screen.getByText("Title")).toBeDefined();
    expect(screen.getByText("Description")).toBeDefined();
    expect(screen.getByText("Date")).toBeDefined();
    expect(screen.getByText("Time")).toBeDefined();
    expect(screen.getByText("Venue (optional)")).toBeDefined();
  });

  it("back button on step 2 returns to step 1", () => {
    render(<CreateEventWizard />);
    fireEvent.click(screen.getByTestId("event-type-concert"));
    expect(screen.getByText("Event Details")).toBeDefined();

    fireEvent.click(screen.getByTestId("back-button"));
    expect(
      screen.getByText("What type of event are you creating?")
    ).toBeDefined();
  });

  // Note: Full form submission tests are skipped because react-hook-form + radix-ui Slot
  // cause test hangs in jsdom (known issue from Story 1.4).
  // Zod validation is thoroughly covered in src/lib/validators/__tests__/event.test.ts
  // Convex mutation contracts are covered in convex/events.test.ts
});
