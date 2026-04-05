import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type PayState = "review" | "processing" | "success";

const TIP_OPTIONS = [
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const params = useLocalSearchParams<{
    proName: string;
    proInitials: string;
    proColor: string;
    price: string;
  }>();

  const proName = params.proName || "John Rivera";
  const proInitials = params.proInitials || "JR";
  const proColor = params.proColor || "#34C759";
  const basePrice = parseFloat(params.price || "45");

  const [payState, setPayState] = useState<PayState>("review");
  const [tipIdx, setTipIdx] = useState(1);
  const spinValue = useRef(new Animated.Value(0)).current;

  const tip = Math.round(basePrice * TIP_OPTIONS[tipIdx].value * 100) / 100;
  const fee = Math.round(basePrice * 0.03 * 100) / 100;
  const total = (basePrice + tip + fee).toFixed(2);

  useEffect(() => {
    if (payState === "processing") {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [payState, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handlePay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayState("processing");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayState("success");
    }, 1800);
  };

  if (payState === "processing") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#fff" }]}>
        <Animated.View
          style={[
            styles.spinner,
            { transform: [{ rotate: spin }] },
          ]}
        />
        <Text style={[styles.processingText, { fontFamily: "Inter_500Medium" }]}>
          Processing Payment...
        </Text>
      </View>
    );
  }

  if (payState === "success") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#fff" }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#34C759" />
        </View>
        <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
          Payment Successful!
        </Text>
        <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
          ${total} paid · John Rivera is on his way
        </Text>
        <TouchableOpacity
          style={[styles.successBtn, { marginBottom: bottomPadding + 16 }]}
          onPress={() => {
            router.dismiss();
            router.navigate("/(tabs)/jobs");
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.successBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            View in My Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.dismiss()} style={styles.doneLink}>
          <Text style={[styles.doneLinkText, { fontFamily: "Inter_400Regular" }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#fff" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => router.dismiss()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Review & Pay
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}
      >
        {/* Service Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryAvatarBox, { backgroundColor: proColor }]}>
            <Text style={styles.summaryAvatarText}>{proInitials}</Text>
          </View>
          <View>
            <Text style={[styles.summaryService, { fontFamily: "Inter_600SemiBold" }]}>
              Lawn Mowing · Standard cut
            </Text>
            <Text style={[styles.summaryDate, { fontFamily: "Inter_400Regular" }]}>
              April 12, 2026 · 10:30 AM
            </Text>
            <Text style={[styles.summaryPro, { fontFamily: "Inter_400Regular" }]}>
              with {proName}
            </Text>
          </View>
        </View>

        {/* Tip */}
        <Text style={[styles.tipLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Add a tip for {proName.split(" ")[0]}
        </Text>
        <View style={styles.tipRow}>
          {TIP_OPTIONS.map((t, i) => (
            <TouchableOpacity
              key={t.label}
              style={[styles.tipBtn, tipIdx === i && styles.tipBtnActive]}
              onPress={() => { setTipIdx(i); Haptics.selectionAsync(); }}
            >
              <Text
                style={[
                  styles.tipBtnLabel,
                  { fontFamily: "Inter_600SemiBold" },
                  tipIdx === i && { color: "#fff" },
                ]}
              >
                {t.label}
              </Text>
              <Text
                style={[
                  styles.tipBtnAmount,
                  { fontFamily: "Inter_400Regular" },
                  tipIdx === i && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                ${(basePrice * t.value).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Subtotal</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>
              ${basePrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>
              Tip ({TIP_OPTIONS[tipIdx].label})
            </Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>
              ${tip.toFixed(2)}
            </Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>
              TheLawn Platform Fee (3%)
            </Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>
              ${fee.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.lineItem, styles.totalRow]}>
            <Text style={[styles.totalLabel, { fontFamily: "Inter_700Bold" }]}>Total</Text>
            <Text style={[styles.totalValue, { fontFamily: "Inter_700Bold" }]}>${total}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentMethodLeft}>
            <View style={styles.cardIconBox}>
              <Ionicons name="card" size={20} color="#34C759" />
            </View>
            <View>
              <Text style={[styles.cardLabel, { fontFamily: "Inter_400Regular" }]}>
                •••• •••• •••• 4242
              </Text>
              <Text style={[styles.cardSub, { fontFamily: "Inter_400Regular" }]}>Visa · Expires 12/27</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={[styles.payBarContainer, { paddingBottom: bottomPadding + 12 }]}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePay}
          activeOpacity={0.85}
        >
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <Text style={[styles.payBtnText, { fontFamily: "Inter_700Bold" }]}>
            Pay ${total}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: "#34C759",
    borderTopColor: "transparent",
    marginBottom: 8,
  },
  processingText: { fontSize: 18, color: "#374151" },
  successIcon: { marginBottom: 8 },
  successTitle: { fontSize: 28, color: "#111827" },
  successSub: { fontSize: 15, color: "#6b7280", textAlign: "center" },
  successBtn: {
    width: "100%",
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 24,
  },
  successBtnText: { color: "#fff", fontSize: 16 },
  doneLink: { padding: 8 },
  doneLinkText: { color: "#9ca3af", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, color: "#111827" },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  summaryAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryAvatarText: { color: "#fff", fontWeight: "700", fontSize: 20 },
  summaryService: { fontSize: 15, color: "#111827", marginBottom: 3 },
  summaryDate: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  summaryPro: { fontSize: 13, color: "#9ca3af" },
  tipLabel: { fontSize: 13, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  tipBtnActive: { backgroundColor: "#34C759" },
  tipBtnLabel: { fontSize: 16, color: "#374151" },
  tipBtnAmount: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  breakdown: {
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    gap: 12,
  },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineLabel: { fontSize: 14, color: "#6b7280" },
  lineValue: { fontSize: 14, color: "#374151" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: { fontSize: 17, color: "#111827" },
  totalValue: { fontSize: 26, color: "#34C759" },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  paymentMethodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 14, color: "#374151", letterSpacing: 1 },
  cardSub: { fontSize: 12, color: "#9ca3af" },
  payBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  payBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  payBtnText: { color: "#fff", fontSize: 17 },
});
