import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const PROS = [
  { id: "1", name: "John Rivera", specialty: "Lawn Specialist", rating: "4.9", trusted: true, initials: "JR", color: "#34C759" },
  { id: "2", name: "Maria Santos", specialty: "Garden Expert", rating: "4.8", trusted: true, initials: "MS", color: "#166D42" },
  { id: "3", name: "Carlos Mendez", specialty: "Landscaping Pro", rating: "4.7", trusted: false, initials: "CM", color: "#4CAF50" },
];

const SERVICES = [
  { id: "1", name: "Mowing", icon: "leaf-outline" as const },
  { id: "2", name: "Trimming", icon: "leaf" as const },
  { id: "3", name: "Cleanup", icon: "trash-outline" as const },
  { id: "4", name: "Mulching", icon: "flower-outline" as const },
];

const SERVICE_COLORS = ["#34C759", "#166D42", "#4CAF50", "#2E7D32"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="leaf" size={18} color="#fff" />
            </View>
            <Text style={[styles.logoText, { fontFamily: "Inter_700Bold" }]}>theLawn</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.greeting, { fontFamily: "Inter_700Bold" }]}>Good morning, Zamire</Text>
        <Text style={[styles.subGreeting, { fontFamily: "Inter_400Regular" }]}>What do you need today?</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              placeholder="Search pros, services, locations"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Trusted Pros</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prosScroll}>
            {PROS.map((pro) => (
              <TouchableOpacity
                key={pro.id}
                style={[styles.proCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/booking")}
                activeOpacity={0.8}
              >
                <View style={[styles.proAvatar, { backgroundColor: pro.color }]}>
                  <Text style={styles.proInitials}>{pro.initials}</Text>
                </View>
                <Text style={[styles.proName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {pro.name}
                </Text>
                <Text style={[styles.proSpec, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {pro.specialty}
                </Text>
                {pro.trusted && (
                  <View style={[styles.trustedBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.trustedText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Trusted</Text>
                  </View>
                )}
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={11} color="#f59e0b" />
                  <Text style={[styles.ratingNum, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{pro.rating}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Services</Text>
          <View style={styles.servicesGrid}>
            {SERVICES.map((svc, i) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push("/booking")}
                activeOpacity={0.8}
              >
                <View style={[styles.svcIconBox, { backgroundColor: SERVICE_COLORS[i] + "20" }]}>
                  <Ionicons name={svc.icon} size={24} color={SERVICE_COLORS[i]} />
                </View>
                <Text style={[styles.svcName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{svc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>Recent Activity</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="leaf" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activityTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Lawn Mowing</Text>
              <Text style={[styles.activitySub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>John Rivera · March 28</Text>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: colors.secondary }]}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={[styles.ratingPillText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>5.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/booking")}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={[styles.ctaBtnText, { fontFamily: "Inter_700Bold" }]}>Find a Landscaper Near You</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    backgroundColor: "#34C759",
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: {
    width: 30,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 20, color: "#fff" },
  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: { fontSize: 24, color: "#fff", marginBottom: 3 },
  subGreeting: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  searchContainer: { padding: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  prosScroll: { gap: 10, paddingRight: 16 },
  proCard: {
    width: 108,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  proInitials: { color: "#fff", fontSize: 16, fontWeight: "700" },
  proName: { fontSize: 12, textAlign: "center" },
  proSpec: { fontSize: 10, textAlign: "center" },
  trustedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  trustedText: { fontSize: 10 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  ratingNum: { fontSize: 11 },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: {
    width: "47%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  svcIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  svcName: { fontSize: 14 },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: { fontSize: 14, marginBottom: 2 },
  activitySub: { fontSize: 12 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingPillText: { fontSize: 12 },
  ctaContainer: { paddingHorizontal: 16, marginTop: 4 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 20,
  },
  ctaBtnText: { color: "#fff", fontSize: 16 },
});
