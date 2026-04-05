import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";

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

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;
  const { role } = useAuth();
  const isLandscaper = role === "landscaper";

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
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
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
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>
                  {appt.address}
                </Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="call-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>
                  {appt.phone}
                </Text>
              </View>
              {appt.note && (
                <View style={styles.notePill}>
                  <Ionicons name="image-outline" size={12} color="#34FF7A" />
                  <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.note}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="location-outline" size={44} color="#34FF7A" />
          </View>
          <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>
            No active jobs yet
          </Text>
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
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#111111",
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

  apptCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 6,
  },
  apptTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
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
  noteText: { fontSize: 12, color: "#34FF7A" },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 12,
    paddingBottom: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    backgroundColor: "#0d2e18",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, color: "#FFFFFF" },
  emptySub: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  mapPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#111111",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  mapText: { fontSize: 14, color: "#555" },
});
