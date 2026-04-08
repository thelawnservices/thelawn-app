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
  Linking,
  Share,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";
import { useNotifications, type ServiceNotification } from "@/contexts/notifications";
import { useLandscaperProfile, SERVICE_BLOCK_MINUTES } from "@/contexts/landscaperProfile";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";

type FeedPost = {
  id: string; customerName: string; customerInitials: string; customerColor: string;
  landscaperName: string; service: string; stars: number; text: string;
  timestamp: string; hasPhoto: boolean;
  photoIcon: "leaf-outline" | "cut-outline" | "flower-outline" | "grid-outline" | "layers-outline" | "construct-outline";
  likes: number;
};
const HOME_FEED_POSTS: FeedPost[] = [
  { id: "f1", customerName: "Sarah M.", customerInitials: "SM", customerColor: "#166D42", landscaperName: "John Rivera Landscaping", service: "Mowing/Edging", stars: 5, text: "John did an incredible job on our front yard. Super clean edges and done in under 2 hours. Highly recommend!", timestamp: "2 hours ago", hasPhoto: true, photoIcon: "cut-outline", likes: 12 },
  { id: "f2", customerName: "Marcus T.", customerInitials: "MT", customerColor: "#2C5282", landscaperName: "GreenScape Pros", service: "Weeding/Mulching", stars: 5, text: "Flower beds look brand new. They cleared all the weeds and laid fresh mulch — the whole yard smells amazing. Will book again.", timestamp: "5 hours ago", hasPhoto: true, photoIcon: "flower-outline", likes: 8 },
  { id: "f3", customerName: "Alex R.", customerInitials: "AR", customerColor: "#6B21A8", landscaperName: "Maria Santos", service: "Mowing/Edging", stars: 5, text: "Really professional service. Maria showed up right on time and the lawn looks perfect. Already booked my next appointment.", timestamp: "Yesterday at 4:30 PM", hasPhoto: false, photoIcon: "leaf-outline", likes: 21 },
  { id: "f4", customerName: "Priya N.", customerInitials: "PN", customerColor: "#B45309", landscaperName: "EcoGreen Services", service: "Sod Installation", stars: 4, text: "Great sod installation — the new grass is already looking lush. Only minor thing was a 15-min late arrival, but quality more than made up for it.", timestamp: "Yesterday at 11:00 AM", hasPhoto: true, photoIcon: "grid-outline", likes: 5 },
  { id: "f5", customerName: "Carlos R.", customerInitials: "CR", customerColor: "#0F766E", landscaperName: "John Rivera Landscaping", service: "Weeding/Mulching", stars: 5, text: "Completely transformed my back yard. Pulled every weed and the mulch color they chose looks perfect with my house.", timestamp: "2 days ago", hasPhoto: true, photoIcon: "leaf-outline", likes: 34 },
  { id: "f6", customerName: "James W.", customerInitials: "JW", customerColor: "#1D4ED8", landscaperName: "GreenScape Pros", service: "Artificial Turf", stars: 5, text: "Artificial turf installation was seamless. My dogs love it and it looks better than real grass. Zero maintenance — worth every penny.", timestamp: "3 days ago", hasPhoto: true, photoIcon: "layers-outline", likes: 47 },
  { id: "f7", customerName: "Diane W.", customerInitials: "DW", customerColor: "#BE185D", landscaperName: "EcoGreen Services", service: "Sod Installation", stars: 4, text: "Good work overall. The sod looks healthy and they cleaned up well afterward. A few small patches need to settle but I'm told that's normal.", timestamp: "4 days ago", hasPhoto: false, photoIcon: "grid-outline", likes: 9 },
  { id: "f8", customerName: "Tina B.", customerInitials: "TB", customerColor: "#047857", landscaperName: "Maria Santos", service: "Weeding/Mulching", stars: 5, text: "Maria is a gem. She went above and beyond — even trimmed around our mailbox without being asked. The garden has never looked better!", timestamp: "5 days ago", hasPhoto: true, photoIcon: "flower-outline", likes: 18 },
];

function normalizeDateKey(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 3) return raw;
  if (parts.length === 2) return `${parts[0]} ${parts[1]}, ${new Date().getFullYear()}`;
  return raw;
}

function normalizeTime(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("morning")) return "8:00 AM";
  if (lower.includes("afternoon")) return "12:00 PM";
  if (lower.includes("evening")) return "5:00 PM";
  if (lower === "flexible" || lower === "anytime" || lower === "tbd") return "8:00 AM";
  return raw;
}


const LANDSCAPER_QUICK_STATS = [
  { label: "Jobs Accepted", value: "7", icon: "checkmark-circle" as const, iconColor: "#34C759" },
  { label: "Avg Rating", value: "4.9", icon: "star" as const, iconColor: "#f59e0b" },
  { label: "This Week", value: "$420", icon: "cash" as const, iconColor: "#34FF7A" },
];


function AnimatedStatCard({ stat, delay, onPress }: { stat: { label: string; value: string; icon: "checkmark-circle" | "star" | "heart" | "cash"; iconColor: string }; delay: number; onPress?: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  const inner = (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <Ionicons name={stat.icon} size={22} color={stat.iconColor} />
      <Text style={[styles.statValue, { fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
      <Text style={[styles.statLabel, { fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
    </Animated.View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{inner}</TouchableOpacity>;
  }
  return inner;
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


function NotificationsPanel({
  visible,
  onClose,
  items,
  notifEnabled,
  onToggleEnabled,
}: {
  visible: boolean;
  onClose: () => void;
  items: ServiceNotification[];
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
                Active Service Alerts
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
              {items.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 28 }}>
                  <Ionicons name="notifications-outline" size={42} color="#777" style={{ marginBottom: 10 }} />
                  <Text style={[{ color: "#BBBBBB", fontSize: 14, textAlign: "center" }, { fontFamily: "Inter_400Regular" }]}>
                    No alerts yet.{"\n"}Alerts appear when work starts, a message is sent, or a job is complete.
                  </Text>
                </View>
              ) : (
                items.map((n) => (
                  <View key={n.id} style={styles.notifItem}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(52,255,122,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={n.icon as any} size={22} color="#34FF7A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.notifItemTitle, { fontFamily: "Inter_500Medium" }]}>
                        {n.title}
                      </Text>
                      <Text style={[styles.notifItemSub, { fontFamily: "Inter_400Regular" }]}>
                        {n.sub}
                      </Text>
                    </View>
                  </View>
                ))
              )}
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
  notifEnabled,
  missedCount,
  onProfilePress,
  avatarUri,
  userInitial,
}: {
  topPadding: number;
  onBellPress: () => void;
  notifEnabled: boolean;
  missedCount: number;
  onProfilePress: () => void;
  avatarUri: string | null;
  userInitial: string;
}) {
  return (
    <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
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
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarBtnImage} />
            ) : (
              <Text style={[styles.avatarBtnInitial, { fontFamily: "Inter_700Bold" }]}>
                {userInitial}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ProfileDropdownModal({
  visible,
  onClose,
  onViewProfile,
  onServices,
  onSettings,
  onShare,
  onPaymentHistory,
  onVouchers,
  onHelp,
  isLandscaper,
  onSignOut,
}: {
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onServices: () => void;
  onSettings: () => void;
  onShare: () => void;
  onPaymentHistory: () => void;
  onVouchers: () => void;
  onHelp: () => void;
  isLandscaper: boolean;
  onSignOut: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={dropStyles.overlay} onPress={onClose}>
        <Pressable style={dropStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={dropStyles.item} onPress={onViewProfile} activeOpacity={0.7}>
            <Ionicons name="person-outline" size={20} color="#CCCCCC" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>View Profile</Text>
          </TouchableOpacity>
          {isLandscaper && (
            <>
              <TouchableOpacity style={dropStyles.item} onPress={onServices} activeOpacity={0.7}>
                <Ionicons name="construct-outline" size={20} color="#CCCCCC" />
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>My Services</Text>
                  <Ionicons name="chevron-forward" size={16} color="#555" />
                </View>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={dropStyles.item} onPress={onSettings} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="#CCCCCC" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onShare} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={20} color="#CCCCCC" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Share with friends</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onPaymentHistory} activeOpacity={0.7}>
            <Ionicons name="receipt-outline" size={20} color="#34FF7A" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Payment History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onVouchers} activeOpacity={0.7}>
            <Ionicons name="pricetag-outline" size={20} color="#CCCCCC" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Vouchers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={dropStyles.item} onPress={onHelp} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color="#CCCCCC" />
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
    backgroundColor: "#1A1A1A",
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
            placeholderTextColor="#777"
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
                placeholderTextColor="#777"
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
            placeholderTextColor="#777"
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
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#34FF7A",
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
  { id: "debit", label: "Debit Card", icon: "" },
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
          <Text style={[{ fontSize: 15, color: "#CCCCCC", textAlign: "center", marginBottom: 20, fontFamily: "Inter_400Regular" }]}>
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
              {saved === opt.id && <Ionicons name="checkmark-circle" size={20} color="#34FF7A" />}
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
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  optionSelected: { borderColor: "#34FF7A" },
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
const ALL_SERVICES = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Artificial Turf", "Full Service"];

const ACCEPTED_PAYMENT_OPTIONS = [
  { value: "Cash",      icon: "cash-outline" as const },
  { value: "Venmo",     icon: "phone-portrait-outline" as const },
  { value: "PayPal",    icon: "card-outline" as const },
  { value: "Cash App",  icon: "logo-buffer" as const },
  { value: "Zelle",     icon: "swap-horizontal-outline" as const },
  { value: "Check",     icon: "document-outline" as const },
  { value: "In Person", icon: "handshake-outline" as const },
];

type ServiceAvail = { days: string[]; startTime: string; endTime: string };
type AvailState = Record<string, ServiceAvail>;

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m === 30) break;
      const period = h < 12 ? "AM" : "PM";
      const hr = h > 12 ? h - 12 : h;
      slots.push(`${hr}:${m === 0 ? "00" : "30"} ${period}`);
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

const DEFAULT_AVAIL: AvailState = {
  "Mowing/Edging":    { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "8:00 AM",  endTime: "6:00 PM"  },
  "Weeding/Mulching": { days: ["Tue", "Thu"],                       startTime: "9:00 AM",  endTime: "5:00 PM"  },
  "Sod Installation": { days: ["Mon", "Wed", "Fri"],                startTime: "7:00 AM",  endTime: "5:00 PM"  },
  "Artificial Turf":  { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "7:00 AM",  endTime: "4:00 PM"  },
  "Full Service":     { days: ["Mon", "Wed", "Fri"],                startTime: "8:00 AM",  endTime: "5:00 PM"  },
};

type PricingTier = { label: string; range: string; price: string };
type ServicePricing = Record<string, PricingTier[]>;

const BASE_TIERS: PricingTier[] = [
  { label: "Small",  range: "Up to 2,000 sq ft",   price: "$45" },
  { label: "Medium", range: "2,000 – 5,000 sq ft",  price: "$65" },
  { label: "Large",  range: "5,000+ sq ft",          price: "$95" },
];

function makeDefaultPricing(): ServicePricing {
  const out: ServicePricing = {};
  for (const svc of ALL_SERVICES) out[svc] = BASE_TIERS.map((t) => ({ ...t }));
  return out;
}

function ServicesEditModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { myServices, saveMyServices } = useLandscaperProfile();

  const [offered, setOffered]   = useState<string[]>(() => [...myServices.offered]);
  const [avail, setAvail]       = useState<AvailState>(() => JSON.parse(JSON.stringify(myServices.avail)));
  const [pricing, setPricing]   = useState<ServicePricing>(() => JSON.parse(JSON.stringify(myServices.pricing)));
  const [acceptedPayments, setAcceptedPayments] = useState<string[]>(() => [...myServices.acceptedPayments]);
  const [saved, setSaved] = useState(false);
  const [timePicker, setTimePicker] = useState<{ service: string; field: "startTime" | "endTime" } | null>(null);

  // Sync from context whenever modal opens
  useEffect(() => {
    if (visible) {
      setOffered([...myServices.offered]);
      setAvail(JSON.parse(JSON.stringify(myServices.avail)));
      setPricing(JSON.parse(JSON.stringify(myServices.pricing)));
      setAcceptedPayments([...myServices.acceptedPayments]);
    }
  }, [visible]);

  function toggleService(svc: string) {
    Haptics.selectionAsync();
    setOffered((prev) => prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]);
  }

  function toggleDay(service: string, day: string) {
    setAvail((prev) => {
      const days = prev[service].days.includes(day)
        ? prev[service].days.filter((d) => d !== day)
        : [...prev[service].days, day];
      return { ...prev, [service]: { ...prev[service], days } };
    });
  }

  function applyTime(slot: string) {
    if (!timePicker) return;
    const { service, field } = timePicker;
    setAvail((prev) => ({ ...prev, [service]: { ...prev[service], [field]: slot } }));
    setTimePicker(null);
  }

  function updatePrice(service: string, tierIdx: number, value: string) {
    setPricing((prev) => ({
      ...prev,
      [service]: prev[service].map((t, i) => (i === tierIdx ? { ...t, price: value } : t)),
    }));
  }

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveMyServices({ offered, avail, pricing, acceptedPayments });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  }

  const tpField = timePicker?.field ?? "startTime";
  const currentTime = timePicker ? (avail[timePicker.service]?.[tpField] ?? "") : "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={svcStyles.overlay}>
        <View style={svcStyles.sheet}>
          <View style={svcStyles.header}>
            <Text style={[svcStyles.title, { fontFamily: "Inter_700Bold" }]}>My Services</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

            {/* ── Services I Offer ───────────────────────────── */}
            <Text style={[svcStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Services I Offer</Text>
            <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular" }]}>
              Toggle on the services you provide. Disabled services are hidden from your profile.
            </Text>
            <View style={svcStyles.chipsRow}>
              {ALL_SERVICES.map((svc) => {
                const on = offered.includes(svc);
                return (
                  <TouchableOpacity
                    key={svc}
                    style={[svcStyles.chip, on && svcStyles.chipOn]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={16} color={on ? "#000" : "#555"} />
                    <Text style={[svcStyles.chipText, { fontFamily: "Inter_500Medium" }, on && svcStyles.chipTextOn]}>
                      {svc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={svcStyles.divider} />

            {/* ── Per-Service: Availability + Pricing ───────── */}
            <Text style={[svcStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Availability & Pricing</Text>
            <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular" }]}>
              Configure working days, hours, and rates per yard size for each active service.
            </Text>

            {offered.map((service, si) => (
              <View key={service} style={[svcStyles.serviceBlock, si > 0 && { marginTop: 14 }]}>

                <Text style={[svcStyles.schedServiceLabel, { fontFamily: "Inter_700Bold" }]}>{service}</Text>

                {/* Days */}
                <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium" }]}>AVAILABLE DAYS</Text>
                <View style={svcStyles.daysRow}>
                  {ALL_DAYS.map((day) => {
                    const active = avail[service]?.days.includes(day) ?? false;
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => { toggleDay(service, day); Haptics.selectionAsync(); }}
                        activeOpacity={0.75}
                        style={[svcStyles.dayChip, active && svcStyles.dayChipActive]}
                      >
                        <Text style={[svcStyles.dayChipText, active && svcStyles.dayChipTextActive, { fontFamily: "Inter_500Medium" }]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Time buttons */}
                <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium" }]}>WORKING HOURS</Text>
                <View style={svcStyles.timesRow}>
                  <TouchableOpacity
                    style={svcStyles.timeBtn}
                    onPress={() => setTimePicker({ service, field: "startTime" })}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                      <Ionicons name="time-outline" size={14} color="#34FF7A" />
                      <Text style={[svcStyles.timeBtnLabel, { fontFamily: "Inter_400Regular" }]}>Start</Text>
                    </View>
                    <Text style={[svcStyles.timeBtnValue, { fontFamily: "Inter_600SemiBold" }]}>
                      {avail[service]?.startTime ?? "8:00 AM"}
                    </Text>
                  </TouchableOpacity>

                  <Ionicons name="arrow-forward" size={13} color="#444" style={{ marginHorizontal: 2 }} />

                  <TouchableOpacity
                    style={svcStyles.timeBtn}
                    onPress={() => setTimePicker({ service, field: "endTime" })}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flex: 1 }}>
                      <Ionicons name="time-outline" size={14} color="#34FF7A" />
                      <Text style={[svcStyles.timeBtnLabel, { fontFamily: "Inter_400Regular" }]}>End</Text>
                    </View>
                    <Text style={[svcStyles.timeBtnValue, { fontFamily: "Inter_600SemiBold" }]}>
                      {avail[service]?.endTime ?? "5:00 PM"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Pricing per service */}
                <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium" }]}>BASE RATE BY YARD SIZE</Text>
                {(pricing[service] ?? BASE_TIERS).map((tier, ti) => (
                  <View key={tier.label} style={svcStyles.pricingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[svcStyles.pricingSize, { fontFamily: "Inter_600SemiBold" }]}>
                        {tier.label} Yard
                      </Text>
                      <Text style={[svcStyles.pricingDesc, { fontFamily: "Inter_400Regular" }]}>{tier.range}</Text>
                    </View>
                    <TextInput
                      style={[svcStyles.priceInput, { fontFamily: "Inter_700Bold" }]}
                      value={tier.price}
                      onChangeText={(v) => updatePrice(service, ti, v)}
                      keyboardType="default"
                      maxLength={8}
                      selectTextOnFocus
                      placeholderTextColor="#555"
                    />
                  </View>
                ))}

              </View>
            ))}

            {offered.length === 0 && (
              <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular", marginTop: 4 }]}>
                Enable at least one service above to configure its availability and pricing.
              </Text>
            )}

            <View style={[svcStyles.divider, { marginTop: 20 }]} />

            {/* ── Accepted Payments ─────────────────────────── */}
            <Text style={[svcStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Accepted Payments</Text>
            <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular" }]}>
              Customers will see your accepted payment methods before booking. Select all that apply.
            </Text>
            <View style={svcStyles.chipsRow}>
              {ACCEPTED_PAYMENT_OPTIONS.map((opt) => {
                const on = acceptedPayments.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[svcStyles.chip, on && svcStyles.chipOn]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAcceptedPayments((prev) =>
                        on ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={14} color={on ? "#000" : "#555"} />
                    <Text style={[svcStyles.chipText, { fontFamily: "Inter_500Medium" }, on && svcStyles.chipTextOn]}>
                      {opt.value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {acceptedPayments.length > 0 && (
              <View style={svcStyles.paymentNote}>
                <Ionicons name="eye-outline" size={13} color="#34FF7A" />
                <Text style={[svcStyles.paymentNoteText, { fontFamily: "Inter_400Regular" }]}>
                  Customers will see: <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{acceptedPayments.join("  ·  ")}</Text>
                </Text>
              </View>
            )}

            <View style={[svcStyles.divider, { marginTop: 16 }]} />

            {/* ── Save ──────────────────────────────────────── */}
            <TouchableOpacity
              style={[svcStyles.saveBtn, saved && svcStyles.saveBtnSuccess]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name={saved ? "checkmark-circle" : "save-outline"} size={18} color="#000" />
              <Text style={[svcStyles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
                {saved ? "Saved!" : "Save Changes"}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>

      {/* ── Time Picker ───────────────────────────────────── */}
      {timePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setTimePicker(null)}>
          <TouchableOpacity style={svcStyles.tpOverlay} activeOpacity={1} onPress={() => setTimePicker(null)}>
            <View style={svcStyles.tpSheet}>
              <Text style={[svcStyles.tpTitle, { fontFamily: "Inter_700Bold" }]}>
                Select {tpField === "startTime" ? "Start" : "End"} Time
              </Text>
              <Text style={[svcStyles.tpSubtitle, { fontFamily: "Inter_400Regular" }]}>
                {timePicker.service}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                {TIME_SLOTS.map((slot) => {
                  const selected = slot === currentTime;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[svcStyles.tpSlot, selected && svcStyles.tpSlotActive]}
                      onPress={() => { Haptics.selectionAsync(); applyTime(slot); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        svcStyles.tpSlotText,
                        { fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" },
                        selected && svcStyles.tpSlotTextActive,
                      ]}>
                        {slot}
                      </Text>
                      {selected && <Ionicons name="checkmark" size={16} color="#000" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const svcStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "#222", padding: 24, maxHeight: "90%",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 20, color: "#FFFFFF" },
  sectionLabel: { fontSize: 15, color: "#FFFFFF", marginBottom: 6 },
  sectionHint: { fontSize: 12, color: "#777", marginBottom: 14, lineHeight: 18 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#333",
  },
  chipOn: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  chipText: { fontSize: 13, color: "#666" },
  chipTextOn: { color: "#000" },
  divider: { height: 1, backgroundColor: "#222", marginBottom: 22, marginTop: 4 },
  serviceBlock: {
    backgroundColor: "#171717", borderRadius: 18,
    borderWidth: 1, borderColor: "#262626",
    padding: 16, marginBottom: 4,
  },
  schedServiceLabel: { fontSize: 15, color: "#34FF7A", marginBottom: 14 },
  subLabel: { fontSize: 10, color: "#666", marginBottom: 8, letterSpacing: 0.8 },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  dayChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 10, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#333",
  },
  dayChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  dayChipText: { fontSize: 12, color: "#777" },
  dayChipTextActive: { color: "#000" },
  timesRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  timeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1A1A", borderRadius: 12,
    borderWidth: 1, borderColor: "#333",
    paddingHorizontal: 12, paddingVertical: 11,
  },
  timeBtnLabel: { fontSize: 11, color: "#888" },
  timeBtnValue: { fontSize: 13, color: "#FFFFFF" },
  pricingRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#111", borderRadius: 12,
    borderWidth: 1, borderColor: "#222",
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 8,
  },
  pricingSize: { fontSize: 13, color: "#FFFFFF", marginBottom: 2 },
  pricingDesc: { fontSize: 11, color: "#666" },
  priceInput: {
    fontSize: 17, color: "#34FF7A",
    backgroundColor: "#0D0D0D", borderRadius: 10,
    borderWidth: 1, borderColor: "#34FF7A44",
    paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 64, textAlign: "center",
  },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16,
    paddingVertical: 16, marginTop: 4,
  },
  saveBtnSuccess: { backgroundColor: "#22c55e" },
  saveBtnText: { fontSize: 16, color: "#000" },
  tpOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center",
  },
  tpSheet: {
    backgroundColor: "#1A1A1A", borderRadius: 22,
    borderWidth: 1, borderColor: "#2A2A2A",
    padding: 22, width: "82%", maxWidth: 340,
  },
  tpTitle: { fontSize: 17, color: "#FFFFFF", textAlign: "center", marginBottom: 4 },
  tpSubtitle: { fontSize: 12, color: "#666", textAlign: "center", marginBottom: 16 },
  tpSlot: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 10, marginBottom: 4,
    backgroundColor: "#111",
  },
  tpSlotActive: { backgroundColor: "#34FF7A" },
  tpSlotText: { fontSize: 15, color: "#FFFFFF" },
  tpSlotTextActive: { color: "#000" },
  paymentNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#0E1F14", borderRadius: 12,
    borderWidth: 1, borderColor: "#1D4428",
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 4,
  },
  paymentNoteText: { fontSize: 12, color: "#BBBBBB", flex: 1, lineHeight: 18 },
});


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { logout, role, avatarUri, userName } = useAuth();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : (role === "landscaper" ? "G" : "Z");
  const { acceptJob } = useJobs();
  const { addBookedSlot } = useLandscaperProfile();
  const [prosLoaded, setProsLoaded] = useState(false);
  const [selectedPro, setSelectedPro] = useState<TrustedPro | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (name: string) => {
    Haptics.selectionAsync();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const customerQuickStats = [
    { label: "Favorites", value: String(favorites.size), icon: "heart" as const, iconColor: "#f87171" },
  ];
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [pushModalVisible, setPushModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [vouchersVisible, setVouchersVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [servicesEditVisible, setServicesEditVisible] = useState(false);
  const [paymentHistoryVisible, setPaymentHistoryVisible] = useState(false);
  const [feedLiked, setFeedLiked] = useState<Set<string>>(new Set());
  const [feedCounts, setFeedCounts] = useState<Record<string, number>>(
    Object.fromEntries(HOME_FEED_POSTS.map((p) => [p.id, p.likes]))
  );
  const toggleFeedLike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setFeedCounts((c) => ({ ...c, [id]: c[id] - 1 })); }
      else { next.add(id); setFeedCounts((c) => ({ ...c, [id]: c[id] + 1 })); }
      return next;
    });
  };
  const notifEnabledRef = React.useRef(notifEnabled);
  notifEnabledRef.current = notifEnabled;

  const { notifications: notifItems } = useNotifications();
  const [missedCount, setMissedCount] = useState(0);
  const notifVisibleRef = React.useRef(notifVisible);
  notifVisibleRef.current = notifVisible;
  const prevNotifCount = React.useRef(notifItems.length);

  useEffect(() => {
    if (notifItems.length > prevNotifCount.current) {
      if (notifVisibleRef.current) {
      } else {
        setMissedCount((c) => c + 1);
      }
    }
    prevNotifCount.current = notifItems.length;
  }, [notifItems.length]);

  useEffect(() => {
    const t = setTimeout(() => setProsLoaded(true), 900);
    return () => clearTimeout(t);
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
    action();
  }

  return (
    <View style={styles.container}>
      <AppHeader
        topPadding={topPadding}
        onBellPress={() => { setNotifVisible(true); setMissedCount(0); }}
        notifEnabled={notifEnabled}
        missedCount={missedCount}
        onProfilePress={() => setDropdownVisible(true)}
        avatarUri={avatarUri}
        userInitial={userInitial}
      />
      <ProfileDropdownModal
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onViewProfile={() => { setDropdownVisible(false); router.navigate("/(tabs)/profile"); }}
        onServices={() => { setDropdownVisible(false); setServicesEditVisible(true); }}
        onSettings={() => { setDropdownVisible(false); setSettingsVisible(true); }}
        onShare={() => {
          setDropdownVisible(false);
          Share.share({
            title: "TheLawn — Book Landscaping Services",
            message: "Book trusted local landscapers on TheLawn! Check it out: https://thelawn.app",
            url: "https://thelawn.app",
          }).catch(() => {});
        }}
        onPaymentHistory={() => { setDropdownVisible(false); setPaymentHistoryVisible(true); }}
        onVouchers={() => { setDropdownVisible(false); setVouchersVisible(true); }}
        onHelp={() => { setDropdownVisible(false); setHelpVisible(true); }}
        isLandscaper={role === "landscaper"}
        onSignOut={() => { setDropdownVisible(false); logout(); }}
      />
      <ServicesEditModal
        visible={servicesEditVisible}
        onClose={() => setServicesEditVisible(false)}
      />
      <PaymentHistoryModal
        visible={paymentHistoryVisible}
        onClose={() => setPaymentHistoryVisible(false)}
        role={role === "landscaper" ? "landscaper" : "customer"}
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
            <Ionicons name="notifications-outline" size={52} color="#34FF7A" style={{ marginBottom: 8 }} />
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
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={[styles.greetingText, { fontFamily: "Inter_600SemiBold" }]}>
            {(() => {
              const h = new Date().getHours();
              const tod = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
              const name = role === "landscaper" ? "John" : "Alex";
              return `${tod}, ${name}`;
            })()}
          </Text>
          <Text style={[styles.greetingZip, { fontFamily: "Inter_400Regular" }]}>
            {role === "landscaper"
              ? "Your dashboard · ZIP 34222"
              : "Landscapers near you · ZIP 34222"}
          </Text>
        </View>

        {/* CTA Button – customers only */}
        {role !== "landscaper" && (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => handleBooking(() => router.navigate("/(tabs)/search"))}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={20} color="#000" />
            <Text style={[styles.ctaBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Find a Landscaper Near You
            </Text>
          </TouchableOpacity>
        )}

        {/* Recommended Landscapers — customers only, near top */}
        {role !== "landscaper" && (
          <>
          <View style={styles.recRow}>
            <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
              Recommended Landscapers
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.proRowContent}
            style={[styles.proRow, { marginBottom: 4 }]}
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
                const isFav = favorites.has(pro.name);
                return (
                  <TouchableOpacity
                    key={pro.name}
                    style={styles.proHCard}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedPro(pro);
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Favorite heart */}
                    <TouchableOpacity
                      style={styles.favBtn}
                      onPress={(e) => { e.stopPropagation(); toggleFavorite(pro.name); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? "#f87171" : "#555"} />
                    </TouchableOpacity>
                    <View style={styles.proHIconWrap}>
                      <Ionicons name={pro.icon} size={26} color="#34FF7A" />
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

          </>
        )}

        {/* Popular Services — customers only */}
        {role !== "landscaper" && (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Popular Services
            </Text>
            <View style={styles.servicesGrid}>
              {[
                { name: "Mowing/\nEdging",    icon: "cut-outline" as const,    est: "1–2 hrs" },
                { name: "Weeding/\nMulching", icon: "flower-outline" as const, est: "2–4 hrs" },
                { name: "Sod\nInstallation", icon: "grid-outline" as const,   est: "4–8 hrs" },
                { name: "Artificial\nTurf",  icon: "layers-outline" as const, est: "10–20 hrs" },
              ].map((svc) => (
                <TouchableOpacity
                  key={svc.name}
                  style={styles.svcGridCard}
                  onPress={() => router.navigate("/(tabs)/search")}
                  activeOpacity={0.8}
                >
                  <View style={styles.svcGridIconWrap}>
                    <Ionicons name={svc.icon} size={28} color="#34FF7A" />
                  </View>
                  <Text style={[styles.svcGridName, { fontFamily: "Inter_500Medium" }]}>
                    {svc.name}
                  </Text>
                  <Text style={[styles.svcGridUpdated, { fontFamily: "Inter_400Regular" }]}>
                    Est. {svc.est}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Quick Stats — landscapers only, shown first */}
        {role === "landscaper" && (
          <View style={styles.statsRow}>
            {LANDSCAPER_QUICK_STATS.map((s, i) => (
              <AnimatedStatCard
                key={s.label}
                stat={s}
                delay={i * 120}
              />
            ))}
          </View>
        )}

        {/* Upcoming Appointment — landscapers only, shown second */}
        {role === "landscaper" && (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Upcoming Appointment
            </Text>
            <TouchableOpacity
              style={styles.appointmentCard}
              onPress={() => router.navigate("/(tabs)/appointments")}
              activeOpacity={0.8}
            >
              <View style={styles.apptIcon}>
                <Ionicons name="leaf" size={22} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.apptTitle, { fontFamily: "Inter_600SemiBold" }]}>
                  Lawn Mowing
                </Text>
                <Text style={[styles.apptSub, { fontFamily: "Inter_400Regular" }]}>
                  April 12 • 10:30 AM • John Rivera
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#34FF7A" />
            </TouchableOpacity>
          </>
        )}


        {/* Quick Stats — customers only */}
        {role !== "landscaper" && (
          <View style={styles.statsRow}>
            {customerQuickStats.map((s, i) => (
              <AnimatedStatCard
                key={s.label}
                stat={s}
                delay={i * 120}
                onPress={s.label === "Favorites" ? () => setFavoritesModalVisible(true) : undefined}
              />
            ))}
          </View>
        )}

        {/* ── Community Feed ─────────────────────────────────── */}
        <View style={styles.feedHeaderRow}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
            Community Feed
          </Text>
          <View style={styles.feedLiveDot} />
          <Text style={[styles.feedLiveText, { fontFamily: "Inter_500Medium" }]}>Live</Text>
        </View>
        <Text style={[styles.feedSubtitle, { fontFamily: "Inter_400Regular" }]}>
          Recent reviews & photos from customers
        </Text>

        {HOME_FEED_POSTS.map((post) => (
          <View key={post.id} style={styles.feedCard}>
            {/* Card header */}
            <View style={styles.feedCardHeader}>
              <View style={[styles.feedAvatar, { backgroundColor: post.customerColor }]}>
                <Text style={[styles.feedAvatarText, { fontFamily: "Inter_700Bold" }]}>{post.customerInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {/* Plain Text — customer names are NOT tappable */}
                <Text style={[styles.feedCustomerName, { fontFamily: "Inter_600SemiBold" }]}>{post.customerName}</Text>
                <Text style={[styles.feedTimestamp, { fontFamily: "Inter_400Regular" }]}>{post.timestamp}</Text>
              </View>
              <View style={styles.feedServiceTag}>
                <Ionicons name="leaf" size={10} color="#34FF7A" />
                <Text style={[styles.feedServiceTagText, { fontFamily: "Inter_500Medium" }]}>{post.service}</Text>
              </View>
            </View>

            {/* Landscaper reference */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <Ionicons name="person-circle-outline" size={13} color="#888" />
              <Text style={[{ fontSize: 12, color: "#888" }, { fontFamily: "Inter_400Regular" }]}>
                Reviewed{" "}
                <Text style={{ color: "#34FF7A", fontFamily: "Inter_600SemiBold" }}>{post.landscaperName}</Text>
              </Text>
            </View>

            {/* Stars */}
            <View style={{ flexDirection: "row", gap: 2, marginBottom: 8 }}>
              {[1,2,3,4,5].map((s) => (
                <Ionicons key={s} name="star" size={12} color={s <= post.stars ? "#f59e0b" : "#333"} />
              ))}
            </View>

            {/* Review text */}
            <Text style={[styles.feedReviewText, { fontFamily: "Inter_400Regular" }]}>{post.text}</Text>

            {/* Photo placeholder */}
            {post.hasPhoto && (
              <View style={styles.feedPhotoTile}>
                <Ionicons name={post.photoIcon} size={36} color="#34FF7A" />
                <Text style={[{ fontSize: 11, color: "#555", marginTop: 4 }, { fontFamily: "Inter_400Regular" }]}>Photo attached</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.feedCardFooter}>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 5 }} onPress={() => toggleFeedLike(post.id)} activeOpacity={0.75}>
                <Ionicons name={feedLiked.has(post.id) ? "heart" : "heart-outline"} size={17} color={feedLiked.has(post.id) ? "#ef4444" : "#888"} />
                <Text style={[{ fontSize: 13, color: feedLiked.has(post.id) ? "#ef4444" : "#888" }, { fontFamily: "Inter_400Regular" }]}>
                  {feedCounts[post.id]}
                </Text>
              </TouchableOpacity>
              <Text style={[{ fontSize: 12, color: "#555" }, { fontFamily: "Inter_400Regular" }]}>
                {post.stars === 5 ? "Highly recommended" : post.stars >= 4 ? "Recommended" : "Mixed review"}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Favorites Modal — customers only */}
      <Modal
        visible={favoritesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFavoritesModalVisible(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={() => setFavoritesModalVisible(false)}>
          <Pressable style={{ backgroundColor: "#1A1A1A", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: "#222", paddingBottom: 36 }} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" }}>
                Favorites <Text style={{ color: "#34FF7A" }}>({favorites.size})</Text>
              </Text>
              <TouchableOpacity onPress={() => setFavoritesModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#CCCCCC" />
              </TouchableOpacity>
            </View>
            {favorites.size === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                <Ionicons name="heart-outline" size={48} color="#333" />
                <Text style={{ color: "#BBBBBB", fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                  Tap the heart on any landscaper{"\n"}to save them here.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {TRUSTED_PROS.filter((p) => favorites.has(p.name)).map((pro) => (
                  <TouchableOpacity
                    key={pro.name}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingVertical: 14, gap: 14, borderBottomWidth: 1, borderBottomColor: "#222" }}
                    onPress={() => { setFavoritesModalVisible(false); setTimeout(() => setSelectedPro(pro), 200); }}
                    activeOpacity={0.75}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#0d2e18", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#34FF7A" }}>
                      <Ionicons name="person" size={22} color="#34FF7A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{pro.name}</Text>
                      <Text style={{ color: "#BBBBBB", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>★ {pro.rating} · {pro.jobs} jobs</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#34FF7A" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Landscaper Profile Modal — customers only */}
      <LandscaperProfileViewModal
        pro={selectedPro}
        onClose={() => setSelectedPro(null)}
        onBook={() => {
          setSelectedPro(null);
          handleBooking(() => router.navigate("/pay"));
        }}
      />
    </View>
  );
}

type TrustedPro = { name: string; rating: number; jobs: number; meta: string; icon: "leaf" | "grid" | "flower" | "star" | "cut" | "options" | "earth" };

function LandscaperProfileViewModal({
  pro,
  onClose,
  onBook,
}: {
  pro: TrustedPro | null;
  onClose: () => void;
  onBook: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top;
  const { availability, myServices } = useLandscaperProfile();

  if (!pro) return null;

  const isTrustedPro = pro.rating >= 4.7 && pro.jobs >= 50;

  return (
    <Modal visible={!!pro} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={fsStyles.container}>
        {/* Back arrow — floats over the hero */}
        <TouchableOpacity
          style={[fsStyles.backBtn, { top: topPad + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ── */}
          <View style={[fsStyles.hero, { paddingTop: topPad + 56 }]}>
            <View style={fsStyles.avatarWrap}>
              <View style={fsStyles.avatarInner}>
                <Ionicons name={pro.icon} size={52} color="#000" />
              </View>
            </View>
            <Text style={[fsStyles.heroName, { fontFamily: "Inter_700Bold" }]}>{pro.name}</Text>
            <View style={fsStyles.heroBadgeRow}>
              <View style={fsStyles.ratingPill}>
                <Text style={[fsStyles.ratingText, { fontFamily: "Inter_600SemiBold" }]}>★ {pro.rating}</Text>
              </View>
              {isTrustedPro && (
                <View style={fsStyles.proBadge}>
                  <Text style={[fsStyles.proBadgeText, { fontFamily: "Inter_700Bold" }]}>PRO</Text>
                </View>
              )}
              <Text style={[fsStyles.jobsText, { fontFamily: "Inter_400Regular" }]}>{pro.jobs} jobs</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={14} color="#CCCCCC" />
              <Text style={[fsStyles.location, { fontFamily: "Inter_400Regular" }]}>
                Sarasota / Ellenton, FL · {pro.meta.split("•")[0].trim()}
              </Text>
            </View>
          </View>

          {/* ── Body ── */}
          <View style={fsStyles.body}>

            {/* Call / Text */}
            <View style={fsStyles.contactRow}>
              <TouchableOpacity
                style={fsStyles.contactBtn}
                activeOpacity={0.8}
                onPress={() =>
                  Linking.openURL("tel:+19415550000").catch(() =>
                    Alert.alert("Calling", pro.name)
                  )
                }
              >
                <Ionicons name="call-outline" size={22} color="#34FF7A" />
                <Text style={[fsStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={fsStyles.contactBtn}
                activeOpacity={0.8}
                onPress={() =>
                  Linking.openURL("sms:+19415550000").catch(() =>
                    Alert.alert("Message", "Texting " + pro.name)
                  )
                }
              >
                <Ionicons name="chatbubble-outline" size={22} color="#34FF7A" />
                <Text style={[fsStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Book Now */}
            <TouchableOpacity style={fsStyles.bookBtn} activeOpacity={0.85} onPress={onBook}>
              <Ionicons name="calendar-outline" size={20} color="#000" />
              <Text style={[fsStyles.bookBtnText, { fontFamily: "Inter_600SemiBold" }]}>Book Now</Text>
            </TouchableOpacity>

            {/* About */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>ABOUT</Text>
            <Text style={[fsStyles.aboutText, { fontFamily: "Inter_400Regular" }]}>
              Professional landscaping services with outstanding reviews. Specializing in mowing/edging, weeding/mulching, sod installation, and artificial turf for residential properties in the Sarasota / Ellenton area.
            </Text>

            {/* Recent Work */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>RECENT WORK</Text>
            <View style={fsStyles.photoGrid}>
              {(["leaf-outline","cut-outline","flower-outline","leaf","construct-outline","tree-outline"] as const).map((icon, i) => (
                <View key={i} style={fsStyles.photoTile}>
                  <Ionicons name={icon} size={32} color="#34FF7A" />
                </View>
              ))}
            </View>

            {/* Customer Reviews */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>CUSTOMER REVIEWS</Text>
            {[
              { name: "Sarah M.", initials: "SM", color: "#166D42", stars: 5, text: "Incredible job — super clean edges and left no mess behind. Will be booking regularly!", date: "2 days ago" },
              { name: "Marcus T.", initials: "MT", color: "#2C5282", stars: 5, text: "Reliable, on time, and the yard looks fantastic every time. Highly recommend.", date: "1 week ago" },
              { name: "Alex R.", initials: "AR", color: "#6B21A8", stars: 5, text: "Professional and thorough. Left the property spotless. Will book again.", date: "2 weeks ago" },
              { name: "Priya N.", initials: "PN", color: "#B45309", stars: 4, text: "Great quality work. Only minor delay on arrival but the results were worth it.", date: "3 weeks ago" },
            ].map((rv, i) => (
              <View key={i} style={fsStyles.reviewCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <View style={[fsStyles.reviewAvatar, { backgroundColor: rv.color }]}>
                    <Text style={[fsStyles.reviewAvatarText, { fontFamily: "Inter_700Bold" }]}>{rv.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {/* Plain Text — not tappable, customers cannot navigate to other customer profiles */}
                    <Text style={[fsStyles.reviewAuthor, { fontFamily: "Inter_600SemiBold" }]}>{rv.name}</Text>
                    <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons key={s} name="star" size={11} color={s <= rv.stars ? "#f59e0b" : "#333"} />
                      ))}
                    </View>
                  </View>
                  <Text style={[fsStyles.reviewDate, { fontFamily: "Inter_400Regular" }]}>{rv.date}</Text>
                </View>
                <Text style={[fsStyles.reviewText, { fontFamily: "Inter_400Regular" }]}>{rv.text}</Text>
              </View>
            ))}

            {/* Services & Availability */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>
              SERVICES & AVAILABILITY
            </Text>
            {myServices.offered.map((svc) => {
              const svcAvail = myServices.avail[svc];
              const svcPricing = myServices.pricing[svc] ?? [];
              return (
                <View key={svc} style={fsStyles.svcCard}>
                  <Text style={[fsStyles.svcCardName, { fontFamily: "Inter_700Bold" }]}>{svc}</Text>

                  {/* Days */}
                  {svcAvail && (
                    <>
                      <View style={fsStyles.svcDaysRow}>
                        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => {
                          const on = svcAvail.days.includes(d);
                          return (
                            <View key={d} style={[fsStyles.svcDayChip, on && fsStyles.svcDayChipOn]}>
                              <Text style={[fsStyles.svcDayText, { fontFamily: "Inter_600SemiBold" }, on && fsStyles.svcDayTextOn]}>
                                {d.slice(0,2)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
                        <Ionicons name="time-outline" size={13} color="#888" />
                        <Text style={[{ fontSize: 12, color: "#999" }, { fontFamily: "Inter_400Regular" }]}>
                          {svcAvail.startTime} – {svcAvail.endTime}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Pricing tiers */}
                  {svcPricing.length > 0 && (
                    <View style={fsStyles.svcPriceRow}>
                      {svcPricing.map((tier) => (
                        <View key={tier.label} style={fsStyles.svcPriceCell}>
                          <Text style={[fsStyles.svcPriceCellLabel, { fontFamily: "Inter_500Medium" }]}>
                            {tier.label}
                          </Text>
                          <Text style={[fsStyles.svcPriceCellRange, { fontFamily: "Inter_400Regular" }]}>
                            {tier.range}
                          </Text>
                          <Text style={[fsStyles.svcPriceCellPrice, { fontFamily: "Inter_700Bold" }]}>
                            {tier.price}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Accepted Payments */}
            {myServices.acceptedPayments.length > 0 && (
              <>
                <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>
                  ACCEPTED PAYMENTS
                </Text>
                <View style={fsStyles.paymentsCard}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {myServices.acceptedPayments.map((pm) => {
                      const opt = ACCEPTED_PAYMENT_OPTIONS.find((o) => o.value === pm);
                      return (
                        <View key={pm} style={fsStyles.paymentChip}>
                          {opt && <Ionicons name={opt.icon} size={13} color="#34FF7A" />}
                          <Text style={[fsStyles.paymentChipText, { fontFamily: "Inter_500Medium" }]}>{pm}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const fsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  reviewCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 14, color: "#fff" },
  reviewAuthor: { fontSize: 13, color: "#FFFFFF" },
  reviewDate: { fontSize: 11, color: "#666" },
  reviewText: { fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 20 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: "#0d2e18",
    alignItems: "center",
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    width: 116,
    height: 116,
    borderRadius: 36,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "#34FF7A",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInner: {
    width: 90,
    height: 90,
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: { fontSize: 24, color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
  heroBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap", justifyContent: "center" },
  ratingPill: { backgroundColor: "rgba(52,255,122,0.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#34FF7A" },
  ratingText: { fontSize: 14, color: "#34FF7A" },
  proBadge: { backgroundColor: "#34FF7A", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  proBadgeText: { fontSize: 11, color: "#000000", letterSpacing: 1 },
  jobsText: { fontSize: 14, color: "rgba(255,255,255,0.6)" },
  location: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 4 },
  body: { paddingHorizontal: 20, paddingTop: 28 },
  sectionLabel: { fontSize: 11, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },
  aboutText: { fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 22, marginBottom: 28 },
  pricingCard: {
    backgroundColor: "#161616",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 4,
    overflow: "hidden",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pricingRowBorder: { borderBottomWidth: 1, borderBottomColor: "#222222" },
  pricingSize: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  pricingDesc: { fontSize: 12, color: "#BBBBBB" },
  pricingPrice: { fontSize: 20, color: "#34FF7A" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  photoTile: {
    width: "30.5%",
    aspectRatio: 1,
    backgroundColor: "#161616",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222222",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmoji: { fontSize: 34 },
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  contactBtn: {
    flex: 1,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  contactIcon: { fontSize: 18 },
  contactLabel: { fontSize: 15, color: "#34FF7A" },
  bookBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  bookBtnText: { fontSize: 17, color: "#000000" },

  availCard: {
    backgroundColor: "#1a2e1f",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(52,255,122,0.2)",
  },
  availDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  availDayChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#222222", borderWidth: 1, borderColor: "#333" },
  availDayChipOn: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  availDayText: { fontSize: 11, color: "#999" },
  availDayTextOn: { color: "#000" },
  availHours: { fontSize: 14, color: "rgba(255,255,255,0.75)" },
  svcCard: {
    backgroundColor: "#111", borderRadius: 16,
    borderWidth: 1, borderColor: "#222",
    padding: 14, marginBottom: 10,
  },
  svcCardName: { fontSize: 14, color: "#34FF7A", marginBottom: 10 },
  svcDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  svcDayChip: {
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 8, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#333",
  },
  svcDayChipOn: { backgroundColor: "#34FF7A22", borderColor: "#34FF7A55" },
  svcDayText: { fontSize: 11, color: "#555" },
  svcDayTextOn: { color: "#34FF7A" },
  svcPriceRow: { flexDirection: "row", gap: 8 },
  svcPriceCell: {
    flex: 1, backgroundColor: "#0F0F0F",
    borderRadius: 10, borderWidth: 1, borderColor: "#1E1E1E",
    padding: 10, alignItems: "center",
  },
  svcPriceCellLabel: { fontSize: 11, color: "#FFFFFF", marginBottom: 2 },
  svcPriceCellRange:  { fontSize: 9,  color: "#555", marginBottom: 4, textAlign: "center" },
  svcPriceCellPrice:  { fontSize: 15, color: "#34FF7A" },
  paymentsCard: {
    backgroundColor: "#111", borderRadius: 14,
    borderWidth: 1, borderColor: "#222",
    padding: 14,
  },
  paymentChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "#333",
  },
  paymentChipText: { fontSize: 13, color: "#CCCCCC" },
});

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
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    backgroundColor: "#0A0A0A",
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
    height: 82,
    width: 300,
    shadowColor: "#34FF7A",
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
  greetingRow: { marginBottom: 20 },
  greetingText: { fontSize: 22, color: "#FFFFFF", marginBottom: 4 },
  greetingZip: { fontSize: 13, color: "#CCCCCC" },
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
    backgroundColor: "#1A1A1A",
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
  sectionSubtitle: { fontSize: 12, color: "#999999", marginBottom: 10, marginTop: -4 },
  recRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  seeAllLink: { fontSize: 13, color: "#34FF7A" },
  appointmentCard: {
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#1A1A1A",
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
  svcGridPrice: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  svcGridUpdated: { fontSize: 9, color: "#BBBBBB", textAlign: "center", marginTop: 1 },
  feedHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  feedLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#34FF7A" },
  feedLiveText: { fontSize: 12, color: "#34FF7A" },
  feedSubtitle: { fontSize: 13, color: "#888", marginBottom: 16 },
  feedCard: {
    backgroundColor: "#1A1A1A", borderRadius: 20, borderWidth: 1, borderColor: "#222222",
    padding: 16, marginBottom: 12, gap: 0,
  },
  feedCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  feedAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  feedAvatarText: { fontSize: 15, color: "#fff" },
  feedCustomerName: { fontSize: 14, color: "#FFFFFF" },
  feedTimestamp: { fontSize: 11, color: "#888888", marginTop: 1 },
  feedServiceTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0d2e18", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1, borderColor: "#34FF7A33",
  },
  feedServiceTagText: { fontSize: 10, color: "#34FF7A" },
  feedReviewText: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 21, marginBottom: 10 },
  feedPhotoTile: {
    backgroundColor: "#111", borderRadius: 14, borderWidth: 1, borderColor: "#222",
    height: 110, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  feedCardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#222", paddingTop: 10, marginTop: 2,
  },
  proRow: { marginTop: 20, marginBottom: 24, marginHorizontal: -20 },
  proRowContent: { paddingHorizontal: 20, gap: 12 },
  proHCard: {
    backgroundColor: "#1A1A1A",
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
  proHMeta: { fontSize: 11, color: "#BBBBBB" },
  trustedBadge: {
    backgroundColor: "#0d2e18",
    borderWidth: 1,
    borderColor: "#34FF7A",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  trustedBadgeText: { fontSize: 10, color: "#34FF7A" },
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
    backgroundColor: "#1A1A1A",
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
    borderRadius: 18,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    overflow: "hidden",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarBtnImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarBtnInitial: {
    fontSize: 15,
    color: "#000",
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
  notifTogglePillOn: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  notifToggleText: { fontSize: 11, color: "#999999" },
  notifToggleTextOn: { color: "#34FF7A" },
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
  notifItemSub: { fontSize: 12, color: "#BBBBBB" },
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
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#34FF7A",
  },
  offlineDot: { backgroundColor: "#FF3B30" },
  onlinePillText: { color: "#FFFFFF", fontSize: 11 },
  offlinePillText: { color: "#FF3B30" },
  ctaBtnDisabled: { backgroundColor: "#2a2a2a", shadowOpacity: 0 },
  proHCardDisabled: { opacity: 0.4 },

  favBtn: { position: "absolute", top: 8, right: 8, zIndex: 5 },

  favRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  favRowIcon: {
    width: 44,
    height: 44,
    backgroundColor: "#0d2e18",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  favRowName: { fontSize: 14, color: "#fff", marginBottom: 2 },
  favRowMeta: { fontSize: 12, color: "#BBBBBB" },

  pendingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 8,
  },
  pendingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0d2e18",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 12, color: "#34FF7A" },
  pendingBudget: { fontSize: 16, color: "#FFFFFF" },
  pendingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pendingMetaText: { fontSize: 12, color: "#BBBBBB" },
  pendingDot: { color: "#555555", fontSize: 12 },
  pendingAcceptBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  pendingAcceptText: { color: "#000000", fontSize: 14 },
  pendingEmptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  pendingEmptyText: { fontSize: 14, color: "#BBBBBB" },
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
    backgroundColor: "#1A1A1A",
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
    backgroundColor: "#34FF7A",
    width: "100%",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#34FF7A",
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
