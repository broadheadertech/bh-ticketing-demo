// EventMiniCard.tsx — small event poster tile for the "Upcoming shows" /
// "Events" sections on profile screens. Wears the event's own world via
// themeForEvent + Poster, then navigates to /event/[id] on press.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Poster } from "../ui";
import { themeForEvent } from "../../theme/events";
import { useTheme } from "../../theme/ThemeProvider";
import { formatDate } from "../../lib/format";
import type { Id } from "../../lib/convex";

export type MiniEvent = {
  _id: Id<"events">;
  title: string;
  date: number;
  venueName?: string | null;
  city?: string | null;
  theme?: string | null;
  eventType?: string;
  description?: string;
  artworkUrl?: string | null;
};

export function EventMiniCard({ ev }: { ev: MiniEvent }) {
  const { t } = useTheme();
  const world = themeForEvent({
    theme: ev.theme ?? undefined,
    eventType: ev.eventType,
    description: ev.description,
  });
  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push(`/event/${ev._id}` as never)}
    >
      <Poster eventTheme={world} image={ev.artworkUrl} ratio={4 / 5}>
        <View style={styles.posterContent}>
          <Text style={[styles.posterTitle, { fontFamily: t.fonts.head }]} numberOfLines={2}>
            {ev.title}
          </Text>
        </View>
      </Poster>
      <Text style={[styles.meta, { color: t.ink2, fontFamily: t.fonts.body }]} numberOfLines={1}>
        {formatDate(ev.date)}
      </Text>
      {ev.venueName || ev.city ? (
        <Text style={[styles.sub, { color: t.ink3, fontFamily: t.fonts.mono }]} numberOfLines={1}>
          {[ev.venueName, ev.city].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  posterContent: { flex: 1, justifyContent: "flex-end", padding: 12 },
  posterTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  meta: { fontSize: 13, fontWeight: "700", marginTop: 8 },
  sub: { fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
});
