import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

const SERVICES = [
  "Lawn Mowing",
  "Edging",
  "Weeding",
  "Mulching",
  "Sod Installation",
  "Artificial Turf",
  "Full Service",
  "Other",
];

export default function DisputeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { userName } = useAuth();

  const [purchaseId, setPurchaseId] = useState("");
  const [customerName, setCustomerName] = useState(userName || "");
  const [serviceAddress, setServiceAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [landscaperName, setLandscaperName] = useState("");
  const [serviceDone, setServiceDone] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [screenshot, setScreenshot] = useState<{ uri: string; base64?: string; mimeType?: string; fileName?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  async function pickScreenshot() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo access to attach a screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setScreenshot({
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? "screenshot.jpg",
      });
      Haptics.selectionAsync();
    }
  }

  function removeScreenshot() {
    setScreenshot(null);
    Haptics.selectionAsync();
  }

  function validate() {
    const errors: Record<string, boolean> = {};
    if (!customerName.trim()) errors.customerName = true;
    if (!serviceAddress.trim()) errors.serviceAddress = true;
    if (!phoneNumber.trim()) errors.phoneNumber = true;
    if (!landscaperName.trim()) errors.landscaperName = true;
    if (!serviceDone.trim()) errors.serviceDone = true;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Missing Information", "Please fill in all required fields marked in red.");
      return;
    }

    if (!API_BASE_URL) {
      Alert.alert("Service Unavailable", "Unable to reach the dispute server. Please try again later.");
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const formData = new FormData();
      formData.append("purchaseId", purchaseId.trim());
      formData.append("customerName", customerName.trim());
      formData.append("serviceAddress", serviceAddress.trim());
      formData.append("phoneNumber", phoneNumber.trim());
      formData.append("landscaperName", landscaperName.trim());
      formData.append("serviceDone", serviceDone.trim());
      formData.append("additionalNotes", additionalNotes.trim());

      if (screenshot) {
        if (Platform.OS === "web" && screenshot.base64) {
          const byteString = atob(screenshot.base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: screenshot.mimeType ?? "image/jpeg" });
          formData.append("screenshot", blob, screenshot.fileName ?? "screenshot.jpg");
        } else {
          formData.append("screenshot", {
            uri: screenshot.uri,
            name: screenshot.fileName ?? "screenshot.jpg",
            type: screenshot.mimeType ?? "image/jpeg",
          } as any);
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/disputes`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Submission failed");

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert("Submission Failed", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.successWrap}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={72} color="#34FF7A" />
          </View>
          <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
            Dispute Submitted
          </Text>
          <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
            Your dispute has been sent to The Lawn Services team at TheLawnServices@gmail.com. We'll review the details and follow up with you shortly.
          </Text>
          <View style={styles.successBadge}>
            <Ionicons name="mail-outline" size={16} color="#34FF7A" />
            <Text style={[styles.successBadgeText, { fontFamily: "Inter_500Medium" }]}>
              TheLawnServices@gmail.com
            </Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/")} activeOpacity={0.85}>
            <Text style={[styles.doneBtnText, { fontFamily: "Inter_700Bold" }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const inputBorder = (field: string) =>
    fieldErrors[field] ? "#ef4444" : "#2A2A2A";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>File a Dispute</Text>
          <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>
            Sent directly to TheLawnServices@gmail.com
          </Text>
        </View>
        <View style={styles.disputeIconBadge}>
          <Ionicons name="warning-outline" size={20} color="#f59e0b" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#34FF7A" />
          <Text style={[styles.infoBoxText, { fontFamily: "Inter_400Regular" }]}>
            All dispute details including your Stripe Purchase ID, contact info, and screenshot are sent directly to our support team for review.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Payment Info</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Stripe Purchase ID <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: "Inter_400Regular", borderColor: "#2A2A2A" }]}
            value={purchaseId}
            onChangeText={setPurchaseId}
            placeholder="e.g. TL-2026-10234"
            placeholderTextColor="#555"
            autoCapitalize="characters"
          />
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            Found in your booking confirmation or payment receipt.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Your Information</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: "Inter_400Regular", borderColor: inputBorder("customerName") }]}
            value={customerName}
            onChangeText={(v) => { setCustomerName(v); setFieldErrors((p) => ({ ...p, customerName: false })); }}
            placeholder="Your full name"
            placeholderTextColor="#555"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Service Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: "Inter_400Regular", borderColor: inputBorder("serviceAddress") }]}
            value={serviceAddress}
            onChangeText={(v) => { setServiceAddress(v); setFieldErrors((p) => ({ ...p, serviceAddress: false })); }}
            placeholder="123 Main St, City, State ZIP"
            placeholderTextColor="#555"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Phone Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: "Inter_400Regular", borderColor: inputBorder("phoneNumber") }]}
            value={phoneNumber}
            onChangeText={(v) => { setPhoneNumber(v); setFieldErrors((p) => ({ ...p, phoneNumber: false })); }}
            placeholder="(555) 000-0000"
            placeholderTextColor="#555"
            keyboardType="phone-pad"
          />
        </View>

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Service Details</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Landscaper's Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { fontFamily: "Inter_400Regular", borderColor: inputBorder("landscaperName") }]}
            value={landscaperName}
            onChangeText={(v) => { setLandscaperName(v); setFieldErrors((p) => ({ ...p, landscaperName: false })); }}
            placeholder="Name of the landscaper involved"
            placeholderTextColor="#555"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Service Performed <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.serviceGrid, fieldErrors.serviceDone && styles.serviceGridError]}>
            {SERVICES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.serviceChip, serviceDone === s && styles.serviceChipActive]}
                onPress={() => { setServiceDone(s); setFieldErrors((p) => ({ ...p, serviceDone: false })); Haptics.selectionAsync(); }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.serviceChipText,
                    { fontFamily: serviceDone === s ? "Inter_600SemiBold" : "Inter_400Regular" },
                    serviceDone === s && styles.serviceChipTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Issue Details</Text>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Describe the Issue <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.textarea, { fontFamily: "Inter_400Regular" }]}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Describe what happened in detail..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>
            Screenshot of Issue <Text style={styles.optional}>(optional — strongly recommended)</Text>
          </Text>
          {screenshot ? (
            <View style={styles.screenshotPreviewWrap}>
              <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.screenshotRemoveBtn} onPress={removeScreenshot} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
              <View style={styles.screenshotAttachedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#34FF7A" />
                <Text style={[styles.screenshotAttachedText, { fontFamily: "Inter_500Medium" }]}>
                  Screenshot attached
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.screenshotPicker} onPress={pickScreenshot} activeOpacity={0.75}>
              <Ionicons name="image-outline" size={36} color="#34FF7A" />
              <Text style={[styles.screenshotPickerTitle, { fontFamily: "Inter_600SemiBold" }]}>
                Tap to attach screenshot
              </Text>
              <Text style={[styles.screenshotPickerSub, { fontFamily: "Inter_400Regular" }]}>
                JPG, PNG up to 10MB
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.emailNoticeRow}>
          <Ionicons name="send-outline" size={15} color="#34FF7A" />
          <Text style={[styles.emailNoticeText, { fontFamily: "Inter_400Regular" }]}>
            Your dispute will be emailed directly to{" "}
            <Text style={{ color: "#34FF7A" }}>TheLawnServices@gmail.com</Text> with all the details above.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color="#000" />
              <Text style={[styles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>
                Submit Dispute
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "#34FF7A", marginTop: 1 },
  disputeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2a1f00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#f59e0b",
  },
  scroll: { padding: 20 },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#0d2e18",
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1a5c30",
    alignItems: "flex-start",
  },
  infoBoxText: { fontSize: 13, color: "#AAAAAA", flex: 1, lineHeight: 19 },

  sectionLabel: { fontSize: 13, color: "#34FF7A", marginBottom: 14, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.8 },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, color: "#CCCCCC", marginBottom: 8 },
  fieldHint: { fontSize: 12, color: "#555", marginTop: 5 },
  required: { color: "#ef4444" },
  optional: { color: "#555", fontSize: 12 },

  input: {
    backgroundColor: "#141414",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#FFFFFF",
  },
  textarea: {
    backgroundColor: "#141414",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#FFFFFF",
    minHeight: 110,
  },

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceGridError: { padding: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444" },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#2A2A2A",
  },
  serviceChipActive: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  serviceChipText: { fontSize: 13, color: "#AAAAAA" },
  serviceChipTextActive: { color: "#34FF7A" },

  screenshotPicker: {
    height: 130,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2A2A2A",
    borderStyle: "dashed",
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  screenshotPickerTitle: { fontSize: 15, color: "#CCCCCC" },
  screenshotPickerSub: { fontSize: 12, color: "#555" },

  screenshotPreviewWrap: { position: "relative" },
  screenshotPreview: { width: "100%", height: 180, borderRadius: 12 },
  screenshotRemoveBtn: { position: "absolute", top: 8, right: 8 },
  screenshotAttachedBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  screenshotAttachedText: { fontSize: 12, color: "#34FF7A" },

  emailNoticeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: 4,
  },
  emailNoticeText: { fontSize: 13, color: "#666", flex: 1, lineHeight: 19 },

  submitBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 17, color: "#000" },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  successIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#34FF7A",
  },
  successTitle: { fontSize: 26, color: "#FFFFFF", marginBottom: 12 },
  successSub: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 20,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#1a5c30",
  },
  successBadgeText: { fontSize: 14, color: "#34FF7A" },
  doneBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 17, color: "#000" },
});
