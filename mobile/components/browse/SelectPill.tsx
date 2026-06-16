// SelectPill.tsx — a compact dropdown selector styled as a Plaza pill. RN has no
// native <select>, so this renders the current value as a pill that opens a
// bottom modal sheet of options (mirrors the city/sort <select> in m-browse.jsx).
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export type SelectPillProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

export function SelectPill({ value, options, onChange }: SelectPillProps) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.pill,
          {
            borderColor: t.line,
            backgroundColor: t.card,
            borderRadius: t.radii.pill,
          },
        ]}
      >
        <Text
          style={[styles.value, { color: t.ink2, fontFamily: t.fonts.body }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <ChevronDown size={14} color={t.ink3} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: t.card, borderColor: t.line },
            ]}
          >
            {options.map((opt) => {
              const on = opt === value;
              return (
                <Pressable
                  key={opt}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  style={[styles.row, { borderBottomColor: t.line }]}
                >
                  <Text
                    style={[
                      styles.opt,
                      {
                        color: t.ink,
                        fontFamily: t.fonts.body,
                        fontWeight: on ? "800" : "600",
                      },
                    ]}
                  >
                    {opt}
                  </Text>
                  {on ? <Check size={16} color={t.accent} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    alignSelf: "flex-start",
  },
  value: { fontSize: 12.5, fontWeight: "700", maxWidth: 110 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  opt: { fontSize: 15.5 },
});
