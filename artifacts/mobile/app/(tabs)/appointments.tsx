import React from "react";
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

const APPOINTMENTS = [
  {
    id: "1",
    service: "Lawn Mowing",
    date: "April 12",
    time: "10:30 AM",
    pro: "John Rivera",
    price: "$45",
    status: "upcoming",
    initials: "JR",
    color: "#34C759",
  },
  {
    id: "2",
    service: "Hedge Trimming",
    date: "April 18",
    time: "9:00 AM",
    pro: "GreenScape Pros",
    price: "$65",
    status: "upcoming",
    initials: "GP",
    color: "#166D42",
  },
];

const PAST = [
  {
    id: "3",
    service: "Lawn Mowing",
    date: "March 28",
    time: "11:00 AM",
    pro: "John Rivera",
    price: "$45",
    status: "completed",
    initials: "JR",
    color: "#34C759",
    rating: 5,
  },
];

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Appointments
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Upcoming
        </Text>

        {APPOINTMENTS.map((appt) => (
          <TouchableOpacity key={appt.id} style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardLeft}>
              <View style={[styles.avatar, { backgroundColor: appt.color }]}>
                <Text style={styles.avatarText}>{appt.initials}</Text>
              </View>
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

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Past
        </Text>

        {PAST.map((appt) => (
          <TouchableOpacity key={appt.id} style={[styles.card, styles.pastCard]} activeOpacity={0.8}>
            <View style={styles.cardLeft}>
              <View style={[styles.avatar, { backgroundColor: appt.color + "80" }]}>
                <Text style={styles.avatarText}>{appt.initials}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold", color: "#6b7280" }]}>
                  {appt.service}
                </Text>
                <Text style={[styles.priceText, { fontFamily: "Inter_700Bold", color: "#9ca3af" }]}>
                  {appt.price}
                </Text>
              </View>
              <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>
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
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9F7" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, color: "#111827" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  pastCard: { opacity: 0.75 },
  cardLeft: {},
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
  serviceText: { fontSize: 15, color: "#111827" },
  priceText: { fontSize: 15, color: "#111827" },
  subText: { fontSize: 12, color: "#6b7280", marginBottom: 3 },
  proText: { fontSize: 12, color: "#9ca3af" },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  ratingRow: { flexDirection: "row", gap: 2 },
  completedBadge: {},
});
