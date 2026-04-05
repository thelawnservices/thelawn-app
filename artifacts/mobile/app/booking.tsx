import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const SERVICES = [
  { id: "1", name: "Lawn Mowing", description: "Standard cut & edge", price: 45, icon: "leaf-outline" as const },
  { id: "2", name: "Hedge Trimming", description: "Shape & trim hedges", price: 35, icon: "leaf" as const },
  { id: "3", name: "Leaf Cleanup", description: "Rake & haul away", price: 55, icon: "trash-outline" as const },
  { id: "4", name: "Mulching", description: "Beds & pathways", price: 65, icon: "flower-outline" as const },
  { id: "5", name: "Full Service", description: "Everything included", price: 120, icon: "sparkles-outline" as const },
];

export default function BookingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [selectedId, setSelectedId] = useState<string>("1");

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    Haptics.selectionAsync();
  };

  const handleContinue = () => {
    const svc = SERVICES.find((s) => s.id === selectedId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/review",
      params: { serviceId: selectedId, serviceName: svc?.name, price: svc?.price?.toString() },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Book with John Rivera
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 96 }}>
        <View style={[styles.proCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.proAvatar, { backgroundColor: "#34C759" }]}>
            <Text style={styles.proInitials}>JR</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.proName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>John Rivera</Text>
            <Text style={[styles.proSpec, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Lawn Specialist · 4.9 ★
            </Text>
          </View>
          <View style={[styles.trustedBadge, { backgroundColor: colors.secondary }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={[styles.trustedText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>Trusted</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          Select a Service
        </Text>

        {SERVICES.map((svc) => {
          const selected = selectedId === svc.id;
          return (
            <TouchableOpacity
              key={svc.id}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: selected ? colors.secondary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelect(svc.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.svcIconBox, { backgroundColor: selected ? colors.primary : colors.muted }]}>
                <Ionicons name={svc.icon} size={22} color={selected ? "#fff" : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.svcName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {svc.name}
                </Text>
                <Text style={[styles.svcDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {svc.description}
                </Text>
              </View>
              <Text
                style={[
                  styles.svcPrice,
                  { color: selected ? colors.accent : colors.mutedForeground, fontFamily: "Inter_700Bold" },
                ]}
              >
                ${svc.price}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: bottomPadding + 12, backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, { fontFamily: "Inter_700Bold" }]}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  proInitials: { color: "#fff", fontSize: 18, fontWeight: "700" },
  proName: { fontSize: 15, marginBottom: 2 },
  proSpec: { fontSize: 13 },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  trustedText: { fontSize: 12 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 10,
    gap: 12,
  },
  svcIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  svcName: { fontSize: 15, marginBottom: 2 },
  svcDesc: { fontSize: 13 },
  svcPrice: { fontSize: 16, marginRight: 4 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  continueBtnText: { color: "#fff", fontSize: 16 },
});
