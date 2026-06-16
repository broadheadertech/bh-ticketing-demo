// Poster.tsx — Plaza signature poster: hard ink border + offset hard shadow.
// Renders the event's `image` (artworkUrl) when supplied, over the event-theme
// gradient which acts as the fallback (and shows while the photo loads / when
// there's no artwork). An optional bottom scrim keeps overlaid text readable.
//
// Pass an `eventTheme` (from themeForEvent) to wear that event's world, and an
// optional `image` URL for the real photo. Children render on top (title, pills).
import React from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { type EventTheme } from "../../theme/events";

export type PosterProps = {
  eventTheme: EventTheme;
  /** Real artwork URL. When present it covers the gradient; gradient is the fallback. */
  image?: string | null;
  /** width/height aspect ratio, e.g. 3/4. Omit to fill the parent's width
   *  (then control size via `style`, e.g. a fixed height — used by the hero). */
  ratio?: number;
  /** show the bottom darkening scrim (for text legibility). */
  scrim?: boolean;
  rounded?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Poster({
  eventTheme,
  image,
  ratio,
  scrim = true,
  rounded,
  children,
  style,
}: PosterProps) {
  const { t } = useTheme();
  const radius = rounded ?? t.radii.md;
  const stops = eventTheme.grad;
  // With a ratio, size width-from-height (cards). Without one, fill the parent's
  // width and let `style` set the height (the full-bleed hero).
  const hasRatio = typeof ratio === "number";
  // Unique gradient ids per instance so stacked posters don't share defs.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const gid = `g${uid}`;
  const sid = `s${uid}`;
  const hasImage = typeof image === "string" && image.length > 0;

  return (
    <View
      style={[
        styles.wrap,
        hasRatio ? { aspectRatio: ratio } : { width: "100%" },
        {
          borderRadius: radius,
          borderColor: t.hard,
          // hard offset shadow (4px 4px 0)
          shadowColor: t.hard,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 4,
        },
        style,
      ]}
    >
      <View style={[styles.art, { borderRadius: radius - 2 }]}>
        {/* 1. base gradient (fallback + load placeholder) */}
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              {stops.map((c, i) => (
                <Stop
                  key={i}
                  offset={`${(i / Math.max(1, stops.length - 1)) * 100}%`}
                  stopColor={c}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
        </Svg>

        {/* 2. real artwork on top of the gradient, when available */}
        {hasImage ? (
          <Image
            source={{ uri: image as string }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        {/* 3. scrim on top for text legibility */}
        {scrim ? (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={sid} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="38%" stopColor="#000" stopOpacity={0} />
                <Stop offset="100%" stopColor="#000" stopOpacity={0.6} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${sid})`} />
          </Svg>
        ) : null}

        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 2, overflow: "hidden" },
  art: { flex: 1, overflow: "hidden" },
  content: { ...StyleSheet.absoluteFillObject },
});
