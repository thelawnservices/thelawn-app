import React, { useEffect, useMemo, useRef, useState } from "react";
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
  KeyboardAvoidingView,
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
import { useWallet, type WalletTransaction } from "@/contexts/wallet";
import { validateText } from "@/utils/moderation";
import { sendLocalPush } from "@/utils/pushNotifications";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";
import HelpSupportModal from "@/components/HelpSupportModal";
import FeedbackModal from "@/components/FeedbackModal";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

type FeedPost = {
  id: string; customerName: string; customerInitials: string; customerColor: string;
  landscaperName: string; service: string; stars: number; text: string;
  timestamp: string; hasPhoto: boolean;
  photoIcon: "leaf-outline" | "cut-outline" | "flower-outline" | "grid-outline" | "layers-outline" | "construct-outline";
  likes: number;
};
const HOME_FEED_POSTS: FeedPost[] = [];

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


function CompletedJobsModal({
  visible,
  onClose,
  transactions,
}: {
  visible: boolean;
  onClose: () => void;
  transactions: WalletTransaction[];
}) {
  const insets = useSafeAreaInsets();
  const credits = transactions.filter((t) => t.type === "credit" && t.status === "completed");
  const totalEarned = credits.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cjStyles.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[cjStyles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>

          <View style={cjStyles.header}>
            <View>
              <Text style={[cjStyles.title, { fontFamily: "Inter_700Bold" }]}>Jobs Completed</Text>
              <Text style={[cjStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>Your service earnings history</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={cjStyles.summaryBanner}>
            <View style={cjStyles.summaryItem}>
              <Text style={[cjStyles.summaryNum, { fontFamily: "Inter_700Bold" }]}>{credits.length}</Text>
              <Text style={[cjStyles.summaryLabel, { fontFamily: "Inter_400Regular" }]}>Jobs</Text>
            </View>
            <View style={cjStyles.summaryDivider} />
            <View style={cjStyles.summaryItem}>
              <Text style={[cjStyles.summaryNum, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>
                ${totalEarned.toFixed(0)}
              </Text>
              <Text style={[cjStyles.summaryLabel, { fontFamily: "Inter_400Regular" }]}>Total Earned</Text>
            </View>
          </View>

          {credits.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 }}>
              <Ionicons name="briefcase-outline" size={44} color="#333" />
              <Text style={[{ fontSize: 15, color: "#888", textAlign: "center", fontFamily: "Inter_500Medium" }]}>
                No completed jobs yet
              </Text>
              <Text style={[{ fontSize: 13, color: "#555", textAlign: "center", fontFamily: "Inter_400Regular" }]}>
                Earnings from completed jobs will appear here
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              {credits.map((tx, i) => (
                <View key={tx.id} style={[cjStyles.jobCard, i === credits.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={cjStyles.jobTopRow}>
                    <View style={[cjStyles.avatar, { backgroundColor: "#166D42" }]}>
                      <Ionicons name="leaf" size={16} color="#34FF7A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[cjStyles.customerName, { fontFamily: "Inter_600SemiBold" }]}>{tx.description}</Text>
                      <View style={cjStyles.metaRow}>
                        <Ionicons name="calendar-outline" size={11} color="#888" />
                        <Text style={[cjStyles.metaText, { fontFamily: "Inter_400Regular" }]}>{tx.date}</Text>
                      </View>
                    </View>
                    <Text style={[cjStyles.payout, { fontFamily: "Inter_700Bold" }]}>${tx.amount.toFixed(2)}</Text>
                  </View>
                  <View style={cjStyles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#34FF7A" />
                    <Text style={[cjStyles.completedBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Completed · Payment Released</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const cjStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "#222",
    maxHeight: "88%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 16,
  },
  title: { fontSize: 20, color: "#FFFFFF", marginBottom: 2 },
  subtitle: { fontSize: 13, color: "#777" },
  summaryBanner: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: "#1A1A1A", borderRadius: 16,
    borderWidth: 1, borderColor: "#262626",
    paddingVertical: 14,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontSize: 20, color: "#FFFFFF", marginBottom: 2 },
  summaryLabel: { fontSize: 10, color: "#777", letterSpacing: 0.4 },
  summaryDivider: { width: 1, height: 32, backgroundColor: "#2A2A2A" },
  jobCard: {
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#1E1E1E",
  },
  jobTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, color: "#fff" },
  customerName: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#888" },
  dot: { color: "#555", fontSize: 12 },
  payout: { fontSize: 18, color: "#34FF7A" },
  jobBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  serviceBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#0d2e18", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  serviceBadgeText: { fontSize: 11, color: "#34FF7A" },
  starsRow: { flexDirection: "row", gap: 2 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 8, marginTop: 2 },
  noteText: { fontSize: 11, color: "#666", flex: 1, lineHeight: 16 },
  completedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#0A1F12", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#1D4428",
  },
  completedBadgeText: { fontSize: 10, color: "#34FF7A", letterSpacing: 0.4 },
});


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
                Alerts & Announcements
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
                items.map((n) => {
                  const isAnnounce = n.type === "announcement";
                  return (
                    <View key={n.id} style={[styles.notifItem, isAnnounce && styles.notifItemAnnounce]}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: isAnnounce ? "rgba(255,170,0,0.12)" : "rgba(52,255,122,0.1)",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Ionicons name={n.icon as any} size={22} color={isAnnounce ? "#FFAA00" : "#34FF7A"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          {isAnnounce && (
                            <View style={styles.announcePill}>
                              <Text style={[styles.announcePillText, { fontFamily: "Inter_700Bold" }]}>ANNOUNCEMENT</Text>
                            </View>
                          )}
                          {n.timestamp && (
                            <Text style={[styles.notifTimestamp, { fontFamily: "Inter_400Regular" }]}>{n.timestamp}</Text>
                          )}
                        </View>
                        <Text style={[styles.notifItemTitle, { fontFamily: "Inter_500Medium" }, isAnnounce && { color: "#FFCC55" }]}>
                          {n.title}
                        </Text>
                        <Text style={[styles.notifItemSub, { fontFamily: "Inter_400Regular" }]}>
                          {n.sub}
                        </Text>
                      </View>
                    </View>
                  );
                })
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
          <TouchableOpacity style={styles.avatarRing} onPress={onProfilePress} activeOpacity={0.8}>
            <View style={styles.avatarInner}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarBtnImage} />
              ) : (
                <Text style={[styles.avatarBtnInitial, { fontFamily: "Inter_700Bold" }]}>
                  {userInitial}
                </Text>
              )}
            </View>
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
  onFeedback,
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
  onFeedback: () => void;
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
          <TouchableOpacity style={dropStyles.item} onPress={onFeedback} activeOpacity={0.7}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#34FF7A" />
            <Text style={[dropStyles.itemText, { fontFamily: "Inter_500Medium" }]}>App Feedback</Text>
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
  const { user, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newZip, setNewZip] = useState("");

  async function handleChangePassword() {
    if (!currentPassword.trim()) {
      Alert.alert("Missing field", "Please enter your current password.");
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert("Weak password", "New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user?.username, role, currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error", data.error ?? "Failed to update password. Please try again.");
      } else {
        Alert.alert("Password Updated", "Your password has been changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        onClose();
      }
    } catch {
      Alert.alert("Error", "Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setNewAddress("");
    setNewZip("");
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
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            placeholderTextColor="#777"
            secureTextEntry
          />
          <TextInput
            style={[settStyles.input, { fontFamily: "Inter_400Regular", marginTop: 10 }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password (min 6 characters)"
            placeholderTextColor="#777"
            secureTextEntry
          />

          <TouchableOpacity
            style={[settStyles.primaryBtn, saving && settStyles.primaryBtnLoading, { marginTop: 14 }]}
            onPress={saving ? undefined : handleChangePassword}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Update Password
              </Text>
            )}
          </TouchableOpacity>

          <View style={settStyles.divider} />

          <Text style={[settStyles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginTop: 4 }]}>Update Service Address</Text>
          <Text style={[settStyles.codeHint, { fontFamily: "Inter_400Regular", marginBottom: 14 }]}>
            Enter your new street address and ZIP code so landscapers can find you.
          </Text>
          <TextInput
            style={[settStyles.input, { fontFamily: "Inter_400Regular" }]}
            value={newAddress}
            onChangeText={setNewAddress}
            placeholder="Street address (e.g. 123 Palm Ave, Ellenton, FL)"
            placeholderTextColor="#777"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <TextInput
            style={[settStyles.input, { fontFamily: "Inter_400Regular", marginTop: 10 }]}
            value={newZip}
            onChangeText={setNewZip}
            placeholder="ZIP code (e.g. 34222)"
            placeholderTextColor="#777"
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity
            style={settStyles.primaryBtn}
            onPress={() => {
              if (!newAddress.trim()) {
                Alert.alert("Missing field", "Please enter your street address.");
                return;
              }
              if (!newZip.trim()) {
                Alert.alert("Missing field", "Please enter your ZIP code.");
                return;
              }
              if (newZip.trim().length < 5) {
                Alert.alert("Invalid ZIP", "Please enter a valid 5-digit ZIP code.");
                return;
              }
              Alert.alert(
                "Address Saved",
                `Your service address has been updated to:\n${newAddress.trim()}, ${newZip.trim()}`
              );
              setNewAddress("");
              setNewZip("");
              onClose();
            }}
            activeOpacity={0.85}
          >
            <Text style={[settStyles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Save Address
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
  { id: "stripe",   label: "Pay Now (Cards · Apple Pay · Google Pay)", icon: "" },
  { id: "inperson", label: "Pay In Person (Cash · Check · Other)", icon: "" },
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
const ALL_SERVICES = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Full Service", "Tree Removal"];

const ACCEPTED_PAYMENT_OPTIONS = [
  { value: "Pay Now (Online)", icon: "card" as const },
  { value: "In Person",        icon: "cash-outline" as const },
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
  "Mowing/Edging":            { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "8:00 AM",  endTime: "6:00 PM"  },
  "Weeding/Mulching":         { days: ["Tue", "Thu"],                       startTime: "9:00 AM",  endTime: "5:00 PM"  },
  "Sod Installation":         { days: ["Mon", "Wed", "Fri"],                startTime: "7:00 AM",  endTime: "5:00 PM"  },
  "Full Service":             { days: ["Mon", "Wed", "Fri"],                startTime: "8:00 AM",  endTime: "5:00 PM"  },
  "Tree Removal":             { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], startTime: "7:00 AM",  endTime: "4:00 PM"  },
};

type PricingTier = { label: string; range: string; price: string };
type ServicePricing = Record<string, PricingTier[]>;

const BASE_TIERS: PricingTier[] = [
  { label: "Small",  range: "Up to 2,000 sq ft",   price: "$45" },
  { label: "Medium", range: "2,000 – 5,000 sq ft",  price: "$65" },
  { label: "Large",  range: "5,000+ sq ft",          price: "$95" },
];

const TREE_TIERS: PricingTier[] = [
  { label: "Small",       range: "1 – 6 ft tall",   price: "$150" },
  { label: "Medium",      range: "Up to 10 ft",      price: "$280" },
  { label: "Large",       range: "Up to 20 ft",      price: "$450" },
  { label: "Extra Large", range: "Over 20 ft",        price: "$700" },
];

const TREE_SERVICES_LIST = ["Tree Removal"];
const SOD_SERVICES_LIST  = ["Sod Installation"];

const SOD_TIERS: PricingTier[] = [
  { label: "St. Augustine",   range: "Dense, shade-tolerant",            price: "$420" },
  { label: "Zoysia Grass",    range: "Low-maintenance, drought-resistant", price: "$480" },
  { label: "Bermuda Grass",   range: "Heat-resistant, durable",          price: "$390" },
  { label: "Bahia Grass",     range: "Low-input, sandy soils",           price: "$320" },
  { label: "Centipede Grass", range: "Low-maintenance, acidic soil",     price: "$360" },
  { label: "Xeriscaping",     range: "Drought-resistant design",         price: "$520" },
];

function makeDefaultPricing(): ServicePricing {
  const out: ServicePricing = {};
  for (const svc of ALL_SERVICES) {
    if (TREE_SERVICES_LIST.includes(svc)) out[svc] = TREE_TIERS.map((t) => ({ ...t }));
    else if (SOD_SERVICES_LIST.includes(svc)) out[svc] = SOD_TIERS.map((t) => ({ ...t }));
    else out[svc] = BASE_TIERS.map((t) => ({ ...t }));
  }
  return out;
}

// ── Month date grid helper (4 weeks from today) ───────────────────────────────
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON_NAMES_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MON_NAMES_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type CalCell = { key: string; dayLabel: string; dateNum: number; monthLabel: string } | null;
function buildMonthGrid(year: number, month: number): CalCell[][] {
  const firstDay = new Date(year, month, 1);
  const startDOW = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: CalCell[] = [];
  for (let i = 0; i < startDOW; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = `${MON_NAMES_SHORT[month]} ${d}, ${year}`;
    cells.push({ key, dayLabel: DAY_NAMES_SHORT[date.getDay()], dateNum: d, monthLabel: MON_NAMES_SHORT[month] });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────

function ServicesEditModal({ visible, onClose, isFirstSetup = false }: { visible: boolean; onClose: () => void; isFirstSetup?: boolean }) {
  const { myServices, saveMyServices, bookedSlots } = useLandscaperProfile();

  const [offered, setOffered]   = useState<string[]>(() => [...myServices.offered]);
  const [avail, setAvail]       = useState<AvailState>(() => JSON.parse(JSON.stringify(myServices.avail)));
  const [pricing, setPricing]   = useState<ServicePricing>(() => JSON.parse(JSON.stringify(myServices.pricing)));
  const [acceptedPayments, setAcceptedPayments] = useState<string[]>(() => [...myServices.acceptedPayments]);
  const [blockedDates, setBlockedDates] = useState<string[]>(() => [...(myServices.blockedDates ?? [])]);
  const [saved, setSaved] = useState(false);
  const [timePicker, setTimePicker] = useState<{ service: string; field: "startTime" | "endTime" } | null>(null);
  const [dayDetailPicker, setDayDetailPicker] = useState<{
    service: string; dateKey: string; dateDisplay: string; isWorkDay: boolean;
  } | null>(null);
  const [dayTimeOverrides, setDayTimeOverrides] = useState<{
    [svcDateKey: string]: { start: string; end: string };
  }>({});
  const [ddTimePicker, setDdTimePicker] = useState<"start" | "end" | null>(null);

  const calBaseDate = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [svcCalMonth, setSvcCalMonth] = useState<Record<string, { year: number; month: number }>>(() => {
    const now = new Date();
    const init: Record<string, { year: number; month: number }> = {};
    for (const svc of ALL_SERVICES) init[svc] = { year: now.getFullYear(), month: now.getMonth() };
    return init;
  });

  function prevCalMonth(service: string) {
    setSvcCalMonth((prev) => {
      const { year, month } = prev[service] ?? { year: calBaseDate.getFullYear(), month: calBaseDate.getMonth() };
      const minAbs = calBaseDate.getFullYear() * 12 + calBaseDate.getMonth();
      if (year * 12 + month <= minAbs) return prev;
      const newMonth = month === 0 ? 11 : month - 1;
      const newYear  = month === 0 ? year - 1 : year;
      return { ...prev, [service]: { year: newYear, month: newMonth } };
    });
    Haptics.selectionAsync();
  }

  function nextCalMonth(service: string) {
    setSvcCalMonth((prev) => {
      const { year, month } = prev[service] ?? { year: calBaseDate.getFullYear(), month: calBaseDate.getMonth() };
      const maxAbs = calBaseDate.getFullYear() * 12 + calBaseDate.getMonth() + 12;
      if (year * 12 + month >= maxAbs) return prev;
      const newMonth = month === 11 ? 0 : month + 1;
      const newYear  = month === 11 ? year + 1 : year;
      return { ...prev, [service]: { year: newYear, month: newMonth } };
    });
    Haptics.selectionAsync();
  }

  // Sync from context whenever modal opens
  useEffect(() => {
    if (visible) {
      setOffered([...myServices.offered]);
      setAvail(JSON.parse(JSON.stringify(myServices.avail)));
      setPricing(JSON.parse(JSON.stringify(myServices.pricing)));
      setAcceptedPayments([...myServices.acceptedPayments]);
      setBlockedDates([...(myServices.blockedDates ?? [])]);
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

  function toggleBlockedDate(key: string) {
    Haptics.selectionAsync();
    setBlockedDates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleSave() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveMyServices({ offered, avail, pricing, acceptedPayments, blockedDates });
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

            {isFirstSetup && (
              <View style={svcStyles.setupBanner}>
                <Ionicons name="star-outline" size={18} color="#34FF7A" />
                <View style={{ flex: 1 }}>
                  <Text style={[svcStyles.setupBannerTitle, { fontFamily: "Inter_700Bold" }]}>
                    Welcome to TheLawnServices!
                  </Text>
                  <Text style={[svcStyles.setupBannerBody, { fontFamily: "Inter_400Regular" }]}>
                    Set up your services, availability, and pricing so customers can find and book you. This step is required before you can receive bookings.
                  </Text>
                </View>
              </View>
            )}

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

            <View style={svcStyles.divider} />

            {/* ── Per-Service: Availability + Pricing ───────── */}
            <Text style={[svcStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Availability & Pricing</Text>
            <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular" }]}>
              Configure working days, hours, and rates per yard/tree size for each active service.
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

                {/* Per-service monthly calendar with month navigation */}
                <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium", marginTop: 10 }]}>MONTHLY SCHEDULE — TAP A DAY TO SET DATES</Text>
                {(() => {
                  const calData = svcCalMonth[service] ?? { year: calBaseDate.getFullYear(), month: calBaseDate.getMonth() };
                  const { year: calYear, month: calMonth } = calData;
                  const serviceCalRows = buildMonthGrid(calYear, calMonth);
                  const minAbs = calBaseDate.getFullYear() * 12 + calBaseDate.getMonth();
                  const maxAbs = minAbs + 12;
                  const curAbs = calYear * 12 + calMonth;
                  const isPrevDisabled = curAbs <= minAbs;
                  const isNextDisabled = curAbs >= maxAbs;
                  return (
                    <>
                      <View style={svcStyles.calNavRow}>
                        <TouchableOpacity onPress={() => prevCalMonth(service)} disabled={isPrevDisabled} activeOpacity={0.7} style={svcStyles.calNavBtn}>
                          <Ionicons name="chevron-back" size={20} color={isPrevDisabled ? "#2A2A2A" : "#34FF7A"} />
                        </TouchableOpacity>
                        <Text style={[svcStyles.calMonthNavLabel, { fontFamily: "Inter_700Bold" }]}>
                          {MON_NAMES_FULL[calMonth]} {calYear}
                        </Text>
                        <TouchableOpacity onPress={() => nextCalMonth(service)} disabled={isNextDisabled} activeOpacity={0.7} style={svcStyles.calNavBtn}>
                          <Ionicons name="chevron-forward" size={20} color={isNextDisabled ? "#2A2A2A" : "#34FF7A"} />
                        </TouchableOpacity>
                      </View>
                      <View style={svcStyles.calHeader}>
                        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                          <Text key={d} style={[svcStyles.calHeaderCell, { fontFamily: "Inter_600SemiBold" }]}>{d}</Text>
                        ))}
                      </View>
                      {serviceCalRows.map((week, wi) => (
                        <View key={wi} style={svcStyles.calWeekRow}>
                          {week.map((day, di) => {
                            if (!day) {
                              return <View key={`e${wi}-${di}`} style={[svcStyles.calCell, svcStyles.calCellOff, { opacity: 0 }]} />;
                            }
                            const svcDays = avail[service]?.days ?? [];
                            const isWorkDay = svcDays.includes(day.dayLabel);
                            const isBlocked = blockedDates.includes(day.key);
                            const overrideKey = `${service}||${day.key}`;
                            const hasOverride = !!dayTimeOverrides[overrideKey];
                            const cellStyle = isBlocked ? svcStyles.calCellBlocked : isWorkDay ? svcStyles.calCellAvail : svcStyles.calCellOff;
                            const textColor = isBlocked ? "#EF4444" : isWorkDay ? "#000" : "#555";
                            const isInteractive = isWorkDay || isBlocked;
                            return (
                              <TouchableOpacity
                                key={day.key}
                                style={[svcStyles.calCell, cellStyle]}
                                onPress={() => {
                                  if (!isInteractive) return;
                                  Haptics.selectionAsync();
                                  setDayDetailPicker({ service, dateKey: day.key, dateDisplay: day.key, isWorkDay });
                                }}
                                activeOpacity={isInteractive ? 0.72 : 1}
                              >
                                <Text style={[svcStyles.calCellDay, { fontFamily: "Inter_400Regular", color: isBlocked ? "#EF4444" : isWorkDay ? "rgba(0,0,0,0.55)" : "#555" }]}>
                                  {day.dayLabel.slice(0, 2)}
                                </Text>
                                <Text style={[svcStyles.calCellNum, { fontFamily: "Inter_700Bold", color: textColor }]}>
                                  {day.dateNum}
                                </Text>
                                {isBlocked && <Ionicons name="close" size={8} color="#EF4444" />}
                                {hasOverride && !isBlocked && <View style={svcStyles.calDot} />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </>
                  );
                })()}
                <View style={[svcStyles.calLegend, { marginBottom: 10 }]}>
                  <View style={svcStyles.calLegendItem}>
                    <View style={[svcStyles.calLegendDot, { backgroundColor: "#34FF7A" }]} />
                    <Text style={[svcStyles.calLegendText, { fontFamily: "Inter_400Regular" }]}>Open — tap to manage</Text>
                  </View>
                  <View style={svcStyles.calLegendItem}>
                    <View style={[svcStyles.calLegendDot, { backgroundColor: "#3A1A1A", borderWidth: 1, borderColor: "#5A2020" }]} />
                    <Text style={[svcStyles.calLegendText, { fontFamily: "Inter_400Regular" }]}>Blocked</Text>
                  </View>
                  <View style={svcStyles.calLegendItem}>
                    <View style={[svcStyles.calLegendDot, { backgroundColor: "#141414", borderWidth: 1, borderColor: "#1e1e1e" }]} />
                    <Text style={[svcStyles.calLegendText, { fontFamily: "Inter_400Regular" }]}>Not scheduled</Text>
                  </View>
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
                <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium" }]}>
                  {TREE_SERVICES_LIST.includes(service) ? "BASE RATE BY TREE SIZE" : SOD_SERVICES_LIST.includes(service) ? "BASE RATE BY SOD TYPE" : "BASE RATE BY YARD SIZE"}
                </Text>
                <View style={[
                  { gap: 8, marginBottom: 6 },
                  (TREE_SERVICES_LIST.includes(service) || SOD_SERVICES_LIST.includes(service))
                    ? { flexDirection: "row", flexWrap: "wrap" }
                    : { flexDirection: "row" }
                ]}>
                  {(pricing[service] ?? (TREE_SERVICES_LIST.includes(service) ? TREE_TIERS : SOD_SERVICES_LIST.includes(service) ? SOD_TIERS : BASE_TIERS)).map((tier, ti) => (
                    <View key={tier.label} style={[
                      svcStyles.tierCell,
                      (TREE_SERVICES_LIST.includes(service) || SOD_SERVICES_LIST.includes(service)) && { width: "47%", flex: 0 }
                    ]}>
                      <Text style={[svcStyles.tierCellLabel, { fontFamily: "Inter_600SemiBold" }]}>{tier.label}</Text>
                      <Text style={[svcStyles.tierCellRange, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                        {tier.range}
                      </Text>
                      <TextInput
                        style={[svcStyles.tierCellInput, { fontFamily: "Inter_700Bold" }]}
                        value={tier.price}
                        onChangeText={(v) => updatePrice(service, ti, v)}
                        keyboardType="default"
                        maxLength={8}
                        selectTextOnFocus
                        placeholderTextColor="#555"
                        textAlign="center"
                      />
                    </View>
                  ))}
                </View>

              </View>
            ))}

            {offered.length === 0 && (
              <Text style={[svcStyles.sectionHint, { fontFamily: "Inter_400Regular", marginTop: 4 }]}>
                Enable at least one service above to configure its availability and pricing.
              </Text>
            )}

            <View style={[svcStyles.divider, { marginTop: 20 }]} />

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

      {/* ── Day Detail Sheet ──────────────────────────────── */}
      {dayDetailPicker && (() => {
        const { service: ddSvc, dateKey, dateDisplay, isWorkDay } = dayDetailPicker;
        const isBlocked = blockedDates.includes(dateKey);
        const overrideKey = `${ddSvc}||${dateKey}`;
        const override = dayTimeOverrides[overrideKey];
        const defaultStart = avail[ddSvc]?.startTime ?? "8:00 AM";
        const defaultEnd   = avail[ddSvc]?.endTime   ?? "5:00 PM";
        const displayStart = override?.start ?? defaultStart;
        const displayEnd   = override?.end   ?? defaultEnd;
        return (
          <Modal visible transparent animationType="slide" onRequestClose={() => setDayDetailPicker(null)}>
            <Pressable style={svcStyles.ddOverlay} onPress={() => setDayDetailPicker(null)}>
              <Pressable style={svcStyles.ddSheet} onPress={(e) => e.stopPropagation()}>

                {/* Header */}
                <View style={svcStyles.ddHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[svcStyles.ddDateText, { fontFamily: "Inter_700Bold" }]}>{dateDisplay}</Text>
                    <Text style={[svcStyles.ddServiceText, { fontFamily: "Inter_400Regular" }]}>{ddSvc}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDayDetailPicker(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Status badge */}
                <View style={[svcStyles.ddStatusBadge, isBlocked ? svcStyles.ddStatusBadgeBlocked : svcStyles.ddStatusBadgeOpen]}>
                  <Ionicons name={isBlocked ? "close-circle" : "checkmark-circle"} size={14} color={isBlocked ? "#EF4444" : "#34FF7A"} />
                  <Text style={[svcStyles.ddStatusText, { fontFamily: "Inter_600SemiBold", color: isBlocked ? "#EF4444" : "#34FF7A" }]}>
                    {isBlocked ? "Blocked — Unavailable" : "Open for Bookings"}
                  </Text>
                </View>

                {/* Custom hours — only if not blocked */}
                {!isBlocked && (
                  <>
                    <Text style={[svcStyles.subLabel, { fontFamily: "Inter_500Medium", marginTop: 18, marginBottom: 10 }]}>
                      {override ? "CUSTOM HOURS FOR THIS DATE" : "DEFAULT HOURS — TAP TO CUSTOMIZE"}
                    </Text>
                    <View style={svcStyles.ddHoursRow}>
                      {/* Start time */}
                      <TouchableOpacity
                        style={svcStyles.ddTimeBtn}
                        onPress={() => setDdTimePicker("start")}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="sunny-outline" size={13} color="#34FF7A" />
                          <Text style={[svcStyles.ddTimeBtnLabel, { fontFamily: "Inter_400Regular" }]}>Start</Text>
                        </View>
                        <Text style={[svcStyles.ddTimeBtnValue, { fontFamily: "Inter_700Bold" }]}>{displayStart}</Text>
                      </TouchableOpacity>

                      <Ionicons name="arrow-forward" size={14} color="#444" />

                      {/* End time */}
                      <TouchableOpacity
                        style={svcStyles.ddTimeBtn}
                        onPress={() => setDdTimePicker("end")}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="moon-outline" size={13} color="#34FF7A" />
                          <Text style={[svcStyles.ddTimeBtnLabel, { fontFamily: "Inter_400Regular" }]}>End</Text>
                        </View>
                        <Text style={[svcStyles.ddTimeBtnValue, { fontFamily: "Inter_700Bold" }]}>{displayEnd}</Text>
                      </TouchableOpacity>
                    </View>

                    {override && (
                      <TouchableOpacity
                        style={svcStyles.ddClearOverride}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDayTimeOverrides((prev) => {
                            const next = { ...prev };
                            delete next[overrideKey];
                            return next;
                          });
                        }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="refresh-outline" size={12} color="#777" />
                        <Text style={[svcStyles.ddClearOverrideText, { fontFamily: "Inter_400Regular" }]}>Reset to default hours</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <View style={[svcStyles.divider, { marginTop: 20, marginBottom: 16 }]} />

                {/* Block / Restore */}
                {isBlocked ? (
                  <TouchableOpacity
                    style={svcStyles.ddRestoreBtn}
                    onPress={() => { Haptics.selectionAsync(); toggleBlockedDate(dateKey); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle-outline" size={17} color="#000" />
                    <Text style={[svcStyles.ddRestoreBtnText, { fontFamily: "Inter_700Bold" }]}>Restore Availability</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={svcStyles.ddBlockBtn}
                    onPress={() => { Haptics.selectionAsync(); toggleBlockedDate(dateKey); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                    <Text style={[svcStyles.ddBlockBtnText, { fontFamily: "Inter_700Bold" }]}>Block This Date</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={svcStyles.ddDoneBtn}
                  onPress={() => setDayDetailPicker(null)}
                  activeOpacity={0.85}
                >
                  <Text style={[svcStyles.ddDoneBtnText, { fontFamily: "Inter_700Bold" }]}>Done</Text>
                </TouchableOpacity>

              </Pressable>
            </Pressable>

            {/* Nested time picker for day-level override */}
            {ddTimePicker && (
              <Modal visible transparent animationType="fade" onRequestClose={() => setDdTimePicker(null)}>
                <TouchableOpacity style={svcStyles.tpOverlay} activeOpacity={1} onPress={() => setDdTimePicker(null)}>
                  <View style={svcStyles.tpSheet}>
                    <Text style={[svcStyles.tpTitle, { fontFamily: "Inter_700Bold" }]}>
                      {ddTimePicker === "start" ? "Custom Start Time" : "Custom End Time"}
                    </Text>
                    <Text style={[svcStyles.tpSubtitle, { fontFamily: "Inter_400Regular" }]}>{dateDisplay}</Text>
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                      {TIME_SLOTS.map((slot) => {
                        const cur = ddTimePicker === "start" ? displayStart : displayEnd;
                        const selected = slot === cur;
                        return (
                          <TouchableOpacity
                            key={slot}
                            style={[svcStyles.tpSlot, selected && svcStyles.tpSlotActive]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setDayTimeOverrides((prev) => ({
                                ...prev,
                                [overrideKey]: {
                                  start: ddTimePicker === "start" ? slot : (prev[overrideKey]?.start ?? defaultStart),
                                  end:   ddTimePicker === "end"   ? slot : (prev[overrideKey]?.end   ?? defaultEnd),
                                },
                              }));
                              setDdTimePicker(null);
                            }}
                            activeOpacity={0.75}
                          >
                            <Text style={[svcStyles.tpSlotText, { fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular" }, selected && svcStyles.tpSlotTextActive]}>
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
      })()}
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
  setupBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#0A1F12", borderWidth: 1, borderColor: "#1E5C30",
    borderRadius: 16, padding: 16, marginBottom: 24,
  },
  setupBannerTitle: { fontSize: 14, color: "#34FF7A", marginBottom: 4 },
  setupBannerBody: { fontSize: 12, color: "#999", lineHeight: 18 },
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
  tierCell: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: "center",
  },
  tierCellLabel: { fontSize: 12, color: "#FFFFFF", marginBottom: 3, textAlign: "center" },
  tierCellRange: { fontSize: 9, color: "#666", textAlign: "center", marginBottom: 8, lineHeight: 13 },
  tierCellInput: {
    fontSize: 16, color: "#34FF7A",
    backgroundColor: "#0A0A0A",
    borderRadius: 8,
    borderWidth: 1, borderColor: "#34FF7A44",
    paddingHorizontal: 6, paddingVertical: 6,
    width: "100%", textAlign: "center",
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

  calHeader: { flexDirection: "row", marginBottom: 4 },
  calHeaderCell: { flex: 1, textAlign: "center", fontSize: 10, color: "#666", letterSpacing: 0.4 },
  calMonthLabel: { fontSize: 13, color: "#34FF7A", marginTop: 14, marginBottom: 6 },
  calNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 4 },
  calNavBtn: { padding: 6, borderRadius: 20 },
  calMonthNavLabel: { fontSize: 15, color: "#FFFFFF" },
  calWeekRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  calCell: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 10, paddingVertical: 6, minHeight: 52,
    borderWidth: 1, borderColor: "transparent",
  },
  calCellAvail: { backgroundColor: "#34FF7A" },
  calCellBlocked: { backgroundColor: "#3A1A1A", borderColor: "#5A2020" },
  calCellOff: { backgroundColor: "#141414", borderColor: "#1e1e1e" },
  calCellDay: { fontSize: 9, marginBottom: 2 },
  calCellNum: { fontSize: 14 },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#1A4428", marginTop: 2 },
  calLegend: { flexDirection: "row", gap: 16, marginTop: 10, marginBottom: 4, flexWrap: "wrap" },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  calLegendDot: { width: 12, height: 12, borderRadius: 6 },
  calLegendText: { fontSize: 11, color: "#888" },
  clearBlockedBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginTop: 10,
    backgroundColor: "#2A0E0E", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#5A2020",
  },
  clearBlockedText: { fontSize: 12, color: "#EF4444" },

  ddOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  ddSheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "#222",
    padding: 24, paddingBottom: 36,
  },
  ddHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  ddDateText: { fontSize: 20, color: "#FFFFFF", marginBottom: 4 },
  ddServiceText: { fontSize: 13, color: "#777" },
  ddStatusBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1,
  },
  ddStatusBadgeOpen:    { backgroundColor: "#0A1F12", borderColor: "#1D4428" },
  ddStatusBadgeBlocked: { backgroundColor: "#1F0A0A", borderColor: "#5A2020" },
  ddStatusText: { fontSize: 13 },
  ddHoursRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  ddTimeBtn: {
    flex: 1, backgroundColor: "#1A1A1A", borderRadius: 14,
    borderWidth: 1, borderColor: "#2A2A2A",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  ddTimeBtnLabel: { fontSize: 11, color: "#888" },
  ddTimeBtnValue: { fontSize: 16, color: "#FFFFFF" },
  ddClearOverride: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginTop: 10,
  },
  ddClearOverrideText: { fontSize: 11, color: "#666" },
  ddBlockBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 14, marginBottom: 10,
    backgroundColor: "#1F0A0A", borderWidth: 1, borderColor: "#5A2020",
  },
  ddBlockBtnText: { fontSize: 15, color: "#EF4444" },
  ddRestoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 16, paddingVertical: 14, marginBottom: 10,
    backgroundColor: "#34FF7A",
  },
  ddRestoreBtnText: { fontSize: 15, color: "#000" },
  ddDoneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 16, paddingVertical: 14,
    backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#2A2A2A",
  },
  ddDoneBtnText: { fontSize: 15, color: "#FFFFFF" },
});


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { logout, role, avatarUri, userName, user, needsServiceSetup, setNeedsServiceSetup } = useAuth();
  const userInitial = userName ? userName.charAt(0).toUpperCase() : (role === "landscaper" ? "P" : "C");
  const { acceptJob, acceptedJobs } = useJobs();
  const { balance, transactions, refreshWallet } = useWallet();

  useEffect(() => {
    if (role === "landscaper" && userName) {
      refreshWallet(userName);
    }
  }, [role, userName]);

  const landscaperQuickStats = useMemo(() => [
    { label: "Jobs Completed", value: String(transactions.filter(t => t.type === "credit" && t.status === "completed").length), icon: "checkmark-circle" as const, iconColor: "#34C759" },
    { label: "Balance",        value: `$${balance.toFixed(0)}`,           icon: "cash" as const, iconColor: "#34FF7A" },
  ], [transactions, balance]);
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

  const [completedJobsVisible, setCompletedJobsVisible] = useState(false);
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
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [servicesEditVisible, setServicesEditVisible] = useState(false);
  const [servicesIsFirstSetup, setServicesIsFirstSetup] = useState(false);
  const [paymentHistoryVisible, setPaymentHistoryVisible] = useState(false);

  useEffect(() => {
    if (needsServiceSetup && role === "landscaper") {
      const t = setTimeout(() => {
        setServicesIsFirstSetup(true);
        setServicesEditVisible(true);
        setNeedsServiceSetup(false);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [needsServiceSetup, role]);
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

  const { notifications: notifItems, getNotificationsForRole, broadcastAnnouncement } = useNotifications();
  const [missedCount, setMissedCount] = useState(0);
  const [homeAnnounceVisible, setHomeAnnounceVisible] = useState(false);
  const [homeAnnounceTitle, setHomeAnnounceTitle] = useState("");
  const [homeAnnounceMsg, setHomeAnnounceMsg] = useState("");
  const [homeAnnounceState, setHomeAnnounceState] = useState<"idle" | "sending" | "sent">("idle");
  const HOME_ANNOUNCE_FOLLOWER_COUNT = 0;
  const openHomeAnnounce = () => {
    setHomeAnnounceTitle(""); setHomeAnnounceMsg(""); setHomeAnnounceState("idle");
    setHomeAnnounceVisible(true);
  };
  const sendHomeAnnouncement = () => {
    const titleV = validateText(homeAnnounceTitle.trim());
    const msgV = validateText(homeAnnounceMsg.trim());
    if (!homeAnnounceTitle.trim() || !homeAnnounceMsg.trim()) {
      Alert.alert("Required", "Please fill in both the title and message."); return;
    }
    if (!titleV.ok || !msgV.ok) {
      Alert.alert("Content Blocked", titleV.reason ?? msgV.reason ?? "Message contains disallowed content."); return;
    }
    setHomeAnnounceState("sending");
    setTimeout(() => {
      broadcastAnnouncement(userName || "Your Landscaper", homeAnnounceTitle.trim(), homeAnnounceMsg.trim());
      sendLocalPush(
        `📢 ${userName || "Your Landscaper"}: ${homeAnnounceTitle.trim()}`,
        homeAnnounceMsg.trim()
      );
      setHomeAnnounceState("sent");
      setTimeout(() => setHomeAnnounceVisible(false), 2200);
    }, 1800);
  };
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
        onFeedback={() => { setDropdownVisible(false); setFeedbackVisible(true); }}
        isLandscaper={role === "landscaper"}
        onSignOut={() => { setDropdownVisible(false); logout(); }}
      />
      <ServicesEditModal
        visible={servicesEditVisible}
        isFirstSetup={servicesIsFirstSetup}
        onClose={() => { setServicesEditVisible(false); setServicesIsFirstSetup(false); }}
      />
      <PaymentHistoryModal
        visible={paymentHistoryVisible}
        onClose={() => setPaymentHistoryVisible(false)}
        role={role === "landscaper" ? "landscaper" : "customer"}
      />

      {/* Send Announcement Modal */}
      <Modal visible={homeAnnounceVisible} transparent animationType="slide" onRequestClose={() => setHomeAnnounceVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
        <Pressable style={styles.announceOverlay} onPress={() => { if (homeAnnounceState === "idle") setHomeAnnounceVisible(false); }}>
          <Pressable style={styles.announceSheet} onPress={(e) => e.stopPropagation()}>
            {homeAnnounceState === "sent" ? (
              <View style={styles.announceSentBox}>
                <Ionicons name="checkmark-circle" size={52} color="#34FF7A" />
                <Text style={[styles.announceSentTitle, { fontFamily: "Inter_700Bold" }]}>Announcement Sent!</Text>
                <Text style={[styles.announceSentSub, { fontFamily: "Inter_400Regular" }]}>
                  {HOME_ANNOUNCE_FOLLOWER_COUNT > 0 ? `Your message was delivered to ${HOME_ANNOUNCE_FOLLOWER_COUNT} followers.` : "Your announcement has been sent."}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.announceHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Ionicons name="megaphone-outline" size={22} color="#FFAA00" />
                    <Text style={[styles.announceSheetTitle, { fontFamily: "Inter_700Bold" }]}>Send Announcement</Text>
                  </View>
                  <TouchableOpacity onPress={() => setHomeAnnounceVisible(false)} activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <View style={styles.announceFollowerPill}>
                  <Ionicons name="heart" size={13} color="#f87171" />
                  <Text style={[styles.announceFollowerText, { fontFamily: "Inter_500Medium" }]}>
                    {HOME_ANNOUNCE_FOLLOWER_COUNT > 0 ? `${HOME_ANNOUNCE_FOLLOWER_COUNT} customers will be notified` : "Customers who follow you will be notified"}
                  </Text>
                </View>
                <Text style={[styles.announceFieldLabel, { fontFamily: "Inter_500Medium" }]}>Title</Text>
                <TextInput
                  style={[styles.announceTitleInput, !homeAnnounceTitle && homeAnnounceState !== "idle" && styles.announceInputErr]}
                  placeholder="e.g. Summer Special — 20% Off"
                  placeholderTextColor="#555"
                  value={homeAnnounceTitle}
                  onChangeText={(t) => setHomeAnnounceTitle(t.slice(0, 60))}
                  maxLength={60}
                />
                <Text style={[styles.announceCharCount, { fontFamily: "Inter_400Regular" }]}>{homeAnnounceTitle.length}/60</Text>
                <Text style={[styles.announceFieldLabel, { fontFamily: "Inter_500Medium", marginTop: 12 }]}>Message</Text>
                <TextInput
                  style={[styles.announceMsgInput]}
                  placeholder="Share a promotion, schedule change, or update…"
                  placeholderTextColor="#555"
                  value={homeAnnounceMsg}
                  onChangeText={(t) => setHomeAnnounceMsg(t.slice(0, 300))}
                  maxLength={300}
                  multiline
                />
                <Text style={[styles.announceCharCount, { fontFamily: "Inter_400Regular" }]}>{homeAnnounceMsg.length}/300</Text>
                <TouchableOpacity
                  style={[styles.announceSendBtn, homeAnnounceState === "sending" && styles.announceSendBtnSending]}
                  onPress={sendHomeAnnouncement}
                  activeOpacity={0.85}
                  disabled={homeAnnounceState === "sending"}
                >
                  {homeAnnounceState === "sending" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <ActivityIndicator size="small" color="#000" />
                      <Text style={[styles.announceSendBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sending…</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="megaphone-outline" size={18} color="#000" />
                      <Text style={[styles.announceSendBtnText, { fontFamily: "Inter_700Bold" }]}>
                        {HOME_ANNOUNCE_FOLLOWER_COUNT > 0 ? `Send to ${HOME_ANNOUNCE_FOLLOWER_COUNT} Followers` : "Send Announcement"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.announceDisclaimer, { fontFamily: "Inter_400Regular" }]}>
                  Only customers who favorited your profile will receive this.
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
      <HelpSupportModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        role={role === "landscaper" ? "landscaper" : "customer"}
      />
      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        userName={userName || ""}
        role={role ?? "customer"}
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
        items={getNotificationsForRole(role === "landscaper" ? "landscaper" : "customer")}
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
              const name = userName || (role === "landscaper" ? "Pro" : "there");
              return `${tod}, ${name}`;
            })()}
          </Text>
          <Text style={[styles.greetingZip, { fontFamily: "Inter_400Regular" }]}>
            {role === "landscaper"
              ? `Your dashboard${user?.zipCode ? ` · ZIP ${user.zipCode}` : ""}`
              : `Landscapers near you${user?.zipCode ? ` · ZIP ${user.zipCode}` : ""}`}
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
            ) : TRUSTED_PROS.length === 0 ? (
              <View style={{ paddingHorizontal: 24, paddingVertical: 32, alignItems: "center", gap: 10 }}>
                <Ionicons name="leaf-outline" size={36} color="#333" />
                <Text style={{ color: "#BBBBBB", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                  No landscapers in your area yet.{"\n"}Check back soon!
                </Text>
              </View>
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>
                Popular Services
              </Text>
              <TouchableOpacity onPress={() => router.navigate("/(tabs)/search")} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, color: "#34FF7A", fontFamily: "Inter_500Medium" }}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4, gap: 10 }}
              style={{ marginBottom: 28 }}
            >
              {[
                { name: "Mowing/Edging",          icon: "cut-outline" as const,    est: "1–2 hrs",   hot: true  },
                { name: "Weeding/Mulching",        icon: "flower-outline" as const, est: "2–4 hrs",   hot: true  },
                { name: "Sod Installation",        icon: "grid-outline" as const,   est: "4–8 hrs",   hot: false },
                { name: "Tree Removal",            icon: "cut-outline" as const,    est: "4–8 hrs",   hot: false },
              ].map((svc) => (
                <View key={svc.name} style={styles.svcGridCardWrap}>
                  {svc.hot ? (
                    <View style={styles.svcHotBadge}>
                      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: "#FF6B35" }}>🔥 HOT</Text>
                    </View>
                  ) : (
                    <View style={styles.svcHotSpacer} />
                  )}
                  <TouchableOpacity
                    style={styles.svcGridCard}
                    onPress={() => router.navigate("/(tabs)/search")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.svcGridIconWrap}>
                      <Ionicons name={svc.icon} size={28} color="#34FF7A" />
                    </View>
                    <Text style={[styles.svcGridName, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                      {svc.name}
                    </Text>
                    <Text style={[styles.svcGridUpdated, { fontFamily: "Inter_400Regular" }]}>
                      Est. {svc.est}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Quick Stats — landscapers only, shown first */}
        {role === "landscaper" && (
          <View style={styles.statsRow}>
            {landscaperQuickStats.map((s, i) => (
              <AnimatedStatCard
                key={s.label}
                stat={s}
                delay={i * 120}
                onPress={
                  s.label === "Jobs Completed"
                    ? () => { Haptics.selectionAsync(); setCompletedJobsVisible(true); }
                    : s.label === "Balance"
                    ? () => router.navigate("/(tabs)/wallet")
                    : undefined
                }
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
            {acceptedJobs.length === 0 ? (
              <TouchableOpacity
                style={[styles.appointmentCard, { alignItems: "center", paddingVertical: 24, gap: 6 }]}
                activeOpacity={0.8}
                onPress={() => router.navigate("/(tabs)/appointments")}
              >
                <Ionicons name="calendar-outline" size={28} color="#444" />
                <Text style={[{ fontSize: 14, color: "#666", fontFamily: "Inter_400Regular" }]}>
                  No upcoming appointments
                </Text>
                <Text style={[{ fontSize: 12, color: "#34FF7A", fontFamily: "Inter_500Medium" }]}>
                  Accept requests to fill your schedule →
                </Text>
              </TouchableOpacity>
            ) : (() => {
              const nextJob = acceptedJobs[0];
              return (
                <View style={styles.appointmentCard}>
                  <TouchableOpacity
                    style={styles.apptMainRow}
                    onPress={() => router.navigate("/(tabs)/appointments")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.apptIcon}>
                      <Ionicons name="leaf" size={22} color="#34FF7A" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.apptTitle, { fontFamily: "Inter_600SemiBold" }]}>
                        {nextJob.service}
                      </Text>
                      <Text style={[styles.apptSub, { fontFamily: "Inter_400Regular" }]}>
                        {nextJob.date} • {nextJob.time} • {nextJob.customer}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#34FF7A" />
                  </TouchableOpacity>

                  <View style={styles.apptDivider} />

                  <View style={styles.apptContactRow}>
                    <TouchableOpacity
                      style={styles.apptCallBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (nextJob.phone) {
                          Linking.openURL(`tel:${nextJob.phone}`).catch(() =>
                            Alert.alert("Cannot Call", "Unable to open dialer on this device.")
                          );
                        } else {
                          Alert.alert("No Phone Number", "This customer has not provided a phone number.");
                        }
                      }}
                    >
                      <Ionicons name="call-outline" size={17} color="#000" />
                      <Text style={[styles.apptCallBtnText, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.apptTextBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (nextJob.phone) {
                          Linking.openURL(`sms:${nextJob.phone}`).catch(() =>
                            Alert.alert("Cannot Text", "Unable to open messages on this device.")
                          );
                        } else {
                          Alert.alert("No Phone Number", "This customer has not provided a phone number.");
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={17} color="#34FF7A" />
                      <Text style={[styles.apptTextBtnText, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </>
        )}


        {/* Send Announcement — landscapers only */}
        {role === "landscaper" && (
          <TouchableOpacity
            style={styles.announceCard}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); openHomeAnnounce(); }}
          >
            <View style={styles.announceIconBox}>
              <Ionicons name="megaphone-outline" size={22} color="#FFAA00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.announceCardTitle, { fontFamily: "Inter_600SemiBold" }]}>Send Announcement</Text>
              <Text style={[styles.announceCardSub, { fontFamily: "Inter_400Regular" }]}>
                {HOME_ANNOUNCE_FOLLOWER_COUNT > 0 ? `Notify your ${HOME_ANNOUNCE_FOLLOWER_COUNT} followers` : "Share updates with your customers"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFAA00" />
          </TouchableOpacity>
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

        {HOME_FEED_POSTS.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
            <Ionicons name="leaf-outline" size={36} color="#333" />
            <Text style={{ color: "#BBBBBB", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }}>
              No community reviews yet.{"\n"}Be the first to book a landscaper!
            </Text>
          </View>
        )}
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

      {/* Completed Jobs Modal — landscapers only */}
      <CompletedJobsModal
        visible={completedJobsVisible}
        onClose={() => setCompletedJobsVisible(false)}
        transactions={transactions}
      />

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
        onBook={(services) => {
          setSelectedPro(null);
          handleBooking(() => router.push({ pathname: "/pay", params: { proServices: services.join(",") } }));
        }}
      />
    </View>
  );
}

type TrustedPro = { name: string; rating: number; jobs: number; meta: string; icon: "leaf" | "grid" | "flower" | "star" | "cut" | "options" | "earth"; services: string[] };

function LandscaperProfileViewModal({
  pro,
  onClose,
  onBook,
}: {
  pro: TrustedPro | null;
  onClose: () => void;
  onBook: (services: string[]) => void;
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
                onPress={() => Alert.alert("Contact " + pro.name, "Direct calling is not available yet. Book this pro and use the in-app chat to coordinate.")}
              >
                <Ionicons name="call-outline" size={22} color="#34FF7A" />
                <Text style={[fsStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={fsStyles.contactBtn}
                activeOpacity={0.8}
                onPress={() => Alert.alert("Contact " + pro.name, "Direct messaging is not available yet. Book this pro and use the in-app chat to coordinate.")}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#34FF7A" />
                <Text style={[fsStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Book Now */}
            <TouchableOpacity style={fsStyles.bookBtn} activeOpacity={0.85} onPress={() => onBook(pro.services)}>
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
              {(["leaf-outline","cut-outline","flower-outline","leaf","construct-outline","leaf-outline"] as const).map((icon, i) => (
                <View key={i} style={fsStyles.photoTile}>
                  <Ionicons name={icon} size={32} color="#34FF7A" />
                </View>
              ))}
            </View>

            {/* Customer Reviews */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>CUSTOMER REVIEWS</Text>
            <View style={{ alignItems: "center", paddingVertical: 28, gap: 8 }}>
              <Ionicons name="star-outline" size={32} color="#333" />
              <Text style={{ color: "#BBBBBB", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                No reviews yet
              </Text>
            </View>

            {/* Services & Availability */}
            <Text style={[fsStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>
              SERVICES & AVAILABILITY
            </Text>
            {pro.services.map((svc) => {
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

const TRUSTED_PROS: TrustedPro[] = [];

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
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
  },
  apptMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
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
  apptDivider: { height: 1, backgroundColor: "#222222", marginHorizontal: 0 },
  apptContactRow: {
    flexDirection: "row",
    gap: 0,
  },
  apptCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#34FF7A",
    paddingVertical: 13,
    borderBottomLeftRadius: 20,
  },
  apptCallBtnText: { fontSize: 14, color: "#000" },
  apptTextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#141414",
    paddingVertical: 13,
    borderBottomRightRadius: 20,
    borderLeftWidth: 1,
    borderLeftColor: "#222222",
  },
  apptTextBtnText: { fontSize: 14, color: "#34FF7A" },
  servicesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  svcGridCardWrap: {
    alignItems: "center",
  },
  svcGridCard: {
    width: 108,
    backgroundColor: "#161616",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#262626",
    overflow: "hidden",
  },
  svcHotBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A1200",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FF6B35",
    marginBottom: 6,
  },
  svcHotSpacer: {
    height: 28,
    marginBottom: 6,
  },
  svcGridIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#34FF7A20",
  },
  svcGridName: { fontSize: 12, color: "#FFFFFF", textAlign: "center", lineHeight: 16, minHeight: 32 },
  svcGridPrice: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  svcGridUpdated: { fontSize: 10, color: "#777", textAlign: "center", marginTop: 0 },
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
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarInner: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#1A4A2A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarBtnImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
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
  notifItemAnnounce: { borderColor: "#FFAA0030", backgroundColor: "#1A1400" },
  announcePill: {
    backgroundColor: "#FFAA0020", borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  announcePillText: { fontSize: 9, color: "#FFAA00", letterSpacing: 0.5 },
  notifTimestamp: { fontSize: 11, color: "#555" },
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

  announceCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1A1200", borderRadius: 20,
    borderWidth: 1, borderColor: "#FFAA0030",
    padding: 16, marginBottom: 20,
  },
  announceIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#2A1A00", borderWidth: 1, borderColor: "#FFAA0040",
    alignItems: "center", justifyContent: "center",
  },
  announceCardTitle: { fontSize: 15, color: "#FFCC55" },
  announceCardSub: { fontSize: 12, color: "#BBBBBB", marginTop: 2 },

  announceOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  announceSheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "#1E1E1E", padding: 24, paddingBottom: 40,
  },
  announceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  announceSheetTitle: { fontSize: 18, color: "#FFFFFF" },
  announceFollowerPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1F0A0A", borderWidth: 1, borderColor: "#f8717140",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 20,
  },
  announceFollowerText: { fontSize: 13, color: "#f87171" },
  announceFieldLabel: { fontSize: 13, color: "#CCCCCC", marginBottom: 6 },
  announceTitleInput: {
    backgroundColor: "#1A1A1A", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A2A",
    color: "#FFFFFF", fontSize: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4,
  },
  announceMsgInput: {
    backgroundColor: "#1A1A1A", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A2A",
    color: "#FFFFFF", fontSize: 14, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 110, marginBottom: 4,
  },
  announceInputErr: { borderColor: "#f87171" },
  announceCharCount: { fontSize: 11, color: "#555", textAlign: "right", marginBottom: 4 },
  announceSendBtn: {
    backgroundColor: "#FFAA00", borderRadius: 22, paddingVertical: 15,
    alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 12,
  },
  announceSendBtnSending: { backgroundColor: "#FFAA0099" },
  announceSendBtnText: { fontSize: 15, color: "#000" },
  announceDisclaimer: { fontSize: 11, color: "#555", textAlign: "center", lineHeight: 16 },
  announceSentBox: { alignItems: "center", paddingVertical: 28, gap: 12 },
  announceSentTitle: { fontSize: 20, color: "#34FF7A" },
  announceSentSub: { fontSize: 14, color: "#BBBBBB", textAlign: "center", lineHeight: 20 },
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
