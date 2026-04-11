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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLandscaperProfile, SERVICE_BLOCK_MINUTES } from "@/contexts/landscaperProfile";
import { useNotifications } from "@/contexts/notifications";
import { validateText } from "@/utils/moderation";
import { sendLocalPush } from "@/utils/pushNotifications";

// API server base URL — set EXPO_PUBLIC_API_URL in environment to point to your API server
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type PayState = "availability" | "details" | "review" | "processing" | "success";

type PayKey = "stripe" | "inperson";

const PROFILE_TO_PAY_KEY: Record<string, PayKey> = {
  "Stripe":     "stripe",
  "In Person":  "inperson",
  // Legacy fallbacks — any old online method maps to Stripe
  "Apple Pay":  "stripe",
  "Venmo":      "stripe",
  "PayPal":     "stripe",
  "Debit Card": "stripe",
  "Cash App":   "stripe",
  "Zelle":      "stripe",
  "Check":      "inperson",
};

const ALL_PAY_OPTIONS: { key: PayKey; label: string; ionIcon: string; displayName: string }[] = [
  { key: "stripe",   label: "Pay Now (Online)", ionIcon: "card",      displayName: "Pay Now (Online) · Cards · Apple Pay · Google Pay" },
  { key: "inperson", label: "Pay In Person", ionIcon: "cash-outline", displayName: "Pay In Person (Cash · Check · Other)" },
];

const TIP_OPTIONS = [
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

const SERVICE_OPTIONS: { label: string; icon: "cut-outline" | "flower-outline" | "grid-outline" | "layers-outline" | "leaf-outline"; estTime: string }[] = [
  { label: "Mowing/Edging",           icon: "cut-outline",    estTime: "30min–1hr" },
  { label: "Weeding/Mulching",        icon: "flower-outline", estTime: "2–4 hrs" },
  { label: "Sod Installation",        icon: "grid-outline",   estTime: "4–8 hrs" },
  { label: "Tree Removal",            icon: "cut-outline",    estTime: "4–8 hrs" },
];

const TREE_SERVICES = ["Tree Removal"];
const SOD_SERVICES  = ["Sod Installation"];

const YARD_SIZE_OPTIONS = [
  { key: "Small",  label: "Small",  sub: "< 5,000 sq ft" },
  { key: "Medium", label: "Medium", sub: "5,000–10,000 sq ft" },
  { key: "Large",  label: "Large",  sub: "10,000+ sq ft" },
];

const TREE_SIZE_OPTIONS = [
  { key: "Small",  label: "Small",  sub: "1 – 6 ft tall" },
  { key: "Medium", label: "Medium", sub: "Up to 10 ft" },
  { key: "Large",  label: "Large",  sub: "Up to 20 ft" },
  { key: "XLarge", label: "Extra Large", sub: "Over 20 ft" },
];

const SOD_TYPE_OPTIONS = [
  { key: "St. Augustine",  label: "St. Augustine",  sub: "Dense, shade-tolerant" },
  { key: "Zoysia Grass",   label: "Zoysia Grass",   sub: "Low-maintenance, drought-resistant" },
  { key: "Bermuda Grass",  label: "Bermuda Grass",  sub: "Heat-resistant, durable" },
  { key: "Bahia Grass",    label: "Bahia Grass",    sub: "Low-input, sandy soils" },
  { key: "Centipede Grass",label: "Centipede Grass",sub: "Low-maintenance, acidic soil" },
  { key: "Xeriscaping",    label: "Xeriscaping",    sub: "Drought-resistant design" },
];

const PRICE_MATRIX: Record<string, Record<string, number>> = {
  "Mowing/Edging":            { Small: 45,   Medium: 70,   Large: 100                },
  "Weeding/Mulching":         { Small: 90,   Medium: 130,  Large: 175                },
  "Sod Installation":         { "St. Augustine": 420, "Zoysia Grass": 480, "Bermuda Grass": 390, "Bahia Grass": 320, "Centipede Grass": 360, "Xeriscaping": 520 },
  "Tree Removal":             { Small: 250,  Medium: 500,  Large: 900,  XLarge: 1500 },
};

const PHOTO_ICONS = ["leaf-outline", "camera-outline", "home-outline", "flower-outline", "leaf-outline", "leaf"] as const;
type PhotoIcon = typeof PHOTO_ICONS[number];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SERVICE_DURATIONS: Record<string, number> = {
  "Mowing/Edging":            60,
  "Weeding/Mulching":         240,
  "Sod Installation":         480,
  "Tree Removal":             360,
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
    proServices: string;
    jobAccepted: string;
    discountPct: string;
    discountAmt: string;
    discountLabel: string;
    discountTitle: string;
  }>();

  const proName = params.proName || "Your Pro";
  const proInitials = params.proInitials || "??";
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

  const proServicesList: string[] = params.proServices
    ? params.proServices.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const availableServiceOptions = proServicesList.length > 0
    ? SERVICE_OPTIONS.filter((s) => proServicesList.includes(s.label))
    : SERVICE_OPTIONS;

  const { availability, bookedSlots, addBookedSlot, myServices } = useLandscaperProfile();
  const { addNotification } = useNotifications();
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
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    () => availableServiceOptions.length === 1 ? new Set([availableServiceOptions[0].label]) : new Set()
  );
  const [selectedYardSize, setSelectedYardSize] = useState<string | null>(null);
  const [selectedTreeSize, setSelectedTreeSize] = useState<string | null>(null);
  const [selectedSodType,  setSelectedSodType]  = useState<string | null>(null);

  const hasTreeService = [...selectedServices].some((s) => TREE_SERVICES.includes(s));
  const hasSodService  = [...selectedServices].some((s) => SOD_SERVICES.includes(s));
  const hasYardService = [...selectedServices].some((s) => !TREE_SERVICES.includes(s) && !SOD_SERVICES.includes(s));

  // Map pay.tsx TREE_SIZE key → the label used in My Services TREE_TIERS
  const TREE_KEY_TO_TIER: Record<string, string> = {
    Small: "Small", Medium: "Medium", Large: "Large", XLarge: "Extra Large",
  };

  function parsePriceStr(s: string): number {
    return parseFloat(String(s).replace(/[^0-9.]/g, "")) || 0;
  }

  function getLandscaperPrice(svc: string, key: string): number | null {
    const tiers = myServices.pricing[svc];
    if (!tiers?.length) return null;
    const tierLabel = svc === "Tree Removal" ? (TREE_KEY_TO_TIER[key] ?? key) : key;
    const tier = tiers.find((t) => t.label === tierLabel);
    return tier ? parsePriceStr(tier.price) : null;
  }

  function getPriceForService(svc: string): number {
    if (TREE_SERVICES.includes(svc)) {
      const key = selectedTreeSize ?? "";
      return getLandscaperPrice(svc, key) ?? PRICE_MATRIX[svc]?.[key] ?? 0;
    }
    if (SOD_SERVICES.includes(svc)) {
      const key = selectedSodType ?? "";
      return getLandscaperPrice(svc, key) ?? PRICE_MATRIX[svc]?.[key] ?? 0;
    }
    return PRICE_MATRIX[svc]?.[selectedYardSize ?? ""] ?? 0;
  }

  function getServiceTilePrice(svcLabel: string): string | null {
    if (TREE_SERVICES.includes(svcLabel)) {
      if (!selectedTreeSize) return null;
      const p = getLandscaperPrice(svcLabel, selectedTreeSize) ?? PRICE_MATRIX[svcLabel]?.[selectedTreeSize];
      return p != null ? `$${p}` : null;
    }
    if (SOD_SERVICES.includes(svcLabel)) {
      if (!selectedSodType) return null;
      const p = getLandscaperPrice(svcLabel, selectedSodType) ?? PRICE_MATRIX[svcLabel]?.[selectedSodType];
      return p != null ? `$${p}` : null;
    }
    return selectedYardSize ? `$${PRICE_MATRIX[svcLabel]?.[selectedYardSize] ?? "–"}` : null;
  }

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
        const bookedEnd = bookedStart + durationMinutes + 60; // 1-hr buffer after each booking
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
        const bookedEnd = bookedStart + durationMinutes + 60; // 1-hr buffer after each booking
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
      return conflict ? conflict.service : null;
    };
  }, [selectedDateIdx, bookedSlots, rollingDates, bookingDurationMinutes, availability.endTime]);
  const [recurring, setRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const _defaultEnd = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  })();
  const [recurringEnd, setRecurringEnd] = useState(_defaultEnd);

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
      if (prev.length >= 4) return prev;
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
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PayKey>(defaultPayKey);
  const [instrErr, setInstrErr] = useState<string | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  // ── Stripe pre-warm: create session as soon as the review step opens ────
  const [preWarmedUrl, setPreWarmedUrl] = useState<string | null>(null);
  const [preWarmedSessionId, setPreWarmedSessionId] = useState<string | null>(null);
  const preWarmInFlight = useRef(false);

  const recurringJobCode = useMemo(() => {
    const digits = Math.floor(10000 + Math.random() * 90000);
    return `REC-${digits}`;
  }, []);

  const basePrice =
    selectedServices.size > 0
      ? Math.max(45, [...selectedServices].reduce((sum, svc) => sum + getPriceForService(svc), 0))
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
  const canContinueFromDetails =
    selectedServices.size > 0 &&
    serviceAddress.trim().length > 0 &&
    (!hasTreeService || selectedTreeSize !== null) &&
    (!hasSodService  || selectedSodType  !== null) &&
    (!hasYardService || selectedYardSize !== null);

  useEffect(() => { if (!hasTreeService) setSelectedTreeSize(null); }, [hasTreeService]);
  useEffect(() => { if (!hasSodService)  setSelectedSodType(null);  }, [hasSodService]);
  useEffect(() => { if (!hasYardService) setSelectedYardSize(null); }, [hasYardService]);

  // Pre-warm Stripe session the moment the review screen opens
  useEffect(() => {
    if (payState !== "review" || paymentMethod === "inperson" || !API_BASE_URL) return;
    // Reset any stale session from a previous visit to the review step
    if (preWarmedUrl) { setPreWarmedUrl(null); setPreWarmedSessionId(null); }
    if (preWarmInFlight.current) return;
    preWarmInFlight.current = true;
    const primarySvc = [...selectedServices][0] ?? "Service";
    fetch(`${API_BASE_URL}/api/payments/create-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTotal: parseFloat(discountedBase.toFixed(2)),
        isNewCustomer: false,
        preferredPaymentMethod: paymentMethod,
        proName,
        serviceName: primarySvc,
        serviceDate: selectedDateLabel ?? "TBD",
        successUrl: `${API_BASE_URL}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${API_BASE_URL}/api/payments/cancel`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.url && data?.sessionId) {
          setPreWarmedUrl(data.url);
          setPreWarmedSessionId(data.sessionId);
        }
      })
      .catch(() => {})
      .finally(() => { preWarmInFlight.current = false; });
  }, [payState, paymentMethod]);

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

  const addPhoto = async () => {
    if (photoUris.length >= 6) {
      Alert.alert("Max Photos", "You can attach up to 6 photos.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo access to attach photos of the job.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6 - photoUris.length,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 6));
    }
  };

  const removePhoto = (idx: number) => {
    Haptics.selectionAsync();
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const validatePayment = (): string | true => {
    return true;
  };

  const PAY_METHOD_LABELS: Record<string, string> = {
    stripe:   "Stripe",
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

    const primaryService = [...selectedServices][0] ?? "Service";
    const dateLabel = selectedDateLabel ?? "your scheduled date";
    const timeLabel = selectedTime ?? "";

    if (isInPerson) {
      // Customer sees booking confirmation only
      addNotification({
        icon: "checkmark-circle-outline",
        title: "Booking Confirmed!",
        sub: `${primaryService} with ${proName} on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}. You'll be notified when they're on the way.`,
        targetRole: "customer",
      });
      sendLocalPush(
        "Booking Confirmed!",
        `Your ${primaryService} with ${proName} is booked for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}.`
      );
      // Landscaper gets their action instructions separately
      addNotification({
        icon: "calendar-outline",
        title: "New Booking Received",
        sub: `${primaryService} booked for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}. Tap "Arrived at Location" when you get there, then notify your customer when work begins.`,
        targetRole: "landscaper",
      });
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

      let checkoutUrl: string;
      let sessionId: string;

      // Use the pre-warmed session if it's ready — opens Stripe instantly
      if (preWarmedUrl && preWarmedSessionId) {
        checkoutUrl = preWarmedUrl;
        sessionId = preWarmedSessionId;
        setPreWarmedUrl(null);
        setPreWarmedSessionId(null);
        setStripeSessionId(sessionId);
      } else {
        // Fall back to creating a fresh session (pre-warm wasn't ready yet)
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
          try { const err = await response.json(); errMsg = err.error ?? errMsg; } catch {}
          throw new Error(errMsg);
        }
        const data = await response.json();
        checkoutUrl = data.url;
        sessionId = data.sessionId;
        setStripeSessionId(sessionId);
      }

      // Open Stripe Checkout in the system browser
      const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
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
            const statusRes = await fetch(`${API_BASE_URL}/api/payments/session/${sessionId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.paid) { paid = true; break; }
            }
          } catch {}
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Customer sees their booking confirmation only
        addNotification({
          icon: "checkmark-circle-outline",
          title: "Booking Confirmed!",
          sub: `${primaryService} with ${proName} on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}. You'll be notified when they're on the way.`,
          targetRole: "customer",
        });
        sendLocalPush(
          "Booking Confirmed!",
          `Your ${primaryService} with ${proName} is booked for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}.`
        );
        // Landscaper gets their action instructions separately
        addNotification({
          icon: "calendar-outline",
          title: "New Booking Received",
          sub: `${primaryService} booked for ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ""}. Tap "Arrived at Location" when you get there, then notify your customer when work begins.`,
          targetRole: "landscaper",
        });
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
            <Ionicons name="cash-outline" size={52} color="#34FF7A" />
          </View>
          <Text style={[styles.successTitle, { fontFamily: "Inter_700Bold" }]}>
            Booking Confirmed!
          </Text>
          <Text style={[styles.successSub, { fontFamily: "Inter_400Regular" }]}>
            Your booking is confirmed! You'll receive a notification when {proName.split(" ")[0]} arrives at your location and when work begins.
          </Text>

          <View style={styles.escrowInfoBox}>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>1</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                You'll be notified when {proName.split(" ")[0]} arrives at your location
              </Text>
            </View>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>2</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                You'll be notified again when work starts at your property
              </Text>
            </View>
            <View style={styles.escrowStep}>
              <View style={[styles.escrowStepNum, { backgroundColor: "#0d2e18" }]}>
                <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>3</Text>
              </View>
              <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
                Pay ${total} directly to {proName.split(" ")[0]} when complete
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
          Your booking is confirmed! You'll be notified when {proName.split(" ")[0]} arrives and when work begins at your property.
        </Text>

        <View style={styles.escrowInfoBox}>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>1</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              You'll be notified when {proName.split(" ")[0]} arrives and starts work
            </Text>
          </View>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>2</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              Approve the completed work within 24 hours
            </Text>
          </View>
          <View style={styles.escrowStep}>
            <View style={[styles.escrowStepNum, { backgroundColor: "#E8F5E8" }]}>
              <Text style={[styles.escrowStepNumText, { fontFamily: "Inter_700Bold" }]}>3</Text>
            </View>
            <Text style={[styles.escrowStepText, { fontFamily: "Inter_400Regular" }]}>
              ${total} is released to {proName.split(" ")[0]} from escrow
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
                Pick Up to 4 Days Per Month
              </Text>
              <Text style={[styles.recurringNote, { fontFamily: "Inter_400Regular", marginBottom: 12 }]}>
                Select up to 4 dates each month. Your landscaper will visit on these dates every month for 1 year.
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
                  const maxed = recurringDays.length >= 4 && !selected;
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
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.calDot, recurringDays.length > i && styles.calDotFilled]} />
                ))}
                <Text style={[styles.calHintText, { fontFamily: "Inter_400Regular" }]}>
                  {recurringDays.length === 0
                    ? "Tap dates to select (up to 4)"
                    : recurringDays.length === 4
                    ? "Max 4 dates selected"
                    : `${recurringDays.length} of 4 dates chosen`}
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

              {/* End Date only */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.recurringDateLabel, { fontFamily: "Inter_400Regular" }]}>
                  End Date (1 year from today by default)
                </Text>
                <TextInput
                  style={[styles.recurringDateInput, { fontFamily: "Inter_400Regular" }]}
                  value={recurringEnd}
                  onChangeText={setRecurringEnd}
                  placeholder="Apr 9, 2027"
                  placeholderTextColor="#777"
                />
              </View>
              <Text style={[styles.recurringNote, { fontFamily: "Inter_400Regular", marginTop: 10 }]}>
                Each appointment is charged separately after dual confirmation. Your schedule runs monthly until the end date.
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
            {availableServiceOptions.length === 1
              ? `${availableServiceOptions[0].label} — the only service this pro offers`
              : "Select one or more services this pro offers"}
          </Text>
          <View style={styles.serviceGrid}>
            {availableServiceOptions.map((svc) => {
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
                  {getServiceTilePrice(svc.label) !== null && (
                    <Text style={[styles.serviceTilePrice, { fontFamily: "Inter_600SemiBold" }, isSelected && { color: "#34FF7A" }]}>
                      {getServiceTilePrice(svc.label)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedServices.size > 1 && canContinueFromDetails && (
            <View style={styles.multiServiceTotal}>
              <View style={styles.multiServiceTotalTop}>
                <Text style={[styles.multiServiceTotalLabel, { fontFamily: "Inter_500Medium" }]}>
                  {selectedServices.size} Services Selected
                </Text>
                <Text style={[styles.multiServiceTotalPrice, { fontFamily: "Inter_700Bold" }]}>
                  ${[...selectedServices].reduce((s, n) => s + getPriceForService(n), 0)}
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

          {/* SOD TYPE — shown when Sod Installation is selected */}
          {hasSodService && (
            <>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
                What type of sod?{" "}
                <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
                For Sod Installation — choose the sod variety
              </Text>
              <View style={[styles.yardSizeRow, { flexWrap: "wrap" }]}>
                {SOD_TYPE_OPTIONS.map((ys) => (
                  <TouchableOpacity
                    key={ys.key}
                    style={[styles.yardChip, selectedSodType === ys.key && styles.yardChipActive, { minWidth: "45%" }]}
                    onPress={() => { setSelectedSodType(ys.key); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yardChipLabel, { fontFamily: "Inter_600SemiBold" }, selectedSodType === ys.key && styles.yardChipLabelActive]}>
                      {ys.label}
                    </Text>
                    <Text style={[styles.yardChipSub, { fontFamily: "Inter_400Regular" }, selectedSodType === ys.key && styles.yardChipSubActive]}>
                      {ys.sub}
                    </Text>
                    <Text style={[styles.yardChipPrice, { fontFamily: "Inter_700Bold" }, selectedSodType === ys.key && { color: "#34FF7A" }]}>
                      ${getLandscaperPrice("Sod Installation", ys.key) ?? PRICE_MATRIX["Sod Installation"]?.[ys.key] ?? "–"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* TREE SIZE — shown when Tree Removal is selected */}
          {hasTreeService && (
            <>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
                What size is the tree?{" "}
                <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
                For Tree Removal — select the approximate tree height
              </Text>
              <View style={[styles.yardSizeRow, { flexWrap: "wrap" }]}>
                {TREE_SIZE_OPTIONS.map((ys) => (
                  <TouchableOpacity
                    key={ys.key}
                    style={[styles.yardChip, selectedTreeSize === ys.key && styles.yardChipActive, { minWidth: "45%" }]}
                    onPress={() => { setSelectedTreeSize(ys.key); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yardChipLabel, { fontFamily: "Inter_600SemiBold" }, selectedTreeSize === ys.key && styles.yardChipLabelActive]}>
                      {ys.label}
                    </Text>
                    <Text style={[styles.yardChipSub, { fontFamily: "Inter_400Regular" }, selectedTreeSize === ys.key && styles.yardChipSubActive]}>
                      {ys.sub}
                    </Text>
                    <Text style={[styles.yardChipPrice, { fontFamily: "Inter_700Bold" }, selectedTreeSize === ys.key && { color: "#34FF7A" }]}>
                      ${getLandscaperPrice("Tree Removal", ys.key) ?? PRICE_MATRIX["Tree Removal"]?.[ys.key] ?? "–"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* YARD SIZE — shown when non-tree, non-sod services are selected */}
          {hasYardService && (
            <>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
                What size is your yard?{" "}
                <Text style={{ color: "#ef4444" }}>*</Text>
              </Text>
              <Text style={[styles.fieldHint, { fontFamily: "Inter_400Regular" }]}>
                {hasTreeService || hasSodService
                  ? `For ${[...selectedServices].filter(s => !TREE_SERVICES.includes(s) && !SOD_SERVICES.includes(s)).join(" & ")} — this determines your price`
                  : "This determines your price"}
              </Text>
              <View style={styles.yardSizeRow}>
                {YARD_SIZE_OPTIONS.map((ys) => (
                  <TouchableOpacity
                    key={ys.key}
                    style={[styles.yardChip, selectedYardSize === ys.key && styles.yardChipActive]}
                    onPress={() => { setSelectedYardSize(ys.key); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.yardChipLabel, { fontFamily: "Inter_600SemiBold" }, selectedYardSize === ys.key && styles.yardChipLabelActive]}>
                      {ys.label}
                    </Text>
                    <Text style={[styles.yardChipSub, { fontFamily: "Inter_400Regular" }, selectedYardSize === ys.key && styles.yardChipSubActive]}>
                      {ys.sub}
                    </Text>
                    <Text style={[styles.yardChipPrice, { fontFamily: "Inter_700Bold" }, selectedYardSize === ys.key && { color: "#34FF7A" }]}>
                      ${[...selectedServices].filter(s => !TREE_SERVICES.includes(s) && !SOD_SERVICES.includes(s)).reduce((sum, s) => sum + (PRICE_MATRIX[s]?.[ys.key] ?? 0), 0)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

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

          {photoUris.length > 0 && (
            <View style={styles.photoGrid}>
              {photoUris.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.photoTile}
                  onPress={() => removePhoto(i)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
                  <View style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, padding: 2 }}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {photoUris.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhoto}>
              <Ionicons name="camera-outline" size={22} color="#34FF7A" />
              <Text style={[styles.addPhotoBtnText, { fontFamily: "Inter_500Medium" }]}>
                {photoUris.length === 0 ? "Browse & Attach Photos" : `+ Add More (${photoUris.length}/6)`}
              </Text>
            </TouchableOpacity>
          )}
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
                : hasSodService && !selectedSodType
                ? "Select sod type"
                : hasTreeService && !selectedTreeSize
                ? "Select tree size"
                : hasYardService && !selectedYardSize
                ? "Select yard size"
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
              {selectedServices.size > 0
                ? [...selectedServices].map((svc) => {
                    if (TREE_SERVICES.includes(svc)) return selectedTreeSize ? `${svc} · ${selectedTreeSize} tree` : svc;
                    if (SOD_SERVICES.includes(svc))  return selectedSodType  ? `${svc} · ${selectedSodType} sod`  : svc;
                    return selectedYardSize ? `${svc} · ${selectedYardSize} yard` : svc;
                  }).join("  +  ")
                : "Mowing/Edging"}
            </Text>
            {recurring && (
              <View style={styles.recurringBadge}>
                <Ionicons name="repeat" size={11} color="#34FF7A" />
                <Text style={[styles.recurringBadgeText, { fontFamily: "Inter_500Medium" }]}>
                  {recurringDays.length > 0
                    ? `${recurringDays.map((d) => ordinal(Number(d))).join(" · ")} of every month · until ${recurringEnd}`
                    : "Select days · Monthly"}
                </Text>
              </View>
            )}
            {recurring && (
              <View style={[styles.recurringBadge, { marginTop: 3, backgroundColor: "#0F2A1A" }]}>
                <Ionicons name="barcode-outline" size={11} color="#34FF7A" />
                <Text style={[styles.recurringBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                  Code: {recurringJobCode}
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
              <Ionicons name="cash-outline" size={16} color="#34FF7A" />
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

        {/* Payment method grid — Stripe and In Person side by side */}
        <View style={styles.payMethodGrid}>
          {allowedPayOptions.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.payMethodTile, paymentMethod === m.key && styles.payMethodTileActive]}
              onPress={() => { setPaymentMethod(m.key as PayKey); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <Ionicons name={m.ionIcon as any} size={28} color={paymentMethod === m.key ? "#34FF7A" : "#888"} />
              <Text style={[styles.payMethodTileText, { fontFamily: "Inter_500Medium" }, paymentMethod === m.key && styles.payMethodTileTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
            <Ionicons name={isInPerson ? "cash-outline" : "lock-closed"} size={18} color="#000" />
          )}
          <Text style={[styles.authorizeBtnText, { fontFamily: "Inter_700Bold" }]}>
            {stripeLoading
              ? "Opening Stripe Checkout..."
              : isInPerson
              ? `Confirm Booking · Pay In Person · $${total}`
              : `Pay Now · $${total}`}
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
