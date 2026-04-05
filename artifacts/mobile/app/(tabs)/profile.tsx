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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const [isLandscaper, setIsLandscaper] = useState(true);

  const toggle = () => {
    Haptics.selectionAsync();
    setIsLandscaper((v) => !v);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Profile</Text>
        <TouchableOpacity style={styles.togglePill} onPress={toggle} activeOpacity={0.8}>
          <Text style={[styles.togglePillText, { fontFamily: "Inter_500Medium" }]}>
            {isLandscaper ? "Landscaper View" : "Customer View"}
          </Text>
          <Text style={styles.toggleIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isLandscaper ? <LandscaperProfile /> : <CustomerProfile />}
      </ScrollView>
    </View>
  );
}

function LandscaperProfile() {
  return (
    <>
      {/* Avatar + Name */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarBox}>
          <Ionicons name="leaf" size={40} color="#34FF7A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.proName, { fontFamily: "Inter_700Bold" }]}>
            John Rivera Landscaping
          </Text>
          <Text style={[styles.proSub, { fontFamily: "Inter_400Regular" }]}>
            Established 2019 • Ellenton, FL
          </Text>
          <View style={styles.starsRow}>
            <Text style={styles.stars}>★★★★☆</Text>
            <Text style={[styles.proRating, { fontFamily: "Inter_500Medium" }]}>
              4.9 · Trusted Pro
            </Text>
          </View>
        </View>
      </View>

      {/* Stats card */}
      <View style={styles.card}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { fontFamily: "Inter_500Medium" }]}>Primary Services</Text>
          <Text style={[styles.statValue, { fontFamily: "Inter_400Regular" }]}>
            Lawn Mowing · Hedge Trimming · Mulching · Clean Up
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { fontFamily: "Inter_500Medium" }]}>Jobs Completed</Text>
          <Text style={[styles.statBig, { fontFamily: "Inter_700Bold" }]}>142</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { fontFamily: "Inter_500Medium" }]}>Availability</Text>
          <Text style={[styles.statValue, { fontFamily: "Inter_400Regular" }]}>
            Mon–Sat · 7:00 AM – 6:00 PM
          </Text>
        </View>
      </View>

      {/* Reviews */}
      <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
        Customer Reviews
      </Text>
      <View style={styles.card}>
        <Text style={[styles.reviewText, { fontFamily: "Inter_400Regular" }]}>
          "John did an amazing job on our yard – very professional!"
        </Text>
        <Text style={[styles.reviewAuthor, { fontFamily: "Inter_400Regular" }]}>
          — Sarah M. · 4 days ago
        </Text>
      </View>
      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={[styles.reviewText, { fontFamily: "Inter_400Regular" }]}>
          "Reliable, on time, and the yard looks fantastic every time."
        </Text>
        <Text style={[styles.reviewAuthor, { fontFamily: "Inter_400Regular" }]}>
          — Marcus T. · 2 weeks ago
        </Text>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => Alert.alert("Edit Profile", "Profile editor would open here")}
        activeOpacity={0.85}
      >
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile</Text>
      </TouchableOpacity>
    </>
  );
}

function CustomerProfile() {
  return (
    <>
      {/* Avatar + Name */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={40} color="#34FF7A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.proName, { fontFamily: "Inter_700Bold" }]}>Zamire Smith</Text>
          <Text style={[styles.proSub, { fontFamily: "Inter_400Regular" }]}>Ellenton, FL</Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Email</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>zamire@example.com</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Birthday</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>March 15, 1995</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Preferred Payment</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>Apple Pay</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => Alert.alert("Edit Profile", "Profile editor would open here")}
        activeOpacity={0.85}
      >
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
      </TouchableOpacity>
    </>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, color: "#34FF7A" },
  togglePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  togglePillText: { fontSize: 12, color: "#34FF7A" },
  toggleIcon: { fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 48 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatarBox: {
    width: 80,
    height: 80,
    backgroundColor: "#111111",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#34FF7A",
  },
  proName: { fontSize: 18, color: "#34FF7A", marginBottom: 2 },
  proSub: { fontSize: 12, color: "#34FF7A", marginBottom: 6 },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stars: { color: "#f59e0b", fontSize: 14 },
  proRating: { fontSize: 12, color: "#34FF7A" },
  card: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 12,
  },
  statRow: { paddingVertical: 6 },
  statLabel: { fontSize: 11, color: "#555", marginBottom: 4 },
  statValue: { fontSize: 14, color: "#34FF7A" },
  statBig: { fontSize: 32, color: "#34FF7A" },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  sectionTitle: { fontSize: 15, color: "#34FF7A", marginBottom: 10, marginTop: 8 },
  reviewText: { fontSize: 14, color: "#34FF7A", lineHeight: 22 },
  reviewAuthor: { fontSize: 12, color: "#555", marginTop: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoKey: { fontSize: 13, color: "#555" },
  infoVal: { fontSize: 14, color: "#34FF7A" },
  editBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  editBtnText: { color: "#000", fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, color: "#ef4444" },
});
