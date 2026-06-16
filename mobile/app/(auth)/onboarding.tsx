// app/(auth)/onboarding.tsx — welcome / intro screen.
// Ported from m-onboarding.jsx (welcome view): TIX.PH wordmark + Skip pill, the
// fanned poster deck, the "Every event, its own world." headline, then the CTA
// stack — Apple/Google OAuth, an Email route to /sign-in, and "Browse as guest"
// which drops the user straight into the tabs unauthenticated.
import { router } from "expo-router";
import { ChevronRight, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Screen } from "../../components/ui";
import { OAuthButtons } from "../../components/auth/OAuthButtons";
import { PosterFan } from "../../components/auth/PosterFan";
import { useTheme } from "../../theme/ThemeProvider";

export default function OnboardingScreen() {
  const { t } = useTheme();
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen scroll contentContainerStyle={{ minHeight: "100%" }}>
      {/* Header: wordmark + skip */}
      <View style={styles.header}>
        <Logo />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          style={[
            styles.skip,
            { borderColor: t.line, backgroundColor: t.card, borderRadius: t.radii.pill },
          ]}
        >
          <Text style={[styles.skipText, { color: t.ink2, fontFamily: t.fonts.body }]}>
            Skip
          </Text>
          <ChevronRight color={t.ink2} size={13} />
        </Pressable>
      </View>

      <PosterFan />

      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: t.accent, fontFamily: t.fonts.mono }]}>
          PHILIPPINE LIVE EVENTS
        </Text>
        <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>
          Every event,{"\n"}its own{" "}
          <Text style={{ color: t.accent }}>world.</Text>
        </Text>
        <Text style={[styles.muted, { color: t.ink2, fontFamily: t.fonts.body }]}>
          Discover, buy, and carry your tickets — for every gig, fiesta and
          finish line in the country.
        </Text>
      </View>

      <View style={styles.spacer} />

      {/* CTA stack */}
      <View style={styles.cta}>
        {error ? (
          <Text style={[styles.err, { color: t.accent, fontFamily: t.fonts.body }]}>
            {error}
          </Text>
        ) : null}

        <OAuthButtons onError={setError} />

        <Button
          label="Continue with Email"
          variant="soft"
          size="lg"
          block
          left={<Mail color={t.ink} size={18} />}
          onPress={() => router.push("/(auth)/sign-in")}
        />

        <Button
          label="Browse as guest"
          variant="g"
          block
          style={{ borderWidth: 0 }}
          right={<ChevronRight color={t.ink2} size={16} />}
          onPress={() => router.replace("/(tabs)")}
        />

        <Text style={[styles.terms, { color: t.ink3, fontFamily: t.fonts.body }]}>
          By continuing you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}

function Logo() {
  const { t } = useTheme();
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoDot, { backgroundColor: t.accent }]} />
      <Text style={[styles.logoText, { color: t.ink, fontFamily: t.fonts.head }]}>
        TIX<Text style={{ color: t.accent }}>.PH</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  skip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  skipText: { fontSize: 12.5, fontWeight: "700" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoDot: { width: 14, height: 14, borderRadius: 4 },
  logoText: { fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  hero: { marginTop: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  h1: {
    fontSize: 38,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: -0.5,
  },
  muted: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 320,
  },
  spacer: { flex: 1, minHeight: 16 },
  cta: { gap: 10, marginTop: 18 },
  err: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  terms: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 6,
  },
});
