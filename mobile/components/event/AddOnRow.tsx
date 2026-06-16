// AddOnRow.tsx — one purchasable add-on row (merch, parking, etc.). Backend
// shape from addOns.getPublicAddOnsByEventId: { name, price (centavos),
// description, available (null = unlimited) }.
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { Money } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";

export type AddOnRowProps = {
  name: string;
  description?: string | null;
  price: number; // centavos
  available?: number | null; // null = unlimited
};

export function AddOnRow({ name, description, price, available }: AddOnRowProps) {
  const { t } = useTheme();
  const soldOut = available != null && available <= 0;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderRadius: t.radii.md, opacity: soldOut ? 0.55 : 1 },
        t.shadows.card,
      ]}
    >
      <View style={styles.flex}>
        <Text style={[styles.name, { color: t.ink, fontFamily: t.fonts.body }]}>
          {name}
        </Text>
        {description ? (
          <Text
            numberOfLines={2}
            style={[styles.desc, { color: t.ink3, fontFamily: t.fonts.body }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Money
          centavos={price}
          style={[styles.price, { color: t.ink, fontFamily: t.fonts.mono }]}
        />
        <View style={[styles.addBtn, { borderColor: t.line, backgroundColor: t.paper2 }]}>
          <Plus color={soldOut ? t.ink3 : t.ink} size={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  flex: { flex: 1 },
  name: { fontSize: 14.5, fontWeight: "800" },
  desc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontWeight: "700", fontSize: 14 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
