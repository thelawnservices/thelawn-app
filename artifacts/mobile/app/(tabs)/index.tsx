import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const QUICK_STATS = [
  { label: "Jobs Done", value: "3", icon: "checkmark-circle" as const, iconColor: "#34C759" },
  { label: "Avg Rating", value: "4.9", icon: "star" as const, iconColor: "#f59e0b" },
  { label: "Saved Pros", value: "2", icon: "heart" as const, iconColor: "#f87171" },
];

function AnimatedStatCard({ stat, delay }: { stat: typeof QUICK_STATS[0]; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={stat.icon} size={22} color={stat.iconColor} />
      <Text style={[styles.statValue, { fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
      <Text style={[styles.statLabel, { fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
    </Animated.View>
  );
}

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({ inputRange: [0, 1], outputRange: ["#222222", "#333333"] });

  return (
    <Animated.View style={[styles.skeletonCard, { backgroundColor: bg }]} />
  );
}

function AppHeader({ topPadding }: { topPadding: number }) {
  return (
    <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <Text style={[styles.logo, { fontFamily: "GreatVibes_400Regular" }]}>theLawn</Text>
        <View style={[{ flex: 1 }, styles.headerRight]}>
          <TouchableOpacity style={styles.notifBtn} onPress={() => {}}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const [prosLoaded, setProsLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setProsLoaded(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader topPadding={topPadding} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            { name: "Lawn Mowing",   icon: "leaf" as const,   price: "$45" },
            { name: "Hedge Trimming",icon: "cut" as const,    price: "$65" },
            { name: "Mulching",      icon: "flower" as const, price: "$120" },
            { name: "Cleanup",       icon: "trash" as const,  price: "$35" },
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
              <Text style={[styles.svcChipPrice, { fontFamily: "Inter_600SemiBold" }]}>
                {svc.price}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        {/* Quick Stats — staggered entrance */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s, i) => (
            <AnimatedStatCard key={s.label} stat={s} delay={i * 120} />
          ))}
        </View>

        {/* Horizontal Trusted Landscapers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.proRowContent}
          style={styles.proRow}
        >
          {!prosLoaded ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            TRUSTED_PROS.map((pro) => {
              const isTrustedPro = pro.rating >= 4.7 && pro.jobs >= 50;
              return (
                <TouchableOpacity
                  key={pro.name}
                  style={styles.proHCard}
                  onPress={() => router.navigate("/pay")}
                  activeOpacity={0.8}
                >
                  <View style={styles.proHIconWrap}>
                    <Ionicons name={pro.icon} size={26} color="#34FF7A" />
                  </View>
                  <Text style={[styles.proHName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                    {pro.name}
                  </Text>
                  <Text style={[styles.proHMeta, { fontFamily: "Inter_400Regular" }]}>
                    {pro.rating} ★ • {pro.jobs} jobs
                  </Text>
                  {isTrustedPro && (
                    <View style={styles.trustedBadge}>
                      <Text style={[styles.trustedBadgeText, { fontFamily: "Inter_500Medium" }]}>
                        Trusted Pro
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>


      </ScrollView>
    </View>
  );
}

const TRUSTED_PROS = [
  { name: "John Rivera Landscaping", rating: 4.9, jobs: 142, meta: "2.3 mi • 142 jobs completed", icon: "leaf" as const },
  { name: "Sarah's Lawn Care",        rating: 5.0, jobs: 98,  meta: "1.8 mi • 98 jobs completed",  icon: "grid" as const },
  { name: "GreenScape Pros",          rating: 4.8, jobs: 87,  meta: "3.1 mi • 87 jobs completed",  icon: "flower" as const },
  { name: "Elite Lawn Services",      rating: 4.9, jobs: 65,  meta: "2.9 mi • 65 jobs completed",  icon: "star" as const },
  { name: "FreshCut Landscaping",     rating: 5.0, jobs: 112, meta: "1.4 mi • 112 jobs completed", icon: "cut" as const },
  { name: "Premier Turf Care",        rating: 4.7, jobs: 79,  meta: "4.2 mi • 79 jobs completed",  icon: "options" as const },
  { name: "Nature's Edge Lawn",       rating: 4.9, jobs: 53,  meta: "2.7 mi • 53 jobs completed",  icon: "earth" as const },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: "hidden",
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  logo: {
    fontSize: 34,
    color: "#fff",
    letterSpacing: -1,
    textShadow: "0 0 14px rgba(52, 255, 122, 0.7)",
  } as any,
  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
  statValue: { fontSize: 20, color: "#FFFFFF" },
  statLabel: { fontSize: 11, color: "#FFFFFF" },
  sectionTitle: { fontSize: 17, color: "#FFFFFF", marginBottom: 12 },
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
  apptTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  apptSub: { fontSize: 12, color: "#FFFFFF" },
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
  svcChipText: { fontSize: 11, color: "#FFFFFF", textAlign: "center" },
  svcChipPrice: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  proRow: { marginTop: 20, marginBottom: 24, marginHorizontal: -20 },
  proRowContent: { paddingHorizontal: 20, gap: 12 },
  proHCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 14,
    width: 160,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 6,
  },
  proHIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: "#0d2e18",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  proHName: { fontSize: 13, color: "#FFFFFF", lineHeight: 18 },
  proHMeta: { fontSize: 11, color: "#888888" },
  trustedBadge: {
    backgroundColor: "#0d2e18",
    borderWidth: 1,
    borderColor: "#34FF7A",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  trustedBadgeText: { fontSize: 10, color: "#34FF7A" },
  skeletonCard: {
    width: 160,
    height: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
});
