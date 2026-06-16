// app/(tabs)/profile.tsx — user Profile tab. Ported from the web ProfileScreen.
// Identity card, a 3-up stats row (tickets / following / role), ACCOUNT &
// PREFERENCES settings groups, sign out, and a version footer. The Settings
// screen (/settings) owns the appearance/theming controls; this screen links to
// it via the header gear and the "Appearance" row.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery, useConvex } from "convex/react";
import { unregisterPushToken } from "../../lib/push";
import {
  Bell,
  Info,
  LogOut,
  MapPin,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  User as UserIcon,
  UserCircle,
  Wallet,
} from "lucide-react-native";

import { Avatar, Button, Card, Pill, Screen } from "../../components/ui";
import { SettingsRow, StatBlock } from "../../components/profile";
import { useTheme } from "../../theme/ThemeProvider";
import { api } from "../../lib/convex";

export default function ProfileScreen() {
  const { t } = useTheme();
  const { isSignedIn, user } = useUser();
  const { signOut } = useAuth();
  const convex = useConvex();

  async function handleSignOut() {
    // Unregister this device first (while Convex is still authed) so the next
    // user doesn't inherit this account's pushes, then sign out.
    await unregisterPushToken(convex);
    await signOut();
  }

  const me = useQuery(api.users.getCurrentUser, isSignedIn ? {} : "skip");
  const myTickets = useQuery(api.tickets.getMyTickets, isSignedIn ? {} : "skip");
  const myFollowing = useQuery(api.follows.getMyFollowing, isSignedIn ? {} : "skip");

  const name = me?.name ?? user?.fullName ?? "Guest";
  const email = me?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const roles = me?.roles ?? [];
  const isCreator = roles.includes("artist") || roles.includes("organization");

  return (
    <Screen>
      {/* header */}
      <View style={styles.head}>
        <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>Profile</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
          <Sliders size={21} color={t.ink} />
        </Pressable>
      </View>

      {/* not signed in */}
      {!isSignedIn ? (
        <Card style={styles.signedOut}>
          <UserCircle size={40} color={t.ink3} />
          <Text style={[styles.signedOutText, { color: t.ink2, fontFamily: t.fonts.body }]}>
            Sign in to see your tickets, follows and settings.
          </Text>
          <View style={styles.signedOutBtns}>
            <Button label="Sign in" block onPress={() => router.push("/(auth)/sign-in")} />
            <Button
              label="Create account"
              variant="soft"
              block
              onPress={() => router.push("/(auth)/sign-up")}
            />
          </View>
          <Pressable onPress={() => router.push("/settings")} hitSlop={8}>
            <Text style={[styles.signedOutLink, { color: t.ink3, fontFamily: t.fonts.body }]}>
              App settings
            </Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {/* identity */}
          <Card style={styles.identity}>
            <Avatar size={58} hue={28} />
            <View style={styles.identityText}>
              <Text style={[styles.idName, { color: t.ink, fontFamily: t.fonts.head }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.idMeta, { color: t.ink3, fontFamily: t.fonts.body }]} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <Button label="Edit" variant="soft" size="sm" onPress={() => router.push("/settings")} />
          </Card>

          {/* role pills */}
          {roles.length > 0 ? (
            <View style={styles.pills}>
              {roles.map((r) => (
                <Pill key={r} label={r} />
              ))}
            </View>
          ) : null}

          {/* stats */}
          <View style={styles.stats}>
            <Pressable style={styles.statFlex} onPress={() => router.push("/tickets")}>
              <Card style={styles.statCard}>
                <StatBlock
                  n={myTickets === undefined ? "—" : myTickets.length}
                  label="Tickets"
                  accent
                />
              </Card>
            </Pressable>
            <Card style={[styles.statCard, styles.statFlex]}>
              <StatBlock
                n={myFollowing === undefined ? "—" : myFollowing.length}
                label="Following"
              />
            </Card>
            <Card style={[styles.statCard, styles.statFlex]}>
              <StatBlock n={roles.length} label="Roles" />
            </Card>
          </View>

          {/* my creator profile shortcut */}
          {isCreator && me ? (
            <View style={styles.group}>
              <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
                MY PUBLIC PAGE
              </Text>
              <Card style={styles.groupCard} padded={false}>
                <SettingsRow
                  icon={UserCircle}
                  last
                  title={roles.includes("organization") ? "View organizer page" : "View artist page"}
                  onPress={() =>
                    router.push(
                      (roles.includes("organization")
                        ? `/organizer/${me._id}`
                        : `/artist/${me._id}`) as never,
                    )
                  }
                />
              </Card>
            </View>
          ) : null}

          {/* account */}
          <View style={styles.group}>
            <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
              ACCOUNT
            </Text>
            <Card style={styles.groupCard} padded={false}>
              <SettingsRow icon={UserIcon} title="Personal details" onPress={() => router.push("/settings")} />
              <SettingsRow icon={Wallet} title="Payment methods" detail="GCash · Card" onPress={() => router.push("/settings")} />
              <SettingsRow icon={Bell} title="Notifications" detail="On" last onPress={() => router.push("/settings")} />
            </Card>
          </View>

          {/* preferences */}
          <View style={styles.group}>
            <Text style={[styles.groupLabel, { color: t.ink3, fontFamily: t.fonts.mono }]}>
              PREFERENCES
            </Text>
            <Card style={styles.groupCard} padded={false}>
              <SettingsRow icon={MapPin} title="Location" detail="Manila" onPress={() => router.push("/settings")} />
              <SettingsRow icon={SettingsIcon} title="Appearance & theming" onPress={() => router.push("/settings")} />
              <SettingsRow icon={Shield} title="Privacy & security" onPress={() => router.push("/settings")} />
              <SettingsRow icon={Info} title="Help & support" last onPress={() => router.push("/settings")} />
            </Card>
          </View>

          {/* sign out */}
          <Card style={[styles.groupCard, { marginTop: 18 }]} padded={false}>
            <SettingsRow
              icon={LogOut}
              title="Sign out"
              danger
              noChevron
              last
              onPress={handleSignOut}
            />
          </Card>
        </>
      )}

      <Text style={[styles.footer, { color: t.ink3, fontFamily: t.fonts.mono }]}>
        TIX.PH · v1.0 · Made in the Philippines
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 8,
  },
  h1: { fontSize: 26, fontWeight: "800" },
  signedOut: { alignItems: "center", gap: 12, marginTop: 8, paddingVertical: 28, paddingHorizontal: 18 },
  signedOutText: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  signedOutBtns: { width: "100%", gap: 10, marginTop: 2 },
  signedOutLink: { fontSize: 13, fontWeight: "700", marginTop: 4, textDecorationLine: "underline" },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6 },
  identityText: { flex: 1 },
  idName: { fontSize: 19, fontWeight: "800" },
  idMeta: { fontSize: 12.5, marginTop: 3 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  statFlex: { flex: 1 },
  statCard: { paddingVertical: 14 },
  group: { marginTop: 18 },
  groupLabel: { fontSize: 10, letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  groupCard: { paddingHorizontal: 14 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 22, letterSpacing: 0.3 },
});
