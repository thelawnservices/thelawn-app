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

const PAYMENT_METHODS = ["Apple Pay", "Venmo", "PayPal", "Debit Card", "Cash App"];

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
  const [selectedPayment, setSelectedPayment] = useState("Apple Pay");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePayment = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <View style={styles.avatarRow}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={40} color="#34FF7A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.proName, { fontFamily: "Inter_700Bold" }]}>Zamire Smith</Text>
          <Text style={[styles.proSub, { fontFamily: "Inter_400Regular" }]}>Ellenton, FL</Text>
        </View>
      </View>

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
      </View>

      {/* Payment Method Picker */}
      <View style={styles.paymentCard}>
        <Text style={[styles.paymentLabel, { fontFamily: "Inter_500Medium" }]}>
          Your Preferred Payment Method
        </Text>
        <TouchableOpacity
          style={styles.paymentSelector}
          onPress={() => { setPickerOpen((v) => !v); Haptics.selectionAsync(); }}
          activeOpacity={0.8}
        >
          <Text style={[styles.paymentSelected, { fontFamily: "Inter_500Medium" }]}>
            {selectedPayment}
          </Text>
          <Ionicons
            name={pickerOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {pickerOpen && (
          <View style={styles.paymentDropdown}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentOption,
                  selectedPayment === method && styles.paymentOptionActive,
                ]}
                onPress={() => {
                  setSelectedPayment(method);
                  setPickerOpen(false);
                  setSaved(false);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.paymentOptionText,
                    { fontFamily: selectedPayment === method ? "Inter_600SemiBold" : "Inter_400Regular" },
                    selectedPayment === method && styles.paymentOptionTextActive,
                  ]}
                >
                  {method}
                </Text>
                {selectedPayment === method && (
                  <Ionicons name="checkmark-circle" size={18} color="#34FF7A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.savePaymentBtn}
          onPress={savePayment}
          activeOpacity={0.85}
        >
          <Text style={[styles.savePaymentText, { fontFamily: "Inter_600SemiBold" }]}>
            Save Preferred Payment Method
          </Text>
        </TouchableOpacity>

        {saved && (
          <Text style={[styles.savedMsg, { fontFamily: "Inter_500Medium" }]}>
            ✅ Payment method updated!
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => Alert.alert("Edit Profile", "Profile editor would open here")}
        activeOpacity={0.85}
      >
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile Settings</Text>
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
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
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
  proName: { fontSize: 18, color: "#FFFFFF", marginBottom: 2 },
  proSub: { fontSize: 12, color: "#FFFFFF", marginBottom: 6 },
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
  statValue: { fontSize: 14, color: "#FFFFFF" },
  statBig: { fontSize: 32, color: "#FFFFFF" },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  sectionTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 10, marginTop: 8 },
  reviewText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  reviewAuthor: { fontSize: 12, color: "#555", marginTop: 8 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoKey: { fontSize: 13, color: "#555" },
  infoVal: { fontSize: 14, color: "#FFFFFF" },
  paymentCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 12,
  },
  paymentLabel: { fontSize: 11, color: "#555", marginBottom: 12 },
  paymentSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  paymentSelected: { fontSize: 15, color: "#FFFFFF" },
  paymentDropdown: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 14,
    marginBottom: 4,
    overflow: "hidden",
  },
  paymentOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  paymentOptionActive: { backgroundColor: "#0d2e18" },
  paymentOptionText: { fontSize: 15, color: "#FFFFFF" },
  paymentOptionTextActive: { color: "#34FF7A" },
  savePaymentBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 12,
  },
  savePaymentText: { color: "#000", fontSize: 14 },
  savedMsg: { fontSize: 12, color: "#34FF7A", textAlign: "center", marginTop: 10 },
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
