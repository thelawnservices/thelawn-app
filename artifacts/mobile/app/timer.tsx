import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

export default function TimerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const params = useLocalSearchParams<{
    proName: string;
    proInitials: string;
    proColor: string;
    proRating: string;
    proSpecialty: string;
    serviceName: string;
  }>();

  const proName      = params.proName      || "Your Pro";
  const proInitials  = params.proInitials  || proName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const proColor     = params.proColor     || "#34C759";
  const proSpecialty = params.proSpecialty || "Lawn Specialist";
  const serviceName  = params.serviceName  || "Service";

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleComplete = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/feedback",
      params: { proName: params.proName, proInitials: params.proInitials, proColor: params.proColor, serviceName },
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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>Active Job</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.content, { paddingBottom: bottomPadding + 20 }]}>
        <View style={[styles.statusPill, { backgroundColor: colors.secondary }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
            Arrived & Working
          </Text>
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.timerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Time Elapsed
          </Text>
          <Text style={[styles.timerDisplay, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {formatTime(seconds)}
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.proRow}>
            <View style={[styles.proAvatar, { backgroundColor: proColor }]}>
              <Text style={styles.proInitials}>{proInitials}</Text>
            </View>
            <View>
              <Text style={[styles.proName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {proName}
              </Text>
              <Text style={[styles.proSpec, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {serviceName} · {proSpecialty}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>0.2 mi</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Distance
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="star" size={20} color="#f59e0b" />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>4.9</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Rating
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>47</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Jobs Done
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.completeBtn, { backgroundColor: colors.primary }]}
          onPress={handleComplete}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={[styles.completeBtnText, { fontFamily: "Inter_700Bold" }]}>Mark Complete</Text>
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14 },
  timerCard: {
    width: "100%",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  timerLabel: { fontSize: 13, marginBottom: 8 },
  timerDisplay: { fontSize: 52, letterSpacing: -2 },
  divider: { width: "100%", height: 1, marginVertical: 20 },
  proRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  proInitials: { color: "#fff", fontSize: 16, fontWeight: "700" },
  proName: { fontSize: 15, marginBottom: 2 },
  proSpec: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10, width: "100%" },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  completeBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  completeBtnText: { color: "#fff", fontSize: 17 },
});
