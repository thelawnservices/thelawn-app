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
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";

type Step =
  | "welcome"
  | "customer-login"
  | "landscaper-login"
  | "customer-register"
  | "landscaper-register";

const SPECIALTIES = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Clean Up"];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("welcome");

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string | null>(null);

  // Customer reg
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");

  // Landscaper reg
  const [businessName, setBusinessName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lPassword, setLPassword] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [lZipCode, setLZipCode] = useState("");
  const [years, setYears] = useState("");
  const [paymentPref, setPaymentPref] = useState("");

  const topPad = isWeb ? 60 : insets.top + 20;
  const botPad = isWeb ? 40 : insets.bottom + 20;

  function go(role: "customer" | "landscaper") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(role);
    router.replace("/(tabs)");
  }

  function handleCustomerLogin() {
    if (!email.trim() || !password.trim()) {
      setErrors("Please enter your email and password");
      return;
    }
    setErrors(null);
    go("customer");
  }

  function handleLandscaperLogin() {
    if (!email.trim() || !password.trim()) {
      setErrors("Please enter your email and password");
      return;
    }
    setErrors(null);
    go("landscaper");
  }

  function handleCustomerRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !phone.trim() || !address.trim() || !zipCode.trim()) {
      setErrors("Please fill in all fields including ZIP Code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    go("customer");
  }

  function handleLandscaperRegister() {
    if (!businessName.trim() || !lEmail.trim() || !lPassword.trim() || !lPhone.trim() || !state.trim() || !lZipCode.trim() || !paymentPref) {
      setErrors("Please fill all required fields: Business Name, Email, Password, Phone, State, ZIP Code, and Payment Preference.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    go("landscaper");
  }

  function navBack(to: Step) {
    setErrors(null);
    setEmail("");
    setPassword("");
    setStep(to);
  }

  // ── Welcome ────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <View style={[styles.container, { paddingTop: isWeb ? 60 : insets.top, paddingBottom: isWeb ? 40 : insets.bottom }]}>
        <View style={styles.logoSection}>
          <Image
            source={require("../assets/images/logo-transparent.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonsSection}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep("customer-login")} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in as Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("customer-register")} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? Register here</Text>
          </TouchableOpacity>

          <View style={styles.dividerGap} />

          <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep("landscaper-login")} activeOpacity={0.88}>
            <Text style={[styles.outlineBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in as Landscaper</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("landscaper-register")} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? Register here</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.demoNote, { fontFamily: "Inter_400Regular" }]}>Demo mode – tap to continue</Text>
      </View>
    );
  }

  // ── Customer Login ─────────────────────────────────────────────
  if (step === "customer-login") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => navBack("welcome")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>Sign in as Customer</Text>
            <View style={{ width: 26 }} />
          </View>
          {errors && <ErrorBanner message={errors} />}
          <Field label="Email">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
          </Field>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleCustomerLogin} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={{ marginTop: 20, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Use Passkey (iPhone)</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Landscaper Login ───────────────────────────────────────────
  if (step === "landscaper-login") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => navBack("welcome")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>Sign in as Landscaper</Text>
            <View style={{ width: 26 }} />
          </View>
          {errors && <ErrorBanner message={errors} />}
          <Field label="Email">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
          </Field>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLandscaperLogin} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.passkeyBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert("Passkey / PIN", "iOS would now use your saved biometric login.\n\nDemo: tap OK to sign in.", [
              { text: "Cancel", style: "cancel" },
              { text: "Use Passkey", onPress: () => go("landscaper") },
            ])}
          >
            <Text style={{ fontSize: 18, marginRight: 8 }}>🔑</Text>
            <Text style={[styles.passkeyBtnText, { fontFamily: "Inter_500Medium" }]}>Sign in with saved Passkey / PIN</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Customer Registration ──────────────────────────────────────
  if (step === "customer-register") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => navBack("welcome")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>Customer Registration</Text>
            <View style={{ width: 26 }} />
          </View>
          {errors && <ErrorBanner message={errors} />}
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="First Name">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={firstName} onChangeText={setFirstName} placeholder="Jane" placeholderTextColor="#555" autoCapitalize="words" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Last Name">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lastName} onChangeText={setLastName} placeholder="Smith" placeholderTextColor="#555" autoCapitalize="words" />
              </Field>
            </View>
          </View>
          <Field label="Email">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
          </Field>
          <Field label="Phone Number">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#555" keyboardType="phone-pad" />
          </Field>
          <Field label="Service Address (private)">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={address} onChangeText={setAddress} placeholder="8910 45th Ave E, Ellenton, FL" placeholderTextColor="#555" autoCapitalize="words" />
          </Field>
          <Field label="ZIP Code">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={zipCode} onChangeText={setZipCode} placeholder="34222" placeholderTextColor="#555" keyboardType="numeric" maxLength={5} />
          </Field>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleCustomerRegister} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Landscaper Registration ────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => navBack("welcome")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#34FF7A" />
          </TouchableOpacity>
          <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>Landscaper Registration</Text>
          <View style={{ width: 26 }} />
        </View>
        {errors && <ErrorBanner message={errors} />}
        <Field label="Landscaping or Business Name">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={businessName} onChangeText={setBusinessName} placeholder="Rivera Landscaping" placeholderTextColor="#555" autoCapitalize="words" />
        </Field>
        <Field label="Email">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lEmail} onChangeText={setLEmail} placeholder="your@email.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Field label="Password">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lPassword} onChangeText={setLPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
        </Field>
        <Field label="Phone Number">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lPhone} onChangeText={setLPhone} placeholder="(555) 000-0000" placeholderTextColor="#555" keyboardType="phone-pad" />
        </Field>
        <Field label="Specialty Service">
          <View style={styles.specialtyGrid}>
            {SPECIALTIES.map((s) => (
              <TouchableOpacity key={s} style={[styles.specialtyChip, specialty === s && styles.specialtyChipActive]} onPress={() => setSpecialty(s)} activeOpacity={0.8}>
                <Text style={[styles.specialtyChipText, { fontFamily: "Inter_500Medium" }, specialty === s && styles.specialtyChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
        <Field label="State">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={state} onChangeText={setState} placeholder="FL" placeholderTextColor="#555" autoCapitalize="characters" maxLength={2} />
        </Field>
        <Field label="ZIP Code">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lZipCode} onChangeText={setLZipCode} placeholder="34222" placeholderTextColor="#555" keyboardType="numeric" maxLength={5} />
        </Field>
        <Field label="Years of Experience">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={years} onChangeText={setYears} placeholder="e.g. 5" placeholderTextColor="#555" keyboardType="numeric" maxLength={2} />
        </Field>

        <Field label="Receive Payment Preference">
          <View style={styles.specialtyGrid}>
            {(["Apple Pay", "Venmo", "PayPal", "Cash App", "Debit Card"] as const).map((opt) => (
              <TouchableOpacity key={opt} style={[styles.specialtyChip, paymentPref === opt && styles.specialtyChipActive]} onPress={() => setPaymentPref(opt)} activeOpacity={0.8}>
                <Text style={[styles.specialtyChipText, { fontFamily: "Inter_500Medium" }, paymentPref === opt && styles.specialtyChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleLandscaperRegister} activeOpacity={0.88}>
          <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Landscaper Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.group}>
      <Text style={[fieldStyles.label, { fontFamily: "Inter_500Medium" }]}>{label}</Text>
      {children}
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={errStyles.banner}>
      <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
      <Text style={[errStyles.text, { fontFamily: "Inter_400Regular" }]}>{message}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 18 },
  label: { fontSize: 11, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 },
});

const errStyles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1a0a0a", borderWidth: 1, borderColor: "#FF3B30", borderRadius: 16, padding: 14, marginBottom: 20 },
  text: { color: "#FF3B30", fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", paddingHorizontal: 28 },
  logoSection: { alignItems: "center", marginBottom: 56 },
  logo: { fontSize: 72, color: "#34FF7A", letterSpacing: -4 },
  logoImg: { width: 525, height: 210 },
  buttonsSection: { gap: 10, marginBottom: 40 },
  dividerGap: { height: 10 },
  primaryBtn: {
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
  primaryBtnText: { color: "#000000", fontSize: 17 },
  outlineBtn: {
    backgroundColor: "#1A1A1A",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
  },
  outlineBtnText: { color: "#FFFFFF", fontSize: 17 },
  passkeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#222222",
    paddingVertical: 18,
    borderRadius: 28,
    marginTop: 12,
  },
  passkeyBtnText: { color: "#FFFFFF", fontSize: 15 },
  registerLink: { textAlign: "center", fontSize: 12, color: "#34FF7A", textDecorationLine: "underline" },
  demoNote: { textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" },

  formScroll: { paddingHorizontal: 24 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  formTitle: { fontSize: 20, color: "#FFFFFF" },
  input: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  rowFields: { flexDirection: "row", gap: 12 },

  specialtyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  specialtyChip: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  specialtyChipActive: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  specialtyChipText: { fontSize: 13, color: "#FFFFFF" },
  specialtyChipTextActive: { color: "#34FF7A" },

});
