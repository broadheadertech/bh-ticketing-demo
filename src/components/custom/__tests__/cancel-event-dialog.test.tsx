import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const mockCancelEvent = vi.fn().mockResolvedValue(undefined);

// Mock convex/react
vi.mock("convex/react", () => ({
  useMutation: () => mockCancelEvent,
}));

// Mock toast-helpers
vi.mock("@/lib/utils/toast-helpers", () => ({
  showSuccess: vi.fn(),
  showErrorFromCatch: vi.fn(),
}));

// Mock Convex API
vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    events: {
      cancelEvent: "cancelEvent",
    },
  },
}));

// Mock email Server Action (imported by cancel-event-dialog)
vi.mock("@/lib/actions/events", () => ({
  sendEventCancellation: vi.fn().mockResolvedValue({ success: true, emailsSent: 0 }),
}));

// Mock refund Server Action (imported by cancel-event-dialog)
vi.mock("@/lib/actions/refunds", () => ({
  processEventRefunds: vi.fn().mockResolvedValue({ success: true, data: { refunded: 0, failed: 0, skipped: 0 } }),
}));

import { CancelEventDialog } from "../cancel-event-dialog";

describe("CancelEventDialog", () => {
  const defaultProps = {
    eventId: "event_123",
    eventTitle: "Summer Concert",
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders warning text with event title", () => {
    render(<CancelEventDialog {...defaultProps} />);
    expect(screen.getByText(/Summer Concert/)).toBeDefined();
    expect(screen.getByText(/cannot be undone/)).toBeDefined();
  });

  it("renders cancel reason textarea", () => {
    render(<CancelEventDialog {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/cancellation reason/i)
    ).toBeDefined();
  });

  it("renders action and cancel buttons", () => {
    render(<CancelEventDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /cancel event/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /keep event/i })).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<CancelEventDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/Summer Concert/)).toBeNull();
  });

  it("calls mutation on confirm click", async () => {
    render(<CancelEventDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel event/i }));
    await waitFor(() => {
      expect(mockCancelEvent).toHaveBeenCalledOnce();
    });
  });
});
