import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";

const YARD_SIZES = [
  { label: "Small", sub: "Under 5,000 sq ft" },
  { label: "Medium", sub: "5,000–10,000 sq ft" },
  { label: "Large", sub: "10,000+ sq ft" },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login } = useAuth();
  const [step, setStep] = useState<"welcome" | "register">("welcome");

  // Registration form state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [yardSize, setYardSize] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);

  function handleLogin(role: "customer" | "landscaper") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(role);
    router.replace("/(tabs)");
  }

  function handleRegister() {
    if (!email.trim() || !phone.trim() || !dob.trim() || !address.trim() || !yardSize) {
      setErrors("Please fill in all fields");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    login("customer");
    router.replace("/(tabs)");
  }

  if (step === "register") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#000000" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.registerScroll,
            { paddingTop: isWeb ? 60 : insets.top + 20, paddingBottom: isWeb ? 40 : insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back + Title */}
          <View style={styles.registerHeader}>
            <TouchableOpacity onPress={() => setStep("welcome")} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.registerTitle, { fontFamily: "Inter_700Bold" }]}>
              Customer Registration
            </Text>
            <View style={{ width: 26 }} />
          </View>

          {errors && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{errors}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Email</Text>
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#555"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Date of Birth</Text>
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              value={dob}
              onChangeText={setDob}
              placeholder="MM / DD / YYYY"
              placeholderTextColor="#555"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Primary Address</Text>
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, Ellenton, FL"
              placeholderTextColor="#555"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Yard Size</Text>
            <View style={styles.yardSizeRow}>
              {YARD_SIZES.map((ys) => (
                <TouchableOpacity
                  key={ys.label}
                  style={[styles.yardChip, yardSize === ys.label && styles.yardChipActive]}
                  onPress={() => setYardSize(ys.label)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.yardChipLabel, { fontFamily: "Inter_600SemiBold" }, yardSize === ys.label && styles.yardChipLabelActive]}>
                    {ys.label}
                  </Text>
                  <Text style={[styles.yardChipSub, { fontFamily: "Inter_400Regular" }, yardSize === ys.label && styles.yardChipSubActive]}>
                    {ys.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.createAccountBtn}
            onPress={handleRegister}
            activeOpacity={0.88}
          >
            <Text style={[styles.createAccountBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: isWeb ? 60 : insets.top, paddingBottom: isWeb ? 40 : insets.bottom }]}>
      <View style={styles.logoSection}>
        <Text style={[styles.logo, { fontFamily: "GreatVibes_400Regular" }]}>theLawn</Text>
      </View>

      <View style={styles.buttonsSection}>
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => setStep("register")}
          activeOpacity={0.88}
        >
          <Text style={[styles.registerBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Register as Customer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => handleLogin("landscaper")}
          activeOpacity={0.88}
        >
          <Text style={[styles.outlineBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign in as Landscaper
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => handleLogin("customer")}
          activeOpacity={0.88}
        >
          <Text style={[styles.outlineBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign in as Customer
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.demoNote, { fontFamily: "Inter_400Regular" }]}>
        Demo mode – tap to continue
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 64,
  },
  logo: {
    fontSize: 72,
    color: "#34FF7A",
    letterSpacing: -4,
  },
  buttonsSection: {
    gap: 14,
    marginBottom: 40,
  },
  registerBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  registerBtnText: { color: "#000000", fontSize: 17 },
  outlineBtn: {
    backgroundColor: "#111111",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
  },
  outlineBtnText: { color: "#FFFFFF", fontSize: 17 },
  demoNote: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  // Registration form
  registerScroll: {
    paddingHorizontal: 24,
  },
  registerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  registerTitle: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a0a0a",
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  errorText: { color: "#FF3B30", fontSize: 13 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 13,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  yardSizeRow: {
    flexDirection: "row",
    gap: 10,
  },
  yardChip: {
    flex: 1,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  yardChipActive: {
    backgroundColor: "#0d2e18",
    borderColor: "#34FF7A",
  },
  yardChipLabel: { fontSize: 14, color: "#FFFFFF" },
  yardChipLabelActive: { color: "#34FF7A" },
  yardChipSub: { fontSize: 9, color: "#666666", textAlign: "center" },
  yardChipSubActive: { color: "#34FF7A" },
  createAccountBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  createAccountBtnText: { color: "#000000", fontSize: 17 },
});
