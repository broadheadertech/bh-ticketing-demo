// ArtistChip.tsx — round avatar + name chip for the "Trending" rail. Ported
// from the ArtistChip look in the web app (gradient avatar, ink border, name +
// caption). The home feed has no public artist query in scope, so we feed this
// from event-derived "worlds" (one per event-type category) — a real,
// data-backed stand-in that keeps the rail's visual rhythm.
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Avatar } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";

export function ArtistChip({
  label,
  caption,
  hue,
  onPress,
}: {
  label: string;
  caption?: string;
  hue: number;
  onPress?: () => void;
}) {
  const { t } = useTheme();
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <Avatar size={72} hue={hue}>
        <Text style={[styles.initials, { fontFamily: t.fonts.head }]}>{initials}</Text>
      </Avatar>
      <Text
        style={[styles.label, { color: t.ink, fontFamily: t.fonts.body }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.caption, { color: t.ink3, fontFamily: t.fonts.mono }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 80, alignItems: "center", gap: 6 },
  initials: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  label: { fontSize: 12.5, fontWeight: "700", textAlign: "center", maxWidth: 80 },
  caption: { fontSize: 10, letterSpacing: 0.3 },
});
