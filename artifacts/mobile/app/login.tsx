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
} from "react-native";

import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import TermsModal from "@/components/TermsModal";

const { height: SCREEN_H } = Dimensions.get("window");
const LOGO_H = Math.min(280, Math.max(200, SCREEN_H * 0.38));
const LOGO_MB = Math.min(80, Math.max(40, SCREEN_H * 0.08));

type Step =
  | "welcome"
  | "customer-login"
  | "landscaper-login"
  | "customer-register"
  | "landscaper-register"
  | "verify-code";

const SPECIALTIES = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Clean Up"];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login } = useAuth();
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

  // Landscaper reg
  const [lRegUsername, setLRegUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [lEmail, setLEmail] = useState("");
  const [lPassword, setLPassword] = useState("");
  const [lPhone, setLPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [state, setState] = useState("");
  const [lZipCode, setLZipCode] = useState("");
  const [years, setYears] = useState("");
  const [paymentPref, setPaymentPref] = useState("");

  // Role selection modal
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Forgot / verify
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotRole, setForgotRole] = useState<"customer" | "landscaper">("customer");
  const [verifyCodeInput, setVerifyCodeInput] = useState("");

  const topPad = isWeb ? 60 : insets.top + 20;
  const botPad = isWeb ? 40 : insets.bottom + 20;
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [showPasskey, setShowPasskey] = useState(false);
  const [pendingRole, setPendingRole] = useState<"customer" | "landscaper" | null>(null);

  function go(role: "customer" | "landscaper") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(role);
    router.replace("/(tabs)");
  }

  function finishPasskey() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPasskey(false);
    if (pendingRole) go(pendingRole);
  }

  function skipPasskey() {
    setShowPasskey(false);
    if (pendingRole) go(pendingRole);
  }

  function handlePasskeyLogin(role: "customer" | "landscaper") {
    Haptics.selectionAsync();
    setPendingRole(role);
    setShowPasskey(true);
  }

  function handleCustomerLogin() {
    if (!custUsername.trim() || !password.trim()) {
      setErrors("Please enter your username and password");
      return;
    }
    setErrors(null);
    go("customer");
  }

  function handleLandscaperLogin() {
    if (!landUsername.trim() || !password.trim()) {
      setErrors("Please enter your username and password");
      return;
    }
    setErrors(null);
    go("landscaper");
  }

  function handleCustomerRegister() {
    if (!regUsername.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !regPassword.trim() || !phone.trim() || !address.trim() || !zipCode.trim()) {
      setErrors("Please fill in all fields including Username and ZIP Code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingRole("customer");
    setTimeout(() => setShowPasskey(true), 800);
  }

  function handleLandscaperRegister() {
    if (!lRegUsername.trim() || !businessName.trim() || !lEmail.trim() || !lPassword.trim() || !lPhone.trim() || !state.trim() || !lZipCode.trim() || !paymentPref) {
      setErrors("Please fill all required fields including Username, Business Name, Email, Password, Phone, State, ZIP, and Payment Preference.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setErrors(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPendingRole("landscaper");
    setTimeout(() => setShowPasskey(true), 800);
  }

  function handleSendForgotCode() {
    if (!forgotInput.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowForgot(false);
    setForgotInput("");
    setVerifyCodeInput("");
    setStep("verify-code");
  }

  function handleVerifyCode() {
    if (verifyCodeInput.trim().length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrors("Please enter the full 6-digit code");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setErrors(null);
    go(forgotRole);
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
          <Text style={[styles.demoNote, { fontFamily: "Inter_400Regular" }]}>Demo mode – tap to continue</Text>
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
            <Text style={styles.verifyIcon}>✉️</Text>
          </View>
          <Text style={[styles.verifySubtitle, { fontFamily: "Inter_400Regular" }]}>
            A 6-digit code was sent to your registered email from{"\n"}
            <Text style={{ color: "#34FF7A", fontFamily: "Inter_600SemiBold" }}>TheLawnService@gmail.com</Text>
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
          />

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleVerifyCode} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Verify Code</Text>
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
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={custUsername} onChangeText={setCustUsername} placeholder="your_username" placeholderTextColor="#555" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
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

          <TouchableOpacity style={styles.passkeyLoginBtn} onPress={() => handlePasskeyLogin("customer")} activeOpacity={0.85}>
            <Text style={styles.passkeyLoginIcon}>🔑</Text>
            <Text style={[styles.passkeyLoginText, { fontFamily: "Inter_600SemiBold" }]}>Sign in using Passcode saved on iPhone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={handleCustomerLogin} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRoleModal(true)} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? <Text style={{ color: "#34FF7A" }}>Register here</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <PasskeyModal visible={showPasskey} onUsePasskey={finishPasskey} onSkip={skipPasskey} insets={insets} isWeb={isWeb} />
      <ForgotModal
        visible={showForgot}
        value={forgotInput}
        onChangeValue={setForgotInput}
        onSend={handleSendForgotCode}
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
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={landUsername} onChangeText={setLandUsername} placeholder="your_username" placeholderTextColor="#555" autoCapitalize="none" autoCorrect={false} />
          </Field>
          <Field label="Password">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
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

          <TouchableOpacity style={styles.passkeyLoginBtn} onPress={() => handlePasskeyLogin("landscaper")} activeOpacity={0.85}>
            <Text style={styles.passkeyLoginIcon}>🔑</Text>
            <Text style={[styles.passkeyLoginText, { fontFamily: "Inter_600SemiBold" }]}>Sign in using Passcode saved on iPhone</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={handleLandscaperLogin} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRoleModal(true)} style={{ marginTop: 24, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[styles.registerLink, { fontFamily: "Inter_400Regular" }]}>Don't have an account? <Text style={{ color: "#34FF7A" }}>Register here</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <PasskeyModal visible={showPasskey} onUsePasskey={finishPasskey} onSkip={skipPasskey} insets={insets} isWeb={isWeb} />
      <ForgotModal
        visible={showForgot}
        value={forgotInput}
        onChangeValue={setForgotInput}
        onSend={handleSendForgotCode}
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
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regUsername} onChangeText={setRegUsername} placeholder="choose_a_username" placeholderTextColor="#555" autoCapitalize="none" autoCorrect={false} />
          </Field>
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
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={regPassword} onChangeText={setRegPassword} placeholder="••••••••" placeholderTextColor="#555" secureTextEntry />
          </Field>
          <Field label="Phone Number">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor="#555" keyboardType="phone-pad" />
          </Field>
          <Field label="Service Address (private)">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={address} onChangeText={setAddress} placeholder="8910 45th Ave E, Ellenton, FL" placeholderTextColor="#555" autoCapitalize="words" />
          </Field>
          <Field label="ZIP Code (required)">
            <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={zipCode} onChangeText={setZipCode} placeholder="34222" placeholderTextColor="#555" keyboardType="numeric" maxLength={5} />
          </Field>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleCustomerRegister} activeOpacity={0.88}>
            <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
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
      <PasskeyModal visible={showPasskey} onUsePasskey={finishPasskey} onSkip={skipPasskey} insets={insets} isWeb={isWeb} />
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
          <TextInput style={[styles.input, { fontFamily: "Inter_400Regular" }]} value={lRegUsername} onChangeText={setLRegUsername} placeholder="choose_a_username" placeholderTextColor="#555" autoCapitalize="none" autoCorrect={false} />
        </Field>
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
        <Field label="ZIP Code (required)">
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
    <PasskeyModal visible={showPasskey} onUsePasskey={finishPasskey} onSkip={skipPasskey} insets={insets} isWeb={isWeb} />
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

function ForgotModal({
  visible,
  value,
  onChangeValue,
  onSend,
  onClose,
}: {
  visible: boolean;
  value: string;
  onChangeValue: (t: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={fgStyles.backdrop}>
        <View style={fgStyles.sheet}>
          <Text style={[fgStyles.title, { fontFamily: "Inter_700Bold" }]}>Forgot Username or Password?</Text>
          <Text style={[fgStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Enter your email or username and we'll send a verification code.
          </Text>
          <TextInput
            style={[fgStyles.input, { fontFamily: "Inter_400Regular" }]}
            value={value}
            onChangeText={onChangeValue}
            placeholder="Email or Username"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={fgStyles.sendBtn} onPress={onSend} activeOpacity={0.88}>
            <Text style={[fgStyles.sendBtnText, { fontFamily: "Inter_600SemiBold" }]}>Send Verification Code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, alignItems: "center" }} activeOpacity={0.7}>
            <Text style={[fgStyles.cancelText, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PasskeyModal({
  visible,
  onUsePasskey,
  onSkip,
  insets,
  isWeb,
}: {
  visible: boolean;
  onUsePasskey: () => void;
  onSkip: () => void;
  insets: { bottom: number };
  isWeb: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pkStyles.backdrop}>
        <View style={[pkStyles.sheet, { paddingBottom: isWeb ? 36 : insets.bottom + 24 }]}>
          <View style={pkStyles.handle} />
          <View style={pkStyles.iconBox}>
            <Text style={pkStyles.iconText}>🔑</Text>
          </View>
          <Text style={[pkStyles.title, { fontFamily: "Inter_700Bold" }]}>
            Use Passkey for faster login?
          </Text>
          <Text style={[pkStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            Sign in with Face ID or Touch ID — no password needed
          </Text>
          <TouchableOpacity style={pkStyles.primaryBtn} onPress={onUsePasskey} activeOpacity={0.88}>
            <Text style={pkStyles.primaryBtnIcon}>👤</Text>
            <Text style={[pkStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Continue with Passkey
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={pkStyles.secondaryBtn} onPress={onSkip} activeOpacity={0.85}>
            <Text style={[pkStyles.secondaryBtnText, { fontFamily: "Inter_500Medium" }]}>
              Continue with Password
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={{ marginTop: 20, alignItems: "center" }} activeOpacity={0.6}>
            <Text style={[pkStyles.notNow, { fontFamily: "Inter_400Regular" }]}>Not now</Text>
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
  passkeyLoginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  passkeyLoginIcon: { fontSize: 20 },
  passkeyLoginText: { color: "#FFFFFF", fontSize: 14, flex: 1 },
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
  },
  sendBtnText: { color: "#000", fontSize: 16 },
  cancelText: { color: "#888888", fontSize: 14 },
});

const pkStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#222222",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#333333", marginBottom: 28 },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1a3a1a",
  },
  iconText: { fontSize: 36 },
  title: { fontSize: 22, color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
  subtitle: { fontSize: 14, color: "#AAAAAA", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#34FF7A",
    paddingVertical: 16,
    borderRadius: 22,
    marginBottom: 12,
  },
  primaryBtnIcon: { fontSize: 20 },
  primaryBtnText: { color: "#000", fontSize: 16 },
  secondaryBtn: {
    width: "100%",
    backgroundColor: "#222222",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  secondaryBtnText: { color: "#FFFFFF", fontSize: 15 },
  notNow: { color: "#666666", fontSize: 14 },
});
