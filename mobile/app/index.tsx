// app/index.tsx — cold-start routing gate.
//
// The root Stack auto-discovers every route group, but something has to decide
// where "/" sends a freshly-launched app. This gate waits for Clerk to boot,
// then routes: signed-in users into the tabs, everyone else into onboarding.
//
// While Clerk is still loading we render nothing (the native splash stays up),
// which avoids a flash of the wrong screen.
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  return isSignedIn ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/(auth)/onboarding" />
  );
}
