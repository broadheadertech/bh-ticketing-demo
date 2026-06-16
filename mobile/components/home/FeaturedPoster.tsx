// FeaturedPoster.tsx — large snap-carousel poster for the "This week" rail.
// Ported from m-home.jsx <FeaturedPoster />: a tall event-themed Poster with a
// ★ Featured tag, category tag, title, date/place row and a glassy "FROM" price
// strip pinned to the bottom.
import { Calendar, MapPin } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Money, Poster, Tag } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { themeForEvent } from "@/theme/events";
import { useTheme } from "@/theme/ThemeProvider";
import { eventPlace, fromPrice, type PriceMap, type PublicEvent } from "./types";

export const FEATURED_WIDTH_RATIO = 0.84; // flex: 0 0 84%

export function FeaturedPoster({
  ev,
  prices,
  width,
  onPress,
}: {
  ev: PublicEvent;
  prices: PriceMap | undefined;
  width: number;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const theme = themeForEvent(ev);
  const from = fromPrice(ev, prices);

  return (
    <Pressable onPress={onPress} style={{ width }}>
      <Poster eventTheme={theme} image={ev.artworkUrl} ratio={4 / 4.5}>
        {/* top tag row */}
        <View style={styles.topRow}>
          <Tag
            label="★ Featured"
            bg={t.mango}
            fg="#1a1206"
          />
          <Tag
            label={ev.eventType}
            bg="rgba(0,0,0,0.4)"
            fg="#fff"
          />
        </View>

        {/* bottom block */}
        <View style={styles.bottom}>
          <Text style={[styles.title, { fontFamily: t.fonts.head }]} numberOfLines={2}>
            {ev.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.meta}>
              <Calendar color="#fff" size={13} />
              <Text style={styles.metaText}>{formatDate(ev.date)}</Text>
            </View>
            <View style={styles.meta}>
              <MapPin color="#fff" size={13} />
              <Text style={styles.metaText} numberOfLines={1}>
                {eventPlace(ev)}
              </Text>
            </View>
          </View>

          <View style={styles.priceStrip}>
            <Text style={[styles.fromLabel, { fontFamily: t.fonts.mono }]}>FROM</Text>
            {from != null ? (
              <Money
                centavos={from}
                whole
                style={[styles.price, { fontFamily: t.fonts.head, color: "#fff" }]}
              />
            ) : (
              <Text style={[styles.price, { fontFamily: t.fonts.head }]}>—</Text>
            )}
          </View>
        </View>
      </Poster>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottom: { position: "absolute", left: 14, right: 14, bottom: 14 },
  title: {
    color: "#fff",
    fontSize: 25,
    lineHeight: 25,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  metaText: { color: "#fff", fontSize: 12.5, fontWeight: "700", opacity: 0.95 },
  priceStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  fromLabel: { color: "#fff", fontSize: 11, opacity: 0.9 },
  price: { color: "#fff", fontSize: 17, fontWeight: "800" },
});
