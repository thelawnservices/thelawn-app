import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const TIP_OPTIONS = [
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const params = useLocalSearchParams<{
    serviceName: string;
    price: string;
    proName: string;
    proInitials: string;
    proColor: string;
    proRating: string;
    proSpecialty: string;
  }>();
  const [tipIdx, setTipIdx] = useState(1);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const serviceName  = params.serviceName  || "Mowing/Edging";
  const price        = parseFloat(params.price || "45");
  const proName      = params.proName      || "Your Pro";
  const proInitials  = params.proInitials  || proName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const proColor     = params.proColor     || "#34C759";
  const proRating    = params.proRating    || "";
  const proSpecialty = params.proSpecialty || "Lawn Specialist";
  const proFirstName = proName.split(" ")[0];

  const tip   = Math.round(price * TIP_OPTIONS[tipIdx].value * 100) / 100;
  const fee   = Math.round(price * 0.03 * 100) / 100;
  const total = (price + tip + fee).toFixed(2);

  const handlePay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/timer",
      params: { proName, proInitials, proColor, proRating, proSpecialty, serviceName },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Review & Pay
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 100 }}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.svcIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="leaf" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.svcName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {serviceName}
              </Text>
              <Text style={[styles.svcSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {proName} · {proSpecialty}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.tipLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Add a tip for {proFirstName}
          </Text>
          <View style={styles.tipRow}>
            {TIP_OPTIONS.map((t, i) => (
              <TouchableOpacity
                key={t.label}
                style={[
                  styles.tipBtn,
                  {
                    backgroundColor: tipIdx === i ? colors.primary : colors.secondary,
                  },
                ]}
                onPress={() => {
                  setTipIdx(i);
                  Haptics.selectionAsync();
                }}
              >
                <Text
                  style={[
                    styles.tipBtnText,
                    {
                      color: tipIdx === i ? "#fff" : colors.accent,
                      fontFamily: "Inter_600SemiBold",
                    },
                  ]}
                >
                  {t.label}
                </Text>
                <Text
                  style={[
                    styles.tipAmount,
                    {
                      color: tipIdx === i ? "rgba(255,255,255,0.85)" : colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  ${(price * t.value).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Subtotal
            </Text>
            <Text style={[styles.lineValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              ${price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Tip ({TIP_OPTIONS[tipIdx].label})
            </Text>
            <Text style={[styles.lineValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              ${tip.toFixed(2)}
            </Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              TheLawn fee (3%)
            </Text>
            <Text style={[styles.lineValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
              ${fee.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.lineItem}>
            <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>${total}</Text>
          </View>
        </View>

        <View style={[styles.payMethodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="card-outline" size={22} color={colors.primary} />
          <Text style={[styles.payMethodText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
            •••• •••• •••• 4242
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPadding + 12, backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.payBtn, { backgroundColor: colors.primary }]}
          onPress={handlePay}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>Pay ${total}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17 },
  summaryCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  svcIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  svcName: { fontSize: 16, marginBottom: 3 },
  svcSub: { fontSize: 13 },
  divider: { height: 1, marginVertical: 14 },
  tipLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tipRow: { flexDirection: "row", gap: 8 },
  tipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tipBtnText: { fontSize: 15 },
  tipAmount: { fontSize: 12, marginTop: 2 },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lineLabel: { fontSize: 14 },
  lineValue: { fontSize: 14 },
  totalLabel: { fontSize: 17 },
  totalValue: { fontSize: 26 },
  payMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  payMethodText: { flex: 1, fontSize: 14, letterSpacing: 1 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  payBtnText: { color: "#fff", fontSize: 17 },
});
