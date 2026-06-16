// app/(auth)/_layout.tsx — stack for the onboarding + auth flow.
//
// Gate: while Clerk boots we render nothing (avoids a flash). Once a session
// exists we bounce straight to the tabs — a signed-in user should never see
// onboarding. Unauthenticated users land on /onboarding (the group's first
// screen). Header is hidden; each screen paints its own chrome via <Screen>.
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
