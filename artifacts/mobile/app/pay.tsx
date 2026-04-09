import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLandscaperProfile, SERVICE_BLOCK_MINUTES } from "@/contexts/landscaperProfile";
import { validateText } from "@/utils/moderation";

// API server base URL — set EXPO_PUBLIC_API_URL in environment to point to your API server
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type PayState = "availability" | "details" | "review" | "processing" | "success";

type PayKey = "applepay" | "debit" | "venmo" | "paypal" | "cashapp" | "zelle" | "inperson";

const PROFILE_TO_PAY_KEY: Record<string, PayKey> = {
  "Apple Pay":  "applepay",
  "Venmo":      "venmo",
  "PayPal":     "paypal",
  "Debit Card": "debit",
  "Cash App":   "cashapp",
  "Zelle":      "zelle",
  "In Person":  "inperson",
  "Check":      "inperson",
};

const ALL_PAY_OPTIONS: { key: PayKey; label: string; ionIcon: string; displayName: string }[] = [
  { key: "applepay", label: "Apple Pay",             ionIcon: "logo-apple",           displayName: "Apple Pay" },
  { key: "venmo",    label: "Venmo",                  ionIcon: "cash-outline",          displayName: "Venmo" },
  { key: "paypal",   label: "PayPal",                 ionIcon: "card-outline",          displayName: "PayPal" },
  { key: "cashapp",  label: "Cash App",               ionIcon: "phone-portrait-outline",displayName: "Cash App" },
  { key: "zelle",    label: "Zelle",                  ionIcon: "flash-outline",         displayName: "Zelle" },
  { key: "debit",    label: "Debit / Credit Card",    ionIcon: "card",                  displayName: "Debit / Credit Card" },
  { key: "inperson", label: "Pay In Person",          ionIcon: "people-circle-outline", displayName: "Pay In Person (Cash · Check · Other)" },
];

const TIP_OPTIONS = [
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

const SERVICE_OPTIONS: { label: string; icon: "cut-outline" | "flower-outline" | "grid-outline" | "layers-outline"; estTime: string }[] = [
  { label: "Mowing/Edging",     icon: "cut-outline",    estTime: "1–2 hrs" },
  { label: "Weeding/Mulching",  icon: "flower-outline", estTime: "2–4 hrs" },
  { label: "Sod Installation",  icon: "grid-outline",   estTime: "4–8 hrs" },
  { label: "Artificial Turf",   icon: "layers-outline", estTime: "10–20 hrs" },
];

const YARD_SIZE_OPTIONS = [
  { key: "Small",  label: "Small",  sub: "< 5,000 sq ft" },
  { key: "Medium", label: "Medium", sub: "5,000–10,000 sq ft" },
  { key: "Large",  label: "Large",  sub: "10,000+ sq ft" },
];

const PRICE_MATRIX: Record<string, Record<string, number>> = {
  "Mowing/Edging":    { Small: 45,   Medium: 70,   Large: 100  },
  "Weeding/Mulching": { Small: 90,   Medium: 130,  Large: 175  },
  "Sod Installation": { Small: 350,  Medium: 550,  Large: 850  },
  "Artificial Turf":  { Small: 1200, Medium: 1800, Large: 2800 },
};

const PHOTO_ICONS = ["tree-outline", "camera-outline", "home-outline", "flower-outline", "leaf-outline", "leaf"] as const;
type PhotoIcon = typeof PHOTO_ICONS[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SERVICE_DURATIONS: Record<string, number> = {
  "Mowing/Edging":    120,
  "Weeding/Mulching": 240,
  "Sod Installation": 480,
  "Artificial Turf":  1200,
  "Full Service":     240,
};

function parseTimeToMinutes(t: string): number {
  const [timePart, period] = t.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + (m || 0);
}

function minutesToTimeString(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

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
    proAcceptedPayments: string;
    jobAccepted: string;
    discountPct: string;
    discountAmt: string;
    discountLabel: string;
    discountTitle: string;
  }>();

  const proName = params.proName || "John Rivera";
  const proInitials = params.proInitials || "JR";
  const proColor = params.proColor || "#34FF7A";
  const jobAccepted = params.jobAccepted === "true";

  const discountPct = params.discountPct ? parseFloat(params.discountPct) : null;
  const discountAmt = params.discountAmt ? parseFloat(params.discountAmt) : null;
  const discountLabel = params.discountLabel || "";
  const discountTitle = params.discountTitle || "";
  const hasDiscount = !!(discountPct || discountAmt);

  const proAcceptedPayments: PayKey[] = params.proAcceptedPayments
    ? params.proAcceptedPayments.split(",").map((p) => PROFILE_TO_PAY_KEY[p.trim()]).filter(Boolean) as PayKey[]
    : [];

  const allowedPayOptions = proAcceptedPayments.length > 0
    ? ALL_PAY_OPTIONS.filter((opt) => proAcceptedPayments.includes(opt.key))
    : ALL_PAY_OPTIONS;

  const { availability, bookedSlots, addBookedSlot } = useLandscaperProfile();
  const defaultPayKey: PayKey = allowedPayOptions[0]?.key ?? "inperson";

  const rollingDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = DAY_LABELS[d.getDay()];
      result.push({
        label: dayName,
        dateNum: String(d.getDate()),
        month: MONTH_NAMES[d.getMonth()],
        year: d.getFullYear(),
        available: availability.days[dayName] !== false,
      });
    }
    return result;
  }, [availability.days]);

  const timeSlots = useMemo(() => {
    const startMin = parseTimeToMinutes(availability.startTime || "8:00 AM");
    const endMin = parseTimeToMinutes(availability.endTime || "6:00 PM");
    const slots: string[] = [];
    for (let t = startMin; t < endMin; t += 30) {
      slots.push(minutesToTimeString(t));
    }
    return slots.length > 0 ? slots : [
      "8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM",
      "11:00 AM","11:30 AM","12:00 PM","12:30 PM","1:00 PM","1:30 PM",
      "2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM",
    ];
  }, [availability.startTime, availability.endTime]);

  const [payState, setPayState] = useState<PayState>("availability");
  const [orderId, setOrderId] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedYardSize, setSelectedYardSize] = useState<string | null>(null);
  const [selectedDateIdx, setSelectedDateIdx] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const toggleService = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const bookingDurationMinutes = useMemo(
    () => [...selectedServices].reduce((sum, svc) => sum + (SERVICE_DURATIONS[svc] ?? 60), 0) || 60,
    [selectedServices]
  );

  const availableTimeSlotsForDate = useMemo(() => {
    const endMin = parseTimeToMinutes(availability.endTime || "6:00 PM");
    const slotsTaken =
      selectedDateIdx !== null && rollingDates[selectedDateIdx]
        ? (bookedSlots[
            `${rollingDates[selectedDateIdx].month} ${rollingDates[selectedDateIdx].dateNum}, ${rollingDates[selectedDateIdx].year}`
          ] ?? [])
        : [];
    return timeSlots.filter((slot) => {
      const slotStart = parseTimeToMinutes(slot);
      const slotEnd = slotStart + bookingDurationMinutes;
      if (slotEnd > endMin) return false;
      return !slotsTaken.some(({ time, durationMinutes }) => {
        const bookedStart = parseTimeToMinutes(time);
        const bookedEnd = bookedStart + durationMinutes;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });
  }, [selectedDateIdx, timeSlots, bookedSlots, rollingDates, bookingDurationMinutes, availability.endTime]);

  const getBlockingService = useMemo(() => {
    if (selectedDateIdx === null || !rollingDates[selectedDateIdx]) return (_slot: string): string | null => null;
    const dateKey = `${rollingDates[selectedDateIdx].month} ${rollingDates[selectedDateIdx].dateNum}, ${rollingDates[selectedDateIdx].year}`;
    const slotsTaken = bookedSlots[dateKey] ?? [];
    const endMin = parseTimeToMinutes(availability.endTime || "6:00 PM");
    return (slot: string): string | null => {
      const slotStart = parseTimeToMinutes(slot);
      const slotEnd = slotStart + bookingDurationMinutes;
      if (slotEnd > endMin) return "Outside hours";
      const conflict = slotsTaken.find(({ time, durationMinutes }) => {
        const bookedStart = parseTimeToMinutes(time);
        const bookedEnd = bookedStart + durationMinutes;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
      return conflict ? conflict.service : null;
    };
  }, [selectedDateIdx, bookedSlots, rollingDates, bookingDurationMinutes, availability.endTime]);
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringStart, setRecurringStart] = useState("Apr 7, 2026");
  const [recurringEnd, setRecurringEnd] = useState("Apr 7, 2027");

  // Monthly calendar state
  const _now = new Date();
  const [calMonth, setCalMonth] = useState(_now.getMonth());
  const [calYear, setCalYear] = useState(_now.getFullYear());
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calMonthLabel = new Date(calYear, calMonth, 1).toLocaleString("default", { month: "long" });

  function prevCalMonth() {
    Haptics.selectionAsync();
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextCalMonth() {
    Haptics.selectionAsync();
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }
  function toggleCalendarDay(dayStr: string) {
    Haptics.selectionAsync();
    setRecurringDays((prev) => {
      if (prev.includes(dayStr)) return prev.filter((d) => d !== dayStr);
      if (prev.length >= 3) return prev;
      return [...prev, dayStr].sort((a, b) => Number(a) - Number(b));
    });
  }
  function ordinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  const [tipPresetIdx, setTipPresetIdx] = useState<number | null>(1);
  const [tipMode, setTipMode] = useState<"preset" | "custom" | "none">("preset");
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [photos, setPhotos] = useState<PhotoIcon[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PayKey>(defaultPayKey);
  const [instrErr, setInstrErr] = useState<string | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  const basePrice =
    selectedServices.size > 0 && selectedYardSize
      ? [...selectedServices].reduce((sum, svc) => sum + (PRICE_MATRIX[svc]?.[selectedYardSize] ?? 0), 0)
      : 45;

  const discountSavings: number = (() => {
    if (!hasDiscount) return 0;
    if (discountPct) return Math.round(basePrice * (discountPct / 100) * 100) / 100;
    if (discountAmt) return Math.min(discountAmt, basePrice);
    return 0;
  })();
  const discountedBase = Math.max(0, basePrice - discountSavings);

  const tip =
    tipMode === "none"
      ? 0
      : tipMode === "custom"
      ? Math.max(0, parseFloat(customTipAmount) || 0)
      : tipPresetIdx !== null
      ? Math.round(discountedBase * TIP_OPTIONS[tipPresetIdx].value * 100) / 100
      : 0;
  const tipLabel =
    tipMode === "none"
      ? "No tip"
      : tipMode === "custom"
      ? "Custom"
      : tipPresetIdx !== null
      ? TIP_OPTIONS[tipPresetIdx].label
      : "–";
  const fee = paymentMethod === "inperson" ? 0 : Math.round(discountedBase * 0.03 * 100) / 100;
  const total = (discountedBase + tip + fee).toFixed(2);

  const canContinueFromAvailability = selectedDateIdx !== null && selectedTime !== null;
  const canContinueFromDetails = selectedServices.size > 0 && serviceAddress.trim().length > 0 && selectedYardSize !== null;

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
    setPhotos((prev) => [...prev, PHOTO_ICONS[prev.length % PHOTO_ICONS.length]]);
  };

  const validatePayment = (): string | true => {
    if (paymentMethod === "inperson") return true;
    if (paymentMethod === "applepay") return true;
    // All digital payments are processed through Stripe — no local field validation needed
    return true;
  };

  const PAY_METHOD_LABELS: Record<string, string> = {
    applepay: "Apple Pay",
    debit: "Debit Card",
    venmo: "Venmo",
    paypal: "PayPal",
    cashapp: "Cash App",
    inperson: "In Person",
  };

  const isInPerson = paymentMethod === "inperson";

  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);

  const handleAuthorize = async () => {
    const valid = validatePayment();
    if (valid !== true) {
      Alert.alert("Payment Error", valid);
      return;
    }

    if (selectedDateLabel && selectedTime) {
      const primaryService = [...selectedServices][0] ?? "Service";
      const blockMins = SERVICE_BLOCK_MINUTES[primaryService] ?? bookingDurationMinutes;
      addBookedSlot(selectedDateLabel, selectedTime, blockMins, primaryService);
    }

    const newOrderId = `TL-2026-${String(Math.floor(10000 + Math.random() * 89999)).padStart(5, "0")}`;
    setOrderId(newOrderId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isInPerson) {
      setPayState("success");
      return;
    }

    // ── All digital payments go through Stripe ──────────────────────────────
    if (!API_BASE_URL) {
      Alert.alert(
        "Payments Unavailable",
        "The payment server is not reachable. Please try again later."
      );
      return;
    }
    try {
      setStripeLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const primaryService = [...selectedServices][0] ?? "Service";
      const body = {
        jobTotal: parseFloat(discountedBase.toFixed(2)),
        isNewCustomer: false,
        preferredPaymentMethod: paymentMethod,
        proName,
        serviceName: primaryService,
        serviceDate: selectedDateLabel ?? "TBD",
        successUrl: `${API_BASE_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${API_BASE_URL}/api/payments/cancel`,
      };

      const response = await fetch(`${API_BASE_URL}/api/payments/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errMsg = `Payment server error (${response.status})`;
        try {
          const err = await response.json();
          errMsg = err.error ?? errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      setStripeSessionId(data.sessionId);

      // Open Stripe Checkout in the system browser
      const result = await WebBrowser.openBrowserAsync(data.url, {
        toolbarColor: "#0A0A0A",
        controlsColor: "#34FF7A",
        dismissButtonStyle: "close",
      });

      // Browser closed — poll for payment confirmation
      if (result.type === "opened" || result.type === "dismiss") {
        setPayState("processing");
        let paid = false;
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const statusRes = await fetch(
              `${API_BASE_URL}/api/payments/session/${data.sessionId}`
            );
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.paid) { paid = true; break; }
            }
          } catch {}
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPayState("success");
      }
    } catch (err: any) {
      Alert.alert("Payment Error", err.message ?? "Payment could not be processed.");
    } finally {
      setStripeLoading(false);
    }
  };

  const selectedDateLabel =
    selectedDateIdx !== null && rollingDates[selectedDateIdx]
      ? `${rollingDates[selectedDateIdx].month} ${rollingDates[selectedDateIdx].dateNum}, ${rollingDates[selectedDateIdx].year}`
      : null;

  // ─── Processing ───────────────────────────────────────────────
  if (payState === "processing") {
    return (
      <View style={[styles.fullCenter, { backgroundColor: "#0A0A0A" }]}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        <Text style={[styles.processingText, { fontFamily: "Inter_500Medium" }]}>
          Processing with {PAY_METHOD_LABELS[paymentMethod]}...
        </Text>
      </View>
    );
  }

  // ─── Success ──────────────────────────────────────────────────
  if (payState === "success") {
    if (isInPerson) {
      return (
        <View style={[styles.fullCenter, { backgroundColor: "#0A0A0A", paddingBottom: bottomPadding + 20 }]}>
          <View style={[styles.lockIconBox, { backgroundColor: "#0d2e18" }]}>
            <Ionicons name="handshake-outline" size={52} color="#34FF7A" />
          </View>
          <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
            Booking Confirmed!
          </Text>
          <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
            Your appointment with {proName.split(" ")[0]} is scheduled. Pay them directly when they arrive — no funds are held online.
          </Text>

          <View style={styles.escrowInfoBox}>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>1</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                {proName.split(" ")[0]} arrives on {selectedDateLabel} at {selectedTime}
              </Text>
            </View>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>2</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                Work is completed to your satisfaction
              </Text>
            </View>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>3</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                Pay ${total} directly to {proName.split(" ")[0]} in person
              </Text>
            </View>
          </View>

          <View style={inPersonStyles.noEscrowBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34FF7A" />
            <Text style={[inPersonStyles.noEscrowText, { fontFamily: "Inter_500Medium" }]}>
              No payment held · No confirmation required from either side
            </Text>
          </View>

          {/* Order ID */}
          <View style={successStyles.orderIdRow}>
            <Ionicons name="receipt-outline" size={14} color="#34FF7A" />
            <Text style={[successStyles.orderIdText, { fontFamily: "Inter_500Medium" }]}>Order {orderId}</Text>
          </View>
          <View style={successStyles.receiptNote}>
            <Ionicons name="mail-outline" size={13} color="#BBBBBB" />
            <Text style={[successStyles.receiptNoteText, { fontFamily: "Inter_400Regular" }]}>
              Receipt sent to TheLawnServices
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.successBtn, { width: "100%" }]}
            onPress={() => { router.dismiss(); router.navigate("/(tabs)/appointments"); }}
            activeOpacity={0.85}
          >
            <Text style={[styles.successBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              View Appointment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.dismiss()} style={styles.doneLink}>
            <Text style={[styles.doneLinkText, { fontFamily: "Inter_400Regular" }]}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.fullCenter, { backgroundColor: "#0A0A0A", paddingBottom: bottomPadding + 20 }]}>
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

        {/* Order ID */}
        <View style={successStyles.orderIdRow}>
          <Ionicons name="receipt-outline" size={14} color="#34FF7A" />
          <Text style={[successStyles.orderIdText, { fontFamily: "Inter_500Medium" }]}>Order {orderId}</Text>
        </View>
        <View style={successStyles.receiptNote}>
          <Ionicons name="mail-outline" size={13} color="#BBBBBB" />
          <Text style={[successStyles.receiptNoteText, { fontFamily: "Inter_400Regular" }]}>
            Receipt sent to TheLawnServices
          </Text>
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
            View in My Service
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
            <Ionicons name="chevron-down" size={24} color="#34FF7A" />
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
                Mowing/Edging · ${basePrice}/hr
              </Text>
            </View>
          </View>

          {/* Date row */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Choose a Date
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", gap: 10, paddingRight: 4 }}>
              {rollingDates.map((d, i) => {
                const isSelected = selectedDateIdx === i;
                const isUnavailable = !d.available;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dateTile,
                      isSelected && styles.dateTileActive,
                      isUnavailable && styles.dateTileUnavailable,
                    ]}
                    onPress={() => {
                      if (isUnavailable) return;
                      setSelectedDateIdx(i);
                      setSelectedTime(null);
                      Haptics.selectionAsync();
                    }}
                    disabled={isUnavailable}
                    activeOpacity={isUnavailable ? 1 : 0.8}
                  >
                    <Text
                      style={[
                        styles.dateTileDay,
                        { fontFamily: "Inter_400Regular" },
                        isUnavailable && styles.dateTileUnavailableText,
                        isSelected && { color: "rgba(255,255,255,0.8)" },
                      ]}
                    >
                      {d.label}
                    </Text>
                    <Text
                      style={[
                        styles.dateTileDate,
                        { fontFamily: "Inter_700Bold" },
                        isUnavailable && styles.dateTileUnavailableText,
                        isSelected && { color: "#fff" },
                      ]}
                    >
                      {d.dateNum}
                    </Text>
                    <Text
                      style={[
                        styles.dateTileMonth,
                        { fontFamily: "Inter_400Regular" },
                        isUnavailable && styles.dateTileUnavailableText,
                        isSelected && { color: "rgba(255,255,255,0.8)" },
                      ]}
                    >
                      {d.month}
                    </Text>
                    {isUnavailable && (
                      <View style={styles.dateTileX}>
                        <Ionicons name="close" size={12} color="#777" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Time slots */}
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            {selectedDateIdx !== null && rollingDates[selectedDateIdx]
              ? `Available Times — ${rollingDates[selectedDateIdx].label}, ${rollingDates[selectedDateIdx].month} ${rollingDates[selectedDateIdx].dateNum}`
              : "Available Times"}
          </Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((t) => {
              const isAvail = availableTimeSlotsForDate.includes(t);
              const isBooked = !isAvail;
              const blockingService = isBooked ? getBlockingService(t) : null;
              const isSelected = selectedTime === t;
              const isDisabled = selectedDateIdx === null || isBooked;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.timeTile,
                    isSelected && styles.timeTileActive,
                    isDisabled && styles.timeTileDisabled,
                    isBooked && styles.timeTileBooked,
                  ]}
                  onPress={() => {
                    if (isDisabled) return;
                    setSelectedTime(t);
                    Haptics.selectionAsync();
                  }}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.8}
                >
                  <Text
                    style={[
                      styles.timeTileText,
                      { fontFamily: "Inter_500Medium" },
                      isSelected && { color: "#fff" },
                      isDisabled && { color: "#777" },
                    ]}
                  >
                    {t}
                  </Text>
                  {isBooked && blockingService && blockingService !== "Outside hours" && (
                    <Text style={[styles.timeTileBookedLabel, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                      {blockingService}
                    </Text>
                  )}
                  {isBooked && blockingService === "Outside hours" && (
                    <Text style={[styles.timeTileBookedLabel, { fontFamily: "Inter_400Regular", color: "#555" }]}>
                      Outside hrs
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDateIdx === null && (
            <Text style={[styles.hintText, { fontFamily: "Inter_400Regular" }]}>
              Select a date above to see available times
            </Text>
          )}
          {selectedDateIdx !== null && (
            <View style={{ flexDirection: "row", gap: 16, marginTop: 8, paddingHorizontal: 2, flexWrap: "wrap" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#34FF7A" }} />
                <Text style={{ fontSize: 11, color: "#999", fontFamily: "Inter_400Regular" }}>Available</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#2a0a0a" }} />
                <Text style={{ fontSize: 11, color: "#999", fontFamily: "Inter_400Regular" }}>Booked</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#1a1a1a" }} />
                <Text style={{ fontSize: 11, color: "#999", fontFamily: "Inter_400Regular" }}>Outside hours</Text>
              </View>
            </View>
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
              {/* Calendar header */}
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginBottom: 4 }]}>
                Pick Up to 3 Days Per Month
              </Text>
              <Text style={[styles.recurringNote, { fontFamily: "Inter_400Regular", marginBottom: 12 }]}>
                Select up to 3 dates each month. Your landscaper will visit on these dates every month.
              </Text>

              {/* Month nav */}
              <View style={styles.calNavRow}>
                <TouchableOpacity onPress={prevCalMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={18} color="#CCCCCC" />
                </TouchableOpacity>
                <Text style={[styles.calMonthLabel, { fontFamily: "Inter_700Bold" }]}>
                  {calMonthLabel} {calYear}
                </Text>
                <TouchableOpacity onPress={nextCalMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
                </TouchableOpacity>
              </View>

              {/* Day-of-week headers */}
              <View style={styles.calDowRow}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                  <Text key={d} style={[styles.calDowLabel, { fontFamily: "Inter_500Medium" }]}>{d}</Text>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={styles.calGrid}>
                {Array.from({ length: calFirstDay }).map((_, i) => (
                  <View key={`e${i}`} style={styles.calEmptyCell} />
                ))}
                {Array.from({ length: calDaysInMonth }, (_, i) => i + 1).map((day) => {
                  const dayStr = String(day);
                  const selected = recurringDays.includes(dayStr);
                  const maxed = recurringDays.length >= 3 && !selected;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calDayCell,
                        selected && styles.calDayCellSelected,
                        maxed && styles.calDayCellDisabled,
                      ]}
                      onPress={() => !maxed && toggleCalendarDay(dayStr)}
                      activeOpacity={maxed ? 1 : 0.75}
                    >
                      <Text style={[
                        styles.calDayText,
                        { fontFamily: selected ? "Inter_700Bold" : "Inter_400Regular" },
                        selected && styles.calDayTextSelected,
                        maxed && styles.calDayTextDisabled,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selection count hint */}
              <View style={styles.calHintRow}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.calDot, recurringDays.length > i && styles.calDotFilled]} />
                ))}
                <Text style={[styles.calHintText, { fontFamily: "Inter_400Regular" }]}>
                  {recurringDays.length === 0
                    ? "Tap dates to select (up to 3)"
                    : recurringDays.length === 3
                    ? "Max 3 dates selected"
                    : `${recurringDays.length} of 3 dates chosen`}
                </Text>
              </View>

              {/* Selected summary pill */}
              {recurringDays.length > 0 && (
                <View style={styles.selectedDaysPill}>
                  <Ionicons name="repeat" size={12} color="#34FF7A" />
                  <Text style={[styles.selectedDaysText, { fontFamily: "Inter_500Medium" }]}>
                    {recurringDays.map((d) => ordinal(Number(d))).join(" · ")} of every month
                  </Text>
                </View>
              )}

              {/* Date range */}
              <View style={[styles.recurringDateRow, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.recurringDateLabel, { fontFamily: "Inter_400Regular" }]}>
                    Start Date
                  </Text>
                  <TextInput
                    style={[styles.recurringDateInput, { fontFamily: "Inter_400Regular" }]}
                    value={recurringStart}
                    onChangeText={setRecurringStart}
                    placeholder="Apr 7, 2026"
                    placeholderTextColor="#777"
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
                    placeholderTextColor="#777"
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
            <Ionicons name="chevron-back" size={24} color="#34FF7A" />
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
          {/* Service Type */}
          <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Service Type{" "}
            <Text style={{ color: "#ef4444" }}>*</Text>
          </Text>
          <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
            Select one or more services
          </Text>
          <View style={styles.serviceGrid}>
            {SERVICE_OPTIONS.map((svc) => {
              const isSelected = selectedServices.has(svc.label);
              return (
                <TouchableOpacity
                  key={svc.label}
                  style={[styles.serviceTile, isSelected && styles.serviceTileActive]}
                  onPress={() => toggleService(svc.label)}
                  activeOpacity={0.8}
                >
                  {isSelected && (
                    <View style={styles.serviceCheckBadge}>
                      <Ionicons name="checkmark" size={13} color="#000" />
                    </View>
                  )}
                  <View style={[styles.serviceIconCircle, isSelected && styles.serviceIconCircleActive]}>
                    <Ionicons name={svc.icon} size={28} color={isSelected ? "#34FF7A" : "#888"} />
                  </View>
                  <Text style={[
                    styles.serviceLabel,
                    { fontFamily: "Inter_600SemiBold" },
                    isSelected && styles.serviceLabelActive,
                  ]}>
                    {svc.label}
                  </Text>
                  <Text style={[styles.serviceEstTime, { fontFamily: "Inter_400Regular" }, isSelected && { color: "#34FF7A88" }]}>
                    Est. {svc.estTime}
                  </Text>
                  {selectedYardSize && (
                    <Text style={[styles.serviceTilePrice, { fontFamily: "Inter_600SemiBold" }, isSelected && { color: "#34FF7A" }]}>
                      ${PRICE_MATRIX[svc.label]?.[selectedYardSize] ?? "–"}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedServices.size > 1 && selectedYardSize && (
            <View style={styles.multiServiceTotal}>
              <View style={styles.multiServiceTotalTop}>
                <Text style={[styles.multiServiceTotalLabel, { fontFamily: "Inter_500Medium" }]}>
                  {selectedServices.size} Services Selected
                </Text>
                <Text style={[styles.multiServiceTotalPrice, { fontFamily: "Inter_700Bold" }]}>
                  ${[...selectedServices].reduce((s, n) => s + (PRICE_MATRIX[n]?.[selectedYardSize] ?? 0), 0)}
                </Text>
              </View>
              <Text style={[styles.multiServiceTotalNames, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                {[...selectedServices].join("  •  ")}
              </Text>
            </View>
          )}

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
                {selectedServices.size > 0 && (
                  <Text style={[styles.yardChipPrice, { fontFamily: "Inter_700Bold" }, selectedYardSize === ys.key && { color: "#34FF7A" }]}>
                    ${[...selectedServices].reduce((s, n) => s + (PRICE_MATRIX[n]?.[ys.key] ?? 0), 0)}
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
            style={[styles.textArea, { fontFamily: "Inter_400Regular" }, instrErr ? { borderColor: "#FF4444", borderWidth: 1 } : {}]}
            placeholder="Example: Please edge the driveway, remove weeds from flower beds, trim around the fence..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            value={instructions}
            onChangeText={(t) => { setInstructions(t); if (instrErr) setInstrErr(null); }}
            textAlignVertical="top"
          />
          {instrErr && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Ionicons name="alert-circle-outline" size={14} color="#FF4444" />
              <Text style={[{ fontSize: 12, color: "#FF4444" }, { fontFamily: "Inter_400Regular" }]}>{instrErr}</Text>
            </View>
          )}

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
              {photos.map((icon, i) => (
                <View key={i} style={[styles.photoTile, { alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name={icon} size={36} color="#34FF7A" />
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
            style={[
              styles.continueBtn,
              !canContinueFromDetails && styles.continueBtnDisabled,
            ]}
            onPress={() => {
              if (!canContinueFromDetails) return;
              if (instructions.trim()) {
                const v = validateText(instructions, 500);
                if (!v.valid) {
                  setInstrErr(v.error ?? "Please revise your instructions.");
                  return;
                }
              }
              setInstrErr(null);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPayState("review");
            }}
            activeOpacity={canContinueFromDetails ? 0.85 : 1}
          >
            <Text style={[styles.continueBtnText, { fontFamily: "Inter_700Bold" }]}>
              {selectedServices.size === 0
                ? "Select a service type"
                : !serviceAddress.trim()
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
          <Ionicons name="chevron-back" size={24} color="#34FF7A" />
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
              {selectedServices.size > 0 ? [...selectedServices].join(" + ") : "Mowing/Edging"}{selectedYardSize ? ` · ${selectedYardSize} yard` : ""}
            </Text>
            {recurring && (
              <View style={styles.recurringBadge}>
                <Ionicons name="repeat" size={11} color="#34FF7A" />
                <Text style={[styles.recurringBadgeText, { fontFamily: "Inter_500Medium" }]}>
                  {recurringDays.length > 0 ? recurringDays.join(" · ") : "Select days"} · Monthly
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
            <Ionicons name="document-text-outline" size={16} color="#34FF7A" />
            <Text style={[styles.instructionsPreviewText, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
              {instructions}
            </Text>
          </View>
        )}

        {/* Active discount banner */}
        {hasDiscount && (
          <View style={payDiscStyles.discountBanner}>
            <View style={payDiscStyles.discountBannerLeft}>
              <Ionicons name="pricetag" size={18} color="#FFAA00" />
              <View>
                <Text style={[payDiscStyles.discountBannerTitle, { fontFamily: "Inter_700Bold" }]}>
                  🎉 Discount Applied: {discountLabel}
                </Text>
                {discountTitle ? (
                  <Text style={[payDiscStyles.discountBannerSub, { fontFamily: "Inter_400Regular" }]}>
                    {discountTitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={payDiscStyles.discountSavingsPill}>
              <Text style={[payDiscStyles.discountSavingsText, { fontFamily: "Inter_700Bold" }]}>
                −${discountSavings.toFixed(2)}
              </Text>
            </View>
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
                  tipMode === "preset" && tipPresetIdx === i && { color: "#34FF7A" },
                ]}
              >
                {t.label}
              </Text>
              <Text
                style={[
                  styles.tipBtnAmount,
                  { fontFamily: "Inter_400Regular" },
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
            <Ionicons name="pencil-outline" size={14} color={tipMode === "custom" ? "#34FF7A" : "#AAAAAA"} />
            <Text style={[styles.tipExtraLabel, { fontFamily: "Inter_500Medium" }, tipMode === "custom" && { color: "#34FF7A" }]}>
              Custom Tip
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipExtraBtn, styles.tipExtraBtnNone, tipMode === "none" && styles.tipBtnActive]}
            onPress={() => { setTipMode("none"); setCustomTipAmount(""); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tipExtraLabel, { fontFamily: "Inter_500Medium" }, tipMode === "none" && { color: "#34FF7A" }]}>
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
                placeholderTextColor="#777"
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
          {hasDiscount && discountSavings > 0 && (
            <View style={styles.lineItem}>
              <Text style={[styles.lineLabel, { fontFamily: "Inter_500Medium", color: "#FFAA00" }]}>
                Discount ({discountLabel})
              </Text>
              <Text style={[styles.lineValue, { fontFamily: "Inter_600SemiBold", color: "#FFAA00" }]}>
                −${discountSavings.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.lineItem}>
            <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>Tip ({tipLabel})</Text>
            <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${tip.toFixed(2)}</Text>
          </View>
          {!isInPerson && (
            <View style={styles.lineItem}>
              <Text style={[styles.lineLabel, { fontFamily: "Inter_400Regular" }]}>TheLawn Platform Fee (3%)</Text>
              <Text style={[styles.lineValue, { fontFamily: "Inter_500Medium" }]}>${fee.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.lineItem, styles.totalRow]}>
            <Text style={[styles.totalLabel, { fontFamily: "Inter_700Bold" }]}>Total</Text>
            <Text style={[styles.totalValue, { fontFamily: "Inter_700Bold" }]}>${total}</Text>
          </View>
        </View>

        {/* Escrow / In-Person Notice */}
        {isInPerson ? (
          <View style={[styles.escrowNotice, { borderColor: "#1A2A1A", backgroundColor: "#0d2e1844" }]}>
            <View style={styles.escrowNoticeTop}>
              <Ionicons name="handshake-outline" size={16} color="#34FF7A" />
              <Text style={[styles.escrowNoticeTitle, { fontFamily: "Inter_600SemiBold" }]}>
                Pay in Person
              </Text>
            </View>
            <Text style={[styles.escrowNoticeText, { fontFamily: "Inter_400Regular" }]}>
              No payment is held online. You pay your landscaper{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>directly on the day of service.</Text>{" "}
              No escrow, no processing fees.
            </Text>
          </View>
        ) : (
          <View style={styles.escrowNotice}>
            <View style={styles.escrowNoticeTop}>
              <Ionicons name="lock-closed" size={16} color="#34FF7A" />
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
        )}

        {/* Payment Method */}
        <Text style={[styles.payMethodLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Payment Method
        </Text>

        {/* Accepted-payment enforcement banner */}
        {proAcceptedPayments.length > 0 && (
          <View style={styles.acceptedPayBanner}>
            <Ionicons name="wallet-outline" size={15} color="#34FF7A" />
            <Text style={[styles.acceptedPayBannerText, { fontFamily: "Inter_400Regular" }]}>
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>This landscaper accepts: </Text>
              {allowedPayOptions.map((o) => o.displayName).join(" · ")}
            </Text>
          </View>
        )}

        {/* Payment method grid — all options except Pay In Person in a 2-column grid */}
        <View style={styles.payMethodGrid}>
          {allowedPayOptions.filter((o) => o.key !== "inperson").map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.payMethodTile, paymentMethod === m.key && styles.payMethodTileActive]}
              onPress={() => { setPaymentMethod(m.key as PayKey); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <Ionicons name={m.ionIcon as any} size={28} color={paymentMethod === m.key ? "#34FF7A" : "#888"} />
              <Text style={[styles.payMethodTileText, { fontFamily: "Inter_500Medium" }, paymentMethod === m.key && styles.payMethodTileTextActive]}>
                {m.key === "debit" ? "Debit / Card" : m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pay In Person — full-width */}
        {allowedPayOptions.filter((o) => o.key === "inperson").map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.payMethodTileFull, paymentMethod === m.key && styles.payMethodTileActive]}
            onPress={() => { setPaymentMethod(m.key as PayKey); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <Ionicons name={m.ionIcon as any} size={28} color={paymentMethod === m.key ? "#34FF7A" : "#888"} />
            <Text style={[styles.payMethodTileText, { fontFamily: "Inter_500Medium" }, paymentMethod === m.key && styles.payMethodTileTextActive]}>
              {m.displayName}
            </Text>
          </TouchableOpacity>
        ))}

        {!isInPerson && (
          <View style={styles.stripeCardBlock}>
            <View style={styles.stripeCardHeader}>
              <Ionicons name="card" size={20} color="#34FF7A" />
              <Text style={[styles.stripeCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
                Stripe Secure Checkout
              </Text>
              <View style={styles.stripeLock}>
                <Ionicons name="lock-closed" size={12} color="#34FF7A" />
              </View>
            </View>
            <Text style={[styles.stripeCardBody, { fontFamily: "Inter_400Regular" }]}>
              All payments are processed securely through Stripe. Tap the button below to complete
              your payment — your financial details are handled entirely by Stripe and never stored by us.
            </Text>
            <View style={styles.stripeCardFeeRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#34FF7A" />
              <Text style={[styles.stripeCardFeeText, { fontFamily: "Inter_400Regular" }]}>
                Funds held in escrow until work is approved · PCI DSS compliant
              </Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 12 }]}>
        <TouchableOpacity
          style={[styles.authorizeBtn, stripeLoading && { opacity: 0.7 }]}
          onPress={handleAuthorize}
          activeOpacity={0.85}
          disabled={stripeLoading}
        >
          {stripeLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name={isInPerson ? "handshake-outline" : "lock-closed"} size={18} color="#000" />
          )}
          <Text style={[styles.authorizeBtnText, { fontFamily: "Inter_700Bold" }]}>
            {stripeLoading
              ? "Opening Stripe Checkout..."
              : isInPerson
              ? `Confirm Booking · Pay In Person · $${total}`
              : `Pay with Stripe · $${total}`}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.escrowDisclaimer, { fontFamily: "Inter_400Regular" }]}>
          {isInPerson
            ? "No online payment required. Pay your landscaper directly on the day of service."
            : `Money is held in escrow until both parties confirm completion.\nAll sales are final.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
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
    borderColor: "#34FF7A",
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
  successSub: { fontSize: 14, color: "#BBBBBB", textAlign: "center", lineHeight: 22 },
  escrowInfoBox: {
    width: "100%",
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#34FF7A",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  successBtnText: { color: "#000", fontSize: 16 },
  doneLink: { padding: 8 },
  doneLinkText: { color: "#BBBBBB", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#0A0A0A",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, color: "#34FF7A" },
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
    backgroundColor: "#1A1A1A",
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
  proSummaryService: { fontSize: 13, color: "#BBBBBB" },
  sectionLabel: { fontSize: 11, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },
  dateTile: {
    width: 62,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    gap: 2,
  },
  dateTileActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  dateTileUnavailable: { backgroundColor: "#111111", borderColor: "#1a1a1a", opacity: 0.45 },
  dateTileUnavailableText: { color: "#555555" },
  dateTileX: { position: "absolute", top: 6, right: 6 },
  dateTileDay: { fontSize: 11, color: "#BBBBBB" },
  dateTileDate: { fontSize: 20, color: "#FFFFFF" },
  dateTileMonth: { fontSize: 11, color: "#BBBBBB" },
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
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    minWidth: "30%",
    alignItems: "center",
  },
  timeTileActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  timeTileDisabled: { backgroundColor: "#0d0d0d", borderColor: "#1a1a1a" },
  timeTileBooked: { opacity: 0.38, borderColor: "#1a1a1a" },
  timeTileBookedLabel: { fontSize: 10, color: "#BBBBBB", marginTop: 1 },
  timeTileText: { fontSize: 14, color: "#FFFFFF" },
  hintText: { fontSize: 13, color: "#BBBBBB", textAlign: "center", marginTop: 8 },
  fieldLabel: { fontSize: 15, color: "#34FF7A", marginBottom: 4 },
  fieldHint: { fontSize: 13, color: "#BBBBBB", marginBottom: 12 },
  addressInput: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  addressInputFilled: {
    borderColor: "#34FF7A",
  },
  textArea: {
    backgroundColor: "#1A1A1A",
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
    borderColor: "#34FF7A",
    borderRadius: 22,
    paddingVertical: 20,
    marginBottom: 8,
  },
  addPhotoBtnText: { fontSize: 15, color: "#34FF7A" },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
    backgroundColor: "#1A1A1A",
  },
  continueBtn: {
    backgroundColor: "#34FF7A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#34FF7A",
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
    backgroundColor: "#1A1A1A",
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
  summaryDate: { fontSize: 13, color: "#BBBBBB", marginBottom: 2 },
  summaryPro: { fontSize: 13, color: "#BBBBBB" },
  summaryAddressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  summaryAddress: { fontSize: 12, color: "#BBBBBB", flex: 1 },
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
    color: "#CCCCCC",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tipRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  tipBtnActive: { backgroundColor: "#1A1A1A", borderColor: "#34FF7A", borderWidth: 2 },
  tipBtnLabel: { fontSize: 16, color: "#FFFFFF" },
  tipBtnAmount: { fontSize: 12, color: "#BBBBBB", marginTop: 2 },
  breakdown: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 12,
  },
  lineItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lineLabel: { fontSize: 14, color: "#BBBBBB" },
  lineValue: { fontSize: 14, color: "#FFFFFF" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#333", paddingTop: 12, marginTop: 4 },
  totalLabel: { fontSize: 17, color: "#FFFFFF" },
  totalValue: { fontSize: 26, color: "#34FF7A" },
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
  escrowNoticeTitle: { fontSize: 14, color: "#34FF7A" },
  escrowNoticeText: { fontSize: 13, color: "#A8FFD1", lineHeight: 20 },
  authorizeBtn: {
    backgroundColor: "#34FF7A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#34FF7A",
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
    backgroundColor: "#1A1A1A",
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
  toggleTrackOn: { backgroundColor: "#34FF7A" },
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
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  freqChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
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
  recurringDateLabel: { fontSize: 11, color: "#CCCCCC", marginBottom: 6 },
  recurringDateInput: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: "#FFFFFF",
  },
  recurringNote: { fontSize: 11, color: "#999999", lineHeight: 16 },
  dayPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    minWidth: 48,
    alignItems: "center",
  },
  dayChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  dayChipDisabled: { opacity: 0.3 },
  dayChipText: { fontSize: 12, color: "#CCCCCC" },
  dayChipTextActive: { color: "#000" },
  dayChipTextDisabled: { color: "#555" },

  // Monthly calendar
  calNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  calMonthLabel: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  calDowRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calDowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: "#777",
    textTransform: "uppercase",
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  calEmptyCell: {
    width: "14.2857%",
    aspectRatio: 1,
  },
  calDayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "transparent",
  },
  calDayCellSelected: {
    backgroundColor: "#34FF7A",
    borderColor: "#34FF7A",
  },
  calDayCellDisabled: {
    opacity: 0.25,
  },
  calDayText: {
    fontSize: 13,
    color: "#CCCCCC",
  },
  calDayTextSelected: { color: "#000" },
  calDayTextDisabled: { color: "#444" },
  calHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  calDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#34FF7A",
    backgroundColor: "transparent",
  },
  calDotFilled: {
    backgroundColor: "#34FF7A",
  },
  calHintText: {
    fontSize: 12,
    color: "#777",
  },

  selectedDaysPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  selectedDaysText: { fontSize: 12, color: "#34FF7A" },

  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    marginBottom: 2,
  },
  recurringBadgeText: { fontSize: 11, color: "#34FF7A" },
  savedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
  },
  savedCardNumber: { fontSize: 15, color: "#FFFFFF" },
  savedCardSub: { fontSize: 12, color: "#BBBBBB", marginTop: 2 },

  payMethodLabel: { fontSize: 11, color: "#CCCCCC", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },
  payMethodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  payMethodTile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "48%",
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    backgroundColor: "#1A1A1A",
  },
  payMethodTileFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    backgroundColor: "#1A1A1A",
    marginBottom: 12,
  },
  payMethodTileActive: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  payMethodTileEmoji: { fontSize: 22 },
  payMethodTileText: { fontSize: 14, color: "#FFFFFF" },
  payMethodTileTextActive: { color: "#34FF7A" },
  escrowDisclaimer: {
    fontSize: 11,
    color: "#BBBBBB",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  payFieldReady: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0d2e18",
    borderRadius: 18,
    padding: 14,
  },
  payFieldReadyText: { fontSize: 13, color: "#34FF7A", flex: 1 },
  stripeCardBlock: {
    backgroundColor: "#0d2318",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a5c35",
    padding: 18,
    gap: 10,
    marginTop: 4,
  },
  stripeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stripeCardTitle: {
    color: "#34FF7A",
    fontSize: 15,
    flex: 1,
  },
  stripeLock: {
    backgroundColor: "#1a5c35",
    borderRadius: 99,
    padding: 4,
  },
  stripeCardBody: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 19,
  },
  stripeCardFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  stripeCardFeeText: {
    color: "#666",
    fontSize: 12,
    flex: 1,
  },
  payFieldBox: {
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 20,
    padding: 14,
    fontSize: 14,
    color: "#FFFFFF",
  },
  payFieldHighlightBox: {
    backgroundColor: "#0d2318",
    borderWidth: 2,
    borderColor: "#34FF7A",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    shadowColor: "#34FF7A",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  payFieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  payFieldLabel: {
    color: "#34FF7A",
    fontSize: 13,
  },
  payFieldInputHighlighted: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1a5c35",
    borderRadius: 14,
    padding: 13,
    fontSize: 15,
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
    backgroundColor: "#1A1A1A",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 24,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  serviceTileActive: {
    backgroundColor: "#0d2e18",
    borderColor: "#34FF7A",
    borderWidth: 2,
  },
  serviceCheckBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  serviceIconCircleActive: {
    backgroundColor: "rgba(52,255,122,0.12)",
  },
  serviceLabel: { fontSize: 13, color: "#FFFFFF", textAlign: "center" },
  serviceLabelActive: { color: "#34FF7A" },
  serviceEstTime: { fontSize: 10, color: "#888", textAlign: "center", marginTop: 2 },
  serviceTilePrice: { fontSize: 16, color: "#999", marginTop: 2 },
  multiServiceTotal: {
    backgroundColor: "#0d2e18",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(52,255,122,0.3)",
    gap: 6,
  },
  multiServiceTotalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  multiServiceTotalLabel: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  multiServiceTotalPrice: { fontSize: 22, color: "#34FF7A" },
  multiServiceTotalNames: { fontSize: 12, color: "#999", lineHeight: 18 },

  yardSizeRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  yardChip: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  yardChipActive: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  yardChipLabel: { fontSize: 14, color: "#FFFFFF" },
  yardChipLabelActive: { color: "#34FF7A" },
  yardChipSub: { fontSize: 9, color: "#999999", textAlign: "center" },
  yardChipSubActive: { color: "#34FF7A" },
  yardChipPrice: { fontSize: 16, color: "#34FF7A", marginTop: 4 },

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
    backgroundColor: "#1A1A1A",
  },
  tipExtraBtnCustom: {},
  tipExtraBtnNone: { flex: 0.55 },
  tipExtraLabel: { fontSize: 13, color: "#CCCCCC" },

  customTipBox: {
    backgroundColor: "#1A1A1A",
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
  customTipDollar: { fontSize: 20, color: "#34FF7A" },
  customTipInput: {
    flex: 1,
    fontSize: 20,
    color: "#FFFFFF",
    paddingVertical: 4,
  },
  customTipApplyBtn: {
    backgroundColor: "#34FF7A",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  customTipApplyText: { fontSize: 13, color: "#000" },
  preferredPayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d2e18",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1a4a2a",
  },
  preferredPayBannerText: {
    fontSize: 13,
    color: "#34FF7A",
    flex: 1,
  },
  acceptedPayBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0A1A0F",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1a3a22",
  },
  acceptedPayBannerText: {
    fontSize: 13,
    color: "#CCCCCC",
    flex: 1,
    lineHeight: 20,
  },
});

const inPersonStyles = StyleSheet.create({
  noEscrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d2e18",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  noEscrowText: {
    fontSize: 13,
    color: "#34FF7A",
    flex: 1,
  },
});

const successStyles = StyleSheet.create({
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    width: "100%",
  },
  orderIdText: {
    fontSize: 13,
    color: "#34FF7A",
    letterSpacing: 0.5,
  },
  receiptNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  receiptNoteText: {
    fontSize: 12,
    color: "#BBBBBB",
  },
});

const payDiscStyles = StyleSheet.create({
  discountBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1200",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFAA0040",
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  discountBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  discountBannerTitle: {
    fontSize: 14,
    color: "#FFAA00",
    marginBottom: 2,
  },
  discountBannerSub: {
    fontSize: 12,
    color: "#AA8800",
    lineHeight: 16,
  },
  discountSavingsPill: {
    backgroundColor: "#2A1A00",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFAA0050",
  },
  discountSavingsText: {
    fontSize: 14,
    color: "#FFAA00",
  },
});
