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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";
import { useLandscaperProfile } from "@/contexts/landscaperProfile";
import TermsModal from "@/components/TermsModal";
import PaymentHistoryModal from "@/components/PaymentHistoryModal";

const PAYMENT_METHODS = [
  { label: "Apple Pay",  value: "Apple Pay",  ionIcon: "logo-apple" as const,            shortLabel: "Apple Pay" },
  { label: "Venmo",      value: "Venmo",       ionIcon: "cash-outline" as const,          shortLabel: "Venmo" },
  { label: "PayPal",     value: "PayPal",      ionIcon: "card-outline" as const,          shortLabel: "PayPal" },
  { label: "Debit Card", value: "Debit Card",  ionIcon: "card" as const,                  shortLabel: "Debit" },
  { label: "Cash App",   value: "Cash App",    ionIcon: "phone-portrait-outline" as const, shortLabel: "Cash App" },
  { label: "In Person",  value: "In Person",   ionIcon: "handshake-outline" as const,     shortLabel: "In Person" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role, logout } = useAuth();
  const [isLandscaper, setIsLandscaper] = useState(role === "landscaper");
  const [custMenuVisible, setCustMenuVisible] = useState(false);

  const toggle = () => {
    Haptics.selectionAsync();
    setIsLandscaper((v) => !v);
  };

  if (isLandscaper) {
    return (
      <LandscaperProfile
        topPadding={topPadding}
        toggle={toggle}
        logout={logout}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Profile</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity style={styles.togglePill} onPress={toggle} activeOpacity={0.8}>
            <Text style={[styles.togglePillText, { fontFamily: "Inter_500Medium" }]}>Customer View</Text>
            <Ionicons name="sync-outline" size={14} color="#34FF7A" />
          </TouchableOpacity>
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
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); Alert.alert("Edit Profile", "Profile editor coming soon."); }}>
              <Ionicons name="person-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); Alert.alert("Settings", "Settings coming soon."); }}>
              <Ionicons name="settings-outline" size={18} color="#CCCCCC" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium" }]}>Settings</Text>
            </TouchableOpacity>
            <View style={menuStyles.divider} />
            <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setCustMenuVisible(false); logout(); }}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#ef4444" }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <CustomerProfile logout={logout} />
      </ScrollView>
    </View>
  );
}

// ── Landscaper Profile – Cut App Style ────────────────────────────────────────

type LandscaperTab = "info" | "reviews" | "services";
type ReviewReply = { text: string; author: string; date: string };
type ReviewItem = {
  text: string; author: string; date: string; stars: number;
  avatarInitials: string; avatarColor: string;
  replies: ReviewReply[];
};

function LandscaperProfile({
  topPadding,
  toggle,
  logout,
}: {
  topPadding: number;
  toggle: () => void;
  logout: () => void;
}) {
  const { setAvatarUri } = useAuth();
  const { myServices, bookedSlots } = useLandscaperProfile();
  const [activeTab, setActiveTab] = useState<LandscaperTab>("info");
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [heroBackground, setHeroBackground] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [privVisible, setPrivVisible] = useState(true);
  const [privPrices, setPrivPrices] = useState(false);
  const [privReviews, setPrivReviews] = useState(true);
  const [lsMenuVisible, setLsMenuVisible] = useState(false);
  const [replyingToIdx, setReplyingToIdx] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // Editable profile fields
  const [editVisible, setEditVisible] = useState(false);
  const [profileName, setProfileName] = useState("GreenScape Pros");
  const [profileBio, setProfileBio] = useState("Professional landscaping services with over 10 years of experience. We specialize in mowing/edging, weeding/mulching, sod installation, and artificial turf for residential properties.");
  const [profileCity, setProfileCity] = useState("Ellenton");
  const [profileState, setProfileState] = useState("FL");
  const [profileZip, setProfileZip] = useState("34222");
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


  const [reviews, setReviews] = useState<ReviewItem[]>([
    { text: '"John did an amazing job on our yard – very professional and on time!"', author: "Sarah M.", date: "4 days ago", stars: 5, avatarInitials: "SM", avatarColor: "#166D42", replies: [] },
    { text: '"Reliable, on time, and the yard looks fantastic every time. Highly recommend."', author: "Marcus T.", date: "2 weeks ago", stars: 5, avatarInitials: "MT", avatarColor: "#2C5282", replies: [] },
    { text: '"Great hedge trimming, left the property spotless. Will book again."', author: "Alex R.", date: "3 weeks ago", stars: 5, avatarInitials: "AR", avatarColor: "#6B21A8", replies: [] },
  ]);
  const [newReviewText, setNewReviewText] = useState("");

  async function pickAvatar() {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setAvatarImage(result.assets[0].uri);
      setAvatarUri(result.assets[0].uri);
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
    if (!result.canceled) setHeroBackground(result.assets[0].uri);
  }

  async function pickServicePhotos() {
    Haptics.selectionAsync();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setServicePhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function submitReview() {
    const text = newReviewText.trim();
    if (!text) { Alert.alert("Please write a review before posting."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReviews((prev) => [
      { text: `"${text}"`, author: "You", date: "Just now", stars: 5, avatarInitials: "YO", avatarColor: "#34FF7A", replies: [] },
      ...prev,
    ]);
    setNewReviewText("");
    Alert.alert("Review Posted");
  }

  return (
    <View style={cutStyles.container}>

      {/* ── Hero — matches customer-facing full-screen profile ── */}
      <View style={[cutStyles.hero, { paddingTop: topPadding + 16 }]}>
        {heroBackground ? (
          <Image source={{ uri: heroBackground }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        <View style={cutStyles.heroOverlay} />

        {/* Toggle pill + menu button — top right, below status bar */}
        <View style={[{ position: "absolute", top: topPadding + 14, right: 14, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 10 }]}>
          <TouchableOpacity style={cutStyles.togglePillInner} onPress={toggle} activeOpacity={0.8}>
            <Text style={[cutStyles.toggleText, { fontFamily: "Inter_500Medium" }]}>Landscaper View</Text>
            <Ionicons name="sync-outline" size={13} color="#34FF7A" />
          </TouchableOpacity>
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
              <TouchableOpacity style={menuStyles.item} activeOpacity={0.8} onPress={() => { setLsMenuVisible(false); logout(); }}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={[menuStyles.itemText, { fontFamily: "Inter_500Medium", color: "#ef4444" }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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

        {/* Business name + badges + location — all centered */}
        <Text style={[cutStyles.heroName, { fontFamily: "Inter_700Bold" }]}>{profileName}</Text>
        <View style={cutStyles.heroBadgeRow}>
          <View style={cutStyles.ratingPill}>
            <Text style={[cutStyles.ratingPillText, { fontFamily: "Inter_600SemiBold" }]}>★ 4.9</Text>
          </View>
          <View style={cutStyles.proBadge}>
            <Text style={[cutStyles.proBadgeText, { fontFamily: "Inter_700Bold" }]}>PRO</Text>
          </View>
          <Text style={[cutStyles.jobsText, { fontFamily: "Inter_400Regular" }]}>142 jobs</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
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
        {(["info", "reviews", "services"] as LandscaperTab[]).map((tab) => (
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
            {/* Quick actions */}
            <View style={cutStyles.actionsRow}>
              {([
                { ionIcon: "star-outline" as const,          label: "ADD" },
                { ionIcon: "calendar-outline" as const,      label: "BOOK" },
                { ionIcon: "create-outline" as const,        label: "REVIEW", onPress: () => setActiveTab("reviews") },
                {
                  ionIcon: "share-social-outline" as const,
                  label: "SHARE",
                  onPress: () => {
                    Share.share({
                      title: "GreenScape Pros on TheLawn",
                      message: "Check out GreenScape Pros on TheLawn — top-rated landscaping near you! https://thelawn.app",
                      url: "https://thelawn.app",
                    }).catch(() => {});
                  },
                },
              ]).map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  style={cutStyles.actionChip}
                  onPress={btn.onPress ?? (() => Alert.alert(btn.label, `${btn.label} action`))}
                  activeOpacity={0.75}
                >
                  <Ionicons name={btn.ionIcon} size={20} color="#fff" style={{ marginBottom: 4 }} />
                  <Text style={[cutStyles.actionChipLabel, { fontFamily: "Inter_600SemiBold" }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* About */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>ABOUT</Text>
            <View style={cutStyles.card}>
              <Text style={[cutStyles.aboutText, { fontFamily: "Inter_400Regular" }]}>
                {profileBio}
              </Text>
            </View>

            {/* Call & Text */}
            <View style={cutStyles.contactRow}>
              <TouchableOpacity style={cutStyles.contactBtn} onPress={() => Alert.alert("Calling…", "Connecting to GreenScape Pros.\n\n(Demo)")} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={22} color="#34FF7A" />
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cutStyles.contactBtn} onPress={() => Alert.alert("Texting…", "Opening chat with GreenScape Pros.\n\n(Demo)")} activeOpacity={0.8}>
                <Ionicons name="chatbubble-outline" size={22} color="#34FF7A" />
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Service & Availability — read-only, reflects My Services settings */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>SERVICE & AVAILABILITY</Text>
            <View style={cutStyles.card}>
              {/* Location */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Ionicons name="location-outline" size={18} color="#CCCCCC" />
                <Text style={[cutStyles.addrLine, { fontFamily: "Inter_500Medium", color: "#fff" }]}>
                  {profileCity}, {profileState} {profileZip}
                </Text>
              </View>

              {/* Days available across all services */}
              <Text style={[availStyles.hoursLabel, { fontFamily: "Inter_500Medium", marginBottom: 8 }]}>AVAILABLE DAYS</Text>
              <View style={[availStyles.daysRow, { marginBottom: 16 }]}>
                {DAYS.map((day) => (
                  <View key={day} style={[availStyles.dayChip, allAvailDays[day] && availStyles.dayChipOn]}>
                    <Text style={[availStyles.dayChipText, { fontFamily: "Inter_600SemiBold" }, allAvailDays[day] && availStyles.dayChipTextOn]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={availStyles.readOnlyNote}>
                <Ionicons name="information-circle-outline" size={14} color="#34FF7A" />
                <Text style={[availStyles.readOnlyNoteText, { fontFamily: "Inter_400Regular" }]}>
                  Hours and per-service availability are managed in{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: "#34FF7A" }}>My Services</Text>.
                </Text>
              </View>

              {/* Monthly Schedule Calendar */}
              <Text style={[availStyles.hoursLabel, { fontFamily: "Inter_500Medium", marginBottom: 12, marginTop: 16 }]}>MONTHLY SCHEDULE (NEXT 4 WEEKS)</Text>
              <View style={availStyles.calGrid}>
                {monthDates.map((d, i) => {
                  const dateKey = `${d.month} ${d.dateNum}, ${d.year}`;
                  const hasBookings = (bookedSlots[dateKey] ?? []).length > 0;
                  const isAvail = !!allAvailDays[d.label];
                  const isCalSelected = calendarSelectedDate === dateKey;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        availStyles.calCell,
                        isAvail && availStyles.calCellAvail,
                        isCalSelected && availStyles.calCellSelected,
                        hasBookings && availStyles.calCellHasBookings,
                      ]}
                      onPress={() => setCalendarSelectedDate(isCalSelected ? null : dateKey)}
                      activeOpacity={0.75}
                    >
                      <Text style={[availStyles.calCellLabel, { fontFamily: "Inter_400Regular" }, isAvail ? { color: "rgba(0,0,0,0.6)" } : { color: "#777" }]}>
                        {d.label.slice(0, 2)}
                      </Text>
                      <Text style={[availStyles.calCellDate, { fontFamily: "Inter_700Bold" }, isAvail ? { color: "#000" } : { color: "#777" }]}>
                        {d.dateNum}
                      </Text>
                      {hasBookings && <View style={availStyles.calDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {calendarSelectedDate && (
                <View style={availStyles.calSlotList}>
                  <Text style={[availStyles.hoursLabel, { fontFamily: "Inter_600SemiBold", marginBottom: 8 }]}>
                    {calendarSelectedDate}
                  </Text>
                  {(bookedSlots[calendarSelectedDate] ?? []).length === 0 ? (
                    <Text style={[{ fontSize: 13, color: "#BBBBBB" }, { fontFamily: "Inter_400Regular" }]}>No bookings this day.</Text>
                  ) : (
                    (bookedSlots[calendarSelectedDate] ?? []).map((slot, i) => (
                      <View key={i} style={availStyles.calSlotRow}>
                        <Ionicons name="time-outline" size={14} color="#34FF7A" />
                        <Text style={[availStyles.calSlotText, { fontFamily: "Inter_500Medium" }]}>{slot.time}</Text>
                        <Text style={[availStyles.calSlotDur, { fontFamily: "Inter_400Regular" }]}>
                          {slot.service} · {slot.durationMinutes} min
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
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
                : servicePhotos.map((uri, i) => (
                    <View key={i} style={cutStyles.photoCell}>
                      <Image source={{ uri }} style={cutStyles.photoImage} />
                    </View>
                  ))
              }
            </View>

            {/* Legal */}
            <View style={[styles.legalCard, { marginTop: 24 }]}>
              <Text style={[styles.legalCardTitle, { fontFamily: "Inter_600SemiBold" }]}>Legal</Text>
              <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("terms")} activeOpacity={0.7}>
                <Ionicons name="document-text-outline" size={18} color="#CCCCCC" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={16} color="#777" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
              <View style={styles.legalDivider} />
              <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#CCCCCC" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color="#777" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
              <View style={styles.legalDivider} />
              <Text style={[styles.legalDisclaimer, { fontFamily: "Inter_400Regular" }]}>
                TheLawn is a marketplace platform. All services are performed by independent contractors.
              </Text>
            </View>

            {/* Privacy Settings */}
            <View style={[styles.legalCard, { marginTop: 0 }]}>
              <TouchableOpacity
                style={styles.legalRow}
                onPress={() => { Haptics.selectionAsync(); setPrivacyVisible(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#CCCCCC" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_500Medium" }]}>Privacy Settings</Text>
                <Ionicons name="chevron-forward" size={16} color="#777" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
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
            {/* Write-a-review form */}
            <View style={cutStyles.card}>
              <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold", marginBottom: 10 }]}>WRITE A REVIEW</Text>
              <TextInput
                style={[cutStyles.reviewInput, { fontFamily: "Inter_400Regular" }]}
                value={newReviewText}
                onChangeText={setNewReviewText}
                placeholder="What did you think of the service?"
                placeholderTextColor="#777"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity style={cutStyles.postReviewBtn} onPress={submitReview} activeOpacity={0.85}>
                <Text style={[cutStyles.postReviewBtnText, { fontFamily: "Inter_600SemiBold" }]}>Post Review</Text>
              </TouchableOpacity>
            </View>

            {/* Rating overview */}
            <View style={cutStyles.ratingHeader}>
              <Text style={[cutStyles.ratingBig, { fontFamily: "Inter_700Bold" }]}>4.9</Text>
              <View>
                <Text style={cutStyles.starsRow}>★★★★★</Text>
                <Text style={[cutStyles.ratingSubtext, { fontFamily: "Inter_400Regular" }]}>{reviews.length} reviews</Text>
              </View>
            </View>

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
                          setReviews((prev) => prev.map((rev, idx) =>
                            idx === i
                              ? { ...rev, replies: [...rev.replies, { text: t, author: "GreenScape Pros", date: "Just now" }] }
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

        {/* ── SERVICES TAB ── */}
        {activeTab === "services" && (
          <>
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>OUR SERVICES & PRICING</Text>
            <View style={availStyles.readOnlyNote}>
              <Ionicons name="information-circle-outline" size={14} color="#34FF7A" />
              <Text style={[availStyles.readOnlyNoteText, { fontFamily: "Inter_400Regular" }]}>
                Prices are set per service in{" "}
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#34FF7A" }}>My Services</Text>.
              </Text>
            </View>
            {myServices.offered.map((svc) => {
              const tiers = myServices.pricing[svc] ?? [];
              return (
                <View key={svc} style={[cutStyles.card, { marginBottom: 12 }]}>
                  <Text style={[cutStyles.svcCardName, { fontFamily: "Inter_600SemiBold" }]}>{svc}</Text>
                  <View style={cutStyles.svcPriceRow}>
                    {tiers.map((tier) => (
                      <View key={tier.label} style={cutStyles.svcPriceCell}>
                        <Text style={[cutStyles.svcColLabel, { fontFamily: "Inter_400Regular" }]}>{tier.label}</Text>
                        <Text style={[cutStyles.svcColSub, { fontFamily: "Inter_400Regular" }]}>{tier.range}</Text>
                        <Text style={[cutStyles.svcPrice, { fontFamily: "Inter_700Bold" }]}>{tier.price}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            {myServices.offered.length === 0 && (
              <Text style={[{ fontSize: 13, color: "#777", textAlign: "center", marginTop: 12 }, { fontFamily: "Inter_400Regular" }]}>
                No services enabled. Open My Services to configure them.
              </Text>
            )}
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
                { label: "Business Name", value: draftName, onChange: setDraftName, placeholder: "GreenScape Pros", multiline: false },
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
    </View>
  );
}

// ── Customer Profile ──────────────────────────────────────────────────────────

function CustomerProfile({ logout }: { logout: () => void }) {
  const { setAvatarUri, preferredPayment, setPreferredPayment } = useAuth();
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
      setAvatarImage(result.assets[0].uri);
      setAvatarUri(result.assets[0].uri);
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
          <Text style={[styles.proName, { fontFamily: "Inter_700Bold" }]}>Zamire Smith</Text>
          <Text style={[styles.proSub, { fontFamily: "Inter_400Regular" }]}>Ellenton, FL</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Email</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>zamire@example.com</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoKey, { fontFamily: "Inter_500Medium" }]}>Birthday</Text>
          <Text style={[styles.infoVal, { fontFamily: "Inter_400Regular" }]}>March 15, 1995</Text>
        </View>
      </View>

      {preferredPayment && (
        <View style={custPayStyles.preferredBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#34FF7A" />
          <View style={{ flex: 1 }}>
            <Text style={[custPayStyles.preferredBannerTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Preferred Payment Active
            </Text>
            <Text style={[custPayStyles.preferredBannerSub, { fontFamily: "Inter_400Regular" }]}>
              {preferredPayment} · Auto-selected at checkout
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.paymentCard, error && styles.paymentCardError]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <Text style={[styles.paymentLabel, { fontFamily: "Inter_500Medium", marginBottom: 0 }]}>Preferred Payment Method</Text>
          {preferredPayment && (
            <View style={custPayStyles.activePill}>
              <Text style={[custPayStyles.activePillText, { fontFamily: "Inter_700Bold" }]}>ACTIVE</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentTilesRow} style={{ marginHorizontal: -6 }}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedPayment === method.value;
            const isPreferred = preferredPayment === method.value;
            return (
              <TouchableOpacity key={method.value} style={[styles.paymentTile, isSelected && styles.paymentTileActive]} onPress={() => { setSelectedPayment(method.value); setError(false); Haptics.selectionAsync(); }} activeOpacity={0.75}>
                <Ionicons name={method.ionIcon} size={28} color={isSelected ? "#34FF7A" : "#888"} />
                <Text style={[styles.paymentTileLabel, { fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular" }, isSelected && styles.paymentTileLabelActive]}>{method.shortLabel}</Text>
                {isPreferred && (
                  <View style={custPayStyles.preferredPip}>
                    <Text style={[custPayStyles.preferredPipText, { fontFamily: "Inter_700Bold" }]}>★</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={custPayStyles.inPersonNote}>
          <Ionicons name="handshake-outline" size={14} color="#34FF7A" />
          <Text style={[custPayStyles.inPersonNoteText, { fontFamily: "Inter_400Regular" }]}>
            <Text style={{ fontFamily: "Inter_600SemiBold", color: "#34FF7A" }}>In Person</Text>
            {" "}— pay your landscaper directly on the day of service. No funds held online.
          </Text>
        </View>
        {error && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Ionicons name="warning-outline" size={15} color="#f87171" />
            <Text style={[styles.errorMsg, { fontFamily: "Inter_400Regular" }]}>Please select a payment method</Text>
          </View>
        )}
        {paymentState !== "success" ? (
          <TouchableOpacity style={[styles.savePaymentBtn, paymentState === "loading" && styles.savePaymentBtnLoading]} onPress={paymentState === "idle" ? savePayment : undefined} activeOpacity={0.85}>
            {paymentState === "loading" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={[styles.savePaymentText, { fontFamily: "Inter_600SemiBold" }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={[styles.savePaymentText, { fontFamily: "Inter_600SemiBold" }]}>Save Preferred Payment Method</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Animated.View style={[styles.successBox, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
            <Ionicons name="checkmark-circle" size={32} color="#34FF7A" />
            <Text style={[styles.savedMsg, { fontFamily: "Inter_600SemiBold" }]}>Payment method saved successfully!</Text>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert("Edit Profile", "Profile editor would open here")} activeOpacity={0.85}>
        <Text style={[styles.editBtnText, { fontFamily: "Inter_600SemiBold" }]}>Edit Profile Settings</Text>
      </TouchableOpacity>

      <View style={styles.legalCard}>
        <Text style={[styles.legalCardTitle, { fontFamily: "Inter_600SemiBold" }]}>Legal</Text>
        <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("terms")} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={18} color="#CCCCCC" />
          <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#777" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
        <View style={styles.legalDivider} />
        <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#CCCCCC" />
          <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#777" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
        <View style={styles.legalDivider} />
        <Text style={[styles.legalDisclaimer, { fontFamily: "Inter_400Regular" }]}>
          TheLawn is a marketplace platform. All services are performed by independent contractors. TheLawn is not liable for damages, injuries, or disputes arising from booked services.
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
      </TouchableOpacity>

      {termsDoc && <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />}
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
  actionChipIcon: { fontSize: 18 },
  actionChipLabel: { fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  sectionHeading: { fontSize: 12, color: "#CCCCCC", letterSpacing: 1.4, marginBottom: 10, marginTop: 4 },

  card: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#222222", marginBottom: 20 },
  aboutText: { fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 22 },

  contactRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  contactBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1A1A1A", borderWidth: 1.5, borderColor: "#34FF7A", borderRadius: 28, paddingVertical: 16 },
  contactIcon: { fontSize: 22 },
  contactLabel: { fontSize: 16, color: "#34FF7A" },

  addrName: { fontSize: 15, color: "#FFFFFF", marginBottom: 4 },
  addrLine: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14 },
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
  photoCell: { width: "47%", aspectRatio: 16 / 9, backgroundColor: "#1A1A1A", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222222", overflow: "hidden" },
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
  reviewAuthor: { fontSize: 12, color: "#BBBBBB", marginTop: 8 },

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
  infoKey: { fontSize: 13, color: "#BBBBBB" },
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

