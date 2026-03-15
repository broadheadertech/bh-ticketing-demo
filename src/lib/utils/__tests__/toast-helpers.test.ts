import { describe, it, expect, vi, beforeEach } from "vitest";

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
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

import { showSuccess, showError, showErrorFromCatch } from "../toast-helpers";
import { ConvexError } from "convex/values";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("showSuccess", () => {
  it("calls toast.success with the message", () => {
    showSuccess("Profile saved!");
    expect(mockToast.success).toHaveBeenCalledWith("Profile saved!");
  });
});

describe("showError", () => {
  it("calls toast.error with the message", () => {
    showError("Something failed");
    expect(mockToast.error).toHaveBeenCalledWith("Something failed");
  });
});

describe("showErrorFromCatch", () => {
  it("extracts message from ConvexError", () => {
    const error = new ConvexError("Display name is required");
    showErrorFromCatch(error);
    expect(mockToast.error).toHaveBeenCalledWith("Display name is required");
  });

  it("extracts message from generic Error", () => {
    const error = new Error("Network failed");
    showErrorFromCatch(error);
    expect(mockToast.error).toHaveBeenCalledWith("Network failed");
  });

  it("falls back for non-Error values", () => {
    showErrorFromCatch("string error");
    expect(mockToast.error).toHaveBeenCalledWith(
      "An unexpected error occurred"
    );
  });

  it("falls back for null/undefined", () => {
    showErrorFromCatch(null);
    expect(mockToast.error).toHaveBeenCalledWith(
      "An unexpected error occurred"
    );
  });
});
