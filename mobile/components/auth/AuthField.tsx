// AuthField.tsx — a labelled text input row for the auth screens.
// Ported from m-onboarding.jsx's `.kbd-rule` label + `.m-search` input row:
// an uppercase mono caption above a line-bordered pill that holds a leading
// lucide icon and the field itself.
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export type AuthFieldProps = TextInputProps & {
  label: string;
  left?: React.ReactNode;
};

export function AuthField({ label, left, style, ...rest }: AuthFieldProps) {
  const { t } = useTheme();
  return (
    <View>
      <Text
        style={[
          styles.rule,
          { color: t.ink3, fontFamily: t.fonts.mono },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: t.card,
            borderColor: t.line,
            borderRadius: t.radii.sm,
          },
        ]}
      >
        {left}
        <TextInput
          placeholderTextColor={t.ink3}
          style={[
            styles.input,
            { color: t.ink, fontFamily: t.fonts.body },
            style,
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 7,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "700", padding: 0 },
});
