// GridPoster.tsx — a tappable poster card for the Browse results grid.
// Ported from m-browse.jsx GridPoster: the event poster wears its own world
// (themeForEvent), with a category tag top-left, a save/heart button top-right,
// and the title + date · city overlaid on the scrim. The venue line sits under
// the poster. Public list/search payloads carry no tier price, so the price tag
// is only rendered when a `from` (centavos) is supplied.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Heart, Calendar, MapPin } from "lucide-react-native";
import { Money, Tag, Poster } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { themeForEvent } from "@/theme/events";
import { formatDate } from "@/lib/format";

export type GridEvent = {
  _id: string;
  title: string;
  eventType: string;
  theme?: string | null;
  description?: string;
  date: number;
  venueName?: string | null;
  city?: string | null;
  artworkUrl?: string | null;
  /** optional price in CENTAVOS (not in public list payloads today). */
  from?: number | null;
};

export type GridPosterProps = {
  ev: GridEvent;
  onPress: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
};

const CATEGORY_LABEL: Record<string, string> = {
  concert: "Concert",
  racing: "Racing",
  seminar: "Seminar",
  class: "Class",
  other: "Event",
};

export function GridPoster({ ev, onPress, saved, onToggleSave }: GridPosterProps) {
  const { t } = useTheme();
  const world = themeForEvent(ev);
  const category = CATEGORY_LABEL[ev.eventType] ?? ev.eventType;
  const place = ev.city ?? ev.venueName ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.col, { opacity: pressed ? 0.92 : 1 }]}
    >
      <Poster eventTheme={world} image={ev.artworkUrl} ratio={4 / 4.6} rounded={t.radii.md}>
        <Tag
          label={category}
          bg="rgba(0,0,0,0.4)"
          fg="#fff"
          style={styles.catTag}
        />
        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          style={styles.heartBtn}
        >
          <Heart
            size={18}
            color={saved ? t.accent : "#fff"}
            fill={saved ? t.accent : "transparent"}
          />
        </Pressable>
        <View style={styles.overlay}>
          <Text style={styles.title} numberOfLines={2}>
            {ev.title}
          </Text>
          <View style={styles.metaRow}>
            <Calendar size={11} color="#fff" />
            <Text style={styles.meta}>{formatDate(ev.date)}</Text>
            {place ? (
              <>
                <Text style={[styles.meta, styles.dot]}>·</Text>
                <MapPin size={11} color="#fff" />
                <Text style={styles.meta} numberOfLines={1}>
                  {place}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Poster>

      <View style={styles.footer}>
        <Text
          style={[styles.venue, { color: t.ink3, fontFamily: t.fonts.body }]}
          numberOfLines={1}
        >
          {ev.venueName ?? "Venue TBA"}
        </Text>
        {ev.from != null ? (
          <Money
            centavos={ev.from}
            whole
            style={{ fontSize: 12.5, color: t.accent }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  col: { gap: 8 },
  catTag: { position: "absolute", top: 9, left: 9 },
  heartBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: { position: "absolute", left: 11, right: 11, bottom: 11 },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  meta: { color: "#fff", fontSize: 11, fontWeight: "700", opacity: 0.95 },
  dot: { opacity: 0.6 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    gap: 8,
  },
  venue: { fontSize: 11.5, fontWeight: "700", flexShrink: 1 },
});
