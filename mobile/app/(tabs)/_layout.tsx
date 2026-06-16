// app/(tabs)/_layout.tsx — bottom tab bar. Warm-paper bar with a 2px ink top
// border (Plaza .nav-tabs), coral (accent) active tint, ink-3 inactive.
// Tabs: Home (index), Browse, Tickets, Profile.
//
// Screen agents OWN the tab bodies (index.tsx / browse.tsx / tickets.tsx /
// profile.tsx). Overwrite the one-line placeholders; do not change this file's
// tab set without coordinating.
import { Tabs } from "expo-router";
import { Home, Search, Ticket, User } from "lucide-react-native";
import React from "react";
import { useTheme } from "../../theme/ThemeProvider";

export default function TabsLayout() {
  const { t } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.ink3,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopWidth: 2,
          borderTopColor: t.ink,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontFamily: t.fonts.body,
          fontSize: 10,
          fontWeight: "800",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
