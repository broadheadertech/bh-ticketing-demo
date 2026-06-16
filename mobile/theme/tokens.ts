// tokens.ts — Plaza host design tokens, ported from m-styles.css :root (light)
// and .m-app[data-mode="dark"] (warm dark). These are PLAIN JS values (no CSS
// vars): consume them through useTheme().t in RN StyleSheet.
//
// oklch()/color-mix() from the CSS were resolved to static hex/rgba so RN can
// render them directly.

export type ThemeMode = "light" | "dark";

export type Tokens = {
  mode: ThemeMode;

  // surfaces
  paper: string;
  paper2: string;
  paper3: string;
  card: string;

  // ink (text) scale
  ink: string;
  ink2: string;
  ink3: string;

  // lines / borders
  line: string;
  line2: string;
  hard: string; // hard-shadow / poster border ink

  // brand constants (never re-skinned)
  mango: string;
  green: string;
  blue: string;

  // tweakable accent (Plaza coral by default; an event screen may swap this)
  accent: string;
  accentDark: string;
  accentInk: string;

  // radii
  radii: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };

  // density
  pad: number;
  gap: number;

  // typography families (loaded via expo-font; fall back to system if absent)
  fonts: {
    head: string;
    body: string;
    mono: string;
  };

  // shadow presets (RN shadow + elevation friendly)
  shadows: {
    card: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
};

const RADII = { sm: 11, md: 16, lg: 22, pill: 999 } as const;
const FONTS = {
  head: "BricolageGrotesque",
  body: "Manrope",
  mono: "SpaceMono",
} as const;

export const lightTokens: Tokens = {
  mode: "light",
  paper: "#FBF6EC",
  paper2: "#F3EBDB",
  paper3: "#EDE3CF",
  card: "#FFFCF6",
  ink: "#17120C",
  ink2: "#5B5248",
  ink3: "#8A8073",
  line: "#E4D9C5",
  line2: "#D8CAB0",
  hard: "#17120C",
  mango: "#FFC53D",
  green: "#0E8A6E",
  blue: "#118AB2",
  accent: "#EA5A3D",
  accentDark: "#D24B30", // oklch(l-.08) resolved
  accentInk: "#FFFFFF",
  radii: { ...RADII },
  pad: 16,
  gap: 12,
  fonts: { ...FONTS },
  shadows: {
    card: {
      shadowColor: "#17120C",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 3,
    },
  },
};

export const darkTokens: Tokens = {
  mode: "dark",
  paper: "#15110B",
  paper2: "#1C1710",
  paper3: "#241D14",
  card: "#211A12",
  ink: "#F6EEDF",
  ink2: "#C2B6A2",
  ink3: "#8E826E",
  line: "#352B1E",
  line2: "#423626",
  hard: "#000000",
  mango: "#FFC53D",
  green: "#0E8A6E",
  blue: "#118AB2",
  accent: "#EA5A3D",
  accentDark: "#D24B30",
  accentInk: "#FFFFFF",
  radii: { ...RADII },
  pad: 16,
  gap: 12,
  fonts: { ...FONTS },
  shadows: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 22,
      elevation: 6,
    },
  },
};

export const TOKENS: Record<ThemeMode, Tokens> = {
  light: lightTokens,
  dark: darkTokens,
};
