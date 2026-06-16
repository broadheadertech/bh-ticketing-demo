// MiniPoster.tsx — compact 150px-wide poster for the "Near you" rail. Ported
// from m-home.jsx <MiniPoster />: a square-ish event poster with the title
// overlaid, plus a date/price caption row underneath.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Money, Poster } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { themeForEvent } from "@/theme/events";
import { useTheme } from "@/theme/ThemeProvider";
import { fromPrice, type PriceMap, type PublicEvent } from "./types";

export const MINI_WIDTH = 150;

export function MiniPoster({
  ev,
  prices,
  onPress,
}: {
  ev: PublicEvent;
  prices: PriceMap | undefined;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const theme = themeForEvent(ev);
  const from = fromPrice(ev, prices);

  return (
    <Pressable onPress={onPress} style={{ width: MINI_WIDTH }}>
      <Poster eventTheme={theme} image={ev.artworkUrl} ratio={4 / 4.4}>
        <View style={styles.overlay}>
          <Text style={[styles.title, { fontFamily: t.fonts.head }]} numberOfLines={2}>
            {ev.title}
          </Text>
        </View>
      </Poster>
      <View style={styles.caption}>
        <Text style={[styles.date, { color: t.ink }]} numberOfLines={1}>
          {formatDate(ev.date)}
        </Text>
        {from != null ? (
          <Money
            centavos={from}
            whole
            style={[styles.price, { color: t.accent, fontFamily: t.fonts.mono }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", left: 10, right: 10, bottom: 10 },
  title: {
    color: "#fff",
    fontSize: 15.5,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 8,
    gap: 6,
  },
  date: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  price: { fontSize: 12, fontWeight: "700" },
});
