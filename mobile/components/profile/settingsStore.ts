// settingsStore.ts — persists user UI preferences in the device secure store.
//
// The foundation ThemeProvider keeps host mode + the worn event world in memory
// but does NOT persist anything. The Settings screen owns persistence: it reads
// these on mount, applies dark mode via useTheme().setMode, and writes back when
// the user flips a toggle / picks an accent. Per-event theming + accent are
// stored here too so the choice survives a relaunch (other screens can read them
// when they decide whether to skin their chrome).
import * as SecureStore from "expo-secure-store";
import type { ThemeMode } from "../../theme/tokens";

const KEY_MODE = "phlive.pref.mode"; // "light" | "dark" | "system"
const KEY_EVENT_THEMING = "phlive.pref.eventTheming"; // "1" | "0"
const KEY_ACCENT = "phlive.pref.accent"; // hex string

export type ModePref = ThemeMode | "system";

/** Coral default matches tokens.accent. */
export const ACCENT_OPTIONS = [
  { id: "coral", color: "#EA5A3D", label: "Coral" },
  { id: "mango", color: "#FFC53D", label: "Mango" },
  { id: "green", color: "#0E8A6E", label: "Green" },
  { id: "blue", color: "#118AB2", label: "Blue" },
  { id: "violet", color: "#7C5CFF", label: "Violet" },
  { id: "pink", color: "#FF5CC8", label: "Pink" },
] as const;

export type Prefs = {
  mode: ModePref;
  eventTheming: boolean;
  accent: string;
};

export const DEFAULT_PREFS: Prefs = {
  // Plaza is light-first: a fresh install defaults to light, not the device theme.
  // Users can explicitly pick "System" to follow the device.
  mode: "light",
  eventTheming: true,
  accent: ACCENT_OPTIONS[0].color,
};

async function read(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore — preference simply won't persist this session
  }
}

export async function loadPrefs(): Promise<Prefs> {
  const [mode, eventTheming, accent] = await Promise.all([
    read(KEY_MODE),
    read(KEY_EVENT_THEMING),
    read(KEY_ACCENT),
  ]);
  return {
    mode:
      mode === "light" || mode === "dark" || mode === "system"
        ? mode
        : DEFAULT_PREFS.mode,
    eventTheming: eventTheming == null ? DEFAULT_PREFS.eventTheming : eventTheming === "1",
    accent: accent ?? DEFAULT_PREFS.accent,
  };
}

export function saveMode(mode: ModePref) {
  return write(KEY_MODE, mode);
}

export function saveEventTheming(on: boolean) {
  return write(KEY_EVENT_THEMING, on ? "1" : "0");
}

export function saveAccent(hex: string) {
  return write(KEY_ACCENT, hex);
}
