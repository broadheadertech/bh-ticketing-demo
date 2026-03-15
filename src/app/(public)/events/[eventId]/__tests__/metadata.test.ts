import { describe, it, expect } from "vitest";

/**
 * Pure contract tests for OG metadata generation logic.
 * Tests the transformation rules applied by generateMetadata(),
 * not the Next.js API itself.
 */

// Pure function mirroring generateMetadata() logic
function buildOgMetadata(
  event: {
    title: string;
    description: string;
    artworkUrl: string | null;
  } | null
): {
  title: string;
  description?: string;
  hasOgImage: boolean;
  hasTwitterImage: boolean;
  ogType?: string;
  twitterCard?: string;
} {
  if (!event) return { title: "Event Not Found | PHLive", hasOgImage: false, hasTwitterImage: false };
  const description = event.description.slice(0, 160);
  return {
    title: `${event.title} | PHLive`,
    description,
    hasOgImage: !!event.artworkUrl,
    hasTwitterImage: !!event.artworkUrl,
    ogType: "article",
    twitterCard: "summary_large_image",
  };
}

describe("generateMetadata OG contract", () => {
  it("null event returns fallback title", () => {
    const meta = buildOgMetadata(null);
    expect(meta.title).toBe("Event Not Found | PHLive");
    expect(meta.hasOgImage).toBe(false);
  });

  it("title format is '{event title} | PHLive'", () => {
    const meta = buildOgMetadata({
      title: "Jazz Night",
      description: "A great show",
      artworkUrl: null,
    });
    expect(meta.title).toBe("Jazz Night | PHLive");
  });

  it("description is truncated to 160 chars", () => {
    const longDesc = "A".repeat(200);
    const meta = buildOgMetadata({
      title: "Event",
      description: longDesc,
      artworkUrl: null,
    });
    expect(meta.description).toHaveLength(160);
    expect(meta.description).toBe("A".repeat(160));
  });

  it("description shorter than 160 chars is not padded", () => {
    const shortDesc = "Short description";
    const meta = buildOgMetadata({
      title: "Event",
      description: shortDesc,
      artworkUrl: null,
    });
    expect(meta.description).toBe(shortDesc);
  });

  it("description exactly 160 chars is unchanged", () => {
    const exactDesc = "B".repeat(160);
    const meta = buildOgMetadata({
      title: "Event",
      description: exactDesc,
      artworkUrl: null,
    });
    expect(meta.description).toHaveLength(160);
  });

  it("OG image is present when artworkUrl is set", () => {
    const meta = buildOgMetadata({
      title: "Event",
      description: "desc",
      artworkUrl: "https://storage.convex.cloud/image.jpg",
    });
    expect(meta.hasOgImage).toBe(true);
    expect(meta.hasTwitterImage).toBe(true);
  });

  it("OG image is absent when artworkUrl is null", () => {
    const meta = buildOgMetadata({
      title: "Event",
      description: "desc",
      artworkUrl: null,
    });
    expect(meta.hasOgImage).toBe(false);
    expect(meta.hasTwitterImage).toBe(false);
  });

  it("OG type is 'article' for event pages", () => {
    const meta = buildOgMetadata({
      title: "Event",
      description: "desc",
      artworkUrl: null,
    });
    expect(meta.ogType).toBe("article");
  });

  it("twitter card type is 'summary_large_image'", () => {
    const meta = buildOgMetadata({
      title: "Event",
      description: "desc",
      artworkUrl: "https://storage.convex.cloud/img.jpg",
    });
    expect(meta.twitterCard).toBe("summary_large_image");
  });

  it("empty description produces empty OG description", () => {
    const meta = buildOgMetadata({
      title: "Event",
      description: "",
      artworkUrl: null,
    });
    expect(meta.description).toBe("");
  });
});
