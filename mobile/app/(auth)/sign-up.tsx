// app/(auth)/sign-up.tsx — Clerk email sign-up with a two-step flow:
//   1) "form"   — name + email + password → signUp.create + email code
//   2) "verify" — 6-digit code → attemptEmailAddressVerification → setActive
// New accounts default to the "attendee" role: the Convex user row is created
// server-side by the Clerk webhook (convex/users.createUser writes
// roles: ["attendee"]), so the client never sets a role here. On a complete
// verification the (auth) layout redirect carries the user into the tabs.
import { useSignUp } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { ChevronLeft, Lock, Mail, User } from "lucide-react-native";
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

type Step = "form" | "verify";

export default function SignUpScreen() {
  const { t } = useTheme();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onCreate = useCallback(async () => {
    if (!isLoaded || busy) return;
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Fill in your name, email and password.");
      return;
    }

    try {
      setBusy(true);
      await signUp.create({
        firstName: name.trim(),
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(firstClerkError(err) ?? "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }, [busy, email, isLoaded, name, password, signUp]);

  const onVerify = useCallback(async () => {
    if (!isLoaded || busy) return;
    setError(null);

    if (code.trim().length < 6) {
      setError("Enter the 6-digit code we emailed you.");
      return;
    }

    try {
      setBusy(true);
      const attempt = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        // (auth) layout redirect takes over once the session is active.
      } else {
        setError("That code didn't work. Try again.");
      }
    } catch (err) {
      setError(firstClerkError(err) ?? "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, code, isLoaded, setActive, signUp]);

  return (
    <Screen scroll contentContainerStyle={{ minHeight: "100%" }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            step === "verify"
              ? setStep("form")
              : router.canGoBack()
                ? router.back()
                : router.replace("/(auth)/onboarding")
          }
          style={styles.back}
        >
          <ChevronLeft color={t.ink} size={24} />
        </Pressable>

        {step === "form" ? (
          <>
            <View style={styles.head}>
              <Logo />
              <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>
                Create{"\n"}account.
              </Text>
              <Text style={[styles.muted, { color: t.ink2, fontFamily: t.fonts.body }]}>
                Join TIX.PH to grab tickets and carry them with you everywhere.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthField
                label="NAME"
                value={name}
                onChangeText={setName}
                placeholder="Juan dela Cruz"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                left={<User color={t.ink3} size={16} />}
              />
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
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                left={<Lock color={t.ink3} size={16} />}
                onSubmitEditing={onCreate}
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
                label="Create account"
                variant="p"
                size="lg"
                block
                loading={busy}
                onPress={onCreate}
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
                onPress={() => router.replace("/(auth)/sign-in")}
                style={styles.linkRow}
              >
                <Text style={[styles.linkMuted, { color: t.ink2, fontFamily: t.fonts.body }]}>
                  Already have an account?{" "}
                  <Text style={[styles.linkStrong, { color: t.ink }]}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.head}>
              <Logo />
              <Text style={[styles.h1, { color: t.ink, fontFamily: t.fonts.head }]}>
                Check your{"\n"}email.
              </Text>
              <Text style={[styles.muted, { color: t.ink2, fontFamily: t.fonts.body }]}>
                We sent a 6-digit code to{" "}
                <Text style={{ color: t.ink, fontWeight: "800" }}>
                  {email.trim()}
                </Text>
                . Enter it below to finish.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthField
                label="VERIFICATION CODE"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                inputMode="numeric"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                onSubmitEditing={onVerify}
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
                label="Verify & continue"
                variant="p"
                size="lg"
                block
                loading={busy}
                onPress={onVerify}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setStep("form")}
                style={styles.linkRow}
              >
                <Text style={[styles.linkMuted, { color: t.ink2, fontFamily: t.fonts.body }]}>
                  Wrong email?{" "}
                  <Text style={[styles.linkStrong, { color: t.ink }]}>Go back</Text>
                </Text>
              </Pressable>
            </View>
          </>
        )}
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
