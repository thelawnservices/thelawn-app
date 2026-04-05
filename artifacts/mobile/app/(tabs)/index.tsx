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

function GrassHeader({ topPadding }: { topPadding: number }) {
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 4000, useNativeDriver: false }),
        Animated.timing(sway, { toValue: -1, duration: 4000, useNativeDriver: false }),
        Animated.timing(sway, { toValue: 0, duration: 4000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const rotate = sway.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-2deg", "0deg", "2deg"] });

  return (
    <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
      {/* Animated grass background */}
      <Animated.Text style={[styles.grassBg, { transform: [{ rotate }] }]}>
        🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿
      </Animated.Text>
      {/* Header row on top */}
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
      <GrassHeader topPadding={topPadding} />

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

        {/* Quick Stats — staggered entrance */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s, i) => (
            <AnimatedStatCard key={s.label} stat={s} delay={i * 120} />
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

        {/* Trusted Landscapers */}
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>
          🔥 Trusted Landscapers on TheLawn
        </Text>
        {!prosLoaded ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          TRUSTED_PROS.map((pro) => (
            <TouchableOpacity
              key={pro.name}
              style={styles.proCard}
              onPress={() => router.navigate("/pay")}
              activeOpacity={0.8}
            >
              <View style={styles.proIconWrap}>
                <Ionicons name={pro.icon} size={28} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTopRow}>
                  <Text style={[styles.proName, { fontFamily: "Inter_600SemiBold" }]}>{pro.name}</Text>
                  <Text style={[styles.proRating, { fontFamily: "Inter_500Medium" }]}>{pro.rating} ★</Text>
                </View>
                <Text style={[styles.proMeta, { fontFamily: "Inter_400Regular" }]}>{pro.meta}</Text>
                <TouchableOpacity
                  style={styles.bookNowBtn}
                  onPress={() => router.navigate("/pay")}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.bookNowText, { fontFamily: "Inter_600SemiBold" }]}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const TRUSTED_PROS = [
  { name: "John Rivera Landscaping", rating: "4.9", meta: "2.3 mi • 87 jobs completed", icon: "leaf" as const },
  { name: "Sarah's Lawn Care", rating: "5.0", meta: "1.8 mi • 142 jobs completed", icon: "grid" as const },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: "hidden",
    position: "relative",
    borderBottomWidth: 2,
    borderBottomColor: "#34FF7A",
  },
  grassBg: {
    position: "absolute",
    fontSize: 26,
    opacity: 0.2,
    color: "#34FF7A",
    alignSelf: "center",
    top: "50%",
    letterSpacing: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  logo: { fontSize: 34, color: "#fff", letterSpacing: -1 },
  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 26, color: "#FFFFFF", marginBottom: 20 },
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
  proCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  proIconWrap: {
    width: 52,
    height: 52,
    backgroundColor: "#0d2e18",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  proTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  proName: { fontSize: 14, color: "#FFFFFF", flex: 1, marginRight: 8 },
  proRating: { fontSize: 13, color: "#34FF7A" },
  proMeta: { fontSize: 12, color: "#FFFFFF", marginBottom: 10 },
  bookNowBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  bookNowText: { color: "#000", fontSize: 13 },
  skeletonCard: {
    height: 96,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
});
