import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";

type JobStatus = "pending" | "arrived" | "started" | "completed";

const ACTIVE_JOBS = [
  {
    id: "1",
    service: "Lawn Mowing",
    customer: "Zamire Smith",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Today",
    time: "10:30 AM",
  },
];

const LANDSCAPER_APPOINTMENTS = [
  {
    id: "1",
    customer: "Zamire Smith",
    address: "8910 45th Ave E, Ellenton, FL",
    phone: "(941) 555-0192",
    date: "Apr 9",
    time: "10:30 AM",
    note: "Screenshots attached",
  },
  {
    id: "2",
    customer: "Marcus T.",
    address: "88 Palmetto Ave, Ellenton, FL",
    phone: "(555) 987-6543",
    date: "Apr 12",
    time: "9:00 AM",
    note: null,
  },
];

const STATUS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "arrived",   label: "Arrived" },
  { key: "started",   label: "Work Started" },
  { key: "completed", label: "Completed" },
];

function statusOrder(s: JobStatus): number {
  return { pending: 0, arrived: 1, started: 2, completed: 3 }[s];
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;
  const { role } = useAuth();
  const isLandscaper = role === "landscaper";

  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(
    Object.fromEntries(ACTIVE_JOBS.map((j) => [j.id, "pending"]))
  );

  function advanceStatus(jobId: string, next: JobStatus) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJobStatuses((prev) => ({ ...prev, [jobId]: next }));
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>My Jobs</Text>
      </View>

      {isLandscaper ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
        >
          {/* ── Job Status Tracking ── */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Job Status Tracking
          </Text>

          {ACTIVE_JOBS.map((job) => {
            const status = jobStatuses[job.id];
            const isComplete = status === "completed";
            return (
              <View key={job.id} style={styles.trackingCard}>
                <View style={styles.trackingTopRow}>
                  <Text style={[styles.trackingTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {job.service} – {job.customer}
                  </Text>
                  <View style={[styles.statusPill, isComplete && styles.statusPillComplete]}>
                    <Text style={[styles.statusPillText, { fontFamily: "Inter_600SemiBold" }, isComplete && styles.statusPillTextComplete]}>
                      {isComplete ? "Completed" : "In Progress"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.trackingMeta, { fontFamily: "Inter_400Regular" }]}>
                  {job.address} · {job.date} {job.time}
                </Text>

                <View style={styles.actionRow}>
                  {STATUS_STEPS.map((step) => {
                    const done = statusOrder(status) >= statusOrder(step.key);
                    return (
                      <TouchableOpacity
                        key={step.key}
                        style={[styles.actionBtn, done && styles.actionBtnDone]}
                        onPress={() => advanceStatus(job.id, step.key)}
                        activeOpacity={done ? 1 : 0.8}
                      >
                        {done && <Ionicons name="checkmark" size={12} color="#000" />}
                        <Text style={[styles.actionBtnText, { fontFamily: "Inter_500Medium" }, done && styles.actionBtnTextDone]}>
                          {step.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* ── Upcoming Appointments ── */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            Active & Future Appointments
          </Text>

          {LANDSCAPER_APPOINTMENTS.map((appt) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptTopRow}>
                <Text style={[styles.apptCustomer, { fontFamily: "Inter_600SemiBold" }]}>
                  {appt.customer}
                </Text>
                <Text style={[styles.apptDateTime, { fontFamily: "Inter_400Regular" }]}>
                  {appt.date} · {appt.time}
                </Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="location-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{appt.address}</Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="call-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{appt.phone}</Text>
              </View>
              {appt.note && (
                <View style={styles.notePill}>
                  <Ionicons name="image-outline" size={12} color="#10B981" />
                  <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>{appt.note}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="location-outline" size={44} color="#10B981" />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>No active jobs yet</Text>
          <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>
            Live tracking will appear here once you have a job in progress.
          </Text>
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={32} color="#333" />
            <Text style={[styles.mapText, { fontFamily: "Inter_400Regular" }]}>Map view</Text>
          </View>
        </View>
      )}
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

  scrollContent: { padding: 20, gap: 12 },
  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  trackingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 10,
    marginBottom: 4,
  },
  trackingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  trackingTitle: { fontSize: 14, color: "#FFFFFF", flex: 1 },
  statusPill: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillComplete: { backgroundColor: "#0d2e18", borderWidth: 1, borderColor: "#10B981" },
  statusPillText: { fontSize: 11, color: "#000000" },
  statusPillTextComplete: { color: "#10B981" },
  trackingMeta: { fontSize: 12, color: "#888888" },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  actionBtnDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  actionBtnText: { fontSize: 11, color: "#10B981", textAlign: "center" },
  actionBtnTextDone: { color: "#000000" },

  apptCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 6,
  },
  apptTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  apptCustomer: { fontSize: 15, color: "#FFFFFF" },
  apptDateTime: { fontSize: 12, color: "#888888" },
  apptMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  apptMeta: { fontSize: 13, color: "#888888" },
  notePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  noteText: { fontSize: 12, color: "#10B981" },

  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 12, paddingBottom: 60 },
  emptyIconBox: { width: 80, height: 80, backgroundColor: "#0d2e18", borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, color: "#FFFFFF" },
  emptySub: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22 },
  mapPlaceholder: { width: "100%", height: 160, backgroundColor: "#1A1A1A", borderRadius: 22, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, borderWidth: 1, borderColor: "#222222" },
  mapText: { fontSize: 14, color: "#555" },
});
