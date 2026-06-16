// events.ts — "every event its own world." The 5 event themes ported from the
// web app's src/lib/themes.ts. The Plaza chrome stays neutral; an event poster
// or detail hero wears one of these.
//
// `grad` is kept as an ORDERED list of stops (react-native-svg LinearGradient
// or expo-linear-gradient consume `colors`), since RN has no CSS gradient
// string. `gradCss` keeps the original web string for reference/parity.

export type EventThemeId =
  | "aurora"
  | "grandprix"
  | "cosmic"
  | "tropical"
  | "fiesta";

export type EventTheme = {
  id: EventThemeId;
  name: string;
  tagline: string;
  /** Ordered gradient stops for poster art / hero backgrounds (RN-friendly). */
  grad: string[];
  /** Original CSS gradient string (web parity / reference only). */
  gradCss: string;
  /** Primary brand color (dots, stage tints). */
  primary: string;
  /** Accent color (chips, highlights). */
  accent: string;
};

export const EVENT_THEMES: Record<EventThemeId, EventTheme> = {
  aurora: {
    id: "aurora",
    name: "Aurora Fest",
    tagline: "Northern-lights festival glow",
    grad: ["#2EE6D6", "#7C5CFF", "#FF5CC8"],
    gradCss: "linear-gradient(120deg, #2EE6D6 0%, #7C5CFF 46%, #FF5CC8 100%)",
    primary: "#7C5CFF",
    accent: "#FF5CC8",
  },
  grandprix: {
    id: "grandprix",
    name: "Grand Prix",
    tagline: "Carbon, speed & pole-position gold",
    grad: ["#E10600", "#FF4D00"],
    gradCss: "linear-gradient(100deg, #E10600 0%, #FF4D00 100%)",
    primary: "#E10600",
    accent: "#FFD700",
  },
  cosmic: {
    id: "cosmic",
    name: "Out of This World",
    tagline: "Neon nebula & starfield drift",
    grad: ["#1B0B3F", "#3C096C", "#9D4EDD"],
    gradCss: "linear-gradient(180deg, #1B0B3F 0%, #3C096C 55%, #9D4EDD 130%)",
    primary: "#9D4EDD",
    accent: "#00F5FF",
  },
  tropical: {
    id: "tropical",
    name: "Tropical Sunset",
    tagline: "Golden-hour island sundowner",
    grad: ["#1A0E2E", "#6A2C70", "#FF6B35", "#F7B32B"],
    gradCss:
      "linear-gradient(180deg, #1A0E2E 0%, #6A2C70 38%, #FF6B35 84%, #F7B32B 100%)",
    primary: "#FF6B35",
    accent: "#F7B32B",
  },
  fiesta: {
    id: "fiesta",
    name: "Fiesta",
    tagline: "Banderitas & warm town-plaza light",
    grad: ["#E63946", "#FFB627", "#06A77D"],
    gradCss: "linear-gradient(120deg, #E63946 0%, #FFB627 56%, #06A77D 100%)",
    primary: "#E63946",
    accent: "#FFB627",
  },
};

export const THEME_ORDER: EventThemeId[] = [
  "aurora",
  "grandprix",
  "cosmic",
  "tropical",
  "fiesta",
];

/** Fallback mapping when an event has no explicit theme. */
const TYPE_TO_THEME: Record<string, EventThemeId> = {
  concert: "aurora",
  racing: "grandprix",
  seminar: "cosmic",
  class: "tropical",
  other: "fiesta",
};

function isThemeId(value: string | undefined | null): value is EventThemeId {
  return !!value && value in EVENT_THEMES;
}

/**
 * Resolve the theme for an event: explicit `theme` field → `[theme:x]`
 * override in the description → eventType mapping → fiesta. Mirrors the web
 * resolver so mobile and web pick the same world for an event.
 */
export function themeForEvent(event: {
  theme?: string | null;
  eventType?: string;
  description?: string;
}): EventTheme {
  if (isThemeId(event.theme)) return EVENT_THEMES[event.theme];
  const tag = event.description?.match(/\[theme:([a-z]+)\]/)?.[1];
  if (isThemeId(tag)) return EVENT_THEMES[tag];
  const mapped = TYPE_TO_THEME[event.eventType ?? ""];
  return EVENT_THEMES[mapped ?? "fiesta"];
}
