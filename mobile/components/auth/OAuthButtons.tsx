// OAuthButtons.tsx — Apple + Google social sign-in via Clerk's useOAuth.
// Ported from the onboarding CTA stack: a full-width ink "Continue with Apple"
// button plus a Google ghost button. On success Clerk sets the active session
// and the (auth) layout's redirect carries the user into the tabs; the Convex
// `users.createUser` row is provisioned by the Clerk webhook server-side.
import { useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { Apple } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../ui";
import { useTheme } from "../../theme/ThemeProvider";
import { useWarmUpBrowser } from "./useWarmUpBrowser";

type Strategy = "oauth_apple" | "oauth_google";

export function OAuthButtons({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  useWarmUpBrowser();
  const { t } = useTheme();
  const apple = useOAuth({ strategy: "oauth_apple" });
  const google = useOAuth({ strategy: "oauth_google" });
  const [busy, setBusy] = useState<Strategy | null>(null);

  const run = useCallback(
    async (strategy: Strategy) => {
      const flow = strategy === "oauth_apple" ? apple : google;
      try {
        setBusy(strategy);
        // Uses the configured "phlive" deep-link scheme (app.json).
        const redirectUrl = Linking.createURL("/(tabs)");
        const { createdSessionId, setActive } =
          await flow.startOAuthFlow({ redirectUrl });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
        // If no session was created the user cancelled — stay put silently.
      } catch (err) {
        onError?.(
          err instanceof Error ? err.message : "Could not sign in. Try again.",
        );
      } finally {
        setBusy(null);
      }
    },
    [apple, google, onError],
  );

  return (
    <View style={styles.col}>
      <Button
        label="Continue with Apple"
        variant="ink"
        size="lg"
        block
        loading={busy === "oauth_apple"}
        disabled={busy !== null}
        left={<Apple color={t.paper} size={18} fill={t.paper} />}
        onPress={() => run("oauth_apple")}
      />
      <Button
        label="Continue with Google"
        variant="g"
        size="lg"
        block
        loading={busy === "oauth_google"}
        disabled={busy !== null}
        onPress={() => run("oauth_google")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  col: { gap: 10 },
});
