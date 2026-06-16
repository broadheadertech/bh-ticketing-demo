// app/leaderboard/[id].tsx — public race leaderboard.
// [id] is an events._id (results are keyed by event). Pulls
// races:getResultsPublic (anyone can view) and renders the medal-ranked
// LeaderboardTable. Neutral Plaza chrome.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { ArrowLeft, Flag, Trophy } from "lucide-react-native";
import { api, type Id } from "@/lib/convex";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Pill, Placeholder, Screen } from "@/components/ui";
import { LeaderboardTable, type LeaderboardData } from "@/components/verticals";
import { formatDate } from "@/lib/format";

export default function LeaderboardScreen() {
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const data = useQuery(api.races.getResultsPublic, {
    eventId: id as Id<"events">,
  }) as LeaderboardData | null | undefined;

  return (
    <Screen>
      <View style={styles.bar}>
        <HeaderBtn onPress={() => router.back()}>
          <ArrowLeft size={20} color={t.ink} />
        </HeaderBtn>
        <Text style={[styles.barTitle, { color: t.ink }]}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {data === undefined ? (
        <View style={{ paddingTop: 12, gap: 12 }}>
          <Placeholder height={64} label="loading" />
          <Placeholder height={360} label="loading results" />
        </View>
      ) : data === null ? (
        <Missing onBack={() => router.back()} />
      ) : (
        <View style={styles.body}>
          {/* race header */}
          <View style={styles.titleWrap}>
            <View style={[styles.trophy, { backgroundColor: t.mango, borderColor: t.hard }]}>
              <Trophy size={22} color={t.hard} />
            </View>
            <Text style={[styles.title, { color: t.ink, fontFamily: t.fonts.head }]}>
              {data.eventTitle}
            </Text>
            <Pill label={formatDate(data.eventDate)} left={<Flag size={13} color={t.ink2} />} />
          </View>

          {data.rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: t.ink }]}>
                Results not posted yet
              </Text>
              <Text style={[styles.emptyBody, { color: t.ink3 }]}>
                Finish-line times appear here once the organizer publishes them.
                Check back after the race.
              </Text>
            </View>
          ) : (
            <LeaderboardTable data={data} />
          )}
        </View>
      )}
    </Screen>
  );
}

function Missing({ onBack }: { onBack: () => void }) {
  const { t } = useTheme();
  return (
    <View style={styles.missing}>
      <View style={[styles.missIcon, { backgroundColor: t.paper2, borderColor: t.ink }]}>
        <Trophy size={28} color={t.ink} />
      </View>
      <Text style={[styles.missTitle, { color: t.ink }]}>Race not found</Text>
      <Text style={[styles.missBody, { color: t.ink3 }]}>
        We couldn't find a leaderboard for this event.
      </Text>
      <View style={{ marginTop: 8 }}>
        <Button label="Go back" variant="g" onPress={onBack} />
      </View>
    </View>
  );
}

function HeaderBtn({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        { backgroundColor: t.paper2, borderColor: t.line, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 6,
  },
  barTitle: { fontSize: 15, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingTop: 10, gap: 18 },
  titleWrap: { alignItems: "center", gap: 10 },
  trophy: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  empty: { alignItems: "center", gap: 8, paddingTop: 28, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 280 },
  missing: { paddingTop: 64, alignItems: "center", gap: 10, paddingHorizontal: 16 },
  missIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  missTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  missBody: { fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 280 },
});
