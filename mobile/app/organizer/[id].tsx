// app/organizer/[id].tsx — organizer profile. Ported from the web
// OrganizerScreen. A banner cover, a logo badge that overlaps the cover, the
// org name (+ verified shield), kind/city/since meta, follower/event counts,
// bio, then the organizer's events as a poster grid. Data: creatorProfiles +
// follows + listPublicEvents filtered to this creator.
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { ShieldCheck } from "lucide-react-native";

import { Button, Placeholder, Screen, SectionHead } from "../../components/ui";
import { EventMiniCard, ProfileHeaderButtons, useFollow } from "../../components/profile";
import { useTheme } from "../../theme/ThemeProvider";
import { api, type Id } from "../../lib/convex";

export default function OrganizerScreen() {
  const { t } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id as Id<"users"> | undefined;

  const profile = useQuery(
    api.creatorProfiles.getProfileByUserId,
    userId ? { userId } : "skip",
  );
  const allEvents = useQuery(api.events.listPublicEvents);
  const { following, followerCount, busy, toggle } = useFollow("creator", userId);

  const events = useMemo(
    () => (allEvents ?? []).filter((e) => e.creatorId === userId),
    [allEvents, userId],
  );

  const loading = profile === undefined || allEvents === undefined;
  const name = profile?.displayName ?? "Organizer";
  const city = events.find((e) => e.city)?.city;
  const since = events.length
    ? new Date(Math.min(...events.map((e) => e.date))).getFullYear()
    : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen pad={false}>
        <View>
          {profile?.profilePhotoUrl ? (
            <View style={[styles.cover, { backgroundColor: t.paper2 }]} />
          ) : (
            <Placeholder height={170} label="organizer cover" rounded={0} />
          )}
          <ProfileHeaderButtons />
        </View>

        <View style={styles.body}>
          {/* logo + follow */}
          <View style={styles.topRow}>
            <View style={[styles.logo, { borderColor: t.card, backgroundColor: t.paper3 }]}>
              <Text style={[styles.logoText, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                {name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Button
              size="sm"
              variant={following ? "soft" : "p"}
              loading={busy}
              label={following ? "Following" : "+ Follow"}
              onPress={toggle}
            />
          </View>

          {/* name */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.head }]} numberOfLines={2}>
              {name}
            </Text>
            <ShieldCheck size={18} color={t.blue} />
          </View>
          <Text style={[styles.meta, { color: t.ink3, fontFamily: t.fonts.body }]}>
            {["Organizer", city, since ? `since ${since}` : null].filter(Boolean).join(" · ")}
          </Text>

          {/* counts */}
          <View style={styles.counts}>
            <View style={styles.count}>
              <Text style={[styles.countN, { color: t.ink, fontFamily: t.fonts.head }]}>
                {loading ? "—" : followerCount}
              </Text>
              <Text style={[styles.countL, { color: t.ink3, fontFamily: t.fonts.body }]}>
                followers
              </Text>
            </View>
            <View style={styles.count}>
              <Text style={[styles.countN, { color: t.ink, fontFamily: t.fonts.head }]}>
                {loading ? "—" : events.length}
              </Text>
              <Text style={[styles.countL, { color: t.ink3, fontFamily: t.fonts.body }]}>
                events
              </Text>
            </View>
          </View>

          {/* bio */}
          {profile?.bio ? (
            <Text style={[styles.bio, { color: t.ink2, fontFamily: t.fonts.body }]}>
              {profile.bio}
            </Text>
          ) : null}

          {/* events */}
          <View style={styles.section}>
            <SectionHead title="Events" index={String(events.length)} />
            {loading ? (
              <ActivityIndicator color={t.accent} />
            ) : events.length === 0 ? (
              <Text style={[styles.empty, { color: t.ink3, fontFamily: t.fonts.body }]}>
                No events published yet.
              </Text>
            ) : (
              <View style={styles.grid}>
                {events.map((ev) => (
                  <View key={ev._id} style={styles.gridCell}>
                    <EventMiniCard ev={ev} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  cover: { height: 170 },
  body: { paddingHorizontal: 16, paddingBottom: 8 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -34,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 22, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  name: { fontSize: 24, fontWeight: "800", flexShrink: 1 },
  meta: { fontSize: 13, marginTop: 5 },
  counts: { flexDirection: "row", gap: 22, marginTop: 16 },
  count: { flexDirection: "row", alignItems: "center", gap: 6 },
  countN: { fontSize: 16, fontWeight: "800" },
  countL: { fontSize: 13 },
  bio: { fontSize: 14.5, lineHeight: 23, marginTop: 16 },
  section: { marginTop: 22 },
  empty: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  gridCell: { width: "50%", paddingHorizontal: 6, marginBottom: 16 },
});
