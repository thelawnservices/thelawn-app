import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";

const CUSTOMER_UPCOMING = [
  {
    id: "1",
    service: "Lawn Mowing",
    date: "April 12",
    time: "10:30 AM",
    pro: "John Rivera",
    price: "$45",
    initials: "JR",
    color: "#FFFFFF",
  },
  {
    id: "2",
    service: "Hedge Trimming",
    date: "April 18",
    time: "9:00 AM",
    pro: "GreenScape Pros",
    price: "$65",
    initials: "GP",
    color: "#166D42",
  },
];

const CUSTOMER_PAST = [
  {
    id: "3",
    service: "Lawn Mowing",
    date: "March 28",
    time: "11:00 AM",
    pro: "John Rivera",
    price: "$45",
    initials: "JR",
    color: "#FFFFFF",
    rating: 5,
  },
];

const LANDSCAPER_SCHEDULED = [
  {
    id: "s1",
    service: "Lawn Mowing",
    size: "Medium",
    customer: "Alex T.",
    address: "8910 45th Ave E, Ellenton, FL",
    phone: "(941) 555-0192",
    date: "Apr 14",
    time: "9:00 AM",
    budget: "$65",
    note: null,
  },
  {
    id: "s2",
    service: "Hedge Trimming",
    size: "Small",
    customer: "Maria K.",
    address: "22 Palmetto Dr, Bradenton, FL",
    phone: "(941) 555-3381",
    date: "Apr 15",
    time: "11:00 AM",
    budget: "$55",
    note: "Gate code: 4892",
  },
  {
    id: "s3",
    service: "Clean Up",
    size: "Small",
    customer: "Sarah B.",
    address: "14 Manatee Ave, Ellenton, FL",
    phone: "(941) 555-7743",
    date: "Apr 17",
    time: "10:00 AM",
    budget: "$30",
    note: null,
  },
];

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role } = useAuth();
  const isLandscaper = role === "landscaper";

  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const { acceptedJobs, cancelAccepted } = useJobs();

  const visibleScheduled = LANDSCAPER_SCHEDULED.filter(
    (a) => !cancelledIds.includes(a.id)
  );

  if (isLandscaper) {
    const totalJobs = acceptedJobs.length + visibleScheduled.length;
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Appointments
          </Text>
          <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>
            Scheduled & Confirmed Jobs
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Live accepted jobs (from accepting requests) ── */}
          {acceptedJobs.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
                Recently Accepted
              </Text>
              {acceptedJobs.map((job) => (
                <View key={job.id} style={[styles.lsCard, styles.newJobCard]}>
                  <View style={styles.newJobBadge}>
                    <Text style={[styles.newJobBadgeText, { fontFamily: "Inter_700Bold" }]}>NEW</Text>
                  </View>
                  <View style={styles.lsTopRow}>
                    <View style={styles.lsServiceBadge}>
                      <Ionicons name="leaf" size={14} color="#34FF7A" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{job.service}</Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>{job.budget}</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{job.date} at {job.time}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="resize-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.size} yard</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.customer}</Text>
                    {job.distance && (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="location-outline" size={13} color="#555" />
                        <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.distance}</Text>
                      </>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        "Cancel Appointment?",
                        `Cancel ${job.service} with ${job.customer} on ${job.date}?`,
                        [
                          { text: "Keep", style: "cancel" },
                          { text: "Cancel Job", style: "destructive", onPress: () => cancelAccepted(job.id) },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.cancelBtnText, { fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* ── Pre-scheduled jobs ── */}
          {visibleScheduled.length > 0 && (
            <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }, acceptedJobs.length > 0 && { marginTop: 8 }]}>
              Scheduled
            </Text>
          )}

          {totalJobs === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#333" />
              <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>
                No scheduled appointments
              </Text>
              <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>
                Accept requests to fill your schedule
              </Text>
            </View>
          ) : (
            visibleScheduled.map((appt) => (
              <View key={appt.id} style={styles.lsCard}>
                {/* Top row: service badge + budget */}
                <View style={styles.lsTopRow}>
                  <View style={styles.lsServiceBadge}>
                    <Ionicons name="leaf" size={14} color="#34FF7A" />
                    <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>
                      {appt.service}
                    </Text>
                  </View>
                  <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>
                    {appt.budget}
                  </Text>
                </View>

                {/* Date / time */}
                <View style={styles.lsMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>
                    {appt.date} at {appt.time}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="resize-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.size} yard
                  </Text>
                </View>

                {/* Customer */}
                <View style={styles.lsMetaRow}>
                  <Ionicons name="person-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.customer}
                  </Text>
                </View>

                {/* Address */}
                <View style={styles.lsMetaRow}>
                  <Ionicons name="location-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {appt.address}
                  </Text>
                </View>

                {/* Phone */}
                <View style={styles.lsMetaRow}>
                  <Ionicons name="call-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.phone}
                  </Text>
                </View>

                {/* Note pill */}
                {appt.note && (
                  <View style={styles.notePill}>
                    <Ionicons name="information-circle-outline" size={13} color="#34FF7A" />
                    <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>
                      {appt.note}
                    </Text>
                  </View>
                )}

                {/* Cancel button */}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      "Cancel Appointment?",
                      `Cancel ${appt.service} with ${appt.customer} on ${appt.date}?`,
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Cancel Job",
                          style: "destructive",
                          onPress: () => setCancelledIds((prev) => [...prev, appt.id]),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.cancelBtnText, { fontFamily: "Inter_500Medium" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Customer view ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Appointments</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Upcoming</Text>

        {CUSTOMER_UPCOMING.map((appt) => (
          <TouchableOpacity key={appt.id} style={styles.card} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: appt.color }]}>
              <Text style={styles.avatarText}>{appt.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold" }]}>
                  {appt.service}
                </Text>
                <Text style={[styles.priceText, { fontFamily: "Inter_700Bold" }]}>
                  {appt.price}
                </Text>
              </View>
              <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>
                {appt.date} · {appt.time}
              </Text>
              <Text style={[styles.proText, { fontFamily: "Inter_400Regular" }]}>
                with {appt.pro}
              </Text>
            </View>
            <View style={styles.statusDot} />
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>
          Past
        </Text>

        {CUSTOMER_PAST.map((appt) => (
          <TouchableOpacity key={appt.id} style={[styles.card, styles.pastCard]} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: appt.color + "60" }]}>
              <Text style={styles.avatarText}>{appt.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold", color: "#555" }]}>
                  {appt.service}
                </Text>
                <Text style={[styles.priceText, { fontFamily: "Inter_700Bold", color: "#555" }]}>
                  {appt.price}
                </Text>
              </View>
              <Text style={[styles.subText, { fontFamily: "Inter_400Regular", color: "#444" }]}>
                {appt.date} · {appt.time}
              </Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= (appt.rating || 0) ? "star" : "star-outline"}
                    size={13}
                    color="#f59e0b"
                  />
                ))}
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#34FF7A" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "#AAAAAA", marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  emptyState: { paddingVertical: 80, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: "#555" },
  emptySub: { fontSize: 13, color: "#444" },

  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  newJobCard: {
    borderColor: "#34FF7A33",
    borderWidth: 1.5,
    position: "relative",
  },
  newJobBadge: {
    position: "absolute",
    top: -1,
    right: 14,
    backgroundColor: "#34FF7A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  newJobBadgeText: { fontSize: 10, color: "#000", letterSpacing: 0.8 },

  // Landscaper card
  lsCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 9,
  },
  lsTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lsServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lsServiceText: { fontSize: 14, color: "#34FF7A" },
  lsBudget: { fontSize: 20, color: "#FFFFFF" },
  lsMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lsMetaText: { fontSize: 13, color: "#AAAAAA", flex: 1 },
  metaDot: { color: "#333", fontSize: 12 },
  notePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  noteText: { fontSize: 12, color: "#34FF7A" },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 14, color: "#666" },

  // Customer card
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  pastCard: { opacity: 0.7 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  serviceText: { fontSize: 15, color: "#FFFFFF" },
  priceText: { fontSize: 15, color: "#FFFFFF" },
  subText: { fontSize: 12, color: "#555", marginBottom: 3 },
  proText: { fontSize: 12, color: "#555" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34C759" },
  ratingRow: { flexDirection: "row", gap: 2 },
});
