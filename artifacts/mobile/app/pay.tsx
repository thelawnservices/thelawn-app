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

const SERVICE_OPTIONS = [
  { label: "Lawn Mowing",    emoji: "🌿" },
  { label: "Hedge Trimming", emoji: "✂️" },
  { label: "Mulching",       emoji: "🪴" },
  { label: "Clean Up",       emoji: "🗑️" },
];

const YARD_SIZE_OPTIONS = [
  { key: "Small",  label: "Small",  sub: "< 5,000 sq ft" },
  { key: "Medium", label: "Medium", sub: "5,000–10,000 sq ft" },
  { key: "Large",  label: "Large",  sub: "10,000+ sq ft" },
];

const PRICE_MATRIX: Record<string, Record<string, number>> = {
  "Lawn Mowing":    { Small: 45,  Medium: 65,  Large: 120 },
  "Hedge Trimming": { Small: 55,  Medium: 75,  Large: 95  },
  "Mulching":       { Small: 110, Medium: 140, Large: 180 },
  "Clean Up":       { Small: 30,  Medium: 40,  Large: 55  },
};

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
  const proColor = params.proColor || "#22C55E";

  const [payState, setPayState] = useState<PayState>("availability");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedYardSize, setSelectedYardSize] = useState<string | null>(null);
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<"Weekly" | "Bi-weekly" | "Monthly">("Weekly");
  const [recurringStart, setRecurringStart] = useState("Apr 7, 2026");
  const [recurringEnd, setRecurringEnd] = useState("Apr 7, 2027");
  const [tipPresetIdx, setTipPresetIdx] = useState<number | null>(1);
  const [tipMode, setTipMode] = useState<"preset" | "custom" | "none">("preset");
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"applepay" | "debit" | "venmo" | "paypal" | "cashapp">("applepay");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [venmoUser, setVenmoUser] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [cashTag, setCashTag] = useState("");
  const spinValue = useRef(new Animated.Value(0)).current;

  const basePrice =
    selectedService && selectedYardSize
      ? (PRICE_MATRIX[selectedService]?.[selectedYardSize] ?? 45)
      : 45;

  const tip =
    tipMode === "none"
      ? 0
      : tipMode === "custom"
      ? Math.max(0, parseFloat(customTipAmount) || 0)
      : tipPresetIdx !== null
      ? Math.round(basePrice * TIP_OPTIONS[tipPresetIdx].value * 100) / 100
      : 0;
  const tipLabel =
    tipMode === "none"
      ? "No tip"
      : tipMode === "custom"
      ? "Custom"
      : tipPresetIdx !== null
      ? TIP_OPTIONS[tipPresetIdx].label
      : "–";
  const fee = Math.round(basePrice * 0.03 * 100) / 100;
  const total = (basePrice + tip + fee).toFixed(2);

  const canContinueFromAvailability = selectedDateIdx !== null && selectedTime !== null;
  const canContinueFromDetails = selectedService !== null && serviceAddress.trim().length > 0 && selectedYardSize !== null;

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

  const validatePayment = (): string | true => {
    if (paymentMethod === "applepay") return true;
    if (paymentMethod === "debit") {
      const raw = cardNumber.replace(/\s/g, "");
      if (!/^\d{16}$/.test(raw)) return "Please enter a valid 16-digit card number.";
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return "Please enter a valid expiry date (MM/YY).";
      if (!/^\d{3,4}$/.test(cardCvv)) return "Please enter a valid CVV (3–4 digits).";
      return true;
    }
    if (paymentMethod === "venmo") {
      if (!venmoUser.trim() || !venmoUser.trim().startsWith("@"))
        return "Venmo username must start with @";
      return true;
    }
    if (paymentMethod === "paypal") {
      if (!paypalEmail.includes("@")) return "Please enter a valid PayPal email address.";
      return true;
    }
    if (paymentMethod === "cashapp") {
      if (!cashTag.trim() || !cashTag.trim().startsWith("$"))
        return "Cash App $cashtag must start with $";
      return true;
    }
    return true;
  };

  const PAY_METHOD_LABELS: Record<string, string> = {
    applepay: "Apple Pay",
    debit: "Debit Card",
    venmo: "Venmo",
    paypal: "PayPal",
    cashapp: "Cash App",
  };

  const handleAuthorize = () => {
    const valid = validatePayment();
    if (valid !== true) {
      Alert.alert("Payment Error", valid);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPayState("processing");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayState("success");
    }, 2200);
  };

  const selectedDateLabel =
    selectedDateIdx !== null
      ? `${DATES[selectedDateIdx].date}, 2026`
      : null;

  // ─── Processing ───────────────────────────────────────────────
  if (payState === "processing") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#050505" }]}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={[styles.processingText, { fontFamily: "Inter_500Medium" }]}>
          Processing with {PAY_METHOD_LABELS[paymentMethod]}...
        </Text>
      </View>
    );
  }

  // ─── Success ──────────────────────────────────────────────────
  if (payState === "success") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#050505", paddingBottom: bottomPadding + 20 }]}>
        <View style={styles.lockIconBox}>
          <Ionicons name="lock-closed" size={52} color="#22C55E" />
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
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity onPress={() => router.dismiss()} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={24} color="#22C55E" />
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

          {/* Recurring Appointment */}
          <View style={styles.recurringRow}>
            <Text style={[styles.recurringLabel, { fontFamily: "Inter_500Medium" }]}>
              Recurring Appointment
            </Text>
            <TouchableOpacity
              style={[styles.toggleTrack, recurring && styles.toggleTrackOn]}
              onPress={() => {
                setRecurring((v) => !v);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, recurring && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {recurring && (
            <View style={styles.recurringExpandBox}>
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginBottom: 10 }]}>
                Frequency
              </Text>
              <View style={styles.freqRow}>
                {(["Weekly", "Bi-weekly", "Monthly"] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqChip, recurringFreq === f && styles.freqChipActive]}
                    onPress={() => {
                      setRecurringFreq(f);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.freqChipText,
                        { fontFamily: "Inter_500Medium" },
                        recurringFreq === f && styles.freqChipTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.recurringDateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recurringDateLabel, { fontFamily: "Inter_400Regular" }]}>
                    Start Date
                  </Text>
                  <TextInput
                    style={[styles.recurringDateInput, { fontFamily: "Inter_400Regular" }]}
                    value={recurringStart}
                    onChangeText={setRecurringStart}
                    placeholder="Apr 7, 2026"
                    placeholderTextColor="#555"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recurringDateLabel, { fontFamily: "Inter_400Regular" }]}>
                    End Date
                  </Text>
                  <TextInput
                    style={[styles.recurringDateInput, { fontFamily: "Inter_400Regular" }]}
                    value={recurringEnd}
                    onChangeText={setRecurringEnd}
                    placeholder="Apr 7, 2027"
                    placeholderTextColor="#555"
                  />
                </View>
              </View>
              <Text style={[styles.recurringNote, { fontFamily: "Inter_400Regular" }]}>
                Each appointment is charged separately after dual confirmation.
              </Text>
            </View>
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
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity onPress={() => setPayState("availability")} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#22C55E" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Job Details</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Date/time pill */}
        <View style={styles.selectedSlotPill}>
          <Ionicons name="calendar-outline" size={14} color="#22C55E" />
          <Text style={[styles.selectedSlotText, { fontFamily: "Inter_500Medium" }]}>
            {selectedDateLabel} at {selectedTime}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 100 }}
        >
          {/* Service Type */}
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Service Type{" "}
            <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <View style={styles.serviceGrid}>
            {SERVICE_OPTIONS.map((svc) => (
              <TouchableOpacity
                key={svc.label}
                style={[styles.serviceTile, selectedService === svc.label && styles.serviceTileActive]}
                onPress={() => {
                  setSelectedService(svc.label);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                <Text style={[
                  styles.serviceLabel,
                  { fontFamily: "Inter_600SemiBold" },
                  selectedService === svc.label && styles.serviceLabelActive,
                ]}>
                  {svc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Service Address */}
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            Service Address{" "}
            <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            Where should the landscaper go?
          </Text>
          <TextInput
            style={[
              styles.addressInput,
              { fontFamily: "Inter_400Regular" },
              serviceAddress.length > 0 && styles.addressInputFilled,
            ]}
            placeholder="e.g. 8910 45th Ave E, Ellenton, FL"
            placeholderTextColor="#9ca3af"
            value={serviceAddress}
            onChangeText={setServiceAddress}
            returnKeyType="done"
            autoCorrect={false}
          />

          {/* Yard Size */}
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
            What size is your yard?{" "}
            <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            This determines your price
          </Text>
          <View style={styles.yardSizeRow}>
            {YARD_SIZE_OPTIONS.map((ys) => (
              <TouchableOpacity
                key={ys.key}
                style={[styles.yardChip, selectedYardSize === ys.key && styles.yardChipActive]}
                onPress={() => {
                  setSelectedYardSize(ys.key);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.yardChipLabel, { fontFamily: "Inter_600SemiBold" }, selectedYardSize === ys.key && styles.yardChipLabelActive]}>
                  {ys.label}
                </Text>
                <Text style={[styles.yardChipSub, { fontFamily: "Inter_400Regular" }, selectedYardSize === ys.key && styles.yardChipSubActive]}>
                  {ys.sub}
                </Text>
                {selectedYardSize === ys.key && selectedService && (
                  <Text style={[styles.yardChipPrice, { fontFamily: "Inter_700Bold" }]}>
                    ${PRICE_MATRIX[selectedService]?.[ys.key] ?? "–"}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
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
            <Ionicons name="camera-outline" size={22} color="#22C55E" />
            <Text style={[styles.addPhotoBtnText, { fontFamily: "Inter_500Medium" }]}>
              + Add Photo
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 12 }]}>
          <TouchableOpacity
            style={[
              styles.continueBtn,
              !canContinueFromDetails && styles.continueBtnDisabled,
            ]}
            onPress={() => {
              if (!canContinueFromDetails) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPayState("review");
            }}
            activeOpacity={canContinueFromDetails ? 0.85 : 1}
          >
            <Text style={[styles.continueBtnText, { fontFamily: "Inter_700Bold" }]}>
              {!serviceAddress.trim()
                ? "Enter a service address"
                : !selectedYardSize
                ? "Select your yard size"
                : "Continue to Review & Pay"}
            </Text>
            {canContinueFromDetails && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Review & Pay ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <TouchableOpacity onPress={() => setPayState("details")} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#22C55E" />
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
              {selectedService ?? "Lawn Mowing"}{selectedYardSize ? ` · ${selectedYardSize} yard` : ""}
            </Text>
            {recurring && (
              <View style={styles.recurringBadge}>
                <Ionicons name="repeat" size={11} color="#22C55E" />
                <Text style={[styles.recurringBadgeText, { fontFamily: "Inter_500Medium" }]}>
                  {recurringFreq} · Charged per appointment
                </Text>
              </View>
            )}
            <Text style={[styles.summaryDate, { fontFamily: "Inter_400Regular" }]}>
              {selectedDateLabel} · {selectedTime}
            </Text>
            <Text style={[styles.summaryPro, { fontFamily: "Inter_400Regular" }]}>
              with {proName}
            </Text>
            {serviceAddress.trim().length > 0 && (
              <View style={styles.summaryAddressRow}>
                <Ionicons name="location-outline" size={12} color="#9ca3af" />
                <Text style={[styles.summaryAddress, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {serviceAddress}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Job Instructions preview */}
        {instructions.trim().length > 0 && (
          <View style={styles.instructionsPreview}>
            <Ionicons name="document-text-outline" size={16} color="#22C55E" />
            <Text style={[styles.instructionsPreviewText, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
              {instructions}
            </Text>
          </View>
        )}

        {/* Tip */}
        <Text style={[styles.tipLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Add a tip for {proName.split(" ")[0].toUpperCase()}
        </Text>
        <View style={styles.tipRow}>
          {TIP_OPTIONS.map((t, i) => (
            <TouchableOpacity
              key={t.label}
              style={[styles.tipBtn, tipMode === "preset" && tipPresetIdx === i && styles.tipBtnActive]}
              onPress={() => { setTipMode("preset"); setTipPresetIdx(i); Haptics.selectionAsync(); }}
            >
              <Text
                style={[
                  styles.tipBtnLabel,
                  { fontFamily: "Inter_600SemiBold" },
                  tipMode === "preset" && tipPresetIdx === i && { color: "#fff" },
                ]}
              >
                {t.label}
              </Text>
              <Text
                style={[
                  styles.tipBtnAmount,
                  { fontFamily: "Inter_400Regular" },
                  tipMode === "preset" && tipPresetIdx === i && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                ${(basePrice * t.value).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tipExtraRow}>
          <TouchableOpacity
            style={[styles.tipExtraBtn, styles.tipExtraBtnCustom, tipMode === "custom" && styles.tipBtnActive]}
            onPress={() => { setTipMode("custom"); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={14} color={tipMode === "custom" ? "#fff" : "#AAAAAA"} />
            <Text style={[styles.tipExtraLabel, { fontFamily: "Inter_500Medium" }, tipMode === "custom" && { color: "#fff" }]}>
              Custom Tip
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipExtraBtn, styles.tipExtraBtnNone, tipMode === "none" && styles.tipBtnActive]}
            onPress={() => { setTipMode("none"); setCustomTipAmount(""); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tipExtraLabel, { fontFamily: "Inter_500Medium" }, tipMode === "none" && { color: "#fff" }]}>
              No Tip
            </Text>
          </TouchableOpacity>
        </View>
        {tipMode === "custom" && (
          <View style={styles.customTipBox}>
            <View style={styles.customTipInputRow}>
              <Text style={[styles.customTipDollar, { fontFamily: "Inter_600SemiBold" }]}>$</Text>
              <TextInput
                style={[styles.customTipInput, { fontFamily: "Inter_400Regular" }]}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="decimal-pad"
                value={customTipAmount}
                onChangeText={setCustomTipAmount}
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity
              style={styles.customTipApplyBtn}
              onPress={() => { Haptics.selectionAsync(); }}
              activeOpacity={0.85}
            >
              <Text style={[styles.customTipApplyText, { fontFamily: "Inter_600SemiBold" }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Subtotal</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${basePrice.toFixed(2)}</Text>
          </View>
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Tip ({tipLabel})</Text>
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
            <Ionicons name="lock-closed" size={16} color="#22C55E" />
            <Text style={[styles.escrowNoticeTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Secure Escrow Payment
            </Text>
          </View>
          {recurring && (
            <Text style={[styles.escrowNoticeText, { fontFamily: "Inter_400Regular", marginBottom: 6 }]}>
              Each recurring appointment requires{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>dual confirmation</Text> before payment release.
            </Text>
          )}
          <Text style={[styles.escrowNoticeText, { fontFamily: "Inter_400Regular" }]}>
            Your payment will be held securely and{" "}
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>not charged</Text> until both you and
            the landscaper confirm the work is complete.
          </Text>
        </View>

        {/* Payment Method */}
        <Text style={[styles.payMethodLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Payment Method
        </Text>
        <View style={styles.payMethodRow}>
          {(
            [
              { key: "applepay", icon: "logo-apple", label: "Apple Pay" },
              { key: "debit",    icon: "card",       label: "Debit" },
              { key: "venmo",    icon: "phone-portrait", label: "Venmo" },
              { key: "paypal",   icon: "globe",      label: "PayPal" },
              { key: "cashapp",  icon: "cash",       label: "Cash App" },
            ] as const
          ).map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.payMethodChip, paymentMethod === m.key && styles.payMethodChipActive]}
              onPress={() => { setPaymentMethod(m.key); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <Ionicons name={m.icon} size={16} color={paymentMethod === m.key ? "#000" : "#AAAAAA"} />
              <Text style={[styles.payMethodChipText, { fontFamily: "Inter_500Medium" }, paymentMethod === m.key && styles.payMethodChipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {paymentMethod === "applepay" && (
          <View style={styles.payFieldReady}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={[styles.payFieldReadyText, { fontFamily: "Inter_500Medium" }]}>
              Apple Pay ready — tap Authorize to confirm
            </Text>
          </View>
        )}
        {paymentMethod === "debit" && (
          <View style={styles.payFieldBox}>
            <TextInput
              style={[styles.payFieldInput, { fontFamily: "Inter_400Regular" }]}
              placeholder="Card Number"
              placeholderTextColor="#555"
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={setCardNumber}
              maxLength={19}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                style={[styles.payFieldInput, { flex: 1, fontFamily: "Inter_400Regular" }]}
                placeholder="MM / YY"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                value={cardExpiry}
                onChangeText={setCardExpiry}
                maxLength={5}
              />
              <TextInput
                style={[styles.payFieldInput, { flex: 1, fontFamily: "Inter_400Regular" }]}
                placeholder="CVV"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                secureTextEntry
                value={cardCvv}
                onChangeText={setCardCvv}
                maxLength={4}
              />
            </View>
          </View>
        )}
        {paymentMethod === "venmo" && (
          <TextInput
            style={[styles.payFieldInputStandalone, { fontFamily: "Inter_400Regular" }]}
            placeholder="Venmo Username"
            placeholderTextColor="#555"
            value={venmoUser}
            onChangeText={setVenmoUser}
            autoCapitalize="none"
          />
        )}
        {paymentMethod === "paypal" && (
          <TextInput
            style={[styles.payFieldInputStandalone, { fontFamily: "Inter_400Regular" }]}
            placeholder="PayPal Email"
            placeholderTextColor="#555"
            keyboardType="email-address"
            value={paypalEmail}
            onChangeText={setPaypalEmail}
            autoCapitalize="none"
          />
        )}
        {paymentMethod === "cashapp" && (
          <TextInput
            style={[styles.payFieldInputStandalone, { fontFamily: "Inter_400Regular" }]}
            placeholder="$Cashtag"
            placeholderTextColor="#555"
            value={cashTag}
            onChangeText={setCashTag}
            autoCapitalize="none"
          />
        )}

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
  container: { flex: 1, backgroundColor: "#050505" },
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
    borderColor: "#22C55E",
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
  successSub: { fontSize: 14, color: "#888888", textAlign: "center", lineHeight: 22 },
  escrowInfoBox: {
    width: "100%",
    backgroundColor: "#161616",
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
    backgroundColor: "#22C55E",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  successBtnText: { color: "#000", fontSize: 16 },
  doneLink: { padding: 8 },
  doneLinkText: { color: "#888888", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#050505",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, color: "#22C55E" },
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
    backgroundColor: "#161616",
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
  proSummaryService: { fontSize: 13, color: "#888888" },
  sectionLabel: { fontSize: 11, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },
  dateTile: {
    width: 62,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#161616",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    gap: 2,
  },
  dateTileActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
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
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    minWidth: "30%",
    alignItems: "center",
  },
  timeTileActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  timeTileDisabled: { backgroundColor: "#0d0d0d", borderColor: "#1a1a1a" },
  timeTileText: { fontSize: 14, color: "#FFFFFF" },
  hintText: { fontSize: 13, color: "#888888", textAlign: "center", marginTop: 8 },
  fieldLabel: { fontSize: 15, color: "#22C55E", marginBottom: 4 },
  fieldHint: { fontSize: 13, color: "#888888", marginBottom: 12 },
  addressInput: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  addressInputFilled: {
    borderColor: "#22C55E",
  },
  textArea: {
    backgroundColor: "#161616",
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
    borderColor: "#22C55E",
    borderRadius: 22,
    paddingVertical: 20,
    marginBottom: 8,
  },
  addPhotoBtnText: { fontSize: 15, color: "#22C55E" },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    backgroundColor: "#161616",
  },
  continueBtn: {
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#22C55E",
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
    backgroundColor: "#161616",
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
  summaryDate: { fontSize: 13, color: "#888888", marginBottom: 2 },
  summaryPro: { fontSize: 13, color: "#888888" },
  summaryAddressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  summaryAddress: { fontSize: 12, color: "#888888", flex: 1 },
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
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#161616",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  tipBtnActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  tipBtnLabel: { fontSize: 16, color: "#FFFFFF" },
  tipBtnAmount: { fontSize: 12, color: "#888888", marginTop: 2 },
  breakdown: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 12,
  },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineLabel: { fontSize: 14, color: "#888888" },
  lineValue: { fontSize: 14, color: "#FFFFFF" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 17, color: "#FFFFFF" },
  totalValue: { fontSize: 26, color: "#22C55E" },
  escrowNotice: {
    backgroundColor: "#0A1F1A",
    borderWidth: 1,
    borderColor: "#1a3a1a",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  escrowNoticeTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  escrowNoticeTitle: { fontSize: 14, color: "#22C55E" },
  escrowNoticeText: { fontSize: 13, color: "#A8FFD1", lineHeight: 20 },
  authorizeBtn: {
    backgroundColor: "#22C55E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  authorizeBtnText: { color: "#000", fontSize: 16 },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  recurringLabel: { fontSize: 15, color: "#FFFFFF" },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#333333",
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackOn: { backgroundColor: "#22C55E" },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleThumbOn: { alignSelf: "flex-end" },
  freqRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#161616",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  freqChipActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  freqChipText: { fontSize: 13, color: "#FFFFFF" },
  freqChipTextActive: { color: "#000" },

  recurringExpandBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    gap: 12,
  },
  recurringDateRow: { flexDirection: "row", gap: 12 },
  recurringDateLabel: { fontSize: 11, color: "#AAAAAA", marginBottom: 6 },
  recurringDateInput: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#FFFFFF",
  },
  recurringNote: { fontSize: 11, color: "#666666", lineHeight: 16 },

  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    marginBottom: 2,
  },
  recurringBadgeText: { fontSize: 11, color: "#22C55E" },
  savedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 22,
    padding: 16,
    marginTop: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  savedCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardNumber: { fontSize: 15, color: "#FFFFFF" },
  savedCardSub: { fontSize: 12, color: "#888888", marginTop: 2 },

  payMethodLabel: { fontSize: 11, color: "#AAAAAA", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },
  payMethodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  payMethodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    backgroundColor: "#161616",
  },
  payMethodChipActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  payMethodChipText: { fontSize: 12, color: "#AAAAAA" },
  payMethodChipTextActive: { color: "#000" },
  payFieldReady: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0d2e18",
    borderRadius: 18,
    padding: 14,
  },
  payFieldReadyText: { fontSize: 13, color: "#22C55E", flex: 1 },
  payFieldBox: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 14,
    gap: 10,
  },
  payFieldInput: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#FFFFFF",
  },
  payFieldInputStandalone: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 20,
    padding: 14,
    fontSize: 14,
    color: "#FFFFFF",
  },

  serviceGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    gap: 14,
    alignContent: "flex-start",
  },
  serviceTile: {
    width: "46%",
    backgroundColor: "#161616",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  serviceTileActive: {
    backgroundColor: "#0d2e18",
    borderColor: "#22C55E",
  },
  serviceEmoji: { fontSize: 44 },
  serviceLabel: { fontSize: 14, color: "#FFFFFF", textAlign: "center" },
  serviceLabelActive: { color: "#22C55E" },

  yardSizeRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  yardChip: {
    flex: 1,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  yardChipActive: { backgroundColor: "#0d2e18", borderColor: "#22C55E" },
  yardChipLabel: { fontSize: 14, color: "#FFFFFF" },
  yardChipLabelActive: { color: "#22C55E" },
  yardChipSub: { fontSize: 9, color: "#666666", textAlign: "center" },
  yardChipSubActive: { color: "#22C55E" },
  yardChipPrice: { fontSize: 16, color: "#22C55E", marginTop: 4 },

  tipExtraRow: { flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 4 },
  tipExtraBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    backgroundColor: "#161616",
  },
  tipExtraBtnCustom: {},
  tipExtraBtnNone: { flex: 0.55 },
  tipExtraLabel: { fontSize: 13, color: "#AAAAAA" },

  customTipBox: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customTipInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  customTipDollar: { fontSize: 20, color: "#22C55E" },
  customTipInput: {
    flex: 1,
    fontSize: 20,
    color: "#FFFFFF",
    paddingVertical: 4,
  },
  customTipApplyBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  customTipApplyText: { fontSize: 13, color: "#000" },
});
