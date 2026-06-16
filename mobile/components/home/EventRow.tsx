// EventRow.tsx — horizontal list card for the "This weekend" rail. Ported from
// m-home.jsx <EventRow />: a small 64px poster thumb + title + date/venue pills
// + a heart toggle. The heart is local-only (no backend saved list yet); it
// reports presses via onToggleSave so the parent can keep an in-memory Set.
import { Calendar, Heart, MapPin } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Pill, Poster } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { themeForEvent } from "@/theme/events";
import { useTheme } from "@/theme/ThemeProvider";
import { eventPlace, type PublicEvent } from "./types";

export function EventRow({
  ev,
  saved,
  onPress,
  onToggleSave,
}: {
  ev: PublicEvent;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}) {
  const { t } = useTheme();
  const theme = themeForEvent(ev);

  return (
    <Pressable onPress={onPress}>
      <Card padded={false} style={styles.card}>
        <View style={styles.thumb}>
          <Poster eventTheme={theme} image={ev.artworkUrl} ratio={1 / 1.18} scrim={false} />
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]} numberOfLines={2}>
            {ev.title}
          </Text>
          <View style={styles.pills}>
            <Pill label={formatDate(ev.date)} left={<Calendar color={t.ink2} size={12} />} />
            <Pill label={eventPlace(ev)} left={<MapPin color={t.ink2} size={12} />} />
          </View>
        </View>

        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          style={styles.heart}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved" : "Save event"}
        >
          <Heart
            color={saved ? t.accent : t.ink3}
            fill={saved ? t.accent : "transparent"}
            size={20}
          />
        </Pressable>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "stretch", padding: 9, gap: 12 },
  thumb: { width: 64, flexShrink: 0 },
  body: { flex: 1, justifyContent: "center", gap: 6 },
  title: { fontSize: 15, fontWeight: "800" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  heart: { alignSelf: "center", padding: 4 },
});
