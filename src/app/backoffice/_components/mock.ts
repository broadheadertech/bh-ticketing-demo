// Representative data for the back-office dashboards (mirrors the prototype's
// mock layer). Charts/tables render against this; see BACKOFFICE-INTEGRATION.md
// for the live Convex queries each surface maps to.
import { EVENT_THEMES, type EventThemeId } from "@/lib/themes";

export type BoEvent = {
  id: string;
  title: string;
  theme: EventThemeId;
  category: string;
  shortDate: string;
  date: string;
  venue: string;
  city: string;
  from: number; // pesos
  org: string;
  lineup: string[];
  blurb: string;
};

export const BO_EVENTS: BoEvent[] = [
  { id: "aurora-fest", title: "Aurora Music Festival 2026", theme: "aurora", category: "Festival", shortDate: "Jul 5", date: "Jul 5, 2026 · 4:00 PM", venue: "MOA Arena", city: "Pasay", from: 1500, org: "backspace", lineup: ["ridges"], blurb: "Three stages, twenty acts, one glowing night." },
  { id: "manila-gp", title: "Manila Grand Prix", theme: "grandprix", category: "Sports", shortDate: "Aug 2", date: "Aug 2, 2026 · 1:00 PM", venue: "Clark Speedway", city: "Pampanga", from: 1200, org: "gridiron", lineup: [], blurb: "Pole position, carbon and speed." },
  { id: "cosmoverse", title: "Cosmoverse Convention", theme: "cosmic", category: "Convention", shortDate: "Aug 15", date: "Aug 15, 2026 · 10:00 AM", venue: "SMX", city: "Pasay", from: 900, org: "nebula", lineup: [], blurb: "A neon-lit gathering for builders and dreamers." },
  { id: "sunset-sessions", title: "Sunset Sessions: Island Edition", theme: "tropical", category: "Concert", shortDate: "Jun 28", date: "Jun 28, 2026 · 5:00 PM", venue: "La Union Beachfront", city: "San Juan", from: 800, org: "backspace", lineup: ["ridges"], blurb: "Golden-hour sets by the shore." },
  { id: "harvest-fiesta", title: "Barangay Fiesta Nights", theme: "fiesta", category: "Fiesta", shortDate: "Jun 23", date: "Jun 23, 2026 · 6:00 PM", venue: "Plaza Independencia", city: "Cebu", from: 0, org: "nebula", lineup: [], blurb: "A free community fiesta — banderitas and street food." },
  { id: "apex-drift", title: "Apex Drift Series", theme: "grandprix", category: "Sports", shortDate: "Sep 9", date: "Sep 9, 2026 · 2:00 PM", venue: "City Kart", city: "Parañaque", from: 500, org: "gridiron", lineup: [], blurb: "Amateur drift championship finale." },
];

export const ORGANIZERS: Record<string, { id: string; name: string; kind: string; city: string; followers: string }> = {
  backspace: { id: "backspace", name: "Backspace Live", kind: "Concert promoter", city: "Makati", followers: "12.4k" },
  gridiron: { id: "gridiron", name: "GridIron PH", kind: "Motorsport", city: "Pampanga", followers: "5.1k" },
  nebula: { id: "nebula", name: "Nebula Collective", kind: "Festivals & cons", city: "Cebu", followers: "8.9k" },
};

export const ARTISTS: Record<string, { id: string; name: string; meta: string; hue: number; listeners: string; bio: string; tags: string[] }> = {
  ridges: {
    id: "ridges",
    name: "The Ridges",
    meta: "Indie rock · Manila",
    hue: 24,
    listeners: "184k",
    bio: "Four-piece indie outfit from Manila, blending shoegaze textures with OPM songwriting.",
    tags: ["Indie", "Rock", "OPM"],
  },
};

// deterministic per-event stats so charts/tables stay stable across renders
function h32(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type BoStats = {
  cap: number;
  sold: number;
  pct: number;
  revenue: number;
  avg: number;
  scanned: number;
  status: string;
  views: number;
};

export function boStats(ev: BoEvent): BoStats {
  const h = h32(ev.id);
  const cap = 200 + (h % 18) * 100;
  const pct = ev.id === "sunset-sessions" ? 0.92 : 0.28 + ((h >> 4) % 60) / 100;
  const sold = Math.min(cap, Math.round(cap * pct));
  const avg = Math.round((ev.from || 600) * (1.6 + ((h >> 8) % 30) / 20));
  const revenue = sold * avg;
  const scanned = Math.round(sold * (((h >> 6) % 12) / 100));
  const status =
    ev.id === "harvest-fiesta" ? "draft" : ev.id === "apex-drift" ? "pending" : "published";
  return { cap, sold, pct: sold / cap, revenue, avg, scanned, status, views: sold * (6 + (h % 7)) };
}

export const grad = (ev: BoEvent) => EVENT_THEMES[ev.theme].grad;
export const themeName = (ev: BoEvent) => EVENT_THEMES[ev.theme].name;
export const artGrad = (a: { hue: number }) =>
  `conic-gradient(from 140deg, oklch(0.66 0.2 ${a.hue}), oklch(0.7 0.17 ${(a.hue + 55) % 360}), oklch(0.6 0.2 ${(a.hue + 175) % 360}), oklch(0.66 0.2 ${a.hue}))`;

export const withStats = () => BO_EVENTS.map((e) => ({ ...e, _s: boStats(e) }));
export const orgEvents = (orgId: string) =>
  BO_EVENTS.filter((e) => e.org === orgId).map((e) => ({ ...e, _s: boStats(e) }));
export const artistEvents = (artistId: string) =>
  BO_EVENTS.filter((e) => e.lineup.includes(artistId)).map((e) => ({ ...e, _s: boStats(e) }));

export type BoEventWithStats = BoEvent & { _s: BoStats };
