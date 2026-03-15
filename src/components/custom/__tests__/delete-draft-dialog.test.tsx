import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const mockDeleteDraft = vi.fn().mockResolvedValue(undefined);

// Mock convex/react
vi.mock("convex/react", () => ({
  useMutation: () => mockDeleteDraft,
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
      deleteDraftEvent: "deleteDraftEvent",
    },
  },
}));

import { DeleteDraftDialog } from "../delete-draft-dialog";

describe("DeleteDraftDialog", () => {
  const defaultProps = {
    eventId: "event_123",
    eventTitle: "Draft Show",
    open: true,
    onOpenChange: vi.fn(),
    onDeleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders warning text with event title", () => {
    render(<DeleteDraftDialog {...defaultProps} />);
    expect(screen.getByText(/Draft Show/)).toBeDefined();
    expect(screen.getByText(/permanently remove/)).toBeDefined();
  });

  it("renders action and cancel buttons", () => {
    render(<DeleteDraftDialog {...defaultProps} />);
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /keep draft/i })).toBeDefined();
  });

  it("does not render when closed", () => {
    render(<DeleteDraftDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/Draft Show/)).toBeNull();
  });

  it("calls mutation and onDeleted on confirm click", async () => {
    render(<DeleteDraftDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(mockDeleteDraft).toHaveBeenCalledOnce();
      expect(defaultProps.onDeleted).toHaveBeenCalledOnce();
    });
  });
});
