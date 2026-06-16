// Screen.tsx — standard scroll wrapper for every screen.
//   - paints the Plaza paper background
//   - respects the safe-area (notch / home indicator)
//   - adds a status-bar pad at the top (mirrors .m-statuspad)
//   - horizontal padding via tokens (set `pad={false}` for edge-to-edge)
// Pass `scroll={false}` for a fixed (non-scrolling) screen.
import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";

export type ScreenProps = ScrollViewProps & {
  scroll?: boolean;
  /** apply horizontal token padding to the content. */
  pad?: boolean;
  /** override the background (e.g. an event-themed screen). */
  background?: string;
  children?: React.ReactNode;
};

export function Screen({
  scroll = true,
  pad = true,
  background,
  contentContainerStyle,
  children,
  style,
  ...rest
}: ScreenProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const bg = background ?? t.paper;

  const content: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom + 24,
    paddingHorizontal: pad ? t.pad : 0,
  };

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: bg }, content, style as ViewStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: bg }, style]}
      contentContainerStyle={[content, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
