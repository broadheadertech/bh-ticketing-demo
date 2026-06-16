// app/artist/[id].tsx — artist profile. Ported from the web ArtistScreen.
// Hero with a hue-tinted gradient + avatar + name, a Follow button, a stats
// row (followers / upcoming / links), tags, About bio, and the artist's
// upcoming shows. Data: creatorProfiles.getProfileByUserId + users (via the
// event creatorId) + follows for the live follower count / follow state, and
// listPublicEvents filtered to this creator.
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { Bell, Check, Music, Plus } from "lucide-react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Button, Card, Screen, SectionHead } from "../../components/ui";
import {
  EventMiniCard,
  ProfileHeaderButtons,
  StatBlock,
  useFollow,
} from "../../components/profile";
import { useTheme } from "../../theme/ThemeProvider";
import { api, type Id } from "../../lib/convex";

// Stable hue from an id string (mirrors the web hue rotation idea).
function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export default function ArtistScreen() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id as Id<"users"> | undefined;

  const profile = useQuery(
    api.creatorProfiles.getProfileByUserId,
    userId ? { userId } : "skip",
  );
  const allEvents = useQuery(api.events.listPublicEvents);

  const { following, followerCount, busy, toggle } = useFollow("creator", userId);

  const upcoming = useMemo(
    () => (allEvents ?? []).filter((e) => e.creatorId === userId),
    [allEvents, userId],
  );

  const loading = profile === undefined || allEvents === undefined;
  const hue = userId ? hueFromId(userId) : 260;
  const name = profile?.displayName ?? "Artist";
  const links = [
    profile?.websiteUrl,
    profile?.instagramUrl,
    profile?.spotifyUrl,
    profile?.facebookUrl,
  ].filter(Boolean).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen pad={false}>
        {/* hero */}
        <View style={styles.hero}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="h1" cx="30%" cy="0%" r="80%">
                <Stop offset="0%" stopColor={`hsl(${hue},70%,55%)`} />
                <Stop offset="100%" stopColor={`hsl(${hue},45%,28%)`} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="h2" cx="90%" cy="100%" r="80%">
                <Stop offset="0%" stopColor={`hsl(${(hue + 60) % 360},60%,42%)`} />
                <Stop offset="100%" stopColor={`hsl(${hue},45%,28%)`} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`hsl(${hue},45%,32%)`} />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#h1)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#h2)" />
          </Svg>
          <ProfileHeaderButtons />
          <View style={[styles.heroFoot, { paddingTop: insets.top }]}>
            <Avatar size={92} hue={hue} style={styles.heroAvatar} />
            <Text style={[styles.heroName, { fontFamily: t.fonts.head }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.heroMeta, { fontFamily: t.fonts.mono }]} numberOfLines={1}>
              {profile?.bio ? "ARTIST" : "ARTIST · TIX.PH"}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={t.accent} style={{ marginTop: 24 }} />
          ) : (
            <>
              {/* follow row */}
              <View style={styles.followRow}>
                <Button
                  block
                  variant={following ? "soft" : "p"}
                  loading={busy}
                  label={following ? "Following" : "Follow"}
                  left={
                    following ? (
                      <Check size={17} color={t.ink} strokeWidth={2.4} />
                    ) : (
                      <Plus size={17} color={t.accentInk} strokeWidth={2.2} />
                    )
                  }
                  onPress={toggle}
                  style={{ flex: 1 }}
                />
                <View style={[styles.bellBtn, { borderColor: t.ink }]}>
                  <Bell size={20} color={t.ink} />
                </View>
              </View>

              {/* stats */}
              <Card style={styles.stats} padded={false}>
                <StatBlock n={followerCount} label="Followers" />
                <View style={[styles.divider, { backgroundColor: t.line }]} />
                <StatBlock n={upcoming.length} label="Upcoming" />
                <View style={[styles.divider, { backgroundColor: t.line }]} />
                <StatBlock n={links} label="Links" />
              </Card>

              {/* tags */}
              <View style={styles.tags}>
                <View style={[styles.tag, { borderColor: t.line, backgroundColor: t.card }]}>
                  <Music size={12} color={t.ink2} />
                  <Text style={[styles.tagText, { color: t.ink2, fontFamily: t.fonts.body }]}>
                    Live
                  </Text>
                </View>
              </View>

              {/* about */}
              {profile?.bio ? (
                <View style={styles.section}>
                  <SectionHead title="About" />
                  <Text style={[styles.bio, { color: t.ink2, fontFamily: t.fonts.body }]}>
                    {profile.bio}
                  </Text>
                </View>
              ) : null}

              {/* upcoming shows */}
              <View style={styles.section}>
                <SectionHead title="Upcoming shows" index={String(upcoming.length)} />
                {upcoming.length === 0 ? (
                  <Text style={[styles.empty, { color: t.ink3, fontFamily: t.fonts.body }]}>
                    No upcoming shows yet.
                  </Text>
                ) : (
                  <View style={styles.grid}>
                    {upcoming.map((ev) => (
                      <View key={ev._id} style={styles.gridCell}>
                        <EventMiniCard ev={ev} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { height: 250, overflow: "hidden", justifyContent: "flex-end" },
  heroFoot: { alignItems: "center", paddingBottom: 18 },
  heroAvatar: {
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  heroName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 14,
  },
  heroMeta: { color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 5, letterSpacing: 0.5 },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  followRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", alignItems: "center", paddingVertical: 14, marginTop: 16 },
  divider: { width: 1.5, alignSelf: "stretch" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  tagText: { fontSize: 12.5, fontWeight: "700" },
  section: { marginTop: 22 },
  bio: { fontSize: 14.5, lineHeight: 23 },
  empty: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  gridCell: { width: "50%", paddingHorizontal: 6, marginBottom: 16 },
});
