import React from "react";
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

const QUICK_STATS = [
  { label: "Jobs Done", value: "3", icon: "checkmark-circle" as const, iconColor: "#34C759" },
  { label: "Avg Rating", value: "4.9", icon: "star" as const, iconColor: "#f59e0b" },
  { label: "Saved Pros", value: "2", icon: "heart" as const, iconColor: "#f87171" },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={styles.container}>
      {/* Green gradient header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.logo, { fontFamily: "Inter_700Bold" }]}>theLawn</Text>
          <TouchableOpacity style={styles.notifBtn} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={[styles.greeting, { fontFamily: "Inter_600SemiBold" }]}>
          Good morning, Zamire 👋
        </Text>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.navigate("/(tabs)/search")}
          activeOpacity={0.85}
        >
          <Ionicons name="search" size={20} color="#000" />
          <Text style={[styles.ctaBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Find a Landscaper Near You
          </Text>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={22} color={s.iconColor} />
              <Text style={[styles.statValue, { fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming */}
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Upcoming Appointment
        </Text>
        <TouchableOpacity
          style={styles.appointmentCard}
          onPress={() => router.navigate("/(tabs)/appointments")}
          activeOpacity={0.8}
        >
          <View style={styles.apptIcon}>
            <Ionicons name="leaf" size={22} color="#34FF7A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.apptTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Lawn Mowing
            </Text>
            <Text style={[styles.apptSub, { fontFamily: "Inter_400Regular" }]}>
              April 12 • 10:30 AM • John Rivera
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#34FF7A" />
        </TouchableOpacity>

        {/* Popular Services */}
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Popular Services
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.servicesRow}
        >
          {[
            { name: "Lawn Mowing", icon: "leaf" as const },
            { name: "Hedge Trimming", icon: "cut" as const },
            { name: "Mulching", icon: "flower" as const },
            { name: "Cleanup", icon: "trash" as const },
          ].map((svc) => (
            <TouchableOpacity
              key={svc.name}
              style={styles.svcChip}
              onPress={() => router.navigate("/(tabs)/search")}
              activeOpacity={0.8}
            >
              <View style={styles.svcChipIcon}>
                <Ionicons name={svc.icon} size={20} color="#34FF7A" />
              </View>
              <Text style={[styles.svcChipText, { fontFamily: "Inter_500Medium" }]}>
                {svc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#34C759",
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { fontSize: 26, color: "#fff", letterSpacing: -1 },
  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 26, color: "#34FF7A", marginBottom: 20 },
  ctaBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
    marginBottom: 24,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnText: { color: "#000", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#222222",
  },
  statValue: { fontSize: 20, color: "#34FF7A" },
  statLabel: { fontSize: 11, color: "#34FF7A" },
  sectionTitle: { fontSize: 17, color: "#34FF7A", marginBottom: 12 },
  appointmentCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#222222",
  },
  apptIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#0d2e18",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  apptTitle: { fontSize: 15, color: "#34FF7A", marginBottom: 3 },
  apptSub: { fontSize: 12, color: "#34FF7A" },
  servicesRow: { gap: 10, paddingRight: 4 },
  svcChip: {
    backgroundColor: "#111111",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 8,
    width: 100,
    borderWidth: 1,
    borderColor: "#222222",
  },
  svcChipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
  },
  svcChipText: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
});
