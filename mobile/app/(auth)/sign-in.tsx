// app/(auth)/sign-in.tsx — Clerk email + password sign-in.
// Ported from m-onboarding.jsx (signin view): back chevron, "Welcome back."
// headline, EMAIL + PASSWORD fields, a "Sign in" primary CTA, OAuth shortcuts
// and a "Create an account" link. On success Clerk activates the session and
// the (auth) layout redirect carries the user to the tabs (where
// users.getCurrentUser resolves the Convex profile).
import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { ChevronLeft, Lock, Mail } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuthField } from "../../components/auth/AuthField";
import { OAuthButtons } from "../../components/auth/OAuthButtons";
import { Button, Screen } from "../../components/ui";
import { useTheme } from "../../theme/ThemeProvider";

export default function SignInScreen() {
  const { t } = useTheme();
  const { signIn, setActive, isLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = useCallback(async () => {
    if (!isLoaded || busy) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setBusy(true);
      const attempt = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        // (auth) layout redirect takes over once the session is active.
      } else {
        setError("Additional verification required. Check your email.");
      }
    } catch (err) {
      setError(firstClerkError(err) ?? "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, email, isLoaded, password, setActive, signIn]);

  return (
    <Screen scroll contentContainerStyle={{ minHeight: "100%" }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Back */}
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/onboarding"))}
          style={styles.back}
        >
          <ChevronLeft color={t.ink} size={24} />
        </Pressable>

        <View style={styles.head}>
          <Logo />
          <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>
            Welcome{"\n"}back.
          </Text>
          <Text style={[styles.muted, { color: t.ink2, fontFamily: t.fonts.body }]}>
            Sign in to find your tickets and pick up where you left off.
          </Text>
        </View>

        <View style={styles.form}>
          <AuthField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="juan@email.ph"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            left={<Mail color={t.ink3} size={16} />}
          />
          <AuthField
            label="PASSWORD"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            left={<Lock color={t.ink3} size={16} />}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          {error ? (
            <Text style={[styles.err, { color: t.accent, fontFamily: t.fonts.body }]}>
              {error}
            </Text>
          ) : null}
        </View>

        <View style={styles.spacer} />

        <View style={styles.cta}>
          <Button
            label="Sign in"
            variant="p"
            size="lg"
            block
            loading={busy}
            onPress={onSubmit}
          />

          <View style={styles.divider}>
            <View style={[styles.rule, { backgroundColor: t.line }]} />
            <Text style={[styles.or, { color: t.ink3, fontFamily: t.fonts.mono }]}>
              OR
            </Text>
            <View style={[styles.rule, { backgroundColor: t.line }]} />
          </View>

          <OAuthButtons onError={setError} />

          <Pressable
            accessibilityRole="link"
            onPress={() => router.replace("/(auth)/sign-up")}
            style={styles.linkRow}
          >
            <Text style={[styles.linkMuted, { color: t.ink2, fontFamily: t.fonts.body }]}>
              New here?{" "}
              <Text style={[styles.linkStrong, { color: t.ink }]}>
                Create an account
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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

/** Clerk throws an error with a `.errors[]` array; surface the first message. */
function firstClerkError(err: unknown): string | null {
  if (
    err &&
    typeof err === "object" &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown[] }).errors)
  ) {
    const first = (err as { errors: Array<{ message?: string; longMessage?: string }> })
      .errors[0];
    return first?.longMessage ?? first?.message ?? null;
  }
  return err instanceof Error ? err.message : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: "flex-start", paddingTop: 4, marginLeft: -6 },
  head: { marginTop: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoDot: { width: 12, height: 12, borderRadius: 4 },
  logoText: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  h1: {
    fontSize: 32,
    lineHeight: 33,
    fontWeight: "800",
    marginTop: 22,
    letterSpacing: -0.5,
  },
  muted: { fontSize: 14.5, lineHeight: 22, marginTop: 12 },
  form: { gap: 14, marginTop: 26 },
  err: { fontSize: 13, fontWeight: "700" },
  spacer: { flex: 1, minHeight: 24 },
  cta: { gap: 12, marginTop: 18 },
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  rule: { flex: 1, height: 1.5 },
  or: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  linkRow: { alignSelf: "center", paddingVertical: 4 },
  linkMuted: { fontSize: 12.5, fontWeight: "700" },
  linkStrong: { fontWeight: "800" },
});
