/**
 * Event theme engine — "every event its own world" (TIX.PH Plaza design).
 *
 * The platform chrome stays the neutral Plaza host; each event wears one of
 * these presets on its poster card and detail-page hero. The theme comes from
 * the event's optional `theme` field (picked by the organizer at creation),
 * falling back to a `[theme:x]` tag in the description, then to a mapping
 * from `eventType`.
 */

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
  /** CSS gradient used for poster art and hero backgrounds */
  grad: string;
  /** Primary brand color of the theme (dots, stage tints) */
  primary: string;
  /** Accent color (chips, highlights) */
  accent: string;
};

export const EVENT_THEMES: Record<EventThemeId, EventTheme> = {
  aurora: {
    id: "aurora",
    name: "Aurora Fest",
    tagline: "Northern-lights festival glow",
    grad: "linear-gradient(120deg, #2EE6D6 0%, #7C5CFF 46%, #FF5CC8 100%)",
    primary: "#7C5CFF",
    accent: "#FF5CC8",
  },
  grandprix: {
    id: "grandprix",
    name: "Grand Prix",
    tagline: "Carbon, speed & pole-position gold",
    grad: "linear-gradient(100deg, #E10600 0%, #FF4D00 100%)",
    primary: "#E10600",
    accent: "#FFD700",
  },
  cosmic: {
    id: "cosmic",
    name: "Out of This World",
    tagline: "Neon nebula & starfield drift",
    grad: "linear-gradient(180deg, #1B0B3F 0%, #3C096C 55%, #9D4EDD 130%)",
    primary: "#9D4EDD",
    accent: "#00F5FF",
  },
  tropical: {
    id: "tropical",
    name: "Tropical Sunset",
    tagline: "Golden-hour island sundowner",
    grad: "linear-gradient(180deg, #1A0E2E 0%, #6A2C70 38%, #FF6B35 84%, #F7B32B 100%)",
    primary: "#FF6B35",
    accent: "#F7B32B",
  },
  fiesta: {
    id: "fiesta",
    name: "Fiesta",
    tagline: "Banderitas & warm town-plaza light",
    grad: "linear-gradient(120deg, #E63946 0%, #FFB627 56%, #06A77D 100%)",
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

export const THEME_IDS: string[] = THEME_ORDER;

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
 * override in the description → eventType mapping → fiesta.
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
