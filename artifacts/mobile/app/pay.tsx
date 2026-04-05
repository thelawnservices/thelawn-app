import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type PayState = "availability" | "details" | "review" | "processing" | "success";

const TIP_OPTIONS = [
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

const PHOTO_EMOJIS = ["🌳", "📸", "🏡", "🪴", "🌿", "🍃"];

const DATES = [
  { label: "Mon", date: "Apr 7" },
  { label: "Tue", date: "Apr 8" },
  { label: "Wed", date: "Apr 9" },
  { label: "Thu", date: "Apr 10" },
  { label: "Fri", date: "Apr 11" },
  { label: "Sat", date: "Apr 12" },
];

const TIME_SLOTS = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM", "5:30 PM"];

export default function PayScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const params = useLocalSearchParams<{
    proName: string;
    proInitials: string;
    proColor: string;
    price: string;
  }>();

  const proName = params.proName || "John Rivera";
  const proInitials = params.proInitials || "JR";
  const proColor = params.proColor || "#34C759";
  const basePrice = parseFloat(params.price || "45");

  const [payState, setPayState] = useState<PayState>("availability");
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tipIdx, setTipIdx] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const spinValue = useRef(new Animated.Value(0)).current;

  const tip = Math.round(basePrice * TIP_OPTIONS[tipIdx].value * 100) / 100;
  const fee = Math.round(basePrice * 0.03 * 100) / 100;
  const total = (basePrice + tip + fee).toFixed(2);

  const canContinueFromAvailability = selectedDateIdx !== null && selectedTime !== null;

  useEffect(() => {
    if (payState === "processing") {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [payState, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const addPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (photos.length >= 6) {
      Alert.alert("Max Photos", "You can attach up to 6 photos.");
      return;
    }
    setPhotos((prev) => [...prev, PHOTO_EMOJIS[prev.length % PHOTO_EMOJIS.length]]);
  };

  const handleAuthorize = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayState("processing");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayState("success");
    }, 1800);
  };

  const selectedDateLabel =
    selectedDateIdx !== null
      ? `${DATES[selectedDateIdx].date}, 2026`
      : null;

  // ─── Processing ───────────────────────────────────────────────
  if (payState === "processing") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#000000" }]}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={[styles.processingText, { fontFamily: "Inter_500Medium" }]}>
          Authorizing Escrow Hold...
        </Text>
      </View>
    );
  }

  // ─── Success ──────────────────────────────────────────────────
  if (payState === "success") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#fff", paddingBottom: bottomPadding + 20 }]}>
        <View style={styles.lockIconBox}>
          <Ionicons name="lock-closed" size={52} color="#34FF7A" />
        </View>
        <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
          Payment Held in Escrow
        </Text>
        <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
          Funds will be released only after both you and {proName.split(" ")[0]} confirm the work is complete.
        </Text>

        <View style={styles.escrowInfoBox}>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>1</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              Landscaper completes the job
            </Text>
          </View>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>2</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              You confirm you're satisfied
            </Text>
          </View>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>3</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              ${total} is released to {proName.split(" ")[0]}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.successBtn, { width: "100%" }]}
          onPress={() => {
            router.dismiss();
            router.navigate("/(tabs)/jobs");
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.successBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            View in My Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.dismiss()} style={styles.doneLink}>
          <Text style={[styles.doneLinkText, { fontFamily: "Inter_400Regular" }]}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Availability ─────────────────────────────────────────────
  if (payState === "availability") {
    return (
      <View style={[styles.container, { backgroundColor: "#fff" }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity onPress={() => router.dismiss()} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Select Date & Time</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}
        >
          {/* Pro summary */}
          <View style={styles.proSummary}>
            <View style={[styles.proAvatar, { backgroundColor: proColor }]}>
              <Text style={styles.proAvatarText}>{proInitials}</Text>
            </View>
            <View>
              <Text style={[styles.proSummaryName, { fontFamily: "Inter_600SemiBold" }]}>
                {proName}
              </Text>
              <Text style={[styles.proSummaryService, { fontFamily: "Inter_400Regular" }]}>
                Lawn Mowing · ${basePrice}/hr
              </Text>
            </View>
          </View>

          {/* Date row */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Choose a Date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", gap: 10, paddingRight: 4 }}>
              {DATES.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dateTile,
                    selectedDateIdx === i && styles.dateTileActive,
                  ]}
                  onPress={() => {
                    setSelectedDateIdx(i);
                    setSelectedTime(null);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.dateTileDay,
                      { fontFamily: "Inter_400Regular" },
                      selectedDateIdx === i && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {d.label}
                  </Text>
                  <Text
                    style={[
                      styles.dateTileDate,
                      { fontFamily: "Inter_700Bold" },
                      selectedDateIdx === i && { color: "#fff" },
                    ]}
                  >
                    {d.date.split(" ")[1]}
                  </Text>
                  <Text
                    style={[
                      styles.dateTileMonth,
                      { fontFamily: "Inter_400Regular" },
                      selectedDateIdx === i && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {d.date.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Time slots */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            {selectedDateIdx !== null
              ? `Available Times — ${DATES[selectedDateIdx].date}`
              : "Available Times"}
          </Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.timeTile,
                  selectedTime === t && styles.timeTileActive,
                  selectedDateIdx === null && styles.timeTileDisabled,
                ]}
                onPress={() => {
                  if (selectedDateIdx === null) return;
                  setSelectedTime(t);
                  Haptics.selectionAsync();
                }}
                disabled={selectedDateIdx === null}
              >
                <Text
                  style={[
                    styles.timeTileText,
                    { fontFamily: "Inter_500Medium" },
                    selectedTime === t && { color: "#fff" },
                    selectedDateIdx === null && { color: "#d1d5db" },
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedDateIdx === null && (
            <Text style={[styles.hintText, { fontFamily: "Inter_400Regular" }]}>
              Select a date above to see available times
            </Text>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 12 }]}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              !canContinueFromAvailability && styles.continueBtnDisabled,
            ]}
            onPress={() => {
              if (!canContinueFromAvailability) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPayState("details");
            }}
            activeOpacity={canContinueFromAvailability ? 0.85 : 1}
          >
            <Text style={[styles.continueBtnText, { fontFamily: "Inter_700Bold" }]}>
              {canContinueFromAvailability
                ? `Continue · ${selectedDateLabel} at ${selectedTime}`
                : "Select a date & time"}
            </Text>
            {canContinueFromAvailability && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Job Details ──────────────────────────────────────────────
  if (payState === "details") {
    return (
      <View style={[styles.container, { backgroundColor: "#fff" }]}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity onPress={() => setPayState("availability")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Job Details</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Date/time pill */}
        <View style={styles.selectedSlotPill}>
          <Ionicons name="calendar-outline" size={14} color="#34FF7A" />
          <Text style={[styles.selectedSlotText, { fontFamily: "Inter_500Medium" }]}>
            {selectedDateLabel} at {selectedTime}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}
        >
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Special Instructions
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            Tell the landscaper exactly what you want done
          </Text>
          <TextInput
            style={[styles.textArea, { fontFamily: "Inter_400Regular" }]}
            placeholder="Example: Please edge the driveway, remove weeds from flower beds, trim around the fence..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            value={instructions}
            onChangeText={setInstructions}
            textAlignVertical="top"
          />

          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            Attach Photos
            <Text style={[{ fontFamily: "Inter_400Regular", color: "#9ca3af", fontSize: 13 }]}>
              {" "}(optional)
            </Text>
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            Help the pro understand the scope of work
          </Text>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((emoji, i) => (
                <View key={i} style={styles.photoTile}>
                  <Text style={{ fontSize: 36 }}>{emoji}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
            <Ionicons name="camera-outline" size={22} color="#34FF7A" />
            <Text style={[styles.addPhotoBtnText, { fontFamily: "Inter_500Medium" }]}>
              + Add Photo
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 12 }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPayState("review");
            }}
            activeOpacity={0.85}
          >
            <Text style={[styles.continueBtnText, { fontFamily: "Inter_700Bold" }]}>
              Continue to Review & Pay
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Review & Pay ─────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: "#fff" }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => setPayState("details")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Review & Pay</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}
      >
        {/* Service Summary */}
        <View style={styles.summaryCard}>
          <View style={[styles.summaryAvatarBox, { backgroundColor: proColor }]}>
            <Text style={styles.summaryAvatarText}>{proInitials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryService, { fontFamily: "Inter_600SemiBold" }]}>
              Lawn Mowing · Standard cut
            </Text>
            <Text style={[styles.summaryDate, { fontFamily: "Inter_400Regular" }]}>
              {selectedDateLabel} · {selectedTime}
            </Text>
            <Text style={[styles.summaryPro, { fontFamily: "Inter_400Regular" }]}>
              with {proName}
            </Text>
          </View>
        </View>

        {/* Job Instructions preview */}
        {instructions.trim().length > 0 && (
          <View style={styles.instructionsPreview}>
            <Ionicons name="document-text-outline" size={16} color="#34FF7A" />
            <Text style={[styles.instructionsPreviewText, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
              {instructions}
            </Text>
          </View>
        )}

        {/* Tip */}
        <Text style={[styles.tipLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Add a tip for {proName.split(" ")[0]}
        </Text>
        <View style={styles.tipRow}>
          {TIP_OPTIONS.map((t, i) => (
            <TouchableOpacity
              key={t.label}
              style={[styles.tipBtn, tipIdx === i && styles.tipBtnActive]}
              onPress={() => { setTipIdx(i); Haptics.selectionAsync(); }}
            >
              <Text
                style={[
                  styles.tipBtnLabel,
                  { fontFamily: "Inter_600SemiBold" },
                  tipIdx === i && { color: "#fff" },
                ]}
              >
                {t.label}
              </Text>
              <Text
                style={[
                  styles.tipBtnAmount,
                  { fontFamily: "Inter_400Regular" },
                  tipIdx === i && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                ${(basePrice * t.value).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Subtotal</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${basePrice.toFixed(2)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Tip ({TIP_OPTIONS[tipIdx].label})</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${tip.toFixed(2)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>TheLawn Platform Fee (3%)</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${fee.toFixed(2)}</Text>
          </View>
          <View style={[styles.lineItem, styles.totalRow]}>
            <Text style={[styles.totalLabel, { fontFamily: "Inter_700Bold" }]}>Total</Text>
            <Text style={[styles.totalValue, { fontFamily: "Inter_700Bold" }]}>${total}</Text>
          </View>
        </View>

        {/* Escrow Notice */}
        <View style={styles.escrowNotice}>
          <View style={styles.escrowNoticeTop}>
            <Ionicons name="lock-closed" size={16} color="#1d4ed8" />
            <Text style={[styles.escrowNoticeTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Secure Escrow Payment
            </Text>
          </View>
          <Text style={[styles.escrowNoticeText, { fontFamily: "Inter_400Regular" }]}>
            Your payment will be held securely and{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>not charged</Text> until both you and
            the landscaper confirm the work is complete.
          </Text>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentMethod}>
          <View style={styles.paymentMethodLeft}>
            <View style={styles.cardIconBox}>
              <Ionicons name="card" size={20} color="#34FF7A" />
            </View>
            <View>
              <Text style={[styles.cardLabel, { fontFamily: "Inter_400Regular" }]}>
                •••• •••• •••• 4242
              </Text>
              <Text style={[styles.cardSub, { fontFamily: "Inter_400Regular" }]}>Visa · Expires 12/27</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 12 }]}>
        <TouchableOpacity style={styles.authorizeBtn} onPress={handleAuthorize} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <Text style={[styles.authorizeBtnText, { fontFamily: "Inter_700Bold" }]}>
            Authorize Payment Hold · ${total}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  fullCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 28,
  },
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: "#34C759",
    borderTopColor: "transparent",
    marginBottom: 8,
  },
  processingText: { fontSize: 17, color: "#FFFFFF" },
  lockIconBox: {
    width: 96,
    height: 96,
    backgroundColor: "#0d2e18",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 26, color: "#FFFFFF", textAlign: "center" },
  successSub: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22 },
  escrowInfoBox: {
    width: "100%",
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  escrowStep: { flexDirection: "row", alignItems: "center", gap: 14 },
  escrowStepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  escrowStepNumText: { fontSize: 14, color: "#FFFFFF" },
  escrowStepText: { fontSize: 14, color: "#FFFFFF", flex: 1 },
  successBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  successBtnText: { color: "#000", fontSize: 16 },
  doneLink: { padding: 8 },
  doneLinkText: { color: "#555", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#111111",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, color: "#FFFFFF" },
  selectedSlotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  selectedSlotText: { fontSize: 13, color: "#FFFFFF" },
  proSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#111111",
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#222222",
  },
  proAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  proAvatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  proSummaryName: { fontSize: 15, color: "#FFFFFF", marginBottom: 2 },
  proSummaryService: { fontSize: 13, color: "#555" },
  sectionLabel: { fontSize: 13, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  dateTile: {
    width: 62,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#111111",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    gap: 2,
  },
  dateTileActive: { backgroundColor: "#34C759", borderColor: "#34C759" },
  dateTileDay: { fontSize: 11, color: "#555" },
  dateTileDate: { fontSize: 20, color: "#FFFFFF" },
  dateTileMonth: { fontSize: 11, color: "#555" },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  timeTile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    minWidth: "30%",
    alignItems: "center",
  },
  timeTileActive: { backgroundColor: "#34C759", borderColor: "#34C759" },
  timeTileDisabled: { backgroundColor: "#0d0d0d", borderColor: "#1a1a1a" },
  timeTileText: { fontSize: 14, color: "#FFFFFF" },
  hintText: { fontSize: 13, color: "#555", textAlign: "center", marginTop: 8 },
  fieldLabel: { fontSize: 15, color: "#FFFFFF", marginBottom: 4 },
  fieldHint: { fontSize: 13, color: "#555", marginBottom: 12 },
  textArea: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 16,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 120,
    marginBottom: 24,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  photoTile: {
    width: 90,
    height: 90,
    backgroundColor: "#0d2e18",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a3a1a",
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#34C759",
    borderRadius: 22,
    paddingVertical: 20,
    marginBottom: 8,
  },
  addPhotoBtnText: { fontSize: 15, color: "#FFFFFF" },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    backgroundColor: "#111111",
  },
  continueBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: "#1a1a1a",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: { color: "#000", fontSize: 15 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222222",
  },
  summaryAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryAvatarText: { color: "#fff", fontWeight: "700", fontSize: 20 },
  summaryService: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  summaryDate: { fontSize: 13, color: "#555", marginBottom: 2 },
  summaryPro: { fontSize: 13, color: "#555" },
  instructionsPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0d2e18",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1a3a1a",
  },
  instructionsPreviewText: { flex: 1, fontSize: 13, color: "#FFFFFF" },
  tipLabel: {
    fontSize: 13,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  tipBtnActive: { backgroundColor: "#34C759", borderColor: "#34C759" },
  tipBtnLabel: { fontSize: 16, color: "#FFFFFF" },
  tipBtnAmount: { fontSize: 12, color: "#555", marginTop: 2 },
  breakdown: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 12,
  },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineLabel: { fontSize: 14, color: "#555" },
  lineValue: { fontSize: 14, color: "#FFFFFF" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 17, color: "#FFFFFF" },
  totalValue: { fontSize: 26, color: "#FFFFFF" },
  escrowNotice: {
    backgroundColor: "#0d1a2e",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  escrowNoticeTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  escrowNoticeTitle: { fontSize: 14, color: "#60a5fa" },
  escrowNoticeText: { fontSize: 13, color: "#93c5fd", lineHeight: 20 },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111111",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  paymentMethodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#0d2e18",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 14, color: "#FFFFFF", letterSpacing: 1 },
  cardSub: { fontSize: 12, color: "#555" },
  authorizeBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  authorizeBtnText: { color: "#000", fontSize: 16 },
});
