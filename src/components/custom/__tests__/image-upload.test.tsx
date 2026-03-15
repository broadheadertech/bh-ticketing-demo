import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImageUpload } from "../image-upload";
import { validateImageFile } from "@/lib/validators/image-upload";

const mockGenerateUploadUrl = vi.fn();
const mockUpdateEventArtwork = vi.fn();
const mockRemoveEventArtwork = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "generateUploadUrl") return mockGenerateUploadUrl;
    if (ref === "updateEventArtwork") return mockUpdateEventArtwork;
    if (ref === "removeEventArtwork") return mockRemoveEventArtwork;
    return vi.fn();
  },
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    files: { generateUploadUrl: "generateUploadUrl" },
    events: {
      updateEventArtwork: "updateEventArtwork",
      removeEventArtwork: "removeEventArtwork",
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

// Mock next/image to a simple img tag
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImageUpload", () => {
  const defaultProps = {
    eventId: "event123",
  };

  it("renders dropzone with upload prompt when no image", () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByTestId("dropzone")).toBeDefined();
    expect(
      screen.getByText("Drop an image here or click to upload")
    ).toBeDefined();
    expect(screen.getByText("JPEG, PNG, or WebP — max 5MB")).toBeDefined();
  });

  it("renders hidden file input in dropzone", () => {
    render(<ImageUpload {...defaultProps} />);
    const fileInput = screen.getByTestId("file-input");
    expect(fileInput).toBeDefined();
    expect(fileInput.getAttribute("type")).toBe("file");
    expect(fileInput.getAttribute("accept")).toBe(
      "image/jpeg,image/png,image/webp"
    );
  });

  it("shows image preview when currentImageUrl is provided", () => {
    render(
      <ImageUpload
        {...defaultProps}
        currentImageUrl="https://example.convex.cloud/image.jpg"
      />
    );
    expect(screen.getByTestId("image-preview")).toBeDefined();
    expect(screen.queryByTestId("dropzone")).toBeNull();
  });

  it("shows replace and remove buttons when image exists", () => {
    render(
      <ImageUpload
        {...defaultProps}
        currentImageUrl="https://example.convex.cloud/image.jpg"
      />
    );
    expect(screen.getByTestId("replace-artwork-btn")).toBeDefined();
    expect(screen.getByTestId("remove-artwork-btn")).toBeDefined();
  });

  it("does not show preview or action buttons when no image", () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.queryByTestId("image-preview")).toBeNull();
    expect(screen.queryByTestId("replace-artwork-btn")).toBeNull();
    expect(screen.queryByTestId("remove-artwork-btn")).toBeNull();
  });

  // Validation is tested via the validator unit tests;
  // verify the validator rejects invalid files here as integration check
  it("validates file type via validateImageFile", () => {
    const gifFile = new File(["data"], "test.gif", { type: "image/gif" });
    const result = validateImageFile(gifFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  it("validates file size via validateImageFile", () => {
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "big.jpg", {
      type: "image/jpeg",
    });
    const result = validateImageFile(bigFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("File too large");
  });

  it("accepts valid image file via validateImageFile", () => {
    const validFile = new File(["data"], "photo.png", { type: "image/png" });
    const result = validateImageFile(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("handles drag over state visually", () => {
    render(<ImageUpload {...defaultProps} />);
    const dropzone = screen.getByTestId("dropzone");

    fireEvent.dragOver(dropzone, { dataTransfer: { files: [] } });
    // Component should still be rendered (drag state is visual only)
    expect(screen.getByTestId("dropzone")).toBeDefined();

    fireEvent.dragLeave(dropzone, { dataTransfer: { files: [] } });
    expect(screen.getByTestId("dropzone")).toBeDefined();
  });
});
