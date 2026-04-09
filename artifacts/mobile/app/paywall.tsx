import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { useSubscription } from "@/lib/revenuecat";

const ACCENT = "#34FF7A";
const BG = "#0A0A0A";
const CARD = "#1A1A1A";
const BORDER = "#222222";

const FEATURES = [
  { icon: "flash-outline", label: "Priority booking — get serviced first" },
  { icon: "shield-checkmark-outline", label: "Verified Pro landscapers only" },
  { icon: "calendar-outline", label: "Unlimited recurring appointments" },
  { icon: "notifications-outline", label: "Real-time appointment updates" },
  { icon: "star-outline", label: "Exclusive discounts from landscapers" },
  { icon: "headset-outline", label: "Priority customer support" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring, isSubscribed } =
    useSubscription();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentOffering = offerings?.current;
  const pkg = currentOffering?.availablePackages[0];
  const price = pkg?.product?.priceString ?? "$5.99";
  const period = pkg?.product?.subscriptionPeriod ?? "P1M";
  const periodLabel = period === "P1M" ? "/month" : period === "P1Y" ? "/year" : "/period";

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  async function handleSubscribe() {
    if (!pkg) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmVisible(true);
  }

  async function confirmPurchase() {
    if (!pkg) return;
    setConfirmVisible(false);
    setErrorMsg("");
    try {
      await purchase(pkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) {
        setErrorMsg(e?.message ?? "Purchase failed. Please try again.");
      }
    }
  }

  async function handleRestore() {
    Haptics.selectionAsync();
    setErrorMsg("");
    try {
      await restore();
      if (isSubscribed) {
        router.back();
      } else {
        setErrorMsg("No active subscription found to restore.");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Restore failed. Please try again.");
    }
  }

  const topPad = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={22} color="#CCCCCC" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <Ionicons name="leaf" size={14} color={ACCENT} />
          <Text style={[styles.badgeText, { fontFamily: "Inter_600SemiBold" }]}>
            TheLawn Pro
          </Text>
        </View>

        {/* Headline */}
        <Text style={[styles.headline, { fontFamily: "Inter_700Bold" }]}>
          Level up your lawn care
        </Text>
        <Text style={[styles.subhead, { fontFamily: "Inter_400Regular" }]}>
          Get priority access, verified landscapers, and unlimited recurring bookings.
        </Text>

        {/* Price card */}
        <View style={styles.priceCard}>
          {isLoading ? (
            <ActivityIndicator color={ACCENT} size="small" />
          ) : (
            <>
              <Text style={[styles.priceAmount, { fontFamily: "Inter_700Bold" }]}>
                {price}
              </Text>
              <Text style={[styles.pricePeriod, { fontFamily: "Inter_400Regular" }]}>
                {periodLabel}
              </Text>
            </>
          )}
          <Text style={[styles.priceNote, { fontFamily: "Inter_400Regular" }]}>
            Cancel anytime · No contracts
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={18} color={ACCENT} />
              </View>
              <Text style={[styles.featureLabel, { fontFamily: "Inter_500Medium" }]}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Error */}
        {errorMsg ? (
          <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>
            {errorMsg}
          </Text>
        ) : null}

        {/* Subscribe button */}
        <TouchableOpacity
          style={[styles.subscribeBtn, (isPurchasing || isLoading) && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.85}
          disabled={isPurchasing || isLoading || !pkg}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={[styles.subscribeBtnText, { fontFamily: "Inter_700Bold" }]}>
              Start Pro — {price}{periodLabel}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          activeOpacity={0.7}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color="#777" size="small" />
          ) : (
            <Text style={[styles.restoreText, { fontFamily: "Inter_400Regular" }]}>
              Restore Purchase
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.legalText, { fontFamily: "Inter_400Regular" }]}>
          Subscription auto-renews until cancelled. Manage or cancel in your device settings.
        </Text>
      </ScrollView>

      {/* Confirm modal (required by RevenueCat skill for test mode) */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { fontFamily: "Inter_700Bold" }]}>
              Confirm Subscription
            </Text>
            <Text style={[styles.modalBody, { fontFamily: "Inter_400Regular" }]}>
              You are about to subscribe to TheLawn Pro for{" "}
              <Text style={{ color: ACCENT, fontFamily: "Inter_600SemiBold" }}>
                {price}{periodLabel}
              </Text>
              .{"\n\n"}This is a test purchase and no real charge will occur.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setConfirmVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={confirmPurchase}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalConfirmText, { fontFamily: "Inter_700Bold" }]}>
                  Subscribe
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0d2e18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1a4a28",
  },
  badgeText: {
    fontSize: 12,
    color: ACCENT,
  },
  headline: {
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 34,
    marginBottom: 10,
  },
  subhead: {
    fontSize: 15,
    color: "#AAAAAA",
    lineHeight: 22,
    marginBottom: 28,
  },
  priceCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: "center",
    marginBottom: 28,
  },
  priceAmount: {
    fontSize: 42,
    color: "#FFFFFF",
    lineHeight: 50,
  },
  pricePeriod: {
    fontSize: 16,
    color: "#AAAAAA",
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 12,
    color: "#555",
  },
  featureList: {
    gap: 14,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1a4a28",
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 13,
    color: "#f87171",
    textAlign: "center",
    marginBottom: 14,
  },
  subscribeBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  subscribeBtnDisabled: {
    opacity: 0.5,
  },
  subscribeBtnText: {
    fontSize: 16,
    color: "#000",
  },
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 13,
    color: "#777",
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    lineHeight: 16,
  },
  // Confirm modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    color: "#AAAAAA",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalCancelText: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    color: "#000",
  },
});
