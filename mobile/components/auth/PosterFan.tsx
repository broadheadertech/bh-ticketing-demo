// PosterFan.tsx — the fanned deck of 5 event posters on the onboarding hero.
// Ported from m-onboarding.jsx <PosterFan/>: five Plaza posters, each wearing
// one of the event worlds, rotated + vertically offset so they splay out like a
// hand of cards. The centre poster sits highest (zIndex 5).
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Poster } from "../ui";
import { EVENT_THEMES, THEME_ORDER } from "../../theme/events";

// rotation + translateY per slot, mirroring the web `rot`/`ty` arrays.
const ROT = [-12, -6, 0, 6, 12];
const TY = [16, 4, -4, 4, 16];
const POSTER_W = 92;

export function PosterFan() {
  return (
    <View style={styles.row}>
      {THEME_ORDER.map((id, i) => {
        const ev = EVENT_THEMES[id];
        return (
          <View
            key={id}
            style={{
              width: POSTER_W,
              marginHorizontal: -16,
              transform: [{ rotate: `${ROT[i]}deg` }, { translateY: TY[i] }],
              zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2),
            }}
          >
            <Poster eventTheme={ev} ratio={4 / 5} rounded={12}>
              <View style={styles.cap}>
                <Text numberOfLines={2} style={styles.capText}>
                  {ev.name}
                </Text>
              </View>
            </Poster>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 240,
  },
  cap: { position: "absolute", left: 7, right: 7, bottom: 7 },
  capText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    lineHeight: 12,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
