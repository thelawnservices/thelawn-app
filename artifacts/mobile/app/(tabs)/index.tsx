import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  Pressable,
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

const NOTIFICATIONS = [
  {
    id: "0",
    icon: "🔒",
    title: "Payment held in escrow",
    sub: "Lawn Mowing · $48.35 secured — releases on completion",
  },
  {
    id: "1",
    icon: "🚚",
    title: "John Rivera is on the way!",
    sub: "ETA: 8 minutes",
  },
  {
    id: "2",
    icon: "📅",
    title: "Recurring appointment confirmed",
    sub: "Next: April 19 · 10:30 AM",
  },
];

function NotificationsPanel({
  visible,
  onClose,
  items,
  notifEnabled,
  onToggleEnabled,
}: {
  visible: boolean;
  onClose: () => void;
  items: typeof NOTIFICATIONS;
  notifEnabled: boolean;
  onToggleEnabled: () => void;
}) {
  const slideY = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.spring(slideY, { toValue: 0, useNativeDriver: false, bounciness: 4 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.notifOverlay} onPress={onClose}>
        <Animated.View style={[styles.notifOverlayBg, { opacity: overlayOpacity }]} />
        <Animated.View
          style={[styles.notifSheet, { transform: [{ translateY: slideY }] }]}
        >
          <Pressable>
            <View style={styles.notifSheetHeader}>
              <Text style={[styles.notifSheetTitle, { fontFamily: "Inter_700Bold" }]}>
                Notifications
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.notifTogglePill, notifEnabled && styles.notifTogglePillOn]}
                  onPress={onToggleEnabled}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.notifToggleText, { fontFamily: "Inter_600SemiBold" }, notifEnabled && styles.notifToggleTextOn]}>
                    {notifEnabled ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.notifCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.notifList}>
              {items.map((n) => (
                <View key={n.id} style={styles.notifItem}>
                  <Text style={styles.notifItemIcon}>{n.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { fontFamily: "Inter_500Medium" }]}>
                      {n.title}
                    </Text>
                    <Text style={[styles.notifItemSub, { fontFamily: "Inter_400Regular" }]}>
                      {n.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function OfflineBanner({ visible }: { visible: boolean }) {
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -40,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.offlineBanner, { transform: [{ translateY }] }]}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={[styles.offlineBannerText, { fontFamily: "Inter_500Medium" }]}>
        You're offline · Booking is disabled
      </Text>
    </Animated.View>
  );
}

function AppHeader({
  topPadding,
  onBellPress,
  isOffline,
  onToggleOffline,
}: {
  topPadding: number;
  onBellPress: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.onlinePill, isOffline && styles.offlinePill]}
            onPress={onToggleOffline}
            activeOpacity={0.8}
          >
            <View style={[styles.onlineDot, isOffline && styles.offlineDot]} />
            <Text style={[styles.onlinePillText, { fontFamily: "Inter_500Medium" }, isOffline && styles.offlinePillText]}>
              {isOffline ? "Offline" : "Online"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.logo, { fontFamily: "GreatVibes_400Regular" }]}>theLawn</Text>
        <View style={[{ flex: 1 }, styles.headerRight]}>
          <TouchableOpacity style={styles.notifBtn} onPress={onBellPress} activeOpacity={0.7}>
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
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const notifEnabledRef = React.useRef(notifEnabled);
  notifEnabledRef.current = notifEnabled;

  const [notifItems, setNotifItems] = useState(NOTIFICATIONS);

  useEffect(() => {
    const t = setTimeout(() => setProsLoaded(true), 900);
    const n = setTimeout(() => {
      if (notifEnabledRef.current) setNotifVisible(true);
    }, 4000);
    const MOCK_MESSAGES = [
      { id: "", icon: "🚚", title: "Landscaper Arrived", sub: "John Rivera has arrived at your location" },
      { id: "", icon: "🌿", title: "Job In Progress", sub: "Your Lawn Mowing appointment has started" },
      { id: "", icon: "✅", title: "Payment Confirmed", sub: "Escrow released for today's service" },
    ];
    let idx = 0;
    const ws = setInterval(() => {
      const msg = MOCK_MESSAGES[idx % MOCK_MESSAGES.length];
      const item = { ...msg, id: String(Date.now()) };
      setNotifItems((prev) => [item, ...prev]);
      if (notifEnabledRef.current) setNotifVisible(true);
      idx++;
    }, 6500);
    return () => { clearTimeout(t); clearTimeout(n); clearInterval(ws); };
  }, []);

  function handleBooking(action: () => void) {
    if (isOffline) {
      // silently blocked — banner is already visible
      return;
    }
    action();
  }

  return (
    <View style={styles.container}>
      <AppHeader
        topPadding={topPadding}
        onBellPress={() => setNotifVisible(true)}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((v) => !v)}
      />
      <OfflineBanner visible={isOffline} />
      <NotificationsPanel
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        items={notifItems}
        notifEnabled={notifEnabled}
        onToggleEnabled={() => setNotifEnabled((v) => !v)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaBtn, isOffline && styles.ctaBtnDisabled]}
          onPress={() => handleBooking(() => router.navigate("/(tabs)/search"))}
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
        <View style={styles.servicesGrid}>
          {[
            { name: "Lawn\nMowing",    icon: "leaf" as const,   avg: "Avg $52" },
            { name: "Hedge\nTrimming", icon: "cut" as const,    avg: "Avg $68" },
            { name: "Mulching",        icon: "flower" as const, avg: "Avg $135" },
            { name: "Clean Up",        icon: "trash" as const,  avg: "Avg $38" },
          ].map((svc) => (
            <TouchableOpacity
              key={svc.name}
              style={styles.svcGridCard}
              onPress={() => router.navigate("/(tabs)/search")}
              activeOpacity={0.8}
            >
              <View style={styles.svcGridIconWrap}>
                <Ionicons name={svc.icon} size={28} color="#34FF7A" />
              </View>
              <Text style={[styles.svcGridName, { fontFamily: "Inter_500Medium" }]}>
                {svc.name}
              </Text>
              <Text style={[styles.svcGridPrice, { fontFamily: "Inter_600SemiBold" }]}>
                {svc.avg}
              </Text>
              <Text style={[styles.svcGridUpdated, { fontFamily: "Inter_400Regular" }]}>
                Updated daily
              </Text>
            </TouchableOpacity>
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
                  style={[styles.proHCard, isOffline && styles.proHCardDisabled]}
                  onPress={() => handleBooking(() => router.navigate("/pay"))}
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
  servicesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  svcGridCard: {
    flex: 1,
    backgroundColor: "#111111",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#222222",
  },
  svcGridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  svcGridName: { fontSize: 10, color: "#FFFFFF", textAlign: "center", lineHeight: 14 },
  svcGridPrice: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  svcGridUpdated: { fontSize: 9, color: "#555555", textAlign: "center", marginTop: 1 },
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
  notifOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  notifOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  notifSheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  notifSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  notifSheetTitle: { fontSize: 20, color: "#FFFFFF" },
  notifCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  notifTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#1a1a1a",
  },
  notifTogglePillOn: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  notifToggleText: { fontSize: 11, color: "#666666" },
  notifToggleTextOn: { color: "#34FF7A" },
  notifList: { gap: 12 },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  notifItemIcon: { fontSize: 32 },
  notifItemTitle: { fontSize: 14, color: "#FFFFFF", marginBottom: 4 },
  notifItemSub: { fontSize: 12, color: "#888888" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF3B30",
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  offlineBannerText: { color: "#fff", fontSize: 13 },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111111",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#222222",
  },
  offlinePill: { borderColor: "#FF3B30" },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34FF7A",
  },
  offlineDot: { backgroundColor: "#FF3B30" },
  onlinePillText: { color: "#FFFFFF", fontSize: 11 },
  offlinePillText: { color: "#FF3B30" },
  ctaBtnDisabled: { backgroundColor: "#2a2a2a", shadowOpacity: 0 },
  proHCardDisabled: { opacity: 0.4 },
});
