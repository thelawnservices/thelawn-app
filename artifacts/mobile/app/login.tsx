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
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, LawnUser } from "@/contexts/auth";
import TermsModal from "@/components/TermsModal";
import * as AppleAuthentication from "expo-apple-authentication";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

// ── Password helpers ─────────────────────────────────────────────
const PW_CHECKS = [
  { key: "len",   label: "At least 8 characters",        test: (p: string) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter (A–Z)",   test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter (a–z)",   test: (p: string) => /[a-z]/.test(p) },
  { key: "num",   label: "One number (0–9)",             test: (p: string) => /[0-9]/.test(p) },
  { key: "spec",  label: "One special character (!@#$%)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function pwStrength(pw: string) {
  const passed = PW_CHECKS.filter((c) => c.test(pw)).length;
  return { passed, total: PW_CHECKS.length, checks: PW_CHECKS.map((c) => ({ ...c, ok: c.test(pw) })) };
}

function PasswordStrengthMeter({ value }: { value: string }) {
  if (!value) return null;
  const { passed, total, checks } = pwStrength(value);
  const color = passed <= 2 ? "#ef4444" : passed <= 3 ? "#f59e0b" : passed === 4 ? "#facc15" : "#34FF7A";
  return (
    <View style={{ marginTop: 6, marginBottom: 2 }}>
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < passed ? color : "#2a2a2a" }} />
        ))}
      </View>
      {checks.map((c) => (
        <View key={c.key} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <Ionicons name={c.ok ? "checkmark-circle" : "ellipse-outline"} size={14} color={c.ok ? "#34FF7A" : "#555"} />
          <Text style={{ fontSize: 12, color: c.ok ? "#34FF7A" : "#666" }}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const { height: SCREEN_H } = Dimensions.get("window");
const LOGO_H = Math.min(280, Math.max(200, SCREEN_H * 0.38));
const LOGO_MB = Math.min(80, Math.max(40, SCREEN_H * 0.08));

type Step =
  | "welcome"
  | "customer-login"
  | "landscaper-login"
  | "customer-register"
  | "landscaper-register"
  | "verify-code"
  | "set-new-password";

const SPECIALTIES = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Full Service", "Tree Removal"];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login, setNeedsServiceSetup } = useAuth();
  const [step, setStep] = useState<Step>("welcome");
  const [errors, setErrors] = useState<string | null>(null);

  // Login fields
  const [custUsername, setCustUsername] = useState("");
  const [landUsername, setLandUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [lRememberMe, setLRememberMe] = useState(false);

  // Customer reg
  const [regUsername, setRegUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regState, setRegState] = useState("");

  // Landscaper reg
  const [lRegUsername, setLRegUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lPassword, setLPassword] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [lCity, setLCity] = useState("");
  const [state, setState] = useState("");
  const [lZipCode, setLZipCode] = useState("");
  const [years, setYears] = useState("");

  const [pendingIsRegistration, setPendingIsRegistration] = useState(false);
  const [loading, setLoading] = useState(false);

  // Apple Sign In → landscaper registration completion
  const [showAppleLsReg, setShowAppleLsReg] = useState(false);
  const [pendingAppleUser, setPendingAppleUser] = useState<LawnUser | null>(null);
  const [appleRegPhone, setAppleRegPhone] = useState("");
  const [appleRegCity, setAppleRegCity] = useState("");
  const [appleRegState, setAppleRegState] = useState("");
  const [appleRegZip, setAppleRegZip] = useState("");
  const [appleRegServices, setAppleRegServices] = useState<string[]>([]);
  const [appleRegYears, setAppleRegYears] = useState("");
  const [appleRegLoading, setAppleRegLoading] = useState(false);

  // Role selection modal
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Forgot / verify / reset
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotRole, setForgotRole] = useState<"customer" | "landscaper">("customer");
  const [forgotMethod, setForgotMethod] = useState<"email" | "phone">("email");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const topPad = isWeb ? 60 : insets.top + 20;
  const botPad = isWeb ? 40 : insets.bottom + 20;
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  async function go(user: LawnUser) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (user.role === "landscaper" && pendingIsRegistration) {
      setNeedsServiceSetup(true);
    }
    await login(user);
    router.replace("/(tabs)");
  }

  async function handleAppleSignIn(role: "customer" | "landscaper" = "customer") {
    if (Platform.OS !== "ios") return;
    setErrors(null);
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const res = await fetch(`${API_URL}/api/auth/apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appleId: credential.user,
          role,
          email: credential.email ?? undefined,
          givenName: credential.fullName?.givenName ?? undefined,
          familyName: credential.fullName?.familyName ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.error ?? "Apple sign in failed"); return; }
      if (role === "landscaper" && data.isNewUser) {
        // New landscaper — collect required registration info before entering the app
        setPendingAppleUser(data.user as LawnUser);
        setPendingIsRegistration(true);
        setShowAppleLsReg(true);
        return;
      }
      go(data.user as LawnUser);
    } catch (err: any) {
      if (err?.code !== "ERR_REQUEST_CANCELED") {
        setErrors("Apple sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerLogin() {
    if (!custUsername.trim() || !password.trim()) {
      setErrors("Please enter your username and password");
      return;
    }
    setErrors(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: custUsername.trim(), password, role: "customer" }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.error ?? "Login failed"); return; }
      const user = data.user as LawnUser;
      go(user);
    } catch {
      setErrors("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLandscaperLogin() {
    if (!landUsername.trim() || !password.trim()) {
      setErrors("Please enter your username and password");
      return;
    }
    setErrors(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: landUsername.trim(), password, role: "landscaper" }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.error ?? "Login failed"); return; }
      const user = data.user as LawnUser;
      setPendingIsRegistration(false);
      go(user);
    } catch {
      setErrors("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerRegister() {
    if (!regUsername.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !regPassword.trim() || !phone.trim() || !address.trim() || !regCity.trim() || !regState.trim() || !zipCode.trim()) {
      setErrors("Please fill in all required fields including City, State, and ZIP Code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const { passed } = pwStrength(regPassword);
    if (passed < 5) {
      setErrors("Please choose a stronger password meeting all requirements below.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername.trim(),
          role: "customer",
          password: regPassword,
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          city: regCity.trim(),
          state: regState.trim(),
          zipCode: zipCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.error ?? "Registration failed"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      go(data.user as LawnUser);
    } catch {
      setErrors("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLandscaperRegister() {
    if (!lRegUsername.trim() || !businessName.trim() || !lEmail.trim() || !lPassword.trim() || !lPhone.trim() || !lCity.trim() || !state.trim() || !lZipCode.trim()) {
      setErrors("Please fill all required fields: Username, Business Name, Email, Password, Phone, City, State, and ZIP.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (selectedServices.length === 0) {
      setErrors("Please select at least one service you provide.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    const { passed } = pwStrength(lPassword);
    if (passed < 5) {
      setErrors("Please choose a stronger password meeting all requirements below.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: lRegUsername.trim(),
          role: "landscaper",
          password: lPassword,
          displayName: businessName.trim(),
          email: lEmail.trim(),
          phone: lPhone.trim(),
          city: lCity.trim(),
          state: state.trim(),
          zipCode: lZipCode.trim(),
          businessName: businessName.trim(),
          services: selectedServices.join(", "),
          yearsExperience: years.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.error ?? "Registration failed"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingIsRegistration(true);
      go(data.user as LawnUser);
    } catch {
      setErrors("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForgotCode() {
    if (!forgotInput.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotInput.trim(),
          role: forgotRole,
          method: forgotMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors(data.error ?? "Failed to send code. Please try again.");
        setShowForgot(false);
        setStep("verify-code");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResetId(data.resetId ?? null);
      setShowForgot(false);
      setForgotInput("");
      setVerifyCodeInput("");
      setErrors(null);
      setStep("verify-code");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrors("Network error — please check your connection.");
      setShowForgot(false);
      setStep("verify-code");
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (verifyCodeInput.trim().length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrors("Please enter the full 6-digit code.");
      return;
    }
    if (!resetId) {
      setErrors("Reset session expired. Please start over.");
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetId, code: verifyCodeInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors(data.error ?? "Incorrect code. Please try again.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setErrors(null);
      setNewResetPassword("");
      setStep("set-new-password");
    } catch {
      setErrors("Network error — please check your connection.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleSetNewPassword() {
    if (!newResetPassword.trim()) {
      setErrors("Please enter a new password.");
      return;
    }
    if (!resetId) {
      setErrors("Reset session expired. Please start over.");
      return;
    }
    setResetSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetId, code: verifyCodeInput.trim(), newPassword: newResetPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setErrors(data.error ?? "Failed to reset password. Please try again.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setErrors(null);
      setResetId(null);
      setVerifyCodeInput("");
      setNewResetPassword("");
      navBack(forgotRole === "customer" ? "customer-login" : "landscaper-login");
    } catch {
      setErrors("Network error — please check your connection.");
    } finally {
      setResetSaving(false);
    }
  }

  function navBack(to: Step) {
    setErrors(null);
    setPassword("");
    setStep(to);
  }

  // ── Welcome ────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <>
      <View style={[styles.welcomeContainer, { paddingTop: isWeb ? 60 : insets.top, paddingBottom: isWeb ? 40 : insets.bottom }]}>
        <View style={styles.welcomeCenter}>
          <Image
            source={require("../assets/images/logo-transparent.png")}
            style={styles.logoImgLarge}
            resizeMode="contain"
          />

          <TouchableOpacity style={styles.welcomePrimaryBtn} onPress={() => setStep("customer-login")} activeOpacity={0.88}>
            <Text style={[styles.welcomePrimaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in as Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.welcomeOutlineBtn} onPress={() => setStep("landscaper-login")} activeOpacity={0.88}>
            <Text style={[styles.welcomeOutlineBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in as Landscaper</Text>
          </TouchableOpacity>

          <View style={styles.welcomeRegisterBlock}>
            <TouchableOpacity onPress={() => setShowRoleModal(true)} activeOpacity={0.7}>
              <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>
                Don't have an account?{" "}
                <Text style={{ color: "#34FF7A" }}>Register here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.welcomeFooter}>
          <View style={styles.consentRow}>
            <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}>By continuing you agree to our </Text>
            <TouchableOpacity onPress={() => setTermsDoc("terms")} activeOpacity={0.7}>
              <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Terms</Text>
            </TouchableOpacity>
            <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}> and </Text>
            <TouchableOpacity onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
              <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {termsDoc && (
        <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />
      )}
      <RoleSelectionModal
        visible={showRoleModal}
        onSelectCustomer={() => { setShowRoleModal(false); setStep("customer-register"); }}
        onSelectLandscaper={() => { setShowRoleModal(false); setStep("landscaper-register"); }}
        onClose={() => setShowRoleModal(false)}
      />
      </>
    );
  }

  // ── Verify Code ────────────────────────────────────────────────
  if (step === "verify-code") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => navBack(forgotRole === "customer" ? "customer-login" : "landscaper-login")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>Verify Code</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.verifyIconBox}>
            <Ionicons name="mail-outline" size={48} color="#34FF7A" />
          </View>
          <Text style={[styles.verifySubtitle, { fontFamily: "Inter_400Regular" }]}>
            {forgotMethod === "phone"
              ? "A 6-digit code was sent to the email address linked to your phone number."
              : "A 6-digit code was sent to your registered email."}
            {"\n"}Check your inbox from{" "}
            <Text style={{ color: "#34FF7A", fontFamily: "Inter_600SemiBold" }}>TheLawnServices@gmail.com</Text>
            {"\n"}
            <Text style={{ color: "#666", fontSize: 12 }}>Code expires in 15 minutes</Text>
          </Text>

          {errors && <ErrorBanner message={errors} />}

          <TextInput
            style={[styles.codeInput, { fontFamily: "Inter_700Bold" }]}
            value={verifyCodeInput}
            onChangeText={(t) => setVerifyCodeInput(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="• • • • • •"
            placeholderTextColor="#333"
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            editable={!verifyLoading}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24, opacity: verifyLoading ? 0.7 : 1 }]}
            onPress={verifyLoading ? undefined : handleVerifyCode}
            activeOpacity={0.88}
          >
            {verifyLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Verify Code</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setShowForgot(true); setVerifyCodeInput(""); setErrors(null); }}
            style={{ marginTop: 16, alignItems: "center" }}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotLink, { fontFamily: "Inter_400Regular" }]}>Resend code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navBack(forgotRole === "customer" ? "customer-login" : "landscaper-login")} style={{ marginTop: 12, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Allow resend without leaving verify step */}
        <ForgotModal
          visible={showForgot}
          value={forgotInput}
          onChangeValue={setForgotInput}
          method={forgotMethod}
          onChangeMethod={setForgotMethod}
          onSend={handleSendForgotCode}
          loading={forgotLoading}
          onClose={() => { setShowForgot(false); setForgotInput(""); }}
        />
      </KeyboardAvoidingView>
    );
  }

  // ── Set New Password ─────────────────────────────────────────────
  if (step === "set-new-password") {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.formScroll, { paddingTop: topPad, paddingBottom: botPad }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => { setStep("verify-code"); setErrors(null); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[styles.formTitle, { fontFamily: "Inter_700Bold" }]}>New Password</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={[styles.verifyIconBox]}>
            <Ionicons name="lock-closed-outline" size={48} color="#34FF7A" />
          </View>
          <Text style={[styles.verifySubtitle, { fontFamily: "Inter_400Regular" }]}>
            Code verified! Choose a strong new password for your account.
          </Text>

          {errors && <ErrorBanner message={errors} />}

          <Field label="New Password">
            <TextInput
              style={[styles.input, { fontFamily: "Inter_400Regular" }]}
              value={newResetPassword}
              onChangeText={setNewResetPassword}
              placeholder="••••••••"
              placeholderTextColor="#777"
              secureTextEntry
              editable={!resetSaving}
            />
          </Field>
          <PasswordStrengthMeter value={newResetPassword} />

          <TouchableOpacity
            style={[styles.primaryBtn, { marginTop: 24, opacity: resetSaving ? 0.7 : 1 }]}
            onPress={resetSaving ? undefined : handleSetNewPassword}
            activeOpacity={0.88}
          >
            {resetSaving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Set New Password</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navBack(forgotRole === "customer" ? "customer-login" : "landscaper-login")} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Customer Login ─────────────────────────────────────────────
  if (step === "customer-login") {
    return (
      <>
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
          <Field label="Username">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={custUsername} onChangeText={setCustUsername} placeholder="your_username" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#777" secureTextEntry />
          </Field>

          <View style={styles.rememberForgotRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => { setRememberMe((v) => !v); Haptics.selectionAsync(); }} activeOpacity={0.8}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={13} color="#000" />}
              </View>
              <Text style={[styles.rememberText, { fontFamily: "Inter_400Regular" }]}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setForgotRole("customer"); setShowForgot(true); }} activeOpacity={0.7}>
              <Text style={[styles.forgotLink, { fontFamily: "Inter_400Regular" }]}>Forgot username or password?</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: "100%", height: 50, marginBottom: 10 }}
              onPress={handleAppleSignIn}
            />
          )}
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={handleCustomerLogin} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in with Password</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRoleModal(true)} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? <Text style={{ color: "#34FF7A" }}>Register here</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <ForgotModal
        visible={showForgot}
        value={forgotInput}
        onChangeValue={setForgotInput}
        method={forgotMethod}
        onChangeMethod={setForgotMethod}
        onSend={handleSendForgotCode}
        loading={forgotLoading}
        onClose={() => { setShowForgot(false); setForgotInput(""); }}
      />
      <RoleSelectionModal
        visible={showRoleModal}
        onSelectCustomer={() => { setShowRoleModal(false); setStep("customer-register"); }}
        onSelectLandscaper={() => { setShowRoleModal(false); setStep("landscaper-register"); }}
        onClose={() => setShowRoleModal(false)}
      />
      </>
    );
  }

  // ── Landscaper Login ───────────────────────────────────────────
  if (step === "landscaper-login") {
    return (
      <>
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
          <Field label="Username">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={landUsername} onChangeText={setLandUsername} placeholder="your_username" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#777" secureTextEntry />
          </Field>

          <View style={styles.rememberForgotRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => { setLRememberMe((v) => !v); Haptics.selectionAsync(); }} activeOpacity={0.8}>
              <View style={[styles.checkbox, lRememberMe && styles.checkboxChecked]}>
                {lRememberMe && <Ionicons name="checkmark" size={13} color="#000" />}
              </View>
              <Text style={[styles.rememberText, { fontFamily: "Inter_400Regular" }]}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setForgotRole("landscaper"); setShowForgot(true); }} activeOpacity={0.7}>
              <Text style={[styles.forgotLink, { fontFamily: "Inter_400Regular" }]}>Forgot username or password?</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: "100%", height: 50, marginBottom: 10 }}
              onPress={() => handleAppleSignIn("landscaper")}
            />
          )}
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={handleLandscaperLogin} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in with Password</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRoleModal(true)} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? <Text style={{ color: "#34FF7A" }}>Register here</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <ForgotModal
        visible={showForgot}
        value={forgotInput}
        onChangeValue={setForgotInput}
        method={forgotMethod}
        onChangeMethod={setForgotMethod}
        onSend={handleSendForgotCode}
        loading={forgotLoading}
        onClose={() => { setShowForgot(false); setForgotInput(""); }}
      />
      <RoleSelectionModal
        visible={showRoleModal}
        onSelectCustomer={() => { setShowRoleModal(false); setStep("customer-register"); }}
        onSelectLandscaper={() => { setShowRoleModal(false); setStep("landscaper-register"); }}
        onClose={() => setShowRoleModal(false)}
      />
      <AppleLsRegModal
        visible={showAppleLsReg}
        user={pendingAppleUser}
        phone={appleRegPhone} onPhone={setAppleRegPhone}
        city={appleRegCity} onCity={setAppleRegCity}
        stateVal={appleRegState} onState={setAppleRegState}
        zip={appleRegZip} onZip={setAppleRegZip}
        services={appleRegServices} onServices={setAppleRegServices}
        years={appleRegYears} onYears={setAppleRegYears}
        loading={appleRegLoading}
        onSubmit={async () => {
          if (!appleRegPhone.trim()) { Alert.alert("Missing", "Please enter your phone number."); return; }
          if (!appleRegCity.trim()) { Alert.alert("Missing", "Please enter your city."); return; }
          if (!appleRegState.trim()) { Alert.alert("Missing", "Please enter your state."); return; }
          if (!appleRegZip.trim() || appleRegZip.length < 5) { Alert.alert("Missing", "Please enter a valid ZIP code."); return; }
          if (appleRegServices.length === 0) { Alert.alert("Missing", "Please select at least one service you offer."); return; }
          if (!pendingAppleUser) return;
          setAppleRegLoading(true);
          try {
            await fetch(`${API_URL}/api/auth/update-profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username: pendingAppleUser.username,
                role: "landscaper",
                phone: appleRegPhone.trim(),
                city: appleRegCity.trim(),
                state: appleRegState.trim(),
                zipCode: appleRegZip.trim(),
                services: appleRegServices.join(", "),
                yearsExperience: appleRegYears.trim(),
              }),
            });
            setShowAppleLsReg(false);
            go(pendingAppleUser);
          } catch {
            Alert.alert("Error", "Could not save your info. Please try again.");
          } finally {
            setAppleRegLoading(false);
          }
        }}
      />
      </>
    );
  }

  // ── Customer Registration ──────────────────────────────────────
  if (step === "customer-register") {
    return (
      <>
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
          <Field label="Username (required for login)">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regUsername} onChangeText={setRegUsername} placeholder="choose_a_username" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="First Name">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={firstName} onChangeText={setFirstName} placeholder="Jane" placeholderTextColor="#777" autoCapitalize="words" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Last Name">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lastName} onChangeText={setLastName} placeholder="Smith" placeholderTextColor="#777" autoCapitalize="words" />
              </Field>
            </View>
          </View>
          <Field label="Email">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regPassword} onChangeText={setRegPassword} placeholder="••••••••" placeholderTextColor="#777" secureTextEntry />
            <PasswordStrengthMeter value={regPassword} />
          </Field>
          <Field label="Phone Number">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#777" keyboardType="phone-pad" />
          </Field>
          <Field label="Service Address (private)">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={address} onChangeText={setAddress} placeholder="8910 45th Ave E" placeholderTextColor="#777" autoCapitalize="words" />
          </Field>
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="City">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regCity} onChangeText={setRegCity} placeholder="Ellenton" placeholderTextColor="#777" autoCapitalize="words" />
              </Field>
            </View>
            <View style={{ flex: 0.7 }}>
              <Field label="State">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regState} onChangeText={(v) => setRegState(v.toUpperCase().slice(0, 2))} placeholder="FL" placeholderTextColor="#777" autoCapitalize="characters" maxLength={2} />
              </Field>
            </View>
            <View style={{ flex: 0.9 }}>
              <Field label="ZIP Code">
                <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={zipCode} onChangeText={setZipCode} placeholder="34222" placeholderTextColor="#777" keyboardType="numeric" maxLength={5} />
              </Field>
            </View>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleCustomerRegister} disabled={loading} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>}
          </TouchableOpacity>
          <View style={[styles.consentRow, { marginTop: 16 }]}>
            <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}>By registering you agree to our </Text>
            <TouchableOpacity onPress={() => setTermsDoc("terms")} activeOpacity={0.7}>
              <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Terms</Text>
            </TouchableOpacity>
            <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}> & </Text>
            <TouchableOpacity onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
              <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {termsDoc && (
        <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />
      )}
    </>
    );
  }

  // ── Landscaper Registration ────────────────────────────────────
  return (
    <>
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
        <Field label="Username (required for login)">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lRegUsername} onChangeText={setLRegUsername} placeholder="choose_a_username" placeholderTextColor="#777" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Field label="Landscaping or Business Name">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={businessName} onChangeText={setBusinessName} placeholder="Rivera Landscaping" placeholderTextColor="#777" autoCapitalize="words" />
        </Field>
        <Field label="Email">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lEmail} onChangeText={setLEmail} placeholder="your@email.com" placeholderTextColor="#777" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Field label="Password">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lPassword} onChangeText={setLPassword} placeholder="••••••••" placeholderTextColor="#777" secureTextEntry />
          <PasswordStrengthMeter value={lPassword} />
        </Field>
        <Field label="Phone Number">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lPhone} onChangeText={setLPhone} placeholder="(555) 000-0000" placeholderTextColor="#777" keyboardType="phone-pad" />
        </Field>
        <Field label="Services You Provide (select all that apply)">
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            These will appear on your profile immediately after registration. You can update them anytime in My Services.
          </Text>
          <View style={styles.specialtyGrid}>
            {SPECIALTIES.map((s) => {
              const on = selectedServices.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.specialtyChip, on && styles.specialtyChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedServices((prev) =>
                      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  {on && <Ionicons name="checkmark-circle" size={14} color="#000" style={{ marginRight: 4 }} />}
                  <Text style={[styles.specialtyChipText, { fontFamily: "Inter_500Medium" }, on && styles.specialtyChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>
        <Field label="City (primary service area)">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lCity} onChangeText={setLCity} placeholder="Ellenton" placeholderTextColor="#777" autoCapitalize="words" />
        </Field>
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <Field label="State">
              <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={state} onChangeText={setState} placeholder="FL" placeholderTextColor="#777" autoCapitalize="characters" maxLength={2} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="ZIP Code">
              <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lZipCode} onChangeText={setLZipCode} placeholder="34222" placeholderTextColor="#777" keyboardType="numeric" maxLength={5} />
            </Field>
          </View>
        </View>
        <Field label="Years of Experience">
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={years} onChangeText={setYears} placeholder="e.g. 5" placeholderTextColor="#777" keyboardType="numeric" maxLength={2} />
        </Field>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleLandscaperRegister} disabled={loading} activeOpacity={0.88}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Landscaper Account</Text>}
        </TouchableOpacity>
        <View style={[styles.consentRow, { marginTop: 16 }]}>
          <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}>By registering you agree to our </Text>
          <TouchableOpacity onPress={() => setTermsDoc("terms")} activeOpacity={0.7}>
            <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Terms</Text>
          </TouchableOpacity>
          <Text style={[styles.consentText, { fontFamily: "Inter_400Regular" }]}> & </Text>
          <TouchableOpacity onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
            <Text style={[styles.consentLink, { fontFamily: "Inter_500Medium" }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    {termsDoc && (
      <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />
    )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>{label}</Text>
      {children}
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={16} color="#ff6b6b" />
      <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{message}</Text>
    </View>
  );
}

function RoleSelectionModal({
  visible,
  onSelectCustomer,
  onSelectLandscaper,
  onClose,
}: {
  visible: boolean;
  onSelectCustomer: () => void;
  onSelectLandscaper: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={rsStyles.backdrop}>
        <View style={rsStyles.sheet}>
          <Text style={[rsStyles.title, { fontFamily: "Inter_700Bold" }]}>
            What kind of account are you creating?
          </Text>

          <TouchableOpacity style={rsStyles.primaryBtn} onPress={onSelectCustomer} activeOpacity={0.88}>
            <Text style={[rsStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>I'm a Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={rsStyles.outlineBtn} onPress={onSelectLandscaper} activeOpacity={0.88}>
            <Text style={[rsStyles.outlineBtnText, { fontFamily: "Inter_600SemiBold" }]}>I'm a Landscaper / Business</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[rsStyles.cancelText, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 30,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: "#34FF7A",
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: "#000", fontSize: 17 },
  outlineBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#34FF7A",
    backgroundColor: "transparent",
  },
  outlineBtnText: { color: "#FFFFFF", fontSize: 17 },
  cancelText: { color: "#888888", fontSize: 14 },
});

function AppleLsRegModal({
  visible, user, phone, onPhone, city, onCity, stateVal, onState,
  zip, onZip, services, onServices, years, onYears, loading, onSubmit,
}: {
  visible: boolean; user: any;
  phone: string; onPhone: (v: string) => void;
  city: string; onCity: (v: string) => void;
  stateVal: string; onState: (v: string) => void;
  zip: string; onZip: (v: string) => void;
  services: string[]; onServices: (v: string[]) => void;
  years: string; onYears: (v: string) => void;
  loading: boolean; onSubmit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const SRVS = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Full Service", "Tree Removal"];
  function toggleSvc(s: string) {
    onServices(services.includes(s) ? services.filter((x) => x !== s) : [...services, s]);
    Haptics.selectionAsync();
  }
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => {}}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: 28 }}>
            <Ionicons name="leaf" size={32} color="#34FF7A" />
            <Text style={{ color: "#FFFFFF", fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 12, marginBottom: 6 }}>
              Almost there!
            </Text>
            <Text style={{ color: "#AAAAAA", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 }}>
              {user?.businessName ? `Welcome, ${user.businessName}! ` : ""}Just a few more details to complete your landscaper profile.
            </Text>
          </View>

          <View style={alrStyles.fieldWrap}>
            <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>Phone Number *</Text>
            <TextInput style={[alrStyles.input, { fontFamily: "Inter_400Regular" }]} value={phone} onChangeText={onPhone} placeholder="(555) 000-0000" placeholderTextColor="#777" keyboardType="phone-pad" returnKeyType="next" />
          </View>

          <View style={alrStyles.fieldWrap}>
            <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>Services You Offer *</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {SRVS.map((s) => (
                <TouchableOpacity key={s} style={[alrStyles.chip, services.includes(s) && alrStyles.chipOn]} onPress={() => toggleSvc(s)} activeOpacity={0.8}>
                  <Text style={[alrStyles.chipText, { fontFamily: "Inter_500Medium" }, services.includes(s) && alrStyles.chipTextOn]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[alrStyles.fieldWrap, { flex: 2 }]}>
              <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>City *</Text>
              <TextInput style={[alrStyles.input, { fontFamily: "Inter_400Regular" }]} value={city} onChangeText={onCity} placeholder="Sarasota" placeholderTextColor="#777" autoCapitalize="words" returnKeyType="next" />
            </View>
            <View style={[alrStyles.fieldWrap, { flex: 1 }]}>
              <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>State *</Text>
              <TextInput style={[alrStyles.input, { fontFamily: "Inter_400Regular" }]} value={stateVal} onChangeText={onState} placeholder="FL" placeholderTextColor="#777" autoCapitalize="characters" maxLength={2} returnKeyType="next" />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[alrStyles.fieldWrap, { flex: 1 }]}>
              <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>ZIP Code *</Text>
              <TextInput style={[alrStyles.input, { fontFamily: "Inter_400Regular" }]} value={zip} onChangeText={onZip} placeholder="34222" placeholderTextColor="#777" keyboardType="numeric" maxLength={5} returnKeyType="next" />
            </View>
            <View style={[alrStyles.fieldWrap, { flex: 1 }]}>
              <Text style={[alrStyles.label, { fontFamily: "Inter_600SemiBold" }]}>Years Experience</Text>
              <TextInput style={[alrStyles.input, { fontFamily: "Inter_400Regular" }]} value={years} onChangeText={onYears} placeholder="3" placeholderTextColor="#777" keyboardType="numeric" maxLength={2} returnKeyType="done" />
            </View>
          </View>

          <TouchableOpacity style={[alrStyles.submitBtn, loading && { opacity: 0.6 }]} onPress={loading ? undefined : onSubmit} activeOpacity={0.88}>
            {loading ? <ActivityIndicator color="#000" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#000" />
                <Text style={[alrStyles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>Complete Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const alrStyles = StyleSheet.create({
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, color: "#AAAAAA", marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333",
  },
  chipOn: { backgroundColor: "#0D2016", borderColor: "#34FF7A" },
  chipText: { fontSize: 13, color: "#888" },
  chipTextOn: { color: "#34FF7A" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#34FF7A",
    paddingVertical: 18,
    borderRadius: 28,
    marginTop: 8,
  },
  submitBtnText: { fontSize: 17, color: "#000000" },
});

function ForgotModal({
  visible,
  value,
  onChangeValue,
  method,
  onChangeMethod,
  onSend,
  loading,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChangeValue: (t: string) => void;
  method: "email" | "phone";
  onChangeMethod: (m: "email" | "phone") => void;
  onSend: () => void;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={fgStyles.backdrop}>
        <View style={fgStyles.sheet}>
          <Text style={[fgStyles.title, { fontFamily: "Inter_700Bold" }]}>Reset Password</Text>
          <Text style={[fgStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Choose how to identify your account. We'll email you a 6-digit code.
          </Text>

          {/* Email / Phone tab toggle */}
          <View style={fgStyles.tabRow}>
            <TouchableOpacity
              style={[fgStyles.tab, method === "email" && fgStyles.tabActive]}
              onPress={() => { onChangeMethod("email"); onChangeValue(""); }}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={15} color={method === "email" ? "#000" : "#888"} style={{ marginRight: 5 }} />
              <Text style={[fgStyles.tabText, { fontFamily: "Inter_600SemiBold", color: method === "email" ? "#000" : "#888" }]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[fgStyles.tab, method === "phone" && fgStyles.tabActive]}
              onPress={() => { onChangeMethod("phone"); onChangeValue(""); }}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={15} color={method === "phone" ? "#000" : "#888"} style={{ marginRight: 5 }} />
              <Text style={[fgStyles.tabText, { fontFamily: "Inter_600SemiBold", color: method === "phone" ? "#000" : "#888" }]}>Phone</Text>
            </TouchableOpacity>
          </View>

          {method === "phone" && (
            <Text style={[fgStyles.methodNote, { fontFamily: "Inter_400Regular" }]}>
              Enter the phone number you registered with. The reset code will be sent to the email linked to that number.
            </Text>
          )}

          <TextInput
            style={[fgStyles.input, { fontFamily: "Inter_400Regular" }]}
            value={value}
            onChangeText={onChangeValue}
            placeholder={method === "email" ? "Email address" : "Phone number (e.g. +1 555-000-1234)"}
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={method === "phone" ? "phone-pad" : "email-address"}
            editable={!loading}
          />

          <TouchableOpacity
            style={[fgStyles.sendBtn, loading && { opacity: 0.7 }]}
            onPress={loading ? undefined : onSend}
            activeOpacity={0.88}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[fgStyles.sendBtnText, { fontFamily: "Inter_600SemiBold" }]}>Send Reset Code</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, alignItems: "center" }} activeOpacity={0.7} disabled={loading}>
            <Text style={[fgStyles.cancelText, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  welcomeCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImgLarge: {
    height: LOGO_H,
    width: "100%",
    marginBottom: LOGO_MB,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  welcomePrimaryBtn: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#34FF7A",
    paddingVertical: 22,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomePrimaryBtnText: { color: "#000", fontSize: 22 },
  welcomeOutlineBtn: {
    width: "100%",
    maxWidth: 340,
    paddingVertical: 22,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#34FF7A",
    backgroundColor: "transparent",
  },
  welcomeOutlineBtnText: { color: "#FFFFFF", fontSize: 22 },
  welcomeRegisterBlock: { alignItems: "center", marginTop: 36, width: "100%" },
  welcomeFooter: { alignItems: "center", paddingBottom: 8 },
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { height: 68, width: 248 },
  buttonsSection: { gap: 10 },
  dividerGap: { height: 12 },
  primaryBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: "#000", fontSize: 17 },
  outlineBtn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
    backgroundColor: "#1A1A1A",
  },
  outlineBtnText: { color: "#fff", fontSize: 17 },
  registerLink: { color: "#888888", fontSize: 13, textAlign: "center" },
  demoNote: { color: "#666666", fontSize: 12, textAlign: "center", marginBottom: 4 },
  consentRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 12 },
  consentText: { color: "#666666", fontSize: 12 },
  consentLink: { color: "#34FF7A", fontSize: 12 },
  formScroll: { paddingHorizontal: 24, flexGrow: 1 },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  formTitle: { fontSize: 20, color: "#FFFFFF" },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: "#AAAAAA", marginBottom: 7 },
  fieldHint: { fontSize: 12, color: "#666", marginBottom: 12, lineHeight: 17 },
  input: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 15,
    fontSize: 15,
    color: "#FFFFFF",
  },
  rowFields: { flexDirection: "row", gap: 12 },
  rememberForgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#555555",
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  rememberText: { fontSize: 13, color: "#AAAAAA" },
  forgotLink: { fontSize: 13, color: "#34FF7A" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2d0a0a",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ff6b6b33",
  },
  errorText: { color: "#ff6b6b", fontSize: 13, flex: 1 },
  specialtyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  specialtyChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
  },
  specialtyChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  specialtyChipText: { color: "#FFFFFF", fontSize: 13 },
  specialtyChipTextActive: { color: "#000" },
  verifyIconBox: { alignItems: "center", marginVertical: 24 },
  verifyIcon: { fontSize: 64 },
  verifySubtitle: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  codeInput: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
    borderRadius: 22,
    paddingVertical: 22,
    fontSize: 36,
    color: "#FFFFFF",
    letterSpacing: 14,
    textAlign: "center",
  },
});

const fgStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "#222222",
  },
  title: { fontSize: 22, color: "#FFFFFF", marginBottom: 10 },
  subtitle: { fontSize: 13, color: "#888888", marginBottom: 20, lineHeight: 20 },
  input: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 18,
    padding: 15,
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  sendBtnText: { color: "#000", fontSize: 16 },
  cancelText: { color: "#888888", fontSize: 14 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: "#34FF7A",
  },
  tabText: { fontSize: 14 },
  methodNote: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center",
  },
});

