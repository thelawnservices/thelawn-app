import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";

const PAYMENT_METHODS = [
  { label: "🍎  Apple Pay", value: "Apple Pay",  emoji: "🍎", shortLabel: "Apple Pay" },
  { label: "💸  Venmo",     value: "Venmo",       emoji: "💸", shortLabel: "Venmo" },
  { label: "🅿️  PayPal",   value: "PayPal",      emoji: "🅿️", shortLabel: "PayPal" },
  { label: "💳  Debit Card",value: "Debit Card",  emoji: "💳", shortLabel: "Debit" },
  { label: "📱  Cash App",  value: "Cash App",    emoji: "📱", shortLabel: "Cash App" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role, logout } = useAuth();
  const [isLandscaper, setIsLandscaper] = useState(role === "landscaper");

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

const YARD_SIZES = [
  { label: "Small Yard",  sub: "Under 5,000 sq ft",   defaultPrice: "45" },
  { label: "Medium Yard", sub: "5,000–10,000 sq ft",  defaultPrice: "65" },
  { label: "Large Yard",  sub: "10,000+ sq ft",        defaultPrice: "120" },
];

const LANDSCAPER_APPOINTMENTS = [
  {
    id: "1",
    customer: "Zamire Smith",
    address: "123 Main St, Ellenton, FL",
    phone: "(555) 123-4567",
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

function LandscaperProfile() {
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(YARD_SIZES.map((s) => [s.label, s.defaultPrice]))
  );
  const [saveState, setSaveState] = useState<"idle" | "loading" | "success">("idle");
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  const savePrices = () => {
    Haptics.selectionAsync();
    setSaveState("loading");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveState("success");
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: false }),
      ]).start();
      setTimeout(() => {
        setSaveState("idle");
        successOpacity.setValue(0);
        successScale.setValue(0.8);
      }, 2500);
    }, 1200);
  };

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

      {/* Price Editor – Yard Size Tiers */}
      <View style={styles.priceCard}>
        <Text style={[styles.priceCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Service Prices by Yard Size
        </Text>
        {YARD_SIZES.map((s, i) => (
          <View key={s.label}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.priceServiceLabel, { fontFamily: "Inter_500Medium" }]}>
                  {s.label}
                </Text>
                <Text style={[styles.priceServiceSub, { fontFamily: "Inter_400Regular" }]}>
                  {s.sub}
                </Text>
              </View>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.priceDollar}>$</Text>
                <TextInput
                  style={[styles.priceInput, { fontFamily: "Inter_500Medium" }]}
                  value={prices[s.label]}
                  onChangeText={(t) => setPrices((p) => ({ ...p, [s.label]: t.replace(/[^0-9]/g, "") }))}
                  keyboardType="numeric"
                  maxLength={5}
                  selectTextOnFocus
                  placeholderTextColor="#555"
                />
              </View>
            </View>
          </View>
        ))}

        {saveState !== "success" ? (
          <TouchableOpacity
            style={[styles.savePricesBtn, saveState === "loading" && styles.savePricesBtnLoading]}
            onPress={saveState === "idle" ? savePrices : undefined}
            activeOpacity={0.85}
          >
            {saveState === "loading" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={[styles.savePricesBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={[styles.savePricesBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Prices</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Animated.View style={[styles.successBox, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
            <Ionicons name="checkmark-circle" size={32} color="#34FF7A" />
            <Text style={[styles.savedMsg, { fontFamily: "Inter_600SemiBold" }]}>
              Prices saved!
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Active & Future Appointments */}
      <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
        Active & Future Appointments
      </Text>
      {LANDSCAPER_APPOINTMENTS.map((appt) => (
        <View key={appt.id} style={[styles.card, { marginBottom: 10 }]}>
          <Text style={[styles.apptCustomer, { fontFamily: "Inter_600SemiBold" }]}>
            {appt.customer} · {appt.address}
          </Text>
          <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>
            Phone: {appt.phone} · {appt.date} · {appt.time}
          </Text>
          {appt.note && (
            <View style={styles.apptNotePill}>
              <Ionicons name="image-outline" size={12} color="#34FF7A" />
              <Text style={[styles.apptNoteText, { fontFamily: "Inter_400Regular" }]}>
                {appt.note}
              </Text>
            </View>
          )}
        </View>
      ))}

      <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }, { marginTop: 8 }]}>
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
  const { logout } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState("");
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  const showSuccess = () => {
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: false }),
    ]).start();
  };

  const savePayment = () => {
    if (!selectedPayment) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError(false);
    setPaymentState("loading");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentState("success");
      showSuccess();
      setTimeout(() => {
        setPaymentState("idle");
        successOpacity.setValue(0);
        successScale.setValue(0.8);
      }, 2500);
    }, 1400);
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
      <View style={[styles.paymentCard, error && styles.paymentCardError]}>
        <Text style={[styles.paymentLabel, { fontFamily: "Inter_500Medium" }]}>
          Choose Payment Method
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paymentTilesRow}
          style={{ marginHorizontal: -6 }}
        >
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedPayment === method.value;
            return (
              <TouchableOpacity
                key={method.value}
                style={[styles.paymentTile, isSelected && styles.paymentTileActive]}
                onPress={() => {
                  setSelectedPayment(method.value);
                  setError(false);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.paymentTileEmoji}>{method.emoji}</Text>
                <Text style={[
                  styles.paymentTileLabel,
                  { fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular" },
                  isSelected && styles.paymentTileLabelActive,
                ]}>
                  {method.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error && (
          <Text style={[styles.errorMsg, { fontFamily: "Inter_400Regular" }]}>
            ⚠️ Please select a payment method
          </Text>
        )}

        {paymentState !== "success" ? (
          <TouchableOpacity
            style={[styles.savePaymentBtn, paymentState === "loading" && styles.savePaymentBtnLoading]}
            onPress={paymentState === "idle" ? savePayment : undefined}
            activeOpacity={0.85}
          >
            {paymentState === "loading" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={[styles.savePaymentText, { fontFamily: "Inter_600SemiBold" }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={[styles.savePaymentText, { fontFamily: "Inter_600SemiBold" }]}>
                Save Preferred Payment Method
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <Animated.View style={[styles.successBox, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
            <Ionicons name="checkmark-circle" size={32} color="#34FF7A" />
            <Text style={[styles.savedMsg, { fontFamily: "Inter_600SemiBold" }]}>
              Payment method saved successfully!
            </Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => Alert.alert("Edit Profile", "Profile editor would open here")}
        activeOpacity={0.85}
      >
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
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
  paymentLabel: { fontSize: 13, color: "#FFFFFF", marginBottom: 14, fontWeight: "500" },
  paymentTilesRow: { paddingHorizontal: 6, gap: 10, paddingBottom: 4 },
  paymentTile: {
    width: 82,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paymentTileActive: {
    borderColor: "#34FF7A",
    backgroundColor: "#0d2e18",
  },
  paymentTileEmoji: { fontSize: 26 },
  paymentTileLabel: { fontSize: 11, color: "#FFFFFF", textAlign: "center" },
  paymentTileLabelActive: { color: "#34FF7A" },
  paymentCardError: { borderColor: "#ef4444" },
  errorMsg: { fontSize: 12, color: "#ef4444", marginTop: 6, marginBottom: 2 },
  priceCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 12,
  },
  priceCardTitle: { fontSize: 13, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  priceServiceLabel: { fontSize: 15, color: "#FFFFFF" },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  priceDollar: { fontSize: 14, color: "#34FF7A", marginRight: 2 },
  priceInput: {
    fontSize: 16,
    color: "#FFFFFF",
    minWidth: 48,
    textAlign: "right",
  },
  savePricesBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 20,
  },
  savePricesBtnLoading: { opacity: 0.8 },
  savePricesBtnText: { color: "#000", fontSize: 15 },
  savePaymentBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 12,
  },
  savePaymentBtnLoading: { opacity: 0.8 },
  savePaymentText: { color: "#000", fontSize: 14 },
  successBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, paddingVertical: 6 },
  savedMsg: { fontSize: 14, color: "#34FF7A" },
  editBtn: {
    backgroundColor: "#34FF7A",
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
  priceServiceSub: { fontSize: 11, color: "#666666", marginTop: 2 },
  apptCustomer: { fontSize: 14, color: "#FFFFFF", marginBottom: 4 },
  apptMeta: { fontSize: 12, color: "#888888" },
  apptNotePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: "#0d2e18",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  apptNoteText: { fontSize: 11, color: "#34FF7A" },
});
