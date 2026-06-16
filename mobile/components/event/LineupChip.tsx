// LineupChip.tsx — a horizontally-scrolling line-up/participant chip: an avatar
// over a name. Ported from m-event.jsx ArtistChip. Names come from the backend's
// resolved `lineup` array (artist accounts + participant roster).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";

export type LineupChipProps = {
  name: string;
  /** index in the lineup — used to rotate the avatar hue for variety. */
  index?: number;
};

export function LineupChip({ name, index = 0 }: LineupChipProps) {
  const { t } = useTheme();
  return (
    <View style={styles.wrap}>
      <Avatar size={68} hue={(index * 47 + 220) % 360}>
        <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
      </Avatar>
      <Text
        numberOfLines={1}
        style={[styles.name, { color: t.ink, fontFamily: t.fonts.body }]}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 76, alignItems: "center", gap: 7 },
  initial: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 6,
  },
  name: { fontSize: 12.5, fontWeight: "700", textAlign: "center", maxWidth: 76 },
});
