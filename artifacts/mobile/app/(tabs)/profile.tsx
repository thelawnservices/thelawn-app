import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
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

  return (
    <View style={cutStyles.container}>
      {/* ── Hero Banner ─────────────────────────────── */}
      <View style={[cutStyles.hero, { paddingTop: topPadding + 8 }]}>
        {/* Toggle pill top-right */}
        <TouchableOpacity style={cutStyles.togglePill} onPress={toggle} activeOpacity={0.8}>
          <Text style={[cutStyles.toggleText, { fontFamily: "Inter_500Medium" }]}>Landscaper View</Text>
          <Text style={{ fontSize: 13 }}>🔄</Text>
        </TouchableOpacity>

        {/* Circular avatar */}
        <View style={cutStyles.avatarCircle}>
          <Ionicons name="leaf" size={52} color="#000" />
        </View>

        {/* Rating badge */}
        <View style={cutStyles.ratingBadge}>
          <Text style={[cutStyles.ratingText, { fontFamily: "Inter_700Bold" }]}>★ 4.9</Text>
          <Text style={[cutStyles.ratingCount, { fontFamily: "Inter_400Regular" }]}>(142)</Text>
        </View>

        {/* Business name */}
        <View style={cutStyles.heroNameBox}>
          <Text style={[cutStyles.heroName, { fontFamily: "Inter_700Bold" }]}>GreenScape Pros</Text>
          <Text style={[cutStyles.heroSub, { fontFamily: "Inter_400Regular" }]}>Est. 2019 · Ellenton, FL</Text>
        </View>
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

        {activeTab === "info" && (
          <>
            {/* Quick action buttons */}
            <View style={cutStyles.actionsRow}>
              {[
                { icon: "⭐", label: "ADD" },
                { icon: "📅", label: "BOOK" },
                { icon: "✍️", label: "REVIEW" },
                { icon: "🔗", label: "SHARE" },
              ].map((btn) => (
                <TouchableOpacity
                  key={btn.label}
                  style={cutStyles.actionChip}
                  onPress={() => Alert.alert(btn.label, `${btn.label} action tapped`)}
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
              <TouchableOpacity
                style={cutStyles.contactBtn}
                onPress={() => Alert.alert("📞 Calling…", "Connecting to GreenScape Pros.\n\n(Demo)")}
                activeOpacity={0.8}
              >
                <Text style={cutStyles.contactIcon}>📞</Text>
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={cutStyles.contactBtn}
                onPress={() => Alert.alert("💬 Texting…", "Opening chat with GreenScape Pros.\n\n(Demo)")}
                activeOpacity={0.8}
              >
                <Text style={cutStyles.contactIcon}>💬</Text>
                <Text style={[cutStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Address & Hours */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>ADDRESS & HOURS</Text>
            <View style={cutStyles.card}>
              <Text style={[cutStyles.addrName, { fontFamily: "Inter_600SemiBold" }]}>GreenScape Pros</Text>
              <Text style={[cutStyles.addrLine, { fontFamily: "Inter_400Regular" }]}>
                4627 Hall's Mill Crossing · Ellenton, FL 34222
              </Text>

              {/* Map placeholder */}
              <View style={cutStyles.mapBox}>
                <Text style={cutStyles.mapPin}>📍</Text>
                <Text style={[cutStyles.mapText, { fontFamily: "Inter_400Regular" }]}>
                  Interactive Map · Sarasota / Ellenton Area
                </Text>
              </View>

              {/* Hours grid */}
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

            {/* Photos */}
            <Text style={[cutStyles.sectionHeading, { fontFamily: "Inter_600SemiBold" }]}>PHOTOS</Text>
            <View style={cutStyles.photosGrid}>
              {["🌿", "✂️", "🪴", "🧹"].map((emoji, i) => (
                <View key={i} style={cutStyles.photoCell}>
                  <Text style={cutStyles.photoEmoji}>{emoji}</Text>
                </View>
              ))}
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
                The Lawn is a marketplace platform. All services are performed by independent contractors.
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
              <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === "reviews" && (
          <>
            <View style={cutStyles.ratingHeader}>
              <Text style={[cutStyles.ratingBig, { fontFamily: "Inter_700Bold" }]}>4.9</Text>
              <View>
                <Text style={cutStyles.starsRow}>★★★★★</Text>
                <Text style={[cutStyles.ratingSubtext, { fontFamily: "Inter_400Regular" }]}>142 reviews</Text>
              </View>
            </View>

            {[
              { text: "\"John did an amazing job on our yard – very professional and on time!\"", author: "Sarah M.", ago: "4 days ago", stars: 5 },
              { text: "\"Reliable, on time, and the yard looks fantastic every time. Highly recommend.\"", author: "Marcus T.", ago: "2 weeks ago", stars: 5 },
              { text: "\"Great hedge trimming, left the property spotless. Will book again.\"", author: "Alex R.", ago: "3 weeks ago", stars: 5 },
            ].map((r, i) => (
              <View key={i} style={[cutStyles.card, { marginBottom: 12 }]}>
                <Text style={cutStyles.reviewStars}>{"★".repeat(r.stars)}</Text>
                <Text style={[cutStyles.reviewText, { fontFamily: "Inter_400Regular" }]}>{r.text}</Text>
                <Text style={[cutStyles.reviewAuthor, { fontFamily: "Inter_400Regular" }]}>— {r.author} · {r.ago}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === "services" && (
          <PriceMatrixEditor matrix={matrix} setMatrix={setMatrix} />
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
      <Text style={[styles.priceCardTitle, { fontFamily: "Inter_600SemiBold" }]}>
        Service Prices by Yard Size
      </Text>
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
          The Lawn is a marketplace platform. All services are performed by independent contractors. The Lawn is not liable for damages, injuries, or disputes arising from booked services.
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

const AVATAR_SIZE = 110;
const HERO_HEIGHT = 240;

const cutStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },

  hero: {
    height: HERO_HEIGHT,
    backgroundColor: "#111111",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
    position: "relative",
  },
  togglePill: {
    position: "absolute",
    top: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 10,
  },
  toggleText: { fontSize: 12, color: "#34FF7A" },

  avatarCircle: {
    position: "absolute",
    bottom: -(AVATAR_SIZE / 2),
    left: 20,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#34FF7A",
    borderWidth: 4,
    borderColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },

  ratingBadge: {
    position: "absolute",
    bottom: 14,
    left: AVATAR_SIZE + 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#000",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  ratingText: { fontSize: 13, color: "#FFFFFF" },
  ratingCount: { fontSize: 12, color: "rgba(255,255,255,0.5)" },

  heroNameBox: {
    position: "absolute",
    bottom: 44,
    left: AVATAR_SIZE + 28,
  },
  heroName: { fontSize: 22, color: "#FFFFFF", marginBottom: 3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.55)" },

  tabBar: {
    flexDirection: "row",
    marginTop: AVATAR_SIZE / 2,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    backgroundColor: "#0A0A0A",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#34FF7A" },
  tabText: { fontSize: 12, color: "#888888", letterSpacing: 0.8 },
  tabTextActive: { color: "#34FF7A" },

  tabContent: { padding: 20, paddingBottom: 60 },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 24,
  },
  actionChip: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  actionChipIcon: { fontSize: 18 },
  actionChipLabel: { fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  sectionHeading: {
    fontSize: 12,
    color: "#AAAAAA",
    letterSpacing: 1.4,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222222",
    marginBottom: 20,
  },
  aboutText: { fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 22 },

  contactRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1A1A1A",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 16,
  },
  contactIcon: { fontSize: 22 },
  contactLabel: { fontSize: 16, color: "#34FF7A" },

  addrName: { fontSize: 15, color: "#FFFFFF", marginBottom: 4 },
  addrLine: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14 },
  mapBox: {
    height: 120,
    backgroundColor: "#222222",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  mapPin: { fontSize: 28 },
  mapText: { fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  hoursGrid: { flexDirection: "row", gap: 16 },
  hoursCell: { flex: 1 },
  hoursDayText: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 3 },
  hoursTimeText: { fontSize: 14, color: "#FFFFFF" },
  hoursClosedText: { fontSize: 14, color: "rgba(255,255,255,0.35)" },

  photosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  photoCell: {
    width: "47%",
    aspectRatio: 16 / 9,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  photoEmoji: { fontSize: 36 },

  ratingHeader: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  ratingBig: { fontSize: 56, color: "#FFFFFF", lineHeight: 64 },
  starsRow: { fontSize: 22, color: "#f59e0b", marginBottom: 3 },
  ratingSubtext: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  reviewStars: { fontSize: 15, color: "#f59e0b", marginBottom: 6 },
  reviewText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  reviewAuthor: { fontSize: 12, color: "#555", marginTop: 8 },
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
