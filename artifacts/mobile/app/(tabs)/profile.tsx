import React, { useState, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";
import TermsModal from "@/components/TermsModal";

const PAYMENT_METHODS = [
  { label: "🍎  Apple Pay", value: "Apple Pay",  emoji: "🍎", shortLabel: "Apple Pay" },
  { label: "💸  Venmo",     value: "Venmo",       emoji: "💸", shortLabel: "Venmo" },
  { label: "🅿️  PayPal",   value: "PayPal",      emoji: "🅿️", shortLabel: "PayPal" },
  { label: "💳  Debit Card",value: "Debit Card",  emoji: "💳", shortLabel: "Debit" },
  { label: "📱  Cash App",  value: "Cash App",    emoji: "📱", shortLabel: "Cash App" },
];

type PriceMatrix = Record<string, Record<string, string>>;

const PRICE_SERVICES = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Clean Up"];
const YARD_COLS = [
  { key: "Small",  label: "Small",  sub: "< 5k sq ft" },
  { key: "Medium", label: "Medium", sub: "5–10k sq ft" },
  { key: "Large",  label: "Large",  sub: "10k+ sq ft" },
];
const DEFAULT_PRICE_MATRIX: Record<string, Record<string, string>> = {
  "Lawn Mowing":    { Small: "45",  Medium: "65",  Large: "120" },
  "Hedge Trimming": { Small: "55",  Medium: "75",  Large: "95"  },
  "Mulching":       { Small: "110", Medium: "140", Large: "180" },
  "Clean Up":       { Small: "30",  Medium: "40",  Large: "55"  },
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role, logout } = useAuth();
  const [isLandscaper, setIsLandscaper] = useState(role === "landscaper");
  const [matrix, setMatrix] = useState<PriceMatrix>(
    JSON.parse(JSON.stringify(DEFAULT_PRICE_MATRIX))
  );

  const toggle = () => {
    Haptics.selectionAsync();
    setIsLandscaper((v) => !v);
  };

  if (isLandscaper) {
    return (
      <LandscaperProfile
        matrix={matrix}
        setMatrix={setMatrix}
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
        <TouchableOpacity style={styles.togglePill} onPress={toggle} activeOpacity={0.8}>
          <Text style={[styles.togglePillText, { fontFamily: "Inter_500Medium" }]}>Customer View</Text>
          <Text style={styles.toggleIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={picStyles.row}>
        <TouchableOpacity
          style={picStyles.avatar}
          activeOpacity={0.8}
          onPress={() => Alert.alert("Change Profile Picture", "This would open your photo library on a real device.", [{ text: "OK" }])}
        >
          <Text style={picStyles.avatarEmoji}>👤</Text>
        </TouchableOpacity>
        <View style={picStyles.nameCol}>
          <Text style={[picStyles.displayName, { fontFamily: "Inter_600SemiBold" }]}>Your Account</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => Alert.alert("Change Profile Picture", "This would open your photo library on a real device.", [{ text: "OK" }])}>
            <Text style={[picStyles.changeLink, { fontFamily: "Inter_500Medium" }]}>📸  Change profile picture</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <CustomerProfile logout={logout} />
      </ScrollView>
    </View>
  );
}

// ── Landscaper Profile – Cut App Style ────────────────────────────────────────

type LandscaperTab = "info" | "reviews" | "services";
type ReviewItem = { text: string; author: string; date: string; stars: number };

function LandscaperProfile({
  matrix,
  setMatrix,
  topPadding,
  toggle,
  logout,
}: {
  matrix: PriceMatrix;
  setMatrix: React.Dispatch<React.SetStateAction<PriceMatrix>>;
  topPadding: number;
  toggle: () => void;
  logout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<LandscaperTab>("info");
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const [heroBackground, setHeroBackground] = useState<string | null>(null);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [servicePhotos, setServicePhotos] = useState<string[]>([]);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [privVisible, setPrivVisible] = useState(true);
  const [privPrices, setPrivPrices] = useState(false);
  const [privReviews, setPrivReviews] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([
    { text: '"John did an amazing job on our yard – very professional and on time!"', author: "Sarah M.", date: "4 days ago", stars: 5 },
    { text: '"Reliable, on time, and the yard looks fantastic every time. Highly recommend."', author: "Marcus T.", date: "2 weeks ago", stars: 5 },
    { text: '"Great hedge trimming, left the property spotless. Will book again."', author: "Alex R.", date: "3 weeks ago", stars: 5 },
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
    if (!result.canceled) setAvatarImage(result.assets[0].uri);
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
      { text: `"${text}"`, author: "You", date: "Just now", stars: 5 },
      ...prev,
    ]);
    setNewReviewText("");
    Alert.alert("✅ Review posted!");
  }

  return (
    <View style={cutStyles.container}>

      {/* ── Hero — matches customer-facing full-screen profile ── */}
      <View style={[cutStyles.hero, { paddingTop: topPadding + 16 }]}>
        {heroBackground ? (
          <Image source={{ uri: heroBackground }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        ) : null}
        <View style={cutStyles.heroOverlay} />

        {/* Toggle pill — top right */}
        <TouchableOpacity style={cutStyles.togglePill} onPress={toggle} activeOpacity={0.8}>
          <Text style={[cutStyles.toggleText, { fontFamily: "Inter_500Medium" }]}>Landscaper View</Text>
          <Text style={{ fontSize: 13 }}>🔄</Text>
        </TouchableOpacity>

        {/* Edit Banner — top left */}
        <TouchableOpacity style={cutStyles.editBannerBtn} onPress={pickHeroBackground} activeOpacity={0.8}>
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
        <Text style={[cutStyles.heroName, { fontFamily: "Inter_700Bold" }]}>GreenScape Pros</Text>
        <View style={cutStyles.heroBadgeRow}>
          <View style={cutStyles.ratingPill}>
            <Text style={[cutStyles.ratingPillText, { fontFamily: "Inter_600SemiBold" }]}>★ 4.9</Text>
          </View>
          <View style={cutStyles.proBadge}>
            <Text style={[cutStyles.proBadgeText, { fontFamily: "Inter_700Bold" }]}>PRO</Text>
          </View>
          <Text style={[cutStyles.jobsText, { fontFamily: "Inter_400Regular" }]}>142 jobs</Text>
        </View>
        <Text style={[cutStyles.heroLocation, { fontFamily: "Inter_400Regular" }]}>
          📍 Sarasota / Ellenton, FL
        </Text>
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
              {[
                { icon: "⭐", label: "ADD" },
                { icon: "📅", label: "BOOK" },
                { icon: "✍️", label: "REVIEW", onPress: () => setActiveTab("reviews") },
                { icon: "🔗", label: "SHARE" },
              ].map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  style={cutStyles.actionChip}
                  onPress={btn.onPress ?? (() => Alert.alert(btn.label, `${btn.label} action`))}
                  activeOpacity={0.75}
                >
                  <Text style={cutStyles.actionChipIcon}>{btn.icon}</Text>
                  <Text style={[cutStyles.actionChipLabel, { fontFamily: "Inter_600SemiBold" }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* About */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>ABOUT</Text>
            <View style={cutStyles.card}>
              <Text style={[cutStyles.aboutText, { fontFamily: "Inter_400Regular" }]}>
                Professional landscaping services with over 10 years of experience. We specialize in lawn care, hedge trimming, mulching, and clean-up for residential properties in the Sarasota / Ellenton area.
              </Text>
            </View>

            {/* Call & Text */}
            <View style={cutStyles.contactRow}>
              <TouchableOpacity style={cutStyles.contactBtn} onPress={() => Alert.alert("📞 Calling…", "Connecting to GreenScape Pros.\n\n(Demo)")} activeOpacity={0.8}>
                <Text style={cutStyles.contactIcon}>📞</Text>
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cutStyles.contactBtn} onPress={() => Alert.alert("💬 Texting…", "Opening chat with GreenScape Pros.\n\n(Demo)")} activeOpacity={0.8}>
                <Text style={cutStyles.contactIcon}>💬</Text>
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Address & Hours */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>ADDRESS & HOURS</Text>
            <View style={cutStyles.card}>
              <Text style={[cutStyles.addrName, { fontFamily: "Inter_600SemiBold" }]}>GreenScape Pros</Text>
              <Text style={[cutStyles.addrLine, { fontFamily: "Inter_400Regular" }]}>4627 Hall's Mill Crossing · Ellenton, FL 34222</Text>
              <View style={cutStyles.mapBox}>
                <Text style={cutStyles.mapPin}>📍</Text>
                <Text style={[cutStyles.mapText, { fontFamily: "Inter_400Regular" }]}>Interactive Map · Sarasota / Ellenton Area</Text>
              </View>
              <View style={cutStyles.hoursGrid}>
                <View style={cutStyles.hoursCell}>
                  <Text style={[cutStyles.hoursDayText, { fontFamily: "Inter_400Regular" }]}>Monday – Saturday</Text>
                  <Text style={[cutStyles.hoursTimeText, { fontFamily: "Inter_600SemiBold" }]}>8:00 AM – 6:00 PM</Text>
                </View>
                <View style={cutStyles.hoursCell}>
                  <Text style={[cutStyles.hoursDayText, { fontFamily: "Inter_400Regular" }]}>Sunday</Text>
                  <Text style={[cutStyles.hoursClosedText, { fontFamily: "Inter_500Medium" }]}>Closed</Text>
                </View>
              </View>
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
                ? ["🌿", "✂️", "🪴", "🧹"].map((emoji, i) => (
                    <View key={i} style={cutStyles.photoCell}>
                      <Text style={cutStyles.photoEmoji}>{emoji}</Text>
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
                <Ionicons name="document-text-outline" size={18} color="#AAAAAA" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: "auto" }} />
              </TouchableOpacity>
              <View style={styles.legalDivider} />
              <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#AAAAAA" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: "auto" }} />
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
                <Ionicons name="lock-closed-outline" size={18} color="#AAAAAA" />
                <Text style={[styles.legalRowText, { fontFamily: "Inter_500Medium" }]}>Privacy Settings</Text>
                <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: "auto" }} />
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
                      Alert.alert("✅ Privacy settings saved");
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
                placeholderTextColor="#555"
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
                <Text style={cutStyles.reviewStars}>{"★".repeat(r.stars)}</Text>
                <Text style={[cutStyles.reviewText, { fontFamily: "Inter_400Regular" }]}>{r.text}</Text>
                <Text style={[cutStyles.reviewAuthor, { fontFamily: "Inter_400Regular" }]}>— {r.author} · {r.date}</Text>
              </View>
            ))}
          </>
        )}

        {/* ── SERVICES TAB ── */}
        {activeTab === "services" && (
          <>
            {/* Read-only price cards */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>OUR SERVICES & PRICING</Text>
            {PRICE_SERVICES.map((svc) => (
              <View key={svc} style={[cutStyles.card, { marginBottom: 12 }]}>
                <Text style={[cutStyles.svcCardName, { fontFamily: "Inter_600SemiBold" }]}>{svc}</Text>
                <View style={cutStyles.svcPriceRow}>
                  {YARD_COLS.map((col) => (
                    <View key={col.key} style={cutStyles.svcPriceCell}>
                      <Text style={[cutStyles.svcColLabel, { fontFamily: "Inter_400Regular" }]}>{col.label}</Text>
                      <Text style={[cutStyles.svcColSub, { fontFamily: "Inter_400Regular" }]}>{col.sub}</Text>
                      <Text style={[cutStyles.svcPrice, { fontFamily: "Inter_700Bold" }]}>
                        ${matrix[svc][col.key]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Editable price matrix */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>EDIT PRICES</Text>
            <PriceMatrixEditor matrix={matrix} setMatrix={setMatrix} />
          </>
        )}

      </ScrollView>

      {termsDoc && (
        <TermsModal visible={true} docType={termsDoc} onClose={() => setTermsDoc(null)} />
      )}
    </View>
  );
}

// ── Price Matrix Editor ───────────────────────────────────────────────────────

function PriceMatrixEditor({
  matrix,
  setMatrix,
}: {
  matrix: PriceMatrix;
  setMatrix: React.Dispatch<React.SetStateAction<PriceMatrix>>;
}) {
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "loading" | "success">("idle");
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  const savePrices = () => {
    Haptics.selectionAsync();
    setSaveState("loading");
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaveState("success");
      Animated.parallel([
        Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: false }),
      ]).start();
      setTimeout(() => {
        setSaveState("idle");
        successOpacity.setValue(0);
        successScale.setValue(0.8);
      }, 2500);
    }, 1200);
  };

  return (
    <View style={styles.priceCard}>
      <Text style={[styles.priceCardTitle, { fontFamily: "Inter_600SemiBold" }]}>Service Prices by Yard Size</Text>
      {PRICE_SERVICES.map((svc, si) => (
        <View key={svc} style={[styles.priceMatrixCard, si > 0 && { marginTop: 12 }]}>
          <Text style={[styles.priceServiceLabel, { fontFamily: "Inter_500Medium" }]}>{svc}</Text>
          <View style={styles.priceMatrixRow}>
            {YARD_COLS.map((col) => {
              const cellKey = `${svc}:${col.key}`;
              const isFocused = focusedCell === cellKey;
              return (
                <View key={col.key} style={styles.priceMatrixCell}>
                  <Text style={[styles.priceMatrixColLabel, { fontFamily: "Inter_400Regular" }]}>{col.label}</Text>
                  <Text style={[styles.priceMatrixColSub, { fontFamily: "Inter_400Regular" }]}>{col.sub}</Text>
                  <View style={[styles.priceInputWrapper, isFocused && styles.priceInputWrapperFocused]}>
                    <Text style={[styles.priceDollar, isFocused && { color: "#34FF7A" }]}>$</Text>
                    <TextInput
                      style={[styles.priceInput, { fontFamily: "Inter_600SemiBold" }, isFocused && { color: "#34FF7A" }]}
                      value={matrix[svc][col.key]}
                      onChangeText={(t) => setMatrix((m) => ({ ...m, [svc]: { ...m[svc], [col.key]: t.replace(/[^0-9]/g, "") } }))}
                      onFocus={() => setFocusedCell(cellKey)}
                      onBlur={() => setFocusedCell(null)}
                      keyboardType="numeric"
                      maxLength={5}
                      selectTextOnFocus
                      placeholderTextColor="#555"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      {saveState !== "success" ? (
        <TouchableOpacity
          style={[styles.savePricesBtn, saveState === "loading" && styles.savePricesBtnLoading]}
          onPress={saveState === "idle" ? savePrices : undefined}
          activeOpacity={0.85}
        >
          {saveState === "loading" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" color="#000" />
              <Text style={[styles.savePricesBtnText, { fontFamily: "Inter_600SemiBold" }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={[styles.savePricesBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Prices</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Animated.View style={[styles.successBox, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <Ionicons name="checkmark-circle" size={32} color="#34FF7A" />
          <Text style={[styles.savedMsg, { fontFamily: "Inter_600SemiBold" }]}>Prices saved!</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Customer Profile ──────────────────────────────────────────────────────────

function CustomerProfile({ logout }: { logout: () => void }) {
  const [selectedPayment, setSelectedPayment] = useState("");
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState(false);
  const [termsDoc, setTermsDoc] = useState<"terms" | "privacy" | null>(null);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaymentState("success");
      showSuccess();
      setTimeout(() => { setPaymentState("idle"); successOpacity.setValue(0); successScale.setValue(0.8); }, 2500);
    }, 1400);
  };

  return (
    <>
      <View style={styles.avatarRow}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={40} color="#34FF7A" />
        </View>
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

      <View style={[styles.paymentCard, error && styles.paymentCardError]}>
        <Text style={[styles.paymentLabel, { fontFamily: "Inter_500Medium" }]}>Choose Payment Method</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentTilesRow} style={{ marginHorizontal: -6 }}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedPayment === method.value;
            return (
              <TouchableOpacity key={method.value} style={[styles.paymentTile, isSelected && styles.paymentTileActive]} onPress={() => { setSelectedPayment(method.value); setError(false); Haptics.selectionAsync(); }} activeOpacity={0.75}>
                <Text style={styles.paymentTileEmoji}>{method.emoji}</Text>
                <Text style={[styles.paymentTileLabel, { fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular" }, isSelected && styles.paymentTileLabelActive]}>{method.shortLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {error && <Text style={[styles.errorMsg, { fontFamily: "Inter_400Regular" }]}>⚠️ Please select a payment method</Text>}
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
          <Ionicons name="document-text-outline" size={18} color="#AAAAAA" />
          <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
        <View style={styles.legalDivider} />
        <TouchableOpacity style={styles.legalRow} onPress={() => setTermsDoc("privacy")} activeOpacity={0.7}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#AAAAAA" />
          <Text style={[styles.legalRowText, { fontFamily: "Inter_400Regular" }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#444" style={{ marginLeft: "auto" }} />
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

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#0A0A0A",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "#34FF7A" },
  tabText: { fontSize: 12, color: "#888888", letterSpacing: 0.8 },
  tabTextActive: { color: "#34FF7A" },

  tabContent: { padding: 20, paddingBottom: 60 },

  actionsRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 24 },
  actionChip: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 999, paddingVertical: 10, alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#2A2A2A" },
  actionChipIcon: { fontSize: 18 },
  actionChipLabel: { fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  sectionHeading: { fontSize: 12, color: "#AAAAAA", letterSpacing: 1.4, marginBottom: 10, marginTop: 4 },

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
  reviewAuthor: { fontSize: 12, color: "#555", marginTop: 8 },

  svcCardName: { fontSize: 15, color: "#FFFFFF", marginBottom: 14 },
  svcPriceRow: { flexDirection: "row", gap: 8 },
  svcPriceCell: { flex: 1, alignItems: "center", gap: 3 },
  svcColLabel: { fontSize: 11, color: "#AAAAAA" },
  svcColSub: { fontSize: 9, color: "#555" },
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
  avatarBox: { width: 80, height: 80, backgroundColor: "#1A1A1A", borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#34FF7A" },
  proName: { fontSize: 18, color: "#FFFFFF", marginBottom: 2 },
  proSub: { fontSize: 12, color: "#FFFFFF", marginBottom: 6 },
  card: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#222222", marginVertical: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  infoKey: { fontSize: 13, color: "#555" },
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
  priceCardTitle: { fontSize: 13, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 },
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
  priceMatrixCard: { backgroundColor: "#0a0a0a", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#222222" },
  priceMatrixRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  priceMatrixCell: { flex: 1, alignItems: "center", gap: 3 },
  priceMatrixColLabel: { fontSize: 11, color: "#AAAAAA" },
  priceMatrixColSub: { fontSize: 9, color: "#555555", marginBottom: 2 },
  legalCard: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#222222", marginBottom: 12, marginTop: 8 },
  legalCardTitle: { fontSize: 13, color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  legalRowText: { fontSize: 14, color: "#FFFFFF", flex: 1 },
  legalDivider: { height: 1, backgroundColor: "#2A2A2A", marginVertical: 2 },
  legalDisclaimer: { fontSize: 11, color: "#555", lineHeight: 17, marginTop: 10 },
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
