import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { CreatorProfileForm } from "../creator-profile-form";

const mockUseQuery = vi.fn();
const mockUpsertProfile = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUpsertProfile,
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    creatorProfiles: {
      getMyProfile: "getMyProfile",
      upsertProfile: "upsertProfile",
    },
    users: {
      getCurrentUser: "getCurrentUser",
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

describe("CreatorProfileForm", () => {
  it("renders loading skeletons when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    const { container } = render(<CreatorProfileForm />);
    const skeletonContainer = container.querySelector(".max-w-2xl");
    expect(skeletonContainer).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });

  it("queries both getMyProfile and getCurrentUser", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<CreatorProfileForm />);
    expect(mockUseQuery).toHaveBeenCalledWith("getMyProfile");
    expect(mockUseQuery).toHaveBeenCalledWith("getCurrentUser");
  });

  // Note: Full form rendering tests are skipped because react-hook-form + radix-ui Slot
  // cause test hangs in jsdom. Form field rendering is verified via manual testing.
  // Zod validation is thoroughly covered in src/lib/validators/__tests__/creator-profile.test.ts
});
