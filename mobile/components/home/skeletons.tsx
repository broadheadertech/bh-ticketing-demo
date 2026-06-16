// skeletons.tsx — loading + empty states for the home feed. While
// listPublicEvents is undefined we show striped Placeholder rails; if it
// resolves to an empty array we show a friendly empty card.
import { CalendarX } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Placeholder } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { MINI_WIDTH } from "./MiniPoster";

/** Skeleton for the featured + near-you rails while data loads. */
export function FeedSkeleton({ featuredWidth }: { featuredWidth: number }) {
  return (
    <View style={styles.skel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railPad}
      >
        {[0, 1].map((i) => (
          <Placeholder
            key={i}
            label="loading"
            height={featuredWidth / (4 / 4.5)}
            style={{ width: featuredWidth }}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railPad}
      >
        {[0, 1, 2].map((i) => (
          <Placeholder
            key={i}
            label=""
            height={MINI_WIDTH / (4 / 4.4)}
            style={{ width: MINI_WIDTH }}
          />
        ))}
      </ScrollView>

      <View style={styles.rows}>
        {[0, 1, 2].map((i) => (
          <Placeholder key={i} label="" height={84} />
        ))}
      </View>
    </View>
  );
}

/** Empty state when there are no public events at all. */
export function EmptyFeed() {
  const { t } = useTheme();
  return (
    <Card style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: t.paper2, borderColor: t.ink }]}>
        <CalendarX color={t.ink} size={26} />
      </View>
      <Text style={[styles.emptyTitle, { color: t.ink, fontFamily: t.fonts.head }]}>
        No events yet
      </Text>
      <Text style={[styles.emptyBody, { color: t.ink2, fontFamily: t.fonts.body }]}>
        New shows drop here as organizers publish them. Check back soon.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  skel: { gap: 18, marginTop: 22 },
  railPad: { gap: 13 },
  rows: { gap: 10 },
  empty: { alignItems: "center", gap: 12, marginTop: 32, paddingVertical: 28 },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "800" },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 260 },
});
