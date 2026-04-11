import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Pressable,
  Switch,
  Share,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { useLandscaperProfile } from "@/contexts/landscaperProfile";
import TermsModal from "@/components/TermsModal";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";
import HelpSupportModal from "@/components/HelpSupportModal";
import { validateText, simulatePhotoReview, reviewImageWithAI } from "@/utils/moderation";
import { sendLocalPush } from "@/utils/pushNotifications";
import { useNotifications } from "@/contexts/notifications";

const PROFILES_API = process.env.EXPO_PUBLIC_API_URL ?? "";

async function uploadProfileImage(
  uri: string,
  type: "avatar" | "banner",
  username?: string,
  role?: string
) {
  if (!username || !role) return;
  try {
    const formData = new FormData();
    formData.append("image", { uri, type: "image/jpeg", name: `${type}.jpg` } as any);
    formData.append("username", username);
    formData.append("role", role);
    await fetch(`${PROFILES_API}/api/profiles/${type}`, { method: "PUT", body: formData });
  } catch {}
}

const PAYMENT_METHODS = [
  { label: "Stripe (Cards · Apple Pay · Google Pay)", value: "Stripe",    ionIcon: "card" as const,                  shortLabel: "Stripe" },
  { label: "Pay In Person (Cash · Check · Other)",    value: "In Person", ionIcon: "cash-outline" as const, shortLabel: "In Person" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role, logout } = useAuth();
  const router = useRouter();
  const isLandscaper = role === "landscaper";
  const [helpVisible, setHelpVisible] = useState(false);
  const [custMenuVisible, setCustMenuVisible] = useState(false);
  const [custSettingsVisible, setCustSettingsVisible] = useState(false);
  const [customerAddress, setCustomerAddress] = useState<{ street: string; state: string; zip: string } | null>(null);
  const [custTermsDoc, setCustTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [custPrivacyVisible, setCustPrivacyVisible] = useState(false);
  const [custPrivVisible, setCustPrivVisible] = useState(true);
  const [custPrivPrices, setCustPrivPrices] = useState(false);
  const [custPrivReviews, setCustPrivReviews] = useState(true);
  const [custEditVisible, setCustEditVisible] = useState(false);

  if (isLandscaper) {
    return (
      <LandscaperProfile
        topPadding={topPadding}
        logout={logout}
        helpVisible={helpVisible}
        setHelpVisible={setHelpVisible}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Profile</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            style={styles.menuDotBtn}
            onPress={() => { Haptics.selectionAsync(); setCustMenuVisible(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer dropdown menu */}
      <Modal visible={custMenuVisible} transparent animationType="fade" onRequestClose={() => setCustMenuVisible(false)}>
        <Pressable style={menuStyles.overlay} onPress={() => setCustMenuVisible(false)}>
          <View style={[menuStyles.dropdown, { top: topPadding + 56, right: 16 }]}>
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setHelpVisible(true); }}>
              <Ionicons name="help-circle-outline" size={18} color="#34FF7A" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>Help & Support</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); router.push("/dispute"); }}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#f59e0b" }]}>File a Dispute</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setCustEditVisible(true); }}>
              <Ionicons name="person-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setCustSettingsVisible(true); }}>
              <Ionicons name="settings-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Settings</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setCustPrivacyVisible(true); }}>
              <Ionicons name="lock-closed-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Privacy Settings</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setCustTermsDoc("terms"); }}>
              <Ionicons name="document-text-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Terms of Service</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); setCustTermsDoc("privacy"); }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); logout(); }}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#ef4444" }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Customer Terms Modal */}
      {custTermsDoc && <TermsModal visible={true} docType={custTermsDoc} onClose={() => setCustTermsDoc(null)} />}

      {/* Customer Privacy Settings Modal */}
      <Modal visible={custPrivacyVisible} transparent animationType="slide" onRequestClose={() => setCustPrivacyVisible(false)}>
        <Pressable style={privModalStyles.overlay} onPress={() => setCustPrivacyVisible(false)}>
          <Pressable style={privModalStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={privModalStyles.header}>
              <Text style={[privModalStyles.title, { fontFamily: "Inter_700Bold" }]}>Privacy Settings</Text>
              <TouchableOpacity onPress={() => setCustPrivacyVisible(false)} style={privModalStyles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {([
              { label: "Profile visible to landscapers", value: custPrivVisible, onChange: setCustPrivVisible },
              { label: "Show booking history publicly", value: custPrivPrices, onChange: setCustPrivPrices },
              { label: "Allow landscapers to see reviews I wrote", value: custPrivReviews, onChange: setCustPrivReviews },
            ] as const).map((row, idx) => (
              <View key={idx} style={privModalStyles.row}>
                <Text style={[privModalStyles.rowLabel, { fontFamily: "Inter_400Regular" }]}>{row.label}</Text>
                <Switch
                  value={row.value}
                  onValueChange={row.onChange}
                  trackColor={{ false: "#333", true: "#34FF7A" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
            <TouchableOpacity
              style={privModalStyles.saveBtn}
              onPress={() => { setCustPrivacyVisible(false); Alert.alert("Privacy Settings Saved"); }}
              activeOpacity={0.85}
            >
              <Text style={[privModalStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Settings</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <CustomerProfile
          logout={logout}
          customerAddress={customerAddress}
          onAddressChange={setCustomerAddress}
          editVisible={custEditVisible}
          onOpenEdit={() => setCustEditVisible(true)}
          onCloseEdit={() => setCustEditVisible(false)}
        />
      </ScrollView>

      <CustomerSettingsModal
        visible={custSettingsVisible}
        onClose={() => setCustSettingsVisible(false)}
        savedAddress={customerAddress}
        onSave={(addr) => { setCustomerAddress(addr); setCustSettingsVisible(false); }}
      />

      <HelpSupportModal visible={helpVisible} onClose={() => setHelpVisible(false)} role="customer" />
    </View>
  );
}

// ── Landscaper Profile – Cut App Style ────────────────────────────────────────

type LandscaperTab = "info" | "reviews";
type ReviewReply = { text: string; author: string; date: string };
type ReviewItem = {
  text: string; author: string; date: string; stars: number;
  avatarInitials: string; avatarColor: string;
  replies: ReviewReply[];
};

function LandscaperProfile({
  topPadding,
  logout,
  helpVisible,
  setHelpVisible,
}: {
  topPadding: number;
  logout: () => void;
  helpVisible: boolean;
  setHelpVisible: (v: boolean) => void;
}) {
  const { setAvatarUri, banUser, user, userName } = useAuth();
  const { myServices, bookedSlots, saveMyServices } = useLandscaperProfile();
  const { broadcastAnnouncement } = useNotifications();
  const lsRouter = useRouter();
  const [activeTab, setActiveTab] = useState<LandscaperTab>("info");
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [heroBackground, setHeroBackground] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [pendingPhotoUris, setPendingPhotoUris] = useState<Set<string>>(new Set());
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [privVisible, setPrivVisible] = useState(true);
  const [privPrices, setPrivPrices] = useState(false);
  const [privReviews, setPrivReviews] = useState(true);
  const [lsMenuVisible, setLsMenuVisible] = useState(false);
  const [replyingToIdx, setReplyingToIdx] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // Announcements
  const [announceVisible, setAnnounceVisible] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceMsg, setAnnounceMsg] = useState("");
  const [announceExpiryDate, setAnnounceExpiryDate] = useState("");
  const [announceExpiryTime, setAnnounceExpiryTime] = useState("");
  const [announceState, setAnnounceState] = useState<"compose" | "sending" | "sent">("compose");
  const [announceTitleErr, setAnnounceTitleErr] = useState<string | null>(null);
  const [announceMsgErr, setAnnounceMsgErr] = useState<string | null>(null);
  const [announceExpiryErr, setAnnounceExpiryErr] = useState<string | null>(null);
  const ANNOUNCE_FOLLOWER_COUNT = 0;

  function openAnnounce() {
    setAnnounceTitle("");
    setAnnounceMsg("");
    setAnnounceExpiryDate("");
    setAnnounceExpiryTime("");
    setAnnounceState("compose");
    setAnnounceTitleErr(null);
    setAnnounceMsgErr(null);
    setAnnounceExpiryErr(null);
    setAnnounceVisible(true);
  }

  function sendAnnouncement() {
    const titleV = validateText(announceTitle.trim());
    const msgV = validateText(announceMsg.trim());
    let hasErr = false;
    if (!announceTitle.trim()) { setAnnounceTitleErr("Please enter a title."); hasErr = true; }
    else if (!titleV.ok) { setAnnounceTitleErr("Please remove inappropriate language."); hasErr = true; }
    else { setAnnounceTitleErr(null); }
    if (!announceMsg.trim()) { setAnnounceMsgErr("Please enter a message."); hasErr = true; }
    else if (!msgV.ok) { setAnnounceMsgErr("Please remove inappropriate language."); hasErr = true; }
    else { setAnnounceMsgErr(null); }
    if (!announceExpiryDate.trim() || !announceExpiryTime.trim()) {
      setAnnounceExpiryErr("Please set the promotion end date and time.");
      hasErr = true;
    } else { setAnnounceExpiryErr(null); }
    if (hasErr) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    const expiresAt = `${announceExpiryDate.trim()} at ${announceExpiryTime.trim()}`;
    setAnnounceState("sending");
    setTimeout(() => {
      broadcastAnnouncement(profileName, announceTitle.trim(), announceMsg.trim(), expiresAt);
      sendLocalPush(
        `📢 ${profileName}: ${announceTitle.trim()}`,
        announceMsg.trim()
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAnnounceState("sent");
      setTimeout(() => setAnnounceVisible(false), 2800);
    }, 1800);
  }

  // Editable profile fields
  const [editVisible, setEditVisible] = useState(false);
  const [profileName, setProfileName] = useState(user?.businessName || userName || "");
  const [profileBio, setProfileBio] = useState("Professional landscaping services with over 10 years of experience. We specialize in mowing/edging, weeding/mulching, sod installation, and artificial turf for residential properties.");
  const [profileCity, setProfileCity] = useState(user?.city || "");
  const [profileState, setProfileState] = useState(user?.state || "");
  const [profileZip, setProfileZip] = useState(user?.zipCode || "");
  // Draft fields used inside the edit modal
  const [draftName, setDraftName] = useState(profileName);
  const [draftBio, setDraftBio] = useState(profileBio);
  const [draftCity, setDraftCity] = useState(profileCity);
  const [draftState, setDraftState] = useState(profileState);
  const [draftZip, setDraftZip] = useState(profileZip);

  function openEdit() {
    setDraftName(profileName);
    setDraftBio(profileBio);
    setDraftCity(profileCity);
    setDraftState(profileState);
    setDraftZip(profileZip);
    setEditVisible(true);
  }

  function saveEdit() {
    setProfileName(draftName.trim() || profileName);
    setProfileBio(draftBio.trim() || profileBio);
    setProfileCity(draftCity.trim() || profileCity);
    setProfileState(draftState.trim() || profileState);
    setProfileZip(draftZip.trim() || profileZip);
    setEditVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Profile Updated");
  }

  // Derive available days across all offered services from myServices context
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const allAvailDays = useMemo(() => {
    const result: Record<string, boolean> = { Mon:false,Tue:false,Wed:false,Thu:false,Fri:false,Sat:false,Sun:false };
    for (const svc of myServices.offered) {
      for (const day of (myServices.avail[svc]?.days ?? [])) result[day] = true;
    }
    return result;
  }, [myServices]);

  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);

  const monthDates = useMemo(() => {
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      result.push({
        label: DAY_NAMES[d.getDay()],
        dateNum: String(d.getDate()),
        month: MON_NAMES[d.getMonth()],
        year: d.getFullYear(),
      });
    }
    return result;
  }, []);


  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  async function pickAvatar() {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarImage(uri);
      setAvatarUri(uri);
      uploadProfileImage(uri, "avatar", user?.username, user?.role);
      reviewImageWithAI(uri).then((review) => {
        if (!review.approved) {
          Alert.alert(
            "Account Suspended",
            "Your profile photo violated our community guidelines. Your account has been suspended.",
            [{ text: "OK", onPress: banUser }]
          );
        }
      });
    }
  }

  async function pickHeroBackground() {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setHeroBackground(uri);
      uploadProfileImage(uri, "banner", user?.username, user?.role);
      reviewImageWithAI(uri).then((review) => {
        if (!review.approved) {
          Alert.alert(
            "Account Suspended",
            "Your banner image violated our community guidelines. Your account has been suspended.",
            [{ text: "OK", onPress: banUser }]
          );
        }
      });
    }
  }

  async function pickServicePhotos() {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setServicePhotos((prev) => [...prev, ...newUris]);
      setPendingPhotoUris((prev) => new Set([...prev, ...newUris]));
      newUris.forEach((uri) => {
        simulatePhotoReview({ uri, id: uri }).then((managed) => {
          setPendingPhotoUris((prev) => {
            const next = new Set(prev);
            next.delete(uri);
            return next;
          });
          if (managed.status === "rejected") {
            setServicePhotos((prev) => prev.filter((p) => p !== uri));
            Alert.alert(
              "Account Suspended",
              "A photo you uploaded violated our community guidelines. Your account has been suspended.",
              [{ text: "OK", onPress: banUser }]
            );
          }
        });
      });
    }
  }

  return (
    <View style={cutStyles.container}>

      {/* ── Hero — matches customer-facing full-screen profile ── */}
      <View style={[cutStyles.hero, { paddingTop: topPadding + 16 }]}>
        {heroBackground ? (
          <Image source={{ uri: heroBackground }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        <View style={cutStyles.heroOverlay} />

        {/* Menu button — top right */}
        <View style={[{ position: "absolute", top: topPadding + 14, right: 14, zIndex: 10 }]}>
          <TouchableOpacity
            style={cutStyles.menuDotBtnHero}
            onPress={() => { Haptics.selectionAsync(); setLsMenuVisible(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Landscaper dropdown menu */}
        <Modal visible={lsMenuVisible} transparent animationType="fade" onRequestClose={() => setLsMenuVisible(false)}>
          <Pressable style={menuStyles.overlay} onPress={() => setLsMenuVisible(false)}>
            <View style={[menuStyles.dropdown, { top: topPadding + 62, right: 16 }]}>
              <TouchableOpacity
                style={menuStyles.item}
                activeOpacity={0.8}
                onPress={() => {
                  setLsMenuVisible(false);
                  const nowPaused = !myServices.paused;
                  saveMyServices({ ...myServices, paused: nowPaused });
                  Haptics.notificationAsync(
                    nowPaused
                      ? Haptics.NotificationFeedbackType.Warning
                      : Haptics.NotificationFeedbackType.Success
                  );
                  Alert.alert(
                    nowPaused ? "Services Paused" : "Services Resumed",
                    nowPaused
                      ? "Customers can no longer book new appointments with you until you resume."
                      : "Your services are now active and customers can book you again."
                  );
                }}
              >
                <Ionicons
                  name={myServices.paused ? "play-circle-outline" : "pause-circle-outline"}
                  size={18}
                  color={myServices.paused ? "#34FF7A" : "#f59e0b"}
                />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: myServices.paused ? "#34FF7A" : "#f59e0b" }]}>
                  {myServices.paused ? "Resume Services" : "Pause All Services"}
                </Text>
              </TouchableOpacity>
              <View style={menuStyles.divider} />
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); setHelpVisible(true); }}>
                <Ionicons name="help-circle-outline" size={18} color="#34FF7A" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>Help & Support</Text>
              </TouchableOpacity>
              <View style={menuStyles.divider} />
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); setPrivacyVisible(true); }}>
                <Ionicons name="lock-closed-outline" size={18} color="#CCCCCC" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Privacy Settings</Text>
              </TouchableOpacity>
              <View style={menuStyles.divider} />
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); setTermsDoc("terms"); }}>
                <Ionicons name="document-text-outline" size={18} color="#CCCCCC" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Terms of Service</Text>
              </TouchableOpacity>
              <View style={menuStyles.divider} />
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); setTermsDoc("privacy"); }}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#CCCCCC" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Privacy Policy</Text>
              </TouchableOpacity>
              <View style={menuStyles.divider} />
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); logout(); }}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#ef4444" }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* ── Announcement Compose Modal ─────────────────────── */}
        <Modal visible={announceVisible} transparent animationType="slide" onRequestClose={() => { if (announceState !== "sending") setAnnounceVisible(false); }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={announceStyles.overlay}
          >
            <ScrollView
              style={announceStyles.sheet}
              contentContainerStyle={announceStyles.sheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >

              {/* Header */}
              <View style={announceStyles.header}>
                <View style={announceStyles.headerLeft}>
                  <Ionicons name="megaphone-outline" size={20} color="#FFAA00" />
                  <Text style={[announceStyles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Send Announcement</Text>
                </View>
                {announceState !== "sending" && announceState !== "sent" && (
                  <TouchableOpacity onPress={() => setAnnounceVisible(false)} activeOpacity={0.7}>
                    <Ionicons name="close" size={22} color="#CCCCCC" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Followers pill */}
              <View style={announceStyles.followersPill}>
                <Ionicons name="heart" size={13} color="#f87171" />
                <Text style={[announceStyles.followersText, { fontFamily: "Inter_500Medium" }]}>
                  {ANNOUNCE_FOLLOWER_COUNT > 0 ? `${ANNOUNCE_FOLLOWER_COUNT} customers will be notified` : "Customers who follow you will be notified"}
                </Text>
              </View>

              {announceState === "sent" ? (
                <View style={announceStyles.sentBox}>
                  <Ionicons name="checkmark-circle" size={48} color="#34FF7A" />
                  <Text style={[announceStyles.sentTitle, { fontFamily: "Inter_700Bold" }]}>Announcement Sent!</Text>
                  <Text style={[announceStyles.sentSub, { fontFamily: "Inter_400Regular" }]}>
                    {ANNOUNCE_FOLLOWER_COUNT > 0 ? `${ANNOUNCE_FOLLOWER_COUNT} customers who favorited you have been notified.` : "Your announcement has been sent."}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Title field */}
                  <Text style={[announceStyles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>Title *</Text>
                  <TextInput
                    style={[announceStyles.titleInput, announceTitleErr && announceStyles.inputErr, { fontFamily: "Inter_400Regular" }]}
                    placeholder="e.g. Spring Special — 20% Off Mowing"
                    placeholderTextColor="#555"
                    value={announceTitle}
                    onChangeText={(t) => { setAnnounceTitle(t.slice(0, 60)); if (announceTitleErr) setAnnounceTitleErr(null); }}
                    maxLength={60}
                    editable={announceState === "compose"}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    {announceTitleErr
                      ? <Text style={[announceStyles.errText, { fontFamily: "Inter_400Regular" }]}>{announceTitleErr}</Text>
                      : <Text />}
                    <Text style={[announceStyles.charCount, { fontFamily: "Inter_400Regular" }]}>{announceTitle.length}/60</Text>
                  </View>

                  {/* Message field */}
                  <Text style={[announceStyles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>Message *</Text>
                  <TextInput
                    style={[announceStyles.msgInput, announceMsgErr && announceStyles.inputErr, { fontFamily: "Inter_400Regular" }]}
                    placeholder="Write your message to customers who follow you…"
                    placeholderTextColor="#555"
                    value={announceMsg}
                    onChangeText={(t) => { setAnnounceMsg(t.slice(0, 300)); if (announceMsgErr) setAnnounceMsgErr(null); }}
                    maxLength={300}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    editable={announceState === "compose"}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
                    {announceMsgErr
                      ? <Text style={[announceStyles.errText, { fontFamily: "Inter_400Regular" }]}>{announceMsgErr}</Text>
                      : <Text />}
                    <Text style={[announceStyles.charCount, { fontFamily: "Inter_400Regular", color: announceMsg.length > 270 ? "#FFAA00" : "#555" }]}>
                      {announceMsg.length}/300
                    </Text>
                  </View>

                  {/* Promotion expiry */}
                  <View style={announceStyles.expiryHeader}>
                    <Ionicons name="time-outline" size={15} color="#FFAA00" />
                    <Text style={[announceStyles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginBottom: 0, color: "#FFAA00" }]}>
                      Promotion Ends *
                    </Text>
                  </View>
                  <Text style={[announceStyles.expiryHint, { fontFamily: "Inter_400Regular" }]}>
                    Set the date and time your promotion expires.
                  </Text>
                  <View style={announceStyles.expiryRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={[announceStyles.expirySubLabel, { fontFamily: "Inter_400Regular" }]}>Date</Text>
                      <TextInput
                        style={[announceStyles.expiryInput, announceExpiryErr && announceStyles.inputErr, { fontFamily: "Inter_400Regular" }]}
                        placeholder="e.g. Apr 20, 2026"
                        placeholderTextColor="#555"
                        value={announceExpiryDate}
                        onChangeText={(t) => { setAnnounceExpiryDate(t); if (announceExpiryErr) setAnnounceExpiryErr(null); }}
                        editable={announceState === "compose"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[announceStyles.expirySubLabel, { fontFamily: "Inter_400Regular" }]}>Time</Text>
                      <TextInput
                        style={[announceStyles.expiryInput, announceExpiryErr && announceStyles.inputErr, { fontFamily: "Inter_400Regular" }]}
                        placeholder="11:59 PM"
                        placeholderTextColor="#555"
                        value={announceExpiryTime}
                        onChangeText={(t) => { setAnnounceExpiryTime(t); if (announceExpiryErr) setAnnounceExpiryErr(null); }}
                        editable={announceState === "compose"}
                      />
                    </View>
                  </View>
                  {announceExpiryErr && (
                    <Text style={[announceStyles.errText, { fontFamily: "Inter_400Regular", marginBottom: 8 }]}>
                      {announceExpiryErr}
                    </Text>
                  )}

                  {/* Send button */}
                  <TouchableOpacity
                    style={[announceStyles.sendBtn, announceState === "sending" && announceStyles.sendBtnSending]}
                    onPress={sendAnnouncement}
                    activeOpacity={0.85}
                    disabled={announceState === "sending"}
                  >
                    {announceState === "sending" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ActivityIndicator size="small" color="#000" />
                        <Text style={[announceStyles.sendBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sending…</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="megaphone-outline" size={18} color="#000" />
                        <Text style={[announceStyles.sendBtnText, { fontFamily: "Inter_700Bold" }]}>
                          {ANNOUNCE_FOLLOWER_COUNT > 0 ? `Send to ${ANNOUNCE_FOLLOWER_COUNT} Followers` : "Send Announcement"}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <Text style={[announceStyles.disclaimer, { fontFamily: "Inter_400Regular" }]}>
                    Only customers who have favorited your profile will receive this notification.
                  </Text>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Banner — top left, below status bar */}
        <TouchableOpacity style={[cutStyles.editBannerBtn, { top: topPadding + 14 }]} onPress={pickHeroBackground} activeOpacity={0.8}>
          <Ionicons name="camera-outline" size={14} color="#34FF7A" />
          <Text style={[cutStyles.editBannerText, { fontFamily: "Inter_500Medium" }]}>Banner</Text>
        </TouchableOpacity>

        {/* Centered avatar with tap-to-edit camera overlay */}
        <TouchableOpacity style={cutStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
          <View style={cutStyles.avatarInner}>
            {avatarImage ? (
              <Image source={{ uri: avatarImage }} style={cutStyles.avatarImage} />
            ) : (
              <Ionicons name="leaf" size={52} color="#000" />
            )}
          </View>
          {/* Camera edit badge */}
          <View style={cutStyles.avatarEditBadge}>
            <Ionicons name="camera" size={13} color="#000" />
            <Text style={[cutStyles.avatarEditText, { fontFamily: "Inter_700Bold" }]}>EDIT</Text>
          </View>
        </TouchableOpacity>

        {/* Business name + location — all centered */}
        <Text style={[cutStyles.heroName, { fontFamily: "Inter_700Bold" }]}>{profileName}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Ionicons name="location-outline" size={13} color="#CCCCCC" />
          <Text style={[cutStyles.heroLocation, { fontFamily: "Inter_400Regular" }]}>
            {profileCity}, {profileState} {profileZip}
          </Text>
        </View>

        {/* Edit Profile button */}
        <TouchableOpacity style={cutStyles.editProfileBtn} onPress={openEdit} activeOpacity={0.8}>
          <Ionicons name="pencil-outline" size={14} color="#000" />
          <Text style={[cutStyles.editProfileBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ─────────────────────────────────── */}
      <View style={cutStyles.tabBar}>
        {(["info", "reviews"] as LandscaperTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[cutStyles.tabItem, activeTab === tab && cutStyles.tabItemActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
            activeOpacity={0.7}
          >
            <Text style={[cutStyles.tabText, { fontFamily: "Inter_600SemiBold" }, activeTab === tab && cutStyles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Tab Content ─────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={cutStyles.tabContent}>

        {/* ── INFO TAB ── */}
        {activeTab === "info" && (
          <>
            {/* Quick actions — landscaper viewing own profile: Share only */}
            <View style={cutStyles.actionsRow}>
              <TouchableOpacity
                style={[cutStyles.actionChip, cutStyles.actionChipShare]}
                onPress={() => {
                  const profileUrl = `https://thelawn.app/landscaper/${user?.username ?? ""}`;
                  Share.share({
                    title: `Book ${profileName} on TheLawn`,
                    message: `Check out ${profileName} on TheLawn — book me directly for landscaping services near you!\n\n👉 ${profileUrl}\n\nDownload the app: https://thelawn.app`,
                    url: profileUrl,
                  }).catch(() => {});
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="share-social-outline" size={20} color="#34FF7A" />
                <Text style={[cutStyles.actionChipLabel, { fontFamily: "Inter_600SemiBold", color: "#34FF7A", fontSize: 13, letterSpacing: 0.8 }]}>SHARE MY PROFILE</Text>
              </TouchableOpacity>
            </View>

            {/* About */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>ABOUT</Text>
            <View style={cutStyles.card}>
              <Text style={[cutStyles.aboutText, { fontFamily: "Inter_400Regular" }]}>
                {profileBio}
              </Text>
            </View>

            {/* Location */}
            <View style={[cutStyles.card, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
              <Ionicons name="location-outline" size={18} color="#CCCCCC" />
              <Text style={[cutStyles.addrLine, { fontFamily: "Inter_500Medium", color: "#fff" }]}>
                {profileCity}, {profileState} {profileZip}
              </Text>
            </View>

            {/* Photos of our work */}
            <View style={cutStyles.photosSectionHeader}>
              <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold", marginBottom: 0 }]}>PHOTOS OF OUR WORK</Text>
              <TouchableOpacity onPress={pickServicePhotos} activeOpacity={0.75}>
                <Text style={[cutStyles.addPhotosLink, { fontFamily: "Inter_600SemiBold" }]}>+ Add Photos</Text>
              </TouchableOpacity>
            </View>
            <View style={cutStyles.photosGrid}>
              {servicePhotos.length === 0
                ? (["leaf-outline","cut-outline","flower-outline","trash-outline"] as const).map((icon, i) => (
                    <View key={i} style={cutStyles.photoCell}>
                      <Ionicons name={icon} size={30} color="#34FF7A" />
                    </View>
                  ))
                : servicePhotos.map((uri, i) => {
                    const isPending = pendingPhotoUris.has(uri);
                    return (
                      <View key={i} style={cutStyles.photoCell}>
                        <Image source={{ uri }} style={[cutStyles.photoImage, isPending && { opacity: 0.45 }]} />
                        {isPending && (
                          <View style={cutStyles.photoPendingOverlay}>
                            <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                            <Text style={[{ fontSize: 9, color: "#FFFFFF", textAlign: "center", marginTop: 2 }, { fontFamily: "Inter_600SemiBold" }]}>
                              Pending{"\n"}Review
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
              }
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
            </TouchableOpacity>

            {/* ── Privacy Settings Modal ── */}
            <Modal visible={privacyVisible} transparent animationType="slide" onRequestClose={() => setPrivacyVisible(false)}>
              <Pressable style={privModalStyles.overlay} onPress={() => setPrivacyVisible(false)}>
                <Pressable style={privModalStyles.sheet} onPress={(e) => e.stopPropagation()}>
                  <View style={privModalStyles.header}>
                    <Text style={[privModalStyles.title, { fontFamily: "Inter_700Bold" }]}>Privacy Settings</Text>
                    <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={privModalStyles.closeBtn} activeOpacity={0.7}>
                      <Ionicons name="close" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {([
                    { label: "Profile visible to customers", value: privVisible, onChange: setPrivVisible },
                    { label: "Show prices publicly", value: privPrices, onChange: setPrivPrices },
                    { label: "Allow customer reviews", value: privReviews, onChange: setPrivReviews },
                  ] as const).map((row, idx) => (
                    <View key={idx} style={privModalStyles.row}>
                      <Text style={[privModalStyles.rowLabel, { fontFamily: "Inter_400Regular" }]}>{row.label}</Text>
                      <Switch
                        value={row.value}
                        onValueChange={(v) => { Haptics.selectionAsync(); (row.onChange as (v: boolean) => void)(v); }}
                        trackColor={{ false: "#333333", true: "#34FF7A" }}
                        thumbColor={row.value ? "#000000" : "#888888"}
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    style={privModalStyles.saveBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setPrivacyVisible(false);
                      Alert.alert("Privacy Settings Saved");
                    }}
                  >
                    <Text style={[privModalStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Settings</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </Modal>
          </>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === "reviews" && (
          <>
            {/* Rating overview — only show when there are real reviews */}
            {reviews.length > 0 && (
              <View style={cutStyles.ratingHeader}>
                <Text style={[cutStyles.ratingBig, { fontFamily: "Inter_700Bold" }]}>
                  {(reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length).toFixed(1)}
                </Text>
                <View>
                  <Text style={cutStyles.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) =>
                      i < Math.round(reviews.reduce((s, r) => s + r.stars, 0) / reviews.length) ? "★" : "☆"
                    ).join("")}
                  </Text>
                  <Text style={[cutStyles.ratingSubtext, { fontFamily: "Inter_400Regular" }]}>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</Text>
                </View>
              </View>
            )}

            {/* Reviews list */}
            {reviews.map((r, i) => (
              <View key={i} style={[cutStyles.card, { marginBottom: 12 }]}>
                {/* Reviewer row — avatar (no link) + name */}
                <View style={reviewStyles.reviewerRow}>
                  <View style={[reviewStyles.reviewerAvatar, { backgroundColor: r.avatarColor }]}>
                    <Text style={[reviewStyles.reviewerInitials, { fontFamily: "Inter_700Bold" }]}>{r.avatarInitials}</Text>
                  </View>
                  <View>
                    <Text style={[reviewStyles.reviewerName, { fontFamily: "Inter_600SemiBold" }]}>{r.author}</Text>
                    <Text style={[reviewStyles.reviewerDate, { fontFamily: "Inter_400Regular" }]}>{r.date}</Text>
                  </View>
                  <Text style={reviewStyles.reviewStars}>{"★".repeat(r.stars)}</Text>
                </View>
                <Text style={[cutStyles.reviewText, { fontFamily: "Inter_400Regular" }]}>{r.text}</Text>

                {/* Replies */}
                {r.replies.map((rep, ri) => (
                  <View key={ri} style={reviewStyles.replyBubble}>
                    <View style={reviewStyles.replyAvatar}>
                      <Ionicons name="leaf" size={12} color="#000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[reviewStyles.replyAuthor, { fontFamily: "Inter_600SemiBold" }]}>{rep.author}</Text>
                      <Text style={[reviewStyles.replyText, { fontFamily: "Inter_400Regular" }]}>{rep.text}</Text>
                    </View>
                  </View>
                ))}

                {/* Reply toggle */}
                {replyingToIdx === i ? (
                  <View style={reviewStyles.replyInputRow}>
                    <TextInput
                      style={[reviewStyles.replyInput, { fontFamily: "Inter_400Regular" }]}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Write a reply…"
                      placeholderTextColor="#777"
                      multiline
                    />
                    <View style={reviewStyles.replyActions}>
                      <TouchableOpacity style={reviewStyles.replyCancel} onPress={() => { setReplyingToIdx(null); setReplyText(""); }} activeOpacity={0.7}>
                        <Text style={[{ fontSize: 13, color: "#888" }, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={reviewStyles.replySubmit}
                        activeOpacity={0.85}
                        onPress={() => {
                          const t = replyText.trim();
                          if (!t) return;
                          const v = validateText(t);
                          if (!v.ok) {
                            Alert.alert("Reply Not Posted", v.reason ?? "Please revise your reply before posting.");
                            return;
                          }
                          setReviews((prev) => prev.map((rev, idx) =>
                            idx === i
                              ? { ...rev, replies: [...rev.replies, { text: t, author: profileName || userName || "Pro", date: "Just now" }] }
                              : rev
                          ));
                          setReplyText("");
                          setReplyingToIdx(null);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                      >
                        <Text style={[{ fontSize: 13, color: "#000" }, { fontFamily: "Inter_600SemiBold" }]}>Post Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={reviewStyles.replyBtn} onPress={() => { setReplyingToIdx(i); Haptics.selectionAsync(); }} activeOpacity={0.7}>
                    <Ionicons name="chatbubble-outline" size={13} color="#34FF7A" />
                    <Text style={[reviewStyles.replyBtnText, { fontFamily: "Inter_500Medium" }]}>Reply</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}


      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={privModalStyles.overlay} onPress={() => setEditVisible(false)}>
          <Pressable style={[privModalStyles.sheet, { maxHeight: "85%" }]} onPress={(e) => e.stopPropagation()}>
            <View style={privModalStyles.header}>
              <Text style={[privModalStyles.title, { fontFamily: "Inter_700Bold" }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={privModalStyles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {([
                { label: "Business Name", value: draftName, onChange: setDraftName, placeholder: "Your Business Name", multiline: false },
                { label: "About / Bio", value: draftBio, onChange: setDraftBio, placeholder: "Tell customers about your services…", multiline: true },
                { label: "City", value: draftCity, onChange: setDraftCity, placeholder: "Ellenton", multiline: false },
                { label: "State", value: draftState, onChange: setDraftState, placeholder: "FL", multiline: false },
                { label: "ZIP Code", value: draftZip, onChange: setDraftZip, placeholder: "34222", multiline: false },
              ] as { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline: boolean }[]).map((field) => (
                <View key={field.label} style={availStyles.editField}>
                  <Text style={[availStyles.editFieldLabel, { fontFamily: "Inter_500Medium" }]}>{field.label}</Text>
                  <TextInput
                    style={[availStyles.editFieldInput, { fontFamily: "Inter_400Regular" }, field.multiline && { height: 80, textAlignVertical: "top" }]}
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor="#777"
                    multiline={field.multiline}
                    autoCapitalize={field.label === "State" ? "characters" : "sentences"}
                    maxLength={field.label === "State" ? 2 : field.label === "ZIP Code" ? 5 : undefined}
                    keyboardType={field.label === "ZIP Code" ? "numeric" : "default"}
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={privModalStyles.saveBtn} onPress={saveEdit} activeOpacity={0.85}>
              <Text style={[privModalStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Profile</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {termsDoc && (
        <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />
      )}

      <HelpSupportModal visible={helpVisible} onClose={() => setHelpVisible(false)} role="landscaper" />
    </View>
  );
}

// ── Customer Settings Modal ───────────────────────────────────────────────────

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma",
  "Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee",
  "Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

function CustomerSettingsModal({
  visible,
  onClose,
  savedAddress,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  savedAddress: { street: string; state: string; zip: string } | null;
  onSave: (addr: { street: string; state: string; zip: string }) => void;
}) {
  const [hasMoved, setHasMoved] = useState(false);
  const [street, setStreet] = useState(savedAddress?.street ?? "");
  const [stateVal, setStateVal] = useState(savedAddress?.state ?? "");
  const [zip, setZip] = useState(savedAddress?.zip ?? "");
  const [errors, setErrors] = useState<{ street?: string; state?: string; zip?: string }>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [stateDropdown, setStateDropdown] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  function reset() {
    setHasMoved(false);
    setStreet(savedAddress?.street ?? "");
    setStateVal(savedAddress?.state ?? "");
    setZip(savedAddress?.zip ?? "");
    setErrors({});
    setSaveState("idle");
    setStateDropdown(false);
    successOpacity.setValue(0);
  }

  function validate(): boolean {
    const e: typeof errors = {};
    if (!street.trim()) e.street = "Street address is required.";
    if (!stateVal.trim()) e.state = "State is required.";
    if (!/^\d{5}$/.test(zip.trim())) e.zip = "ZIP code must be exactly 5 digits.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    setSaveState("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setSaveState("saved");
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { onSave({ street: street.trim(), state: stateVal.trim(), zip: zip.trim() }); reset(); }, 1800);
    }, 1200);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => { onClose(); reset(); }}>
      <View style={custSettStyles.container}>
        {/* Header */}
        <View style={custSettStyles.header}>
          <TouchableOpacity onPress={() => { onClose(); reset(); }} style={custSettStyles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={22} color="#CCCCCC" />
          </TouchableOpacity>
          <Text style={[custSettStyles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Settings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >

          {/* Address card — top of settings */}
          <View style={custSettStyles.sectionCard}>
            <View style={custSettStyles.sectionHeader}>
              <View style={custSettStyles.sectionIconBox}>
                <Ionicons name="home-outline" size={18} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[custSettStyles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>Service Address</Text>
                <Text style={[custSettStyles.sectionSub, { fontFamily: "Inter_400Regular" }]}>
                  {savedAddress
                    ? `${savedAddress.street}, ${savedAddress.state} ${savedAddress.zip}`
                    : "Ellenton, FL (default)"}
                </Text>
              </View>
            </View>

            {/* "Have you moved?" toggle */}
            <View style={custSettStyles.movedToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[custSettStyles.movedToggleLabel, { fontFamily: "Inter_600SemiBold" }]}>Have you moved?</Text>
                <Text style={[custSettStyles.movedToggleSub, { fontFamily: "Inter_400Regular" }]}>
                  Update your address so landscapers come to the right place.
                </Text>
              </View>
              <Switch
                value={hasMoved}
                onValueChange={(v) => {
                  setHasMoved(v);
                  Haptics.selectionAsync();
                  if (!v) { setErrors({}); }
                }}
                trackColor={{ false: "#2A2A2A", true: "#1a4a2a" }}
                thumbColor={hasMoved ? "#34FF7A" : "#555"}
              />
            </View>

            {hasMoved && (
              <View style={custSettStyles.addressForm}>
                <View style={custSettStyles.formDivider} />

                {/* Street Address */}
                <Text style={[custSettStyles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>Street Address *</Text>
                <TextInput
                  style={[custSettStyles.fieldInput, errors.street ? custSettStyles.fieldInputError : null, { fontFamily: "Inter_400Regular" }]}
                  placeholder="123 Maple St, Apt 4B"
                  placeholderTextColor="#555"
                  value={street}
                  onChangeText={(t) => { setStreet(t); setErrors((e) => ({ ...e, street: undefined })); }}
                  autoCapitalize="words"
                />
                {errors.street && (
                  <View style={custSettStyles.errRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                    <Text style={[custSettStyles.errText, { fontFamily: "Inter_400Regular" }]}>{errors.street}</Text>
                  </View>
                )}

                {/* State */}
                <Text style={[custSettStyles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 14 }]}>State *</Text>
                <TouchableOpacity
                  style={[custSettStyles.fieldInput, custSettStyles.statePickerBtn, errors.state ? custSettStyles.fieldInputError : null]}
                  onPress={() => { setStateDropdown((v) => !v); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <Text style={[{ fontFamily: "Inter_400Regular", fontSize: 15, color: stateVal ? "#FFFFFF" : "#555" }]}>
                    {stateVal || "Select your state"}
                  </Text>
                  <Ionicons name={stateDropdown ? "chevron-up" : "chevron-down"} size={16} color="#777" />
                </TouchableOpacity>
                {errors.state && (
                  <View style={custSettStyles.errRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                    <Text style={[custSettStyles.errText, { fontFamily: "Inter_400Regular" }]}>{errors.state}</Text>
                  </View>
                )}
                {stateDropdown && (
                  <View style={custSettStyles.stateList}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
                      {US_STATES.map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[custSettStyles.stateItem, stateVal === s && custSettStyles.stateItemSelected]}
                          onPress={() => {
                            setStateVal(s);
                            setStateDropdown(false);
                            setErrors((e) => ({ ...e, state: undefined }));
                            Haptics.selectionAsync();
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[custSettStyles.stateItemText, { fontFamily: stateVal === s ? "Inter_600SemiBold" : "Inter_400Regular" }, stateVal === s && { color: "#34FF7A" }]}>
                            {s}
                          </Text>
                          {stateVal === s && <Ionicons name="checkmark" size={14} color="#34FF7A" />}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* ZIP Code */}
                <Text style={[custSettStyles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 14 }]}>ZIP Code *</Text>
                <TextInput
                  style={[custSettStyles.fieldInput, errors.zip ? custSettStyles.fieldInputError : null, { fontFamily: "Inter_400Regular" }]}
                  placeholder="34222"
                  placeholderTextColor="#555"
                  keyboardType="number-pad"
                  maxLength={5}
                  value={zip}
                  onChangeText={(t) => { setZip(t.replace(/\D/g, "")); setErrors((e) => ({ ...e, zip: undefined })); }}
                />
                {errors.zip ? (
                  <View style={custSettStyles.errRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                    <Text style={[custSettStyles.errText, { fontFamily: "Inter_400Regular" }]}>{errors.zip}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 5 }}>
                    <Ionicons name="information-circle-outline" size={13} color="#34FF7A" style={{ marginTop: 1 }} />
                    <Text style={{ fontSize: 11, color: "#888", fontFamily: "Inter_400Regular", flex: 1 }}>
                      Updating your ZIP code changes your service area. Please also confirm your street address above is current.
                    </Text>
                  </View>
                )}

                {/* Save button */}
                {saveState !== "saved" ? (
                  <TouchableOpacity
                    style={[custSettStyles.saveBtn, saveState === "saving" && custSettStyles.saveBtnLoading]}
                    onPress={saveState === "idle" ? handleSave : undefined}
                    activeOpacity={0.85}
                  >
                    {saveState === "saving" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ActivityIndicator size="small" color="#000" />
                        <Text style={[custSettStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saving...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="location" size={17} color="#000" />
                        <Text style={[custSettStyles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Update My Address</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Animated.View style={[custSettStyles.successBox, { opacity: successOpacity }]}>
                    <Ionicons name="checkmark-circle" size={28} color="#34FF7A" />
                    <Text style={[custSettStyles.successText, { fontFamily: "Inter_600SemiBold" }]}>Address updated successfully!</Text>
                  </Animated.View>
                )}
              </View>
            )}
          </View>

          {/* Notifications card */}
          <View style={custSettStyles.sectionCard}>
            <View style={custSettStyles.sectionHeader}>
              <View style={custSettStyles.sectionIconBox}>
                <Ionicons name="notifications-outline" size={18} color="#34FF7A" />
              </View>
              <Text style={[custSettStyles.sectionTitle, { fontFamily: "Inter_600SemiBold" }]}>Notifications</Text>
            </View>
            <View style={custSettStyles.movedToggleRow}>
              <Text style={[custSettStyles.movedToggleLabel, { fontFamily: "Inter_500Medium" }]}>Job status updates</Text>
              <Switch value={true} onValueChange={() => {}} trackColor={{ false: "#2A2A2A", true: "#1a4a2a" }} thumbColor="#34FF7A" />
            </View>
            <View style={custSettStyles.itemDivider} />
            <View style={custSettStyles.movedToggleRow}>
              <Text style={[custSettStyles.movedToggleLabel, { fontFamily: "Inter_500Medium" }]}>Payment receipts</Text>
              <Switch value={true} onValueChange={() => {}} trackColor={{ false: "#2A2A2A", true: "#1a4a2a" }} thumbColor="#34FF7A" />
            </View>
            <View style={custSettStyles.itemDivider} />
            <View style={custSettStyles.movedToggleRow}>
              <Text style={[custSettStyles.movedToggleLabel, { fontFamily: "Inter_500Medium" }]}>Promotional offers</Text>
              <Switch value={false} onValueChange={() => {}} trackColor={{ false: "#2A2A2A", true: "#1a4a2a" }} thumbColor="#555" />
            </View>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Customer Profile ──────────────────────────────────────────────────────────

function CustomerProfile({
  logout,
  customerAddress,
  onAddressChange,
  editVisible,
  onOpenEdit,
  onCloseEdit,
}: {
  logout: () => void;
  customerAddress: { street: string; state: string; zip: string } | null;
  onAddressChange: (addr: { street: string; state: string; zip: string } | null) => void;
  editVisible: boolean;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
}) {
  const { setAvatarUri, preferredPayment, setPreferredPayment, userName, user, updateUser } = useAuth();

  const [draftDisplayName, setDraftDisplayName] = useState(user?.displayName ?? "");
  const [draftPhone, setDraftPhone] = useState(user?.phone ?? "");
  const [draftCity, setDraftCity] = useState(user?.city ?? "");
  const [draftState, setDraftState] = useState(user?.state ?? "");
  const [draftZip, setDraftZip] = useState(user?.zipCode ?? "");
  const [editSaveState, setEditSaveState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (editVisible) {
      setDraftDisplayName(user?.displayName ?? "");
      setDraftPhone(user?.phone ?? "");
      setDraftCity(user?.city ?? "");
      setDraftState(user?.state ?? "");
      setDraftZip(user?.zipCode ?? "");
      setEditSaveState("idle");
    }
  }, [editVisible]);

  async function saveProfileEdit() {
    if (editSaveState === "saving") return;
    setEditSaveState("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateUser({
      displayName: draftDisplayName.trim() || (user?.displayName ?? ""),
      phone: draftPhone.trim(),
      city: draftCity.trim(),
      state: draftState.trim().toUpperCase().slice(0, 2),
      zipCode: draftZip.trim(),
    });
    setEditSaveState("saved");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { onCloseEdit(); setEditSaveState("idle"); }, 1200);
  }
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState(preferredPayment ?? "");
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState(false);
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarImage(uri);
      setAvatarUri(uri);
      uploadProfileImage(uri, "avatar", user?.username, user?.role);
    }
  }

  const showSuccess = () => {
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.spring(successScale, { toValue: 1, useNativeDriver: false }),
    ]).start();
  };

  const savePayment = () => {
    if (!selectedPayment) { setError(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    setError(false);
    setPaymentState("loading");
    setTimeout(() => {
      setPreferredPayment(selectedPayment);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentState("success");
      showSuccess();
      setTimeout(() => { setPaymentState("idle"); successOpacity.setValue(0); successScale.setValue(0.8); }, 2500);
    }, 1400);
  };

  return (
    <>
      <View style={styles.avatarRow}>
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={{ position: "relative" }}>
          <View style={styles.avatarBox}>
            {avatarImage ? (
              <Image source={{ uri: avatarImage }} style={{ width: 80, height: 80, borderRadius: 24 }} />
            ) : (
              <Ionicons name="person" size={40} color="#34FF7A" />
            )}
          </View>
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={12} color="#000" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.proName, { fontFamily: "Inter_700Bold" }]}>{userName || "Your Profile"}</Text>
          <Text style={[styles.proSub, { fontFamily: "Inter_400Regular" }]}>
            {customerAddress
              ? `${customerAddress.street}, ${customerAddress.state} ${customerAddress.zip}`
              : "Ellenton, FL"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Email</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>{user?.email || "—"}</Text>
        </View>
        {!!(user?.phone) && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Phone</Text>
              <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>{user.phone}</Text>
            </View>
          </>
        )}
        {!!(user?.city) && (
          <>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Location</Text>
              <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>
                {[user.city, user.state, user.zipCode].filter(Boolean).join(", ")}
              </Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={onOpenEdit} activeOpacity={0.85}>
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile Settings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: "#1a1000", borderWidth: 1.5, borderColor: "#f59e0b", marginTop: 0 }]}
        onPress={() => router.push("/dispute")}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="warning-outline" size={18} color="#f59e0b" />
          <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold", color: "#f59e0b" }]}>File a Dispute</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
      </TouchableOpacity>

      {termsDoc && <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />}

      {/* ── Customer Edit Profile Modal ── */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={onCloseEdit}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={custEditStyles.overlay} onPress={onCloseEdit}>
            <Pressable style={custEditStyles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={custEditStyles.handle} />
              <View style={custEditStyles.header}>
                <View style={custEditStyles.headerLeft}>
                  <View style={custEditStyles.headerIconBox}>
                    <Ionicons name="person-outline" size={18} color="#34FF7A" />
                  </View>
                  <Text style={[custEditStyles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Edit Profile</Text>
                </View>
                <TouchableOpacity onPress={onCloseEdit} style={custEditStyles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={20} color="#CCCCCC" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Email — read-only */}
                <View style={custEditStyles.fieldGroup}>
                  <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>Email</Text>
                  <View style={[custEditStyles.input, custEditStyles.readOnly]}>
                    <Text style={[custEditStyles.readOnlyText, { fontFamily: "Inter_400Regular" }]}>{user?.email || "—"}</Text>
                    <Ionicons name="lock-closed-outline" size={14} color="#444" />
                  </View>
                  <Text style={[custEditStyles.hint, { fontFamily: "Inter_400Regular" }]}>Email cannot be changed here</Text>
                </View>

                {/* Display Name */}
                <View style={custEditStyles.fieldGroup}>
                  <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>Display Name</Text>
                  <TextInput
                    style={[custEditStyles.input, { fontFamily: "Inter_400Regular" }]}
                    value={draftDisplayName}
                    onChangeText={setDraftDisplayName}
                    placeholder="Your name"
                    placeholderTextColor="#555"
                    maxLength={40}
                    autoCapitalize="words"
                  />
                </View>

                {/* Phone */}
                <View style={custEditStyles.fieldGroup}>
                  <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>Phone</Text>
                  <TextInput
                    style={[custEditStyles.input, { fontFamily: "Inter_400Regular" }]}
                    value={draftPhone}
                    onChangeText={setDraftPhone}
                    placeholder="(555) 000-0000"
                    placeholderTextColor="#555"
                    keyboardType="phone-pad"
                    maxLength={20}
                  />
                </View>

                {/* City / State / ZIP */}
                <View style={custEditStyles.fieldGroup}>
                  <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>City</Text>
                  <TextInput
                    style={[custEditStyles.input, { fontFamily: "Inter_400Regular" }]}
                    value={draftCity}
                    onChangeText={setDraftCity}
                    placeholder="Ellenton"
                    placeholderTextColor="#555"
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[custEditStyles.fieldGroup, { flex: 1 }]}>
                    <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>State</Text>
                    <TextInput
                      style={[custEditStyles.input, { fontFamily: "Inter_400Regular" }]}
                      value={draftState}
                      onChangeText={(t) => setDraftState(t.toUpperCase().slice(0, 2))}
                      placeholder="FL"
                      placeholderTextColor="#555"
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                  <View style={[custEditStyles.fieldGroup, { flex: 2 }]}>
                    <Text style={[custEditStyles.label, { fontFamily: "Inter_500Medium" }]}>ZIP Code</Text>
                    <TextInput
                      style={[custEditStyles.input, { fontFamily: "Inter_400Regular" }]}
                      value={draftZip}
                      onChangeText={setDraftZip}
                      placeholder="34222"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Save button */}
              {editSaveState === "saved" ? (
                <View style={custEditStyles.savedBox}>
                  <Ionicons name="checkmark-circle" size={22} color="#34FF7A" />
                  <Text style={[custEditStyles.savedText, { fontFamily: "Inter_600SemiBold" }]}>Profile saved!</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[custEditStyles.saveBtn, editSaveState === "saving" && { opacity: 0.7 }]}
                  onPress={saveProfileEdit}
                  activeOpacity={0.85}
                  disabled={editSaveState === "saving"}
                >
                  {editSaveState === "saving" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <ActivityIndicator size="small" color="#000" />
                      <Text style={[custEditStyles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saving…</Text>
                    </View>
                  ) : (
                    <Text style={[custEditStyles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const cutStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },

  /* ── Hero ── */
  hero: {
    backgroundColor: "#0d2e18",
    alignItems: "center",
    paddingBottom: 28,
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.30)",
  },

  editBannerBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "rgba(52,255,122,0.35)",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  editBannerText: { fontSize: 11, color: "#34FF7A" },

  togglePill: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 10,
  },
  togglePillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  menuDotBtnHero: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { fontSize: 12, color: "#34FF7A" },

  /* Avatar — centered, glowing border, camera-edit badge */
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
    overflow: "hidden",
  },
  avatarImage: { width: 90, height: 90, borderRadius: 28 },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#34FF7A",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  avatarEditText: { fontSize: 8, color: "#000", letterSpacing: 0.5 },

  /* Name / badges / location — all centered */
  heroName: { fontSize: 24, color: "#FFFFFF", textAlign: "center", marginBottom: 10 },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ratingPill: {
    backgroundColor: "rgba(52,255,122,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#34FF7A",
  },
  ratingPillText: { fontSize: 14, color: "#34FF7A" },
  proBadge: { backgroundColor: "#34FF7A", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  proBadgeText: { fontSize: 11, color: "#000000", letterSpacing: 1 },
  jobsText: { fontSize: 14, color: "rgba(255,255,255,0.6)" },
  heroLocation: { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 4 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#34FF7A", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12, alignSelf: "center" },
  editProfileBtnText: { fontSize: 13, color: "#000" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#0A0A0A",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "#34FF7A" },
  tabText: { fontSize: 12, color: "#BBBBBB", letterSpacing: 0.8 },
  tabTextActive: { color: "#34FF7A" },

  tabContent: { padding: 20, paddingBottom: 60 },

  actionsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 24 },
  actionChip: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 999, paddingVertical: 10, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#2A2A2A" },
  actionChipShare: { flex: 0, width: "100%", borderColor: "#34FF7A30", backgroundColor: "#0D200F", paddingVertical: 14, flexDirection: "row", gap: 10 },
  actionChipIcon: { fontSize: 18 },
  actionChipLabel: { fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  sectionHeading: { fontSize: 13, color: "#CCCCCC", letterSpacing: 1.4, marginBottom: 10, marginTop: 4 },

  card: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#222222", marginBottom: 20 },
  aboutText: { fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 22 },

  contactRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A1A1A", borderWidth: 1.5, borderColor: "#34FF7A", borderRadius: 28, paddingVertical: 16 },
  contactIcon: { fontSize: 22 },
  contactLabel: { fontSize: 16, color: "#34FF7A" },

  addrName: { fontSize: 15, color: "#FFFFFF", marginBottom: 4 },
  addrLine: { fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 14 },
  mapBox: { height: 120, backgroundColor: "#222222", borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16 },
  mapPin: { fontSize: 28 },
  mapText: { fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  hoursGrid: { flexDirection: "row", gap: 16 },
  hoursCell: { flex: 1 },
  hoursDayText: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 3 },
  hoursTimeText: { fontSize: 14, color: "#FFFFFF" },
  hoursClosedText: { fontSize: 14, color: "rgba(255,255,255,0.35)" },

  photosSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 4 },
  addPhotosLink: { fontSize: 13, color: "#34FF7A" },
  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  photoCell: { width: "47%", aspectRatio: 16 / 9, backgroundColor: "#1A1A1A", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222222", overflow: "hidden", position: "relative" },
  photoPendingOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", borderRadius: 20 },
  photoEmoji: { fontSize: 36 },
  photoImage: { width: "100%", height: "100%" },

  reviewInput: { backgroundColor: "#222222", borderRadius: 14, padding: 14, fontSize: 14, color: "#FFFFFF", minHeight: 100, marginBottom: 12 },
  postReviewBtn: { backgroundColor: "#34FF7A", borderRadius: 28, paddingVertical: 13, alignItems: "center" },
  postReviewBtnText: { fontSize: 15, color: "#000" },

  ratingHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  ratingBig: { fontSize: 56, color: "#FFFFFF", lineHeight: 64 },
  starsRow: { fontSize: 22, color: "#f59e0b", marginBottom: 3 },
  ratingSubtext: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  reviewStars: { fontSize: 15, color: "#f59e0b", marginBottom: 6 },
  reviewText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  reviewAuthor: { fontSize: 13, color: "#BBBBBB", marginTop: 8 },

  svcCardName: { fontSize: 15, color: "#FFFFFF", marginBottom: 14 },
  svcPriceRow: { flexDirection: "row", gap: 8 },
  svcPriceCell: { flex: 1, alignItems: "center", gap: 3 },
  svcColLabel: { fontSize: 11, color: "#CCCCCC" },
  svcColSub: { fontSize: 9, color: "#BBBBBB" },
  svcPrice: { fontSize: 20, color: "#34FF7A", marginTop: 4 },
});

const picStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: "#1E1E1E" },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#34FF7A", borderWidth: 3, borderColor: "#34FF7A", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarEmoji: { fontSize: 40 },
  nameCol: { flex: 1, gap: 6 },
  displayName: { fontSize: 18, color: "#FFFFFF" },
  changeLink: { fontSize: 14, color: "#34FF7A" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: { backgroundColor: "#1A1A1A", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#222222", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  togglePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  togglePillText: { fontSize: 12, color: "#34FF7A" },
  toggleIcon: { fontSize: 14 },
  scroll: { padding: 20, paddingBottom: 48 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 },
  avatarBox: { width: 80, height: 80, backgroundColor: "#1A1A1A", borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#34FF7A", overflow: "hidden" },
  avatarEditBadge: { position: "absolute", bottom: -4, right: -4, width: 22, height: 22, backgroundColor: "#34FF7A", borderRadius: 11, alignItems: "center", justifyContent: "center", zIndex: 10 },
  proName: { fontSize: 18, color: "#FFFFFF", marginBottom: 2 },
  proSub: { fontSize: 12, color: "#FFFFFF", marginBottom: 6 },
  card: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  infoKey: { fontSize: 14, color: "#BBBBBB" },
  infoVal: { fontSize: 14, color: "#FFFFFF" },
  paymentCard: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12 },
  paymentLabel: { fontSize: 13, color: "#FFFFFF", marginBottom: 14 },
  paymentTilesRow: { paddingHorizontal: 6, gap: 10, paddingBottom: 4 },
  paymentTile: { width: 82, backgroundColor: "#1a1a1a", borderRadius: 16, padding: 12, alignItems: "center", gap: 6, borderWidth: 2, borderColor: "transparent" },
  paymentTileActive: { borderColor: "#34FF7A", backgroundColor: "#0d2e18" },
  paymentTileEmoji: { fontSize: 26 },
  paymentTileLabel: { fontSize: 11, color: "#FFFFFF", textAlign: "center" },
  paymentTileLabelActive: { color: "#34FF7A" },
  paymentCardError: { borderColor: "#ef4444" },
  errorMsg: { fontSize: 12, color: "#ef4444", marginTop: 6, marginBottom: 2 },
  priceCard: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12 },
  priceCardTitle: { fontSize: 13, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 },
  priceServiceLabel: { fontSize: 15, color: "#FFFFFF" },
  priceInputWrapper: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#222222", borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 12, marginTop: 6, alignSelf: "stretch", gap: 2, borderWidth: 1, borderColor: "transparent" },
  priceInputWrapperFocused: { backgroundColor: "#1a1a1a", borderColor: "#34FF7A" },
  priceDollar: { fontSize: 18, color: "#34FF7A", fontWeight: "600" },
  priceInput: { fontSize: 18, color: "#FFFFFF", width: 52, textAlign: "center", fontWeight: "600" },
  savePricesBtn: { backgroundColor: "#34FF7A", paddingVertical: 15, borderRadius: 20, alignItems: "center", marginTop: 20 },
  savePricesBtnLoading: { opacity: 0.8 },
  savePricesBtnText: { color: "#000", fontSize: 15 },
  savePaymentBtn: { backgroundColor: "#34FF7A", paddingVertical: 13, borderRadius: 20, alignItems: "center", marginTop: 12 },
  savePaymentBtnLoading: { opacity: 0.8 },
  savePaymentText: { color: "#000", fontSize: 14 },
  successBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, paddingVertical: 6 },
  savedMsg: { fontSize: 14, color: "#34FF7A" },
  editBtn: { backgroundColor: "#34FF7A", paddingVertical: 16, borderRadius: 24, alignItems: "center", marginTop: 8, marginBottom: 12 },
  editBtnText: { color: "#000", fontSize: 16 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  logoutText: { fontSize: 15, color: "#ef4444" },
  menuDotBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#2A2A2A",
    alignItems: "center", justifyContent: "center",
  },
  priceMatrixCard: { backgroundColor: "#0a0a0a", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#222222" },
  priceMatrixRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  priceMatrixCell: { flex: 1, alignItems: "center", gap: 3 },
  priceMatrixColLabel: { fontSize: 11, color: "#CCCCCC" },
  priceMatrixColSub: { fontSize: 9, color: "#BBBBBB", marginBottom: 2 },
  legalCard: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12, marginTop: 8 },
  legalCardTitle: { fontSize: 13, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  legalRowText: { fontSize: 14, color: "#FFFFFF", flex: 1 },
  legalDivider: { height: 1, backgroundColor: "#2A2A2A", marginVertical: 2 },
  legalDisclaimer: { fontSize: 11, color: "#BBBBBB", lineHeight: 17, marginTop: 10 },
});

const privModalStyles = StyleSheet.create({
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
    padding: 28,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#222222",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  rowLabel: { fontSize: 15, color: "#FFFFFF", flex: 1, paddingRight: 12 },
  saveBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: { color: "#000000", fontSize: 16 },
});

const availStyles = StyleSheet.create({
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333333",
  },
  dayChipOn: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  dayChipText: { fontSize: 13, color: "#BBBBBB" },
  dayChipTextOn: { color: "#000000" },

  hoursRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hoursField: { flex: 1 },
  hoursLabel: { fontSize: 11, color: "#BBBBBB", marginBottom: 6, letterSpacing: 0.8 },
  hoursInput: {
    backgroundColor: "#222222",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  hoursSep: { fontSize: 13, color: "#BBBBBB", marginTop: 18 },

  addDateRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 16 },
  addDateInput: {
    flex: 1,
    backgroundColor: "#222222",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addDateBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  dateText: { flex: 1, fontSize: 14, color: "#FFFFFF" },

  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  calCell: {
    width: "12.5%",
    minWidth: 38,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111111",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    position: "relative",
  },
  calCellAvail: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  calCellBlocked: { backgroundColor: "#3A1A1A", borderColor: "#5A2020" },
  calCellSelected: { borderColor: "#fff", borderWidth: 2 },
  calCellHasBookings: { borderColor: "#f87171" },
  calCellLabel: { fontSize: 9, marginBottom: 2 },
  calCellDate: { fontSize: 14 },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#f87171",
    marginTop: 3,
  },
  calSlotList: {
    backgroundColor: "#111111",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  calSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
  },
  calSlotText: { fontSize: 14, color: "#FFFFFF" },
  calSlotDur: { fontSize: 12, color: "#BBBBBB", flex: 1, textAlign: "right" },

  saveAvailBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  saveAvailBtnText: { fontSize: 16, color: "#000000" },

  readOnlyNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#0E1F14", borderRadius: 10,
    borderWidth: 1, borderColor: "#1D4428",
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16,
  },
  readOnlyNoteText: { fontSize: 12, color: "#BBBBBB", flex: 1, lineHeight: 18 },

  editField: { marginBottom: 16 },
  editFieldLabel: { fontSize: 12, color: "#CCCCCC", letterSpacing: 0.8, marginBottom: 6 },
  editFieldInput: {
    backgroundColor: "#222222",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333333",
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});

const custPayStyles = StyleSheet.create({
  preferredBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0d2e18",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1a4a2a",
    padding: 16,
    marginBottom: 12,
  },
  preferredBannerTitle: {
    fontSize: 14,
    color: "#34FF7A",
    marginBottom: 2,
  },
  preferredBannerSub: {
    fontSize: 12,
    color: "#BBBBBB",
  },
  activePill: {
    backgroundColor: "#34FF7A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activePillText: {
    fontSize: 10,
    color: "#000",
    letterSpacing: 0.8,
  },
  preferredPip: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#34FF7A",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  preferredPipText: {
    fontSize: 9,
    color: "#000",
  },
  inPersonNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#0d2e18",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#1a3a22",
  },
  inPersonNoteText: {
    fontSize: 12,
    color: "#BBBBBB",
    flex: 1,
    lineHeight: 18,
  },
});

// ── Review styles ─────────────────────────────────────────────────────────────
const reviewStyles = StyleSheet.create({
  reviewerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  reviewerAvatar: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  reviewerInitials: { fontSize: 14, color: "#fff" },
  reviewerName: { fontSize: 14, color: "#FFFFFF" },
  reviewerDate: { fontSize: 11, color: "#CCCCCC", marginTop: 1 },
  reviewStars: { fontSize: 14, color: "#34FF7A", marginLeft: "auto" },
  replyBubble: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#111111", borderRadius: 14, padding: 12,
    marginTop: 10, borderLeftWidth: 3, borderColor: "#34FF7A",
  },
  replyAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#34FF7A", alignItems: "center", justifyContent: "center",
  },
  replyAuthor: { fontSize: 12, color: "#34FF7A", marginBottom: 3 },
  replyText: { fontSize: 13, color: "#CCCCCC" },
  replyBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start", marginTop: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "#0d2e18", borderRadius: 12,
  },
  replyBtnText: { fontSize: 12, color: "#34FF7A" },
  replyInputRow: { marginTop: 10 },
  replyInput: {
    backgroundColor: "#111", borderRadius: 14, padding: 12,
    color: "#FFFFFF", fontSize: 13, borderWidth: 1, borderColor: "#333",
    minHeight: 70, textAlignVertical: "top",
  },
  replyActions: { flexDirection: "row", gap: 10, marginTop: 8, justifyContent: "flex-end" },
  replyCancel: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: "#333" },
  replySubmit: {
    backgroundColor: "#34FF7A", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14,
  },
});

// ── Dropdown menu styles ──────────────────────────────────────────────────────
const menuStyles = StyleSheet.create({
  overlay: { flex: 1 },
  dropdown: {
    position: "absolute",
    backgroundColor: "#1A1A1A",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden",
  },
  item: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 15 },
  itemText: { fontSize: 15, color: "#FFFFFF" },
  divider: { height: 1, backgroundColor: "#252525" },
});

const custEditStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#222",
    maxHeight: "88%",
  },
  handle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconBox: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: "#0d2e18", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1a4a2a",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, color: "#AAAAAA", letterSpacing: 0.6, marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#FFFFFF",
  },
  readOnly: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", opacity: 0.5 },
  readOnlyText: { fontSize: 15, color: "#AAAAAA" },
  hint: { fontSize: 11, color: "#555", marginTop: 5 },
  saveBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, color: "#000000" },
  savedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0d2e18",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1a4a2a",
    paddingVertical: 16,
    marginTop: 4,
  },
  savedText: { fontSize: 15, color: "#34FF7A" },
});

const custSettStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  sectionCard: {
    backgroundColor: "#141414", borderRadius: 20,
    borderWidth: 1, borderColor: "#222222",
    padding: 18, marginBottom: 16,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sectionIconBox: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#0d2e18", borderWidth: 1, borderColor: "#1a4a2a",
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, color: "#FFFFFF" },
  sectionSub: { fontSize: 12, color: "#777", marginTop: 2 },

  movedToggleRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12,
    paddingVertical: 4,
  },
  movedToggleLabel: { fontSize: 15, color: "#FFFFFF", flex: 1 },
  movedToggleSub: { fontSize: 12, color: "#777", marginTop: 2, flex: 1 },
  itemDivider: { height: 1, backgroundColor: "#1E1E1E", marginVertical: 10 },

  formDivider: { height: 1, backgroundColor: "#1E1E1E", marginVertical: 16 },
  addressForm: {},

  fieldLabel: { fontSize: 12, color: "#AAAAAA", letterSpacing: 0.6, marginBottom: 8 },
  fieldInput: {
    backgroundColor: "#1A1A1A", borderRadius: 14,
    borderWidth: 1, borderColor: "#2A2A2A",
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: "#FFFFFF",
  },
  fieldInputError: { borderColor: "#FF4444" },
  statePickerBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  stateList: {
    backgroundColor: "#1A1A1A", borderRadius: 14,
    borderWidth: 1, borderColor: "#2A2A2A",
    marginTop: 4, overflow: "hidden",
  },
  stateItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#222",
  },
  stateItemSelected: { backgroundColor: "#0d2e18" },
  stateItemText: { fontSize: 14, color: "#FFFFFF" },

  errRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  errText: { fontSize: 12, color: "#FF4444" },

  saveBtn: {
    backgroundColor: "#34FF7A", borderRadius: 16,
    paddingVertical: 14, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
    marginTop: 20,
  },
  saveBtnLoading: { backgroundColor: "#34FF7A99" },
  saveBtnText: { fontSize: 15, color: "#000000" },

  successBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#0d2e18", borderRadius: 14,
    borderWidth: 1, borderColor: "#1a4a2a",
    padding: 14, marginTop: 20,
  },
  successText: { fontSize: 14, color: "#34FF7A", flex: 1 },
});

const announceStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "#1E1E1E",
    maxHeight: "90%",
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  followersPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1F0A0A", borderWidth: 1, borderColor: "#f8717140",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: 20,
  },
  followersText: { fontSize: 13, color: "#f87171" },
  fieldLabel: { fontSize: 13, color: "#CCCCCC", marginBottom: 6 },
  titleInput: {
    backgroundColor: "#1A1A1A", borderRadius: 12,
    borderWidth: 1, borderColor: "#2A2A2A",
    color: "#FFFFFF", fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 4,
  },
  msgInput: {
    backgroundColor: "#1A1A1A", borderRadius: 12,
    borderWidth: 1, borderColor: "#2A2A2A",
    color: "#FFFFFF", fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 110, marginBottom: 4,
  },
  inputErr: { borderColor: "#f87171" },
  errText: { fontSize: 12, color: "#f87171", flex: 1 },
  charCount: { fontSize: 11, color: "#555", textAlign: "right" },
  sendBtn: {
    backgroundColor: "#FFAA00", borderRadius: 22,
    paddingVertical: 15, alignItems: "center",
    justifyContent: "center", marginBottom: 12,
  },
  sendBtnSending: { backgroundColor: "#FFAA0099" },
  sendBtnText: { fontSize: 15, color: "#000" },
  disclaimer: { fontSize: 11, color: "#555", textAlign: "center", lineHeight: 16 },
  sentBox: { alignItems: "center", paddingVertical: 28, gap: 12 },
  sentTitle: { fontSize: 20, color: "#34FF7A" },
  sentSub: { fontSize: 14, color: "#BBBBBB", textAlign: "center", lineHeight: 20 },
  expiryHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 4, marginBottom: 6,
  },
  expiryHint: { fontSize: 11, color: "#777", marginBottom: 10, lineHeight: 16 },
  expiryRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  expirySubLabel: { fontSize: 11, color: "#999", marginBottom: 5 },
  expiryInput: {
    backgroundColor: "#1A1A1A", borderRadius: 12,
    borderWidth: 1, borderColor: "#FFAA0050",
    color: "#FFFFFF", fontSize: 13,
    paddingHorizontal: 12, paddingVertical: 10,
  },
});

