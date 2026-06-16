// ThemeProvider.tsx — Plaza host tokens + the active event theme + user prefs.
//
// Owns the persisted UI preferences (mode / accent / per-event theming) so they
// apply app-wide from the first frame — not just while Settings is mounted.
//
// useTheme() returns:
//   t             -> resolved Tokens (light/dark, with the chosen accent applied)
//   mode          -> resolved "light" | "dark"
//   modePref      -> the user's choice: "light" | "dark" | "system"
//   setMode       -> set the mode preference (persisted)
//   accent        -> current accent hex
//   setAccent     -> set the accent (persisted, applied live)
//   themedEvents  -> whether event screens may wear their own colour world
//   setThemedEvents
//   eventTheme    -> the currently worn event world, or null for neutral chrome
//   setEventTheme -> set/clear the worn event world (a detail screen wears its event)
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { TOKENS, lightTokens, type ThemeMode, type Tokens } from "./tokens";
import {
  EVENT_THEMES,
  type EventTheme,
  type EventThemeId,
} from "./events";
import {
  loadPrefs,
  saveAccent,
  saveEventTheming,
  saveMode,
  type ModePref,
} from "../components/profile/settingsStore";

type ThemeContextValue = {
  t: Tokens;
  mode: ThemeMode;
  modePref: ModePref;
  setMode: (mode: ModePref) => void;
  accent: string;
  setAccent: (hex: string) => void;
  themedEvents: boolean;
  setThemedEvents: (on: boolean) => void;
  eventTheme: EventTheme | null;
  setEventTheme: (theme: EventThemeId | EventTheme | null) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null

  // Plaza is light-first; "system" only follows the device if the user picks it.
  const [modePref, setModePref] = useState<ModePref>("light");
  const [accent, setAccentState] = useState<string>(lightTokens.accent);
  const [themedEvents, setThemedEventsState] = useState<boolean>(true);
  const [eventTheme, setEventThemeState] = useState<EventTheme | null>(null);

  // Load persisted prefs once so they apply across the whole app at startup.
  useEffect(() => {
    let alive = true;
    loadPrefs().then((p) => {
      if (!alive) return;
      setModePref(p.mode);
      setAccentState(p.accent);
      setThemedEventsState(p.eventTheming);
    });
    return () => {
      alive = false;
    };
  }, []);

  const mode: ThemeMode =
    modePref === "system" ? (system === "dark" ? "dark" : "light") : modePref;

  const t = useMemo<Tokens>(
    () => ({ ...TOKENS[mode], accent, accentDark: accent }),
    [mode, accent],
  );

  const setMode = useCallback((m: ModePref) => {
    setModePref(m);
    void saveMode(m);
  }, []);

  const setAccent = useCallback((hex: string) => {
    setAccentState(hex);
    void saveAccent(hex);
  }, []);

  const setThemedEvents = useCallback((on: boolean) => {
    setThemedEventsState(on);
    void saveEventTheming(on);
  }, []);

  const setEventTheme = useCallback(
    (theme: EventThemeId | EventTheme | null) => {
      if (theme == null) return setEventThemeState(null);
      if (typeof theme === "string") {
        setEventThemeState(EVENT_THEMES[theme] ?? null);
        return;
      }
      setEventThemeState(theme);
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      t,
      mode,
      modePref,
      setMode,
      accent,
      setAccent,
      themedEvents,
      setThemedEvents,
      eventTheme,
      setEventTheme,
    }),
    [t, mode, modePref, setMode, accent, setAccent, themedEvents, setThemedEvents, eventTheme, setEventTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
