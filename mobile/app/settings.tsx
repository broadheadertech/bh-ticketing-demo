// app/settings.tsx — appearance & app settings.
//
// Owns persistence of UI prefs (expo-secure-store via settingsStore). On mount
// it loads saved prefs and applies dark mode through useTheme().setMode. The
// foundation ThemeProvider is in-memory only, so this screen is the single place
// that remembers the user's choice across launches.
//
// Controls:
//   - Appearance: Light / Dark / System segmented control (Dark mode toggle)
//   - Per-event theming: switch (lets event screens wear their own world)
//   - Accent: color picker (persisted; applied to the running theme accent)
import React from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  ChevronLeft,
  Info,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react-native";

import { Card, Screen } from "../components/ui";
import { ACCENT_OPTIONS, SettingsRow, type ModePref } from "../components/profile";
import { useTheme } from "../theme/ThemeProvider";

const MODE_OPTIONS: { id: ModePref; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

export default function SettingsScreen() {
  // ThemeProvider owns + persists these now, so changes apply app-wide instantly.
  const { t, modePref, setMode, accent, setAccent, themedEvents, setThemedEvents } =
    useTheme();
  const insets = useSafeAreaInsets();
  const system = useColorScheme();

  const onPickMode = (m: ModePref) => setMode(m);
  const onToggleEventTheming = (v: boolean) => setThemedEvents(v);
  const onPickAccent = (hex: string) => setAccent(hex);

  const darkOn = modePref === "system" ? system === "dark" : modePref === "dark";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        {/* header */}
        <View style={[styles.head, { paddingTop: insets.top > 0 ? 6 : 12 }]}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.push("/"))}
            hitSlop={10}
            style={({ pressed }) => [styles.back, { borderColor: t.line, opacity: pressed ? 0.6 : 1 }]}
          >
            <ChevronLeft size={22} color={t.ink} />
          </Pressable>
          <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>Settings</Text>
        </View>

        {/* APPEARANCE */}
        <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          APPEARANCE
        </Text>
        <Card style={styles.card}>
          <View style={styles.segRow}>
            {MODE_OPTIONS.map(({ id, label, Icon }) => {
              const active = modePref === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => onPickMode(id)}
                  style={[
                    styles.seg,
                    {
                      backgroundColor: active ? t.ink : t.paper2,
                      borderColor: active ? t.ink : t.line,
                    },
                  ]}
                >
                  <Icon size={18} color={active ? t.paper : t.ink2} />
                  <Text
                    style={[
                      styles.segLabel,
                      { color: active ? t.paper : t.ink2, fontFamily: t.fonts.body },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* explicit Dark mode toggle (mirrors the segmented control) */}
          <View style={[styles.switchRow, { borderTopColor: t.line }]}>
            <Moon size={18} color={t.ink} />
            <Text style={[styles.switchTitle, { color: t.ink, fontFamily: t.fonts.body }]}>
              Dark mode
            </Text>
            <Switch
              value={darkOn}
              onValueChange={(v) => onPickMode(v ? "dark" : "light")}
              trackColor={{ false: t.line2, true: t.accent }}
              thumbColor={t.card}
            />
          </View>
        </Card>

        {/* THEMING */}
        <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          THEMING
        </Text>
        <Card style={styles.card}>
          <View style={styles.switchRowTop}>
            <Sparkles size={18} color={t.ink} />
            <View style={styles.switchTextWrap}>
              <Text style={[styles.switchTitle, { color: t.ink, fontFamily: t.fonts.body }]}>
                Per-event theming
              </Text>
              <Text style={[styles.switchSub, { color: t.ink3, fontFamily: t.fonts.body }]}>
                Let each event wear its own colour world.
              </Text>
            </View>
            <Switch
              value={themedEvents}
              onValueChange={onToggleEventTheming}
              trackColor={{ false: t.line2, true: t.accent }}
              thumbColor={t.card}
            />
          </View>

          <View style={[styles.accentBlock, { borderTopColor: t.line }]}>
            <View style={styles.accentHead}>
              <Palette size={18} color={t.ink} />
              <Text style={[styles.switchTitle, { color: t.ink, fontFamily: t.fonts.body }]}>
                Accent colour
              </Text>
            </View>
            <View style={styles.swatches}>
              {ACCENT_OPTIONS.map((opt) => {
                const active = accent.toLowerCase() === opt.color.toLowerCase();
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => onPickAccent(opt.color)}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: opt.color,
                        borderColor: active ? t.ink : "transparent",
                      },
                    ]}
                    accessibilityLabel={opt.label}
                  >
                    {active ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.note, { color: t.ink3, fontFamily: t.fonts.mono }]}>
              SAVED ON THIS DEVICE
            </Text>
          </View>
        </Card>

        {/* ABOUT */}
        <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          ABOUT
        </Text>
        <Card style={styles.card} padded={false}>
          <SettingsRow icon={Shield} title="Privacy & security" onPress={() => {}} />
          <SettingsRow icon={Info} title="Help & support" last onPress={() => {}} />
        </Card>

        <Text style={[styles.footer, { color: t.ink3, fontFamily: t.fonts.mono }]}>
          TIX.PH · v1.0 · Made in the Philippines
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 14 },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontSize: 26, fontWeight: "800" },
  groupLabel: { fontSize: 10, letterSpacing: 0.5, marginTop: 18, marginBottom: 6, marginLeft: 2 },
  card: { gap: 0 },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  segLabel: { fontSize: 13, fontWeight: "800" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchRowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchTextWrap: { flex: 1 },
  switchTitle: { flex: 1, fontSize: 14.5, fontWeight: "700" },
  switchSub: { fontSize: 12.5, marginTop: 2 },
  accentBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accentHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  note: { fontSize: 10, letterSpacing: 0.4, marginTop: 12 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 24, letterSpacing: 0.3 },
});
