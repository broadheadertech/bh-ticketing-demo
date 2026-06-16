// app/_layout.tsx — root provider stack for the whole app.
//
// Order (outer -> inner):
//   SafeAreaProvider
//     ClerkProvider (secure-store token cache)
//       ConvexProviderWithClerk (shares the repo's Convex backend, authed)
//         ThemeProvider (Plaza tokens + event worlds)
//           Stack (expo-router) + StatusBar
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BricolageGrotesque_700Bold } from "@expo-google-fonts/bricolage-grotesque";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono";
import { tokenCache } from "../lib/clerkTokenCache";
import { NotificationsProvider } from "../lib/push";
import { ThemeProvider } from "../theme/ThemeProvider";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  // Fail loud in dev so a missing .env is obvious.
  console.warn(
    "[phlive] EXPO_PUBLIC_CONVEX_URL is not set — copy .env.example to .env",
  );
}

const convex = new ConvexReactClient(convexUrl ?? "", {
  unsavedChangesWarning: false,
});

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export default function RootLayout() {
  // Register the Plaza fonts under the exact family names the theme tokens use
  // (BricolageGrotesque / Manrope / SpaceMono). Render nothing until loaded so
  // text doesn't flash in the system fallback.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque: BricolageGrotesque_700Bold,
    Manrope: Manrope_600SemiBold,
    SpaceMono: SpaceMono_400Regular,
  });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider>
            <NotificationsProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </NotificationsProvider>
          </ThemeProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
