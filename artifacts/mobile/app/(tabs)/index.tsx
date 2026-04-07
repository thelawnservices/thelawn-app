import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Modal,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/auth";

const QUICK_STATS = [
  { label: "Jobs Done", value: "3", icon: "checkmark-circle" as const, iconColor: "#34C759" },
  { label: "Avg Rating", value: "4.9", icon: "star" as const, iconColor: "#f59e0b" },
  { label: "Saved Pros", value: "2", icon: "heart" as const, iconColor: "#f87171" },
];

function AnimatedStatCard({ stat, delay }: { stat: typeof QUICK_STATS[0]; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={stat.icon} size={22} color={stat.iconColor} />
      <Text style={[styles.statValue, { fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
      <Text style={[styles.statLabel, { fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
    </Animated.View>
  );
}

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = shimmer.interpolate({ inputRange: [0, 1], outputRange: ["#222222", "#333333"] });

  return (
    <Animated.View style={[styles.skeletonCard, { backgroundColor: bg }]} />
  );
}

const NOTIFICATIONS = [
  {
    id: "0",
    icon: "🔒",
    title: "Payment held in escrow",
    sub: "Lawn Mowing · $48.35 secured — releases on completion",
  },
  {
    id: "1",
    icon: "🚚",
    title: "John Rivera is on the way!",
    sub: "ETA: 8 minutes",
  },
  {
    id: "2",
    icon: "📅",
    title: "Recurring appointment confirmed",
    sub: "Next: April 19 · 10:30 AM",
  },
];

function NotificationsPanel({
  visible,
  onClose,
  items,
  notifEnabled,
  onToggleEnabled,
}: {
  visible: boolean;
  onClose: () => void;
  items: typeof NOTIFICATIONS;
  notifEnabled: boolean;
  onToggleEnabled: () => void;
}) {
  const slideY = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: false }),
        Animated.spring(slideY, { toValue: 0, useNativeDriver: false, bounciness: 4 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(slideY, { toValue: 400, duration: 220, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.notifOverlay} onPress={onClose}>
        <Animated.View style={[styles.notifOverlayBg, { opacity: overlayOpacity }]} />
        <Animated.View
          style={[styles.notifSheet, { transform: [{ translateY: slideY }] }]}
        >
          <Pressable>
            <View style={styles.notifSheetHeader}>
              <Text style={[styles.notifSheetTitle, { fontFamily: "Inter_700Bold" }]}>
                Notifications
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  style={[styles.notifTogglePill, notifEnabled && styles.notifTogglePillOn]}
                  onPress={onToggleEnabled}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.notifToggleText, { fontFamily: "Inter_600SemiBold" }, notifEnabled && styles.notifToggleTextOn]}>
                    {notifEnabled ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.notifCloseBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.notifList}>
              {items.map((n) => (
                <View key={n.id} style={styles.notifItem}>
                  <Text style={styles.notifItemIcon}>{n.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifItemTitle, { fontFamily: "Inter_500Medium" }]}>
                      {n.title}
                    </Text>
                    <Text style={[styles.notifItemSub, { fontFamily: "Inter_400Regular" }]}>
                      {n.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function OfflineBanner({ visible }: { visible: boolean }) {
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -40,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.offlineBanner, { transform: [{ translateY }] }]}>
      <Ionicons name="cloud-offline-outline" size={15} color="#fff" />
      <Text style={[styles.offlineBannerText, { fontFamily: "Inter_500Medium" }]}>
        You're offline · Booking is disabled
      </Text>
    </Animated.View>
  );
}

function AppHeader({
  topPadding,
  onBellPress,
  isOffline,
  onToggleOffline,
  notifEnabled,
  missedCount,
  onProfilePress,
}: {
  topPadding: number;
  onBellPress: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  notifEnabled: boolean;
  missedCount: number;
  onProfilePress: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.onlinePill, isOffline && styles.offlinePill]}
            onPress={onToggleOffline}
            activeOpacity={0.8}
          >
            <View style={[styles.onlineDot, isOffline && styles.offlineDot]} />
            <Text style={[styles.onlinePillText, { fontFamily: "Inter_500Medium" }, isOffline && styles.offlinePillText]}>
              {isOffline ? "Offline" : "Online"}
            </Text>
          </TouchableOpacity>
        </View>
        <Image
          source={require("../../assets/images/logo-transparent.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <View style={[{ flex: 1 }, styles.headerRight]}>
          <TouchableOpacity style={styles.notifBtn} onPress={onBellPress} activeOpacity={0.7}>
            <Ionicons
              name={notifEnabled ? "notifications-outline" : "notifications-off-outline"}
              size={22}
              color={notifEnabled ? "#fff" : "#666666"}
            />
            {!notifEnabled && missedCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={[styles.notifBadgeText, { fontFamily: "Inter_700Bold" }]}>
                  {missedCount > 9 ? "9+" : String(missedCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={onProfilePress} activeOpacity={0.8}>
            <Ionicons name="person" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ProfileDropdownModal({
  visible,
  onClose,
  onAppointments,
  onSettings,
  onShare,
  onPaymentMethod,
  onVouchers,
  onHelp,
  onAvailability,
  isLandscaper,
  onSignOut,
}: {
  visible: boolean;
  onClose: () => void;
  onAppointments: () => void;
  onSettings: () => void;
  onShare: () => void;
  onPaymentMethod: () => void;
  onVouchers: () => void;
  onHelp: () => void;
  onAvailability: () => void;
  isLandscaper: boolean;
  onSignOut: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={dropStyles.sheet} onPress={(e) => e.stopPropagation()}>
          {isLandscaper && (
            <TouchableOpacity style={dropStyles.item} onPress={onAvailability} activeOpacity={0.7}>
              <Text style={dropStyles.itemIcon}>🗓️</Text>
              <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Service Availability</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={dropStyles.item} onPress={onAppointments} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>📅</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onSettings} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>⚙️</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onShare} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>🔗</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Share with friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onPaymentMethod} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>💳</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Payment Method</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onVouchers} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>🎟️</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Vouchers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onHelp} activeOpacity={0.7}>
            <Text style={dropStyles.itemIcon}>❔</Text>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Help and Resources</Text>
          </TouchableOpacity>
          <View style={dropStyles.divider} />
          <TouchableOpacity style={dropStyles.item} onPress={onSignOut} activeOpacity={0.7}>
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_400Regular" }, dropStyles.signOutText]}>Sign out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dropStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 90,
    paddingRight: 16,
  },
  sheet: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    width: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemIcon: { fontSize: 20 },
  itemText: { fontSize: 15, color: "#FFFFFF" },
  divider: { height: 1, backgroundColor: "#222222", marginHorizontal: 16 },
  signOutText: { color: "rgba(255,255,255,0.55)", fontSize: 14 },
});

function SettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const demoCode = useRef("");

  function handleSendCode() {
    if (!newPassword.trim()) {
      Alert.alert("Missing field", "Please enter a new password first.");
      return;
    }
    setSendingCode(true);
    demoCode.current = Math.floor(100000 + Math.random() * 900000).toString();
    setTimeout(() => {
      setSendingCode(false);
      setCodeSent(true);
      Alert.alert(
        "Verification Code Sent",
        `A 6-digit code has been sent to your registered email.\n\nDemo code: ${demoCode.current}`
      );
    }, 1200);
  }

  function handleVerify() {
    if (enteredCode.trim() === demoCode.current) {
      setVerifying(true);
      setTimeout(() => {
        setVerifying(false);
        Alert.alert("Password Updated", "Your password has been changed successfully.");
        setNewPassword("");
        setEnteredCode("");
        setCodeSent(false);
        demoCode.current = "";
        onClose();
      }, 1000);
    } else {
      Alert.alert("Incorrect Code", "The verification code you entered is incorrect.");
    }
  }

  function handleClose() {
    setNewPassword("");
    setEnteredCode("");
    setCodeSent(false);
    setNewAddress("");
    demoCode.current = "";
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={settStyles.overlay} onPress={handleClose}>
        <Pressable style={settStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={settStyles.header}>
            <Text style={[settStyles.title, { fontFamily: "Inter_700Bold" }]}>Settings</Text>
            <TouchableOpacity onPress={handleClose} style={settStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[settStyles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>Change Password</Text>

          <TextInput
            style={[settStyles.input, { fontFamily: "Inter_400Regular" }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            placeholderTextColor="#555"
            secureTextEntry
          />

          <TouchableOpacity
            style={[settStyles.primaryBtn, sendingCode && settStyles.primaryBtnLoading]}
            onPress={sendingCode ? undefined : handleSendCode}
            activeOpacity={0.85}
          >
            {sendingCode ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Send Verification Code to Email
              </Text>
            )}
          </TouchableOpacity>

          {codeSent && (
            <View style={settStyles.codeSection}>
              <Text style={[settStyles.codeHint, { fontFamily: "Inter_400Regular" }]}>
                We sent a 6-digit code to your registered email.
              </Text>
              <TextInput
                style={[settStyles.codeInput, { fontFamily: "Inter_600SemiBold" }]}
                value={enteredCode}
                onChangeText={setEnteredCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[settStyles.primaryBtn, verifying && settStyles.primaryBtnLoading]}
                onPress={verifying ? undefined : handleVerify}
                activeOpacity={0.85}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    Verify & Update Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={settStyles.divider} />

          <Text style={[settStyles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginTop: 4 }]}>Change Service Address</Text>
          <Text style={[settStyles.codeHint, { fontFamily: "Inter_400Regular", marginBottom: 14 }]}>
            Recently Moved? Change service address here
          </Text>
          <TextInput
            style={[settStyles.input, { fontFamily: "Inter_400Regular" }]}
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="New service address"
            placeholderTextColor="#555"
          />
          <TouchableOpacity
            style={settStyles.primaryBtn}
            onPress={() => {
              if (!newAddress.trim()) {
                Alert.alert("Missing field", "Please enter a new service address.");
                return;
              }
              Alert.alert("Address Saved", "Your service address has been updated.");
              setNewAddress("");
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Save New Address
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const settStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#222222",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 20, color: "#FFFFFF" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 16 },
  input: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 4,
  },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnText: { color: "#000000", fontSize: 15 },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 24 },
  codeSection: { marginTop: 20, gap: 12 },
  codeHint: { fontSize: 12, color: "rgba(255,255,255,0.55)" },
  codeInput: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 8,
  },
});

const PAYMENT_OPTIONS = [
  { id: "applepay", label: " Apple Pay", icon: "" },
  { id: "debit", label: "💳 Debit Card", icon: "" },
  { id: "venmo", label: "Venmo", icon: "" },
  { id: "paypal", label: "PayPal", icon: "" },
  { id: "cashapp", label: "Cash App", icon: "" },
];

function PaymentMethodModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState<string | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={settStyles.overlay} onPress={onClose}>
        <Pressable style={settStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={settStyles.header}>
            <Text style={[settStyles.title, { fontFamily: "Inter_700Bold" }]}>Payment Method</Text>
            <TouchableOpacity onPress={onClose} style={settStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={[{ fontSize: 15, color: "#AAAAAA", textAlign: "center", marginBottom: 20, fontFamily: "Inter_400Regular" }]}>
            Add a Payment Method
          </Text>
          {PAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.75}
              onPress={() => { setSaved(opt.id); Alert.alert("Payment Method Saved", `${opt.label.trim()} has been saved.`); onClose(); }}
              style={[pmStyles.option, saved === opt.id && pmStyles.optionSelected]}
            >
              <Text style={[pmStyles.optionText, { fontFamily: "Inter_500Medium" }]}>{opt.label}</Text>
              {saved === opt.id && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pmStyles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  optionSelected: { borderColor: "#22C55E" },
  optionText: { fontSize: 15, color: "#FFFFFF" },
});

function VouchersModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={settStyles.overlay} onPress={onClose}>
        <Pressable style={settStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={settStyles.header}>
            <Text style={[settStyles.title, { fontFamily: "Inter_700Bold" }]}>Vouchers</Text>
            <TouchableOpacity onPress={onClose} style={settStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
            <Text style={[{ fontSize: 28, color: "#FFFFFF", fontFamily: "Inter_700Bold", letterSpacing: 1 }]}>
              NONE AVAILABLE
            </Text>
            <Text style={[{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 18, fontFamily: "Inter_400Regular" }]}>
              TERMS AND CONDITIONS APPLY{"\n"}VOUCHER MUST BE BOOKED BEFORE THE EXPIRING DATE
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const HELP_ITEMS = [
  "How to book a service",
  "Contact support",
  "FAQs",
  "Terms of Service",
  "Privacy Policy",
];

function HelpResourcesModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={settStyles.overlay} onPress={onClose}>
        <Pressable style={settStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={settStyles.header}>
            <Text style={[settStyles.title, { fontFamily: "Inter_700Bold" }]}>Help and Resources</Text>
            <TouchableOpacity onPress={onClose} style={settStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {HELP_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => Alert.alert(item, "This section is coming soon.")}
              style={helpStyles.row}
            >
              <Text style={[helpStyles.rowText, { fontFamily: "Inter_400Regular" }]}>{item}</Text>
              <Ionicons name="chevron-forward" size={16} color="#555555" />
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const helpStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  rowText: { fontSize: 15, color: "#FFFFFF" },
});

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AVAIL_SERVICES = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Clean Up"];

type ServiceAvail = { days: string[]; startTime: string; endTime: string };
type AvailState = Record<string, ServiceAvail>;

const DEFAULT_AVAIL: AvailState = {
  "Lawn Mowing": { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "08:00", endTime: "18:00" },
  "Hedge Trimming": { days: ["Tue", "Thu"], startTime: "09:00", endTime: "17:00" },
  "Mulching": { days: ["Mon", "Wed", "Fri"], startTime: "08:00", endTime: "16:00" },
  "Clean Up": { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "07:00", endTime: "17:00" },
};

function ServiceAvailabilityModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [avail, setAvail] = useState<AvailState>(() => JSON.parse(JSON.stringify(DEFAULT_AVAIL)));

  function toggleDay(service: string, day: string) {
    setAvail((prev) => {
      const days = prev[service].days.includes(day)
        ? prev[service].days.filter((d) => d !== day)
        : [...prev[service].days, day];
      return { ...prev, [service]: { ...prev[service], days } };
    });
  }

  function setTime(service: string, field: "startTime" | "endTime", val: string) {
    setAvail((prev) => ({ ...prev, [service]: { ...prev[service], [field]: val } }));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={settStyles.overlay} onPress={onClose}>
        <Pressable
          style={[settStyles.sheet, { maxHeight: "85%", paddingBottom: 0 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={settStyles.header}>
            <Text style={[settStyles.title, { fontFamily: "Inter_700Bold" }]}>Service Availability</Text>
            <TouchableOpacity onPress={onClose} style={settStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {AVAIL_SERVICES.map((service, si) => (
              <View key={service} style={si > 0 ? { marginTop: 28 } : undefined}>
                <Text style={[avStyles.serviceLabel, { fontFamily: "Inter_600SemiBold" }]}>{service}</Text>

                <View style={avStyles.daysRow}>
                  {ALL_DAYS.map((day) => {
                    const active = avail[service].days.includes(day);
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleDay(service, day)}
                        activeOpacity={0.75}
                        style={[avStyles.dayChip, active && avStyles.dayChipActive]}
                      >
                        <Text style={[avStyles.dayChipText, active && avStyles.dayChipTextActive, { fontFamily: "Inter_500Medium" }]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={avStyles.timesRow}>
                  <View style={avStyles.timeCol}>
                    <Text style={[avStyles.timeLabel, { fontFamily: "Inter_400Regular" }]}>Start Time</Text>
                    <TextInput
                      style={[avStyles.timeInput, { fontFamily: "Inter_400Regular" }]}
                      value={avail[service].startTime}
                      onChangeText={(v) => setTime(service, "startTime", v)}
                      placeholder="08:00"
                      placeholderTextColor="#555"
                    />
                  </View>
                  <View style={avStyles.timeCol}>
                    <Text style={[avStyles.timeLabel, { fontFamily: "Inter_400Regular" }]}>End Time</Text>
                    <TextInput
                      style={[avStyles.timeInput, { fontFamily: "Inter_400Regular" }]}
                      value={avail[service].endTime}
                      onChangeText={(v) => setTime(service, "endTime", v)}
                      placeholder="17:00"
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[settStyles.primaryBtn, { marginTop: 32 }]}
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert("Availability Saved", "Customers will now see your available times.");
                onClose();
              }}
            >
              <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Availability</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const avStyles = StyleSheet.create({
  serviceLabel: { fontSize: 15, color: "#FFFFFF", marginBottom: 12 },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
  },
  dayChipActive: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  dayChipText: { fontSize: 13, color: "#AAAAAA" },
  dayChipTextActive: { color: "#000000" },
  timesRow: { flexDirection: "row", gap: 12 },
  timeCol: { flex: 1 },
  timeLabel: { fontSize: 11, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  timeInput: {
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { logout, role } = useAuth();
  const [prosLoaded, setProsLoaded] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [pushModalVisible, setPushModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [vouchersVisible, setVouchersVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [availabilityVisible, setAvailabilityVisible] = useState(false);
  const notifEnabledRef = React.useRef(notifEnabled);
  notifEnabledRef.current = notifEnabled;

  const [notifItems, setNotifItems] = useState(NOTIFICATIONS);
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProsLoaded(true), 900);
    const n = setTimeout(() => {
      if (notifEnabledRef.current) setNotifVisible(true);
    }, 4000);
    const MOCK_MESSAGES = [
      { id: "", icon: "🚚", title: "Landscaper Arrived", sub: "John Rivera has arrived at your location" },
      { id: "", icon: "🌿", title: "Job In Progress", sub: "Your Lawn Mowing appointment has started" },
      { id: "", icon: "✅", title: "Payment Confirmed", sub: "Escrow released for today's service" },
    ];
    let idx = 0;
    const ws = setInterval(() => {
      const msg = MOCK_MESSAGES[idx % MOCK_MESSAGES.length];
      const item = { ...msg, id: String(Date.now()) };
      setNotifItems((prev) => [item, ...prev]);
      if (notifEnabledRef.current) {
        setNotifVisible(true);
      } else {
        setMissedCount((c) => c + 1);
      }
      idx++;
    }, 6500);
    return () => { clearTimeout(t); clearTimeout(n); clearInterval(ws); };
  }, []);

  useEffect(() => {
    const checkPushAsked = async () => {
      try {
        const asked = await AsyncStorage.getItem("pushAsked");
        if (!asked) {
          const delay = setTimeout(() => setPushModalVisible(true), 1800);
          return () => clearTimeout(delay);
        }
      } catch (_) {}
    };
    checkPushAsked();
  }, []);

  function handleBooking(action: () => void) {
    if (isOffline) {
      // silently blocked — banner is already visible
      return;
    }
    action();
  }

  return (
    <View style={styles.container}>
      <AppHeader
        topPadding={topPadding}
        onBellPress={() => { setNotifVisible(true); setMissedCount(0); }}
        isOffline={isOffline}
        onToggleOffline={() => setIsOffline((v) => !v)}
        notifEnabled={notifEnabled}
        missedCount={missedCount}
        onProfilePress={() => setDropdownVisible(true)}
      />
      <ProfileDropdownModal
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onAppointments={() => { setDropdownVisible(false); router.navigate("/(tabs)/appointments"); }}
        onSettings={() => { setDropdownVisible(false); setSettingsVisible(true); }}
        onShare={() => { setDropdownVisible(false); Alert.alert("Share", "Share link copied to clipboard!"); }}
        onPaymentMethod={() => { setDropdownVisible(false); setPaymentVisible(true); }}
        onVouchers={() => { setDropdownVisible(false); setVouchersVisible(true); }}
        onHelp={() => { setDropdownVisible(false); setHelpVisible(true); }}
        onAvailability={() => { setDropdownVisible(false); setAvailabilityVisible(true); }}
        isLandscaper={role === "landscaper"}
        onSignOut={() => { setDropdownVisible(false); logout(); }}
      />
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
      <PaymentMethodModal
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
      />
      <VouchersModal
        visible={vouchersVisible}
        onClose={() => setVouchersVisible(false)}
      />
      <HelpResourcesModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
      <ServiceAvailabilityModal
        visible={availabilityVisible}
        onClose={() => setAvailabilityVisible(false)}
      />

      {/* Push Notification Permission Modal – shown once after first login */}
      <Modal
        visible={pushModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          AsyncStorage.setItem("pushAsked", "true").catch(() => {});
          setPushModalVisible(false);
        }}
      >
        <Pressable
          style={pushStyles.overlay}
          onPress={() => {
            AsyncStorage.setItem("pushAsked", "true").catch(() => {});
            setPushModalVisible(false);
          }}
        >
          <Pressable style={pushStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={pushStyles.bell}>🛎️</Text>
            <Text style={[pushStyles.title, { fontFamily: "Inter_600SemiBold" }]}>
              Enable Notifications?
            </Text>
            <Text style={[pushStyles.body, { fontFamily: "Inter_400Regular" }]}>
              We'd like to send you updates about service requests, appointment confirmations, and job status changes.
            </Text>
            <TouchableOpacity
              style={pushStyles.allowBtn}
              activeOpacity={0.88}
              onPress={() => {
                AsyncStorage.setItem("pushAsked", "true").catch(() => {});
                setPushModalVisible(false);
                Alert.alert("Notifications Enabled", "You'll receive real-time alerts for requests, appointments, and job updates.");
              }}
            >
              <Text style={[pushStyles.allowBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Allow Notifications
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={pushStyles.notNowBtn}
              activeOpacity={0.85}
              onPress={() => {
                AsyncStorage.setItem("pushAsked", "true").catch(() => {});
                setPushModalVisible(false);
              }}
            >
              <Text style={[pushStyles.notNowText, { fontFamily: "Inter_500Medium" }]}>
                Not Now
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <OfflineBanner visible={isOffline} />
      <NotificationsPanel
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        items={notifItems}
        notifEnabled={notifEnabled}
        onToggleEnabled={() => {
          setNotifEnabled((v) => {
            if (!v) setMissedCount(0);
            return !v;
          });
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CTA Button – customers only */}
        {role !== "landscaper" && (
          <TouchableOpacity
            style={[styles.ctaBtn, isOffline && styles.ctaBtnDisabled]}
            onPress={() => handleBooking(() => router.navigate("/(tabs)/search"))}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color="#000" />
            <Text style={[styles.ctaBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Find a Landscaper Near You
            </Text>
          </TouchableOpacity>
        )}

        {/* Popular Services */}
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Popular Services
        </Text>
        <View style={styles.servicesGrid}>
          {[
            { name: "Lawn\nMowing",    icon: "leaf" as const,   avg: "Avg $52" },
            { name: "Hedge\nTrimming", icon: "cut" as const,    avg: "Avg $68" },
            { name: "Mulching",        icon: "flower" as const, avg: "Avg $135" },
            { name: "Clean Up",        icon: "trash" as const,  avg: "Avg $38" },
          ].map((svc) => (
            <TouchableOpacity
              key={svc.name}
              style={styles.svcGridCard}
              onPress={() => router.navigate("/(tabs)/search")}
              activeOpacity={0.8}
            >
              <View style={styles.svcGridIconWrap}>
                <Ionicons name={svc.icon} size={28} color="#22C55E" />
              </View>
              <Text style={[styles.svcGridName, { fontFamily: "Inter_500Medium" }]}>
                {svc.name}
              </Text>
              <Text style={[styles.svcGridPrice, { fontFamily: "Inter_600SemiBold" }]}>
                {svc.avg}
              </Text>
              <Text style={[styles.svcGridUpdated, { fontFamily: "Inter_400Regular" }]}>
                Updated daily
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming */}
        <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
          Upcoming Appointment
        </Text>
        <TouchableOpacity
          style={styles.appointmentCard}
          onPress={() => router.navigate("/(tabs)/appointments")}
          activeOpacity={0.8}
        >
          <View style={styles.apptIcon}>
            <Ionicons name="leaf" size={22} color="#22C55E" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.apptTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Lawn Mowing
            </Text>
            <Text style={[styles.apptSub, { fontFamily: "Inter_400Regular" }]}>
              April 12 • 10:30 AM • John Rivera
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#22C55E" />
        </TouchableOpacity>

        {/* Quick Stats — staggered entrance */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s, i) => (
            <AnimatedStatCard key={s.label} stat={s} delay={i * 120} />
          ))}
        </View>

        {/* Horizontal Trusted Landscapers */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.proRowContent}
          style={styles.proRow}
        >
          {!prosLoaded ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            TRUSTED_PROS.map((pro) => {
              const isTrustedPro = pro.rating >= 4.7 && pro.jobs >= 50;
              return (
                <TouchableOpacity
                  key={pro.name}
                  style={[styles.proHCard, isOffline && styles.proHCardDisabled]}
                  onPress={() => handleBooking(() => router.navigate("/pay"))}
                  activeOpacity={0.8}
                >
                  <View style={styles.proHIconWrap}>
                    <Ionicons name={pro.icon} size={26} color="#22C55E" />
                  </View>
                  <Text style={[styles.proHName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                    {pro.name}
                  </Text>
                  <Text style={[styles.proHMeta, { fontFamily: "Inter_400Regular" }]}>
                    {pro.rating} ★ • {pro.jobs} jobs
                  </Text>
                  {isTrustedPro && (
                    <View style={styles.trustedBadge}>
                      <Text style={[styles.trustedBadgeText, { fontFamily: "Inter_500Medium" }]}>
                        Trusted Pro
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>


      </ScrollView>
    </View>
  );
}

const TRUSTED_PROS = [
  { name: "John Rivera Landscaping", rating: 4.9, jobs: 142, meta: "2.3 mi • 142 jobs completed", icon: "leaf" as const },
  { name: "Sarah's Lawn Care",        rating: 5.0, jobs: 98,  meta: "1.8 mi • 98 jobs completed",  icon: "grid" as const },
  { name: "GreenScape Pros",          rating: 4.8, jobs: 87,  meta: "3.1 mi • 87 jobs completed",  icon: "flower" as const },
  { name: "Elite Lawn Services",      rating: 4.9, jobs: 65,  meta: "2.9 mi • 65 jobs completed",  icon: "star" as const },
  { name: "FreshCut Landscaping",     rating: 5.0, jobs: 112, meta: "1.4 mi • 112 jobs completed", icon: "cut" as const },
  { name: "Premier Turf Care",        rating: 4.7, jobs: 79,  meta: "4.2 mi • 79 jobs completed",  icon: "options" as const },
  { name: "Nature's Edge Lawn",       rating: 4.9, jobs: 53,  meta: "2.7 mi • 53 jobs completed",  icon: "earth" as const },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    backgroundColor: "#050505",
    paddingHorizontal: 20,
    paddingBottom: 18,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  logoImg: {
    height: 44,
    width: 160,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  notifBtn: {
    width: 36,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  ctaBtn: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 28,
    marginBottom: 24,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnText: { color: "#000", fontSize: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  statCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#222222",
  },
  statValue: { fontSize: 20, color: "#FFFFFF" },
  statLabel: { fontSize: 11, color: "#FFFFFF" },
  sectionTitle: { fontSize: 17, color: "#FFFFFF", marginBottom: 12 },
  appointmentCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#222222",
  },
  apptIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#0d2e18",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  apptTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  apptSub: { fontSize: 12, color: "#FFFFFF" },
  servicesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  svcGridCard: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#222222",
  },
  svcGridIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  svcGridName: { fontSize: 10, color: "#FFFFFF", textAlign: "center", lineHeight: 14 },
  svcGridPrice: { fontSize: 11, color: "#22C55E", textAlign: "center" },
  svcGridUpdated: { fontSize: 9, color: "#555555", textAlign: "center", marginTop: 1 },
  proRow: { marginTop: 20, marginBottom: 24, marginHorizontal: -20 },
  proRowContent: { paddingHorizontal: 20, gap: 12 },
  proHCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 14,
    width: 160,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 6,
  },
  proHIconWrap: {
    width: 44,
    height: 44,
    backgroundColor: "#0d2e18",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  proHName: { fontSize: 13, color: "#FFFFFF", lineHeight: 18 },
  proHMeta: { fontSize: 11, color: "#888888" },
  trustedBadge: {
    backgroundColor: "#0d2e18",
    borderWidth: 1,
    borderColor: "#22C55E",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  trustedBadgeText: { fontSize: 10, color: "#22C55E" },
  skeletonCard: {
    width: 160,
    height: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  notifOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  notifOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  notifSheet: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  notifSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  notifSheetTitle: { fontSize: 20, color: "#FFFFFF" },
  notifCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  notifBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 10, color: "#fff" },
  notifTogglePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#1a1a1a",
  },
  notifTogglePillOn: { backgroundColor: "#0d2e18", borderColor: "#22C55E" },
  notifToggleText: { fontSize: 11, color: "#666666" },
  notifToggleTextOn: { color: "#22C55E" },
  notifList: { gap: 12 },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  notifItemIcon: { fontSize: 32 },
  notifItemTitle: { fontSize: 14, color: "#FFFFFF", marginBottom: 4 },
  notifItemSub: { fontSize: 12, color: "#888888" },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF3B30",
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  offlineBannerText: { color: "#fff", fontSize: 13 },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161616",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#222222",
  },
  offlinePill: { borderColor: "#FF3B30" },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  offlineDot: { backgroundColor: "#FF3B30" },
  onlinePillText: { color: "#FFFFFF", fontSize: 11 },
  offlinePillText: { color: "#FF3B30" },
  ctaBtnDisabled: { backgroundColor: "#2a2a2a", shadowOpacity: 0 },
  proHCardDisabled: { opacity: 0.4 },
});

const pushStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  sheet: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
  },
  bell: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 22, color: "#FFFFFF", textAlign: "center", marginBottom: 12 },
  body: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  allowBtn: {
    backgroundColor: "#22C55E",
    width: "100%",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  allowBtnText: { color: "#000000", fontSize: 17 },
  notNowBtn: {
    backgroundColor: "#222222",
    width: "100%",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
  },
  notNowText: { color: "#FFFFFF", fontSize: 17 },
});
