// ProfileHeaderButtons.tsx — floating back + share buttons over a hero. Ported
// from .m-back.on-dark / .m-actions in the web profile screens. Positioned
// absolutely by the parent hero; respects the top safe-area inset.
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Share2 } from "lucide-react-native";

function RoundButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}

export function ProfileHeaderButtons({ onShare }: { onShare?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { top: insets.top + 8 }]} pointerEvents="box-none">
      <RoundButton onPress={() => (router.canGoBack() ? router.back() : router.push("/"))}>
        <ChevronLeft size={22} color="#fff" />
      </RoundButton>
      <RoundButton onPress={() => onShare?.()}>
        <Share2 size={18} color="#fff" />
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});
