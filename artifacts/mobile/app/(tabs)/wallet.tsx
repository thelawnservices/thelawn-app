import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useWallet } from "@/contexts/wallet";
import { useAuth } from "@/contexts/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";
const MIN_WITHDRAWAL = 0;

type Screen = "main" | "withdraw" | "success" | "payout_settings";

type PayoutMethodId = "stripe_instant" | "stripe_standard";

type WithdrawMethod = {
  id: PayoutMethodId;
  label: string;
  icon: keyof typeof import("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");
  speed: string;
  speedDays: string;
  fee: string;
  feeRate: number;
  instant: boolean;
};

const METHODS: WithdrawMethod[] = [
  {
    id: "stripe_instant",
    label: "Instant Payout",
    icon: "flash-outline",
    speed: "Within Minutes",
    speedDays: "within minutes",
    fee: "1.5% fee",
    feeRate: 0.015,
    instant: true,
  },
  {
    id: "stripe_standard",
    label: "Standard Bank Transfer",
    icon: "business-outline",
    speed: "1–2 Business Days",
    speedDays: "1–2 business days",
    fee: "No fee",
    feeRate: 0,
    instant: false,
  },
];

type StripeStatus = "idle" | "loading" | "connected" | "needs_info" | "error";


function fmt(n: number): string {
  return n.toFixed(2);
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 0 : insets.bottom;

  const { balance, transactions, loading, recordWithdrawal, refreshWallet } = useWallet();
  const { userName } = useAuth();

  const [screen, setScreen] = useState<Screen>("main");
  const [amountText, setAmountText] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{
    transferId?: string;
    payoutId?: string | null;
    arrivalDate?: string | null;
    status?: string;
  } | null>(null);

  // Stripe Connect state
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>("idle");
  const [stripeConnecting, setStripeConnecting] = useState(false);


  const amountNum = parseFloat(amountText) || 0;
  const isStripeConnected = stripeStatus === "connected";

  // ── On mount: load real wallet + Connect account ──────────────────────────
  useEffect(() => {
    if (userName) {
      refreshWallet(userName);
      loadConnectAccount(userName);
    }
  }, [userName]);

  async function loadConnectAccount(name: string) {
    try {
      const res = await fetch(`${API_URL}/api/wallet/connect-account?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.accountId) {
        setStripeAccountId(data.accountId);
        checkStripeStatus(data.accountId);
      }
    } catch {}
  }

  async function checkStripeStatus(accountId: string) {
    setStripeStatus("loading");
    try {
      const res = await fetch(`${API_URL}/api/payouts/account-status/${accountId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.payoutsEnabled) {
        setStripeStatus("connected");
      } else {
        setStripeStatus("needs_info");
      }
    } catch {
      setStripeStatus("error");
    }
  }

  async function connectStripe() {
    setStripeConnecting(true);
    try {
      let accountId = stripeAccountId;

      if (!accountId) {
        const createRes = await fetch(`${API_URL}/api/payouts/create-connect-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "" }),
        });
        const createData = await createRes.json();
        if (createData.errorCode === "CONNECT_NOT_ENABLED") {
          Alert.alert(
            "Stripe Connect Not Enabled",
            "Please contact TheLawnServices support to enable payouts for your account."
          );
          return;
        }
        if (createData.error) throw new Error(createData.error);
        accountId = createData.accountId as string;
        setStripeAccountId(accountId);

        // Save to DB so it persists across sessions
        if (userName && accountId) {
          await fetch(`${API_URL}/api/wallet/save-connect-account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ landscaperName: userName, accountId }),
          });
        }
      }

      const linkRes = await fetch(`${API_URL}/api/payouts/onboarding-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const linkData = await linkRes.json();
      if (linkData.error) throw new Error(linkData.error);

      await Linking.openURL(linkData.url);

      // After returning from Stripe onboarding, re-check status
      setTimeout(() => {
        if (accountId) checkStripeStatus(accountId);
      }, 4000);
    } catch (err: any) {
      Alert.alert("Connection Error", err.message ?? "Failed to connect Stripe account.");
      setStripeStatus("error");
    } finally {
      setStripeConnecting(false);
    }
  }

  async function executeStripeWithdrawal() {
    if (!stripeAccountId) {
      Alert.alert("Not Connected", "Please complete Stripe onboarding in Payout Settings first.");
      return;
    }

    const isInstant = selectedMethod?.id === "stripe_instant";
    const feeRate = selectedMethod?.feeRate ?? 0;
    const fee = parseFloat((amountNum * feeRate).toFixed(2));

    try {
      const res = await fetch(`${API_URL}/api/payouts/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: stripeAccountId,
          amount: amountNum,
          instant: isInstant,
          description: `TheLawnServices ${isInstant ? "instant " : ""}payout — $${fmt(amountNum)}`,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Record in DB and local state
      recordWithdrawal(amountNum, selectedMethod?.label ?? "Stripe Payout");
      setWithdrawResult({
        transferId: data.transferId,
        payoutId: data.payoutId,
        arrivalDate: data.arrivalDate ?? (isInstant ? "Within minutes" : null),
        status: data.status,
      });
      setScreen("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Withdrawal Failed", err.message ?? "Something went wrong. Please try again.");
    }
  }

  function proceedFromWithdraw() {
    if (!amountText || amountNum <= 0) {
      Alert.alert("Enter Amount", "Please enter a valid withdrawal amount.");
      return;
    }
    if (amountNum > balance) {
      Alert.alert("Insufficient Funds", `Your available balance is $${fmt(balance)}.`);
      return;
    }
    if (!selectedMethod) {
      Alert.alert("Select Method", "Please choose a withdrawal method.");
      return;
    }

    // Both methods require Stripe onboarding
    if (!isStripeConnected) {
      Alert.alert(
        "Stripe Account Required",
        "Complete your Stripe onboarding in Payout Settings to enable automatic payouts. It only takes about 2 minutes.",
        [
          { text: "Open Settings", onPress: () => setScreen("payout_settings") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    if (selectedMethod.id === "stripe_instant") {
      const fee = parseFloat((amountNum * 0.015).toFixed(2));
      const net = parseFloat((amountNum - fee).toFixed(2));
      Alert.alert(
        "Confirm Instant Payout",
        `A 1.5% fee applies to instant payouts.\n\nWithdrawal: $${fmt(amountNum)}\nFee: $${fmt(fee)}\nYou receive: $${fmt(net)}\n\nFunds arrive within minutes.`,
        [
          { text: "Confirm", onPress: () => executeStripeWithdrawal() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        "Confirm Bank Transfer",
        `Your funds will be automatically sent to your bank account.\n\nAmount: $${fmt(amountNum)}\nFee: None\nArrival: 1–2 business days`,
        [
          { text: "Confirm", onPress: () => executeStripeWithdrawal() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  }

  function reset() {
    setScreen("main");
    setAmountText("");
    setSelectedMethod(null);
    setWithdrawResult(null);
    if (userName) refreshWallet(userName);
  }

  const creditTotal   = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const withdrawTotal = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  function headerTitle() {
    if (screen === "withdraw")        return "Withdraw Funds";
    if (screen === "success")         return "Withdrawal Initiated";
    if (screen === "payout_settings") return "Payout Settings";
    return "My Wallet";
  }

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <View style={s.header}>
        {screen !== "main" ? (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              if (screen === "success") reset();
              else setScreen("main");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={[s.headerTitle, { fontFamily: "Inter_700Bold" }]}>{headerTitle()}</Text>
        {screen === "main" ? (
          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => { Haptics.selectionAsync(); setScreen("payout_settings"); }}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── MAIN ─────────────────────────────────────────────────── */}
      {screen === "main" && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad + 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance card */}
          <View style={s.balanceCard}>
            <View style={s.badge}>
              <Ionicons name="shield-checkmark" size={13} color="#34FF7A" />
              <Text style={[s.badgeText, { fontFamily: "Inter_500Medium" }]}>
                FDIC Protected · Stripe Secured
              </Text>
            </View>
            <Text style={[s.balLabel, { fontFamily: "Inter_400Regular" }]}>Available Balance</Text>
            {loading ? (
              <ActivityIndicator color="#34FF7A" style={{ marginVertical: 12 }} />
            ) : (
              <Text style={[s.balAmount, { fontFamily: "Inter_700Bold" }]}>${fmt(balance)}</Text>
            )}
            <View style={s.balStats}>
              <View style={s.balStat}>
                <Ionicons name="arrow-down-circle" size={16} color="#34FF7A" />
                <View>
                  <Text style={[s.balStatLabel, { fontFamily: "Inter_400Regular" }]}>Total Earned</Text>
                  <Text style={[s.balStatVal, { fontFamily: "Inter_600SemiBold" }]}>${fmt(creditTotal)}</Text>
                </View>
              </View>
              <View style={s.balStatDivider} />
              <View style={s.balStat}>
                <Ionicons name="arrow-up-circle" size={16} color="#ff6b6b" />
                <View>
                  <Text style={[s.balStatLabel, { fontFamily: "Inter_400Regular" }]}>Total Withdrawn</Text>
                  <Text style={[s.balStatVal, { fontFamily: "Inter_600SemiBold" }]}>${fmt(withdrawTotal)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stripe Connect status banner */}
          <TouchableOpacity
            style={[
              s.stripeBanner,
              isStripeConnected ? s.stripeBannerConnected : s.stripeBannerDisconnected,
            ]}
            onPress={() => { Haptics.selectionAsync(); setScreen("payout_settings"); }}
            activeOpacity={0.8}
          >
            <View style={[s.stripeIconWrap, { backgroundColor: isStripeConnected ? "#34FF7A22" : "#1a1a1a" }]}>
              <Ionicons
                name={isStripeConnected ? "flash" : "flash-outline"}
                size={22}
                color={isStripeConnected ? "#34FF7A" : "#888"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[
                s.stripeBannerTitle,
                { fontFamily: "Inter_600SemiBold", color: isStripeConnected ? "#34FF7A" : "#FFFFFF" },
              ]}>
                {isStripeConnected
                  ? "⚡ Stripe Payouts Ready"
                  : stripeStatus === "needs_info"
                  ? "Stripe Onboarding Incomplete"
                  : "Set Up Stripe Payouts"}
              </Text>
              <Text style={[s.stripeBannerSub, { fontFamily: "Inter_400Regular" }]}>
                {isStripeConnected
                  ? "Instant payouts to your bank, debit card, or Apple Wallet. Tap to manage."
                  : stripeStatus === "needs_info"
                  ? "Finish onboarding to activate payouts — tap to continue."
                  : "Receive payments directly to your bank, debit card, or Apple Wallet."}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          {/* Withdraw button */}
          <TouchableOpacity
            style={s.withdrawBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setScreen("withdraw");
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={20} color="#000" />
            <Text style={[s.withdrawBtnText, { fontFamily: "Inter_700Bold" }]}>Withdraw Funds</Text>
          </TouchableOpacity>


          {/* Transactions */}
          <Text style={[s.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>TRANSACTION HISTORY</Text>
          {transactions.length === 0 && !loading && (
            <View style={s.emptyRow}>
              <Ionicons name="receipt-outline" size={32} color="#333" />
              <Text style={[{ fontSize: 14, color: "#555", marginTop: 8, textAlign: "center" }, { fontFamily: "Inter_400Regular" }]}>
                No transactions yet.{"\n"}Completed jobs will appear here.
              </Text>
            </View>
          )}
          {transactions.map((tx) => {
            const isCredit = tx.type === "credit";
            return (
              <View key={tx.id} style={s.txRow}>
                <View style={[s.txIcon, { backgroundColor: isCredit ? "#0d2e18" : "#2e0d0d" }]}>
                  <Ionicons name={isCredit ? "arrow-down" : "arrow-up"} size={16} color={isCredit ? "#34FF7A" : "#ff6b6b"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.txDesc, { fontFamily: "Inter_500Medium" }]}>{tx.description}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={[s.txDate, { fontFamily: "Inter_400Regular" }]}>{tx.date}</Text>
                    {tx.status === "pending" && (
                      <View style={s.pendingChip}>
                        <Text style={[s.pendingChipText, { fontFamily: "Inter_500Medium" }]}>Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Text style={[s.txAmount, { fontFamily: "Inter_700Bold" }, { color: isCredit ? "#34FF7A" : "#ff6b6b" }]}>
                  {isCredit ? "+" : "−"}${fmt(tx.amount)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── PAYOUT SETTINGS ─────────────────────────────────────── */}
      {screen === "payout_settings" && (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: bottomPad + 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Stripe Connect Section ── */}
          <Text style={[s.payoutSectionLabel, { fontFamily: "Inter_700Bold" }]}>
            ⚡ Instant Stripe Payouts
          </Text>
          <Text style={[s.payoutSectionSub, { fontFamily: "Inter_400Regular" }]}>
            Connect your Stripe account to receive instant payouts to your bank account or debit card. A 1.5% fee applies to instant transfers.
          </Text>

          <View style={[s.stripeConnectCard, isStripeConnected ? s.stripeConnectCardOn : s.stripeConnectCardOff]}>
            <View style={s.stripeConnectTop}>
              <View style={[
                s.stripeConnectIcon,
                { backgroundColor: isStripeConnected ? "#34FF7A22" : "#1e1e1e" },
              ]}>
                <Ionicons
                  name={isStripeConnected ? "checkmark-circle" : stripeStatus === "needs_info" ? "alert-circle-outline" : "card-outline"}
                  size={28}
                  color={isStripeConnected ? "#34FF7A" : stripeStatus === "needs_info" ? "#f59e0b" : "#888"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.stripeConnectTitle, {
                  fontFamily: "Inter_700Bold",
                  color: isStripeConnected ? "#34FF7A" : stripeStatus === "needs_info" ? "#f59e0b" : "#FFFFFF",
                }]}>
                  {isStripeConnected
                    ? "Stripe Account Connected"
                    : stripeStatus === "needs_info"
                    ? "Onboarding Incomplete"
                    : "Connect Stripe Account"}
                </Text>
                <Text style={[s.stripeConnectSub, { fontFamily: "Inter_400Regular" }]}>
                  {isStripeConnected
                    ? "Your payouts are fully activated. Withdraw directly to your bank, debit card, or Apple Wallet-linked card."
                    : stripeStatus === "needs_info"
                    ? "Stripe needs more information to activate your payouts. Tap below to continue."
                    : "Set up your Stripe account to receive direct payouts. Add your bank, debit card, or Apple Wallet-linked card during onboarding."}
                </Text>
              </View>
            </View>

            {/* How it works steps */}
            {!isStripeConnected && (
              <View style={s.howItWorks}>
                {[
                  { icon: "person-outline", text: "Verify your identity with Stripe (takes ~2 min)" },
                  { icon: "card-outline", text: "Add your bank, debit card, or Apple Wallet-linked card" },
                  { icon: "flash-outline", text: "Withdraw earnings instantly — lands in Apple Wallet within minutes" },
                ].map((step, i) => (
                  <View key={i} style={s.howItWorksRow}>
                    <View style={s.howItWorksIcon}>
                      <Ionicons name={step.icon as any} size={14} color="#34FF7A" />
                    </View>
                    <Text style={[s.howItWorksText, { fontFamily: "Inter_400Regular" }]}>{step.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Connect / Re-check button */}
            <TouchableOpacity
              style={[s.stripeConnectBtn, stripeConnecting && { opacity: 0.7 }]}
              onPress={isStripeConnected ? () => checkStripeStatus(stripeAccountId!) : connectStripe}
              disabled={stripeConnecting}
              activeOpacity={0.85}
            >
              {stripeConnecting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Ionicons
                  name={isStripeConnected ? "refresh-outline" : "open-outline"}
                  size={17}
                  color="#000"
                />
              )}
              <Text style={[s.stripeConnectBtnText, { fontFamily: "Inter_700Bold", color: "#000" }]}>
                {stripeConnecting
                  ? "Connecting..."
                  : isStripeConnected
                  ? "Refresh Status"
                  : stripeStatus === "needs_info"
                  ? "Continue Onboarding"
                  : "Start Stripe Onboarding"}
              </Text>
            </TouchableOpacity>

            <View style={s.stripeLegal}>
              <Ionicons name="lock-closed-outline" size={12} color="#555" />
              <Text style={[s.stripeLegalText, { fontFamily: "Inter_400Regular" }]}>
                Your banking details are entered directly on Stripe's secure platform. TheLawnServices never sees your account numbers.
              </Text>
            </View>
          </View>

        </ScrollView>
      )}

      {/* ── WITHDRAW ─────────────────────────────────────────────── */}
      {screen === "withdraw" && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad + 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.section}>
            <Text style={[s.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>AVAILABLE BALANCE</Text>
            <Text style={[s.availBal, { fontFamily: "Inter_700Bold" }]}>${fmt(balance)}</Text>
          </View>

          <View style={s.section}>
            <Text style={[s.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Withdrawal Amount</Text>
            <View style={s.amountInputWrap}>
              <Text style={[s.dollarSign, { fontFamily: "Inter_600SemiBold" }]}>$</Text>
              <TextInput
                style={[s.amountInput, { fontFamily: "Inter_700Bold" }]}
                placeholder="0.00"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={(v) => setAmountText(v.replace(/[^0-9.]/g, ""))}
              />
            </View>
            <TouchableOpacity onPress={() => setAmountText(fmt(balance))} style={s.maxBtn}>
              <Text style={[s.maxBtnText, { fontFamily: "Inter_500Medium" }]}>Withdraw Max</Text>
            </TouchableOpacity>
          </View>

          {/* Method selection */}
          <View style={s.section}>
            <Text style={[s.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Withdrawal Method</Text>

            {METHODS.map((m) => {
              const active = selectedMethod?.id === m.id;
              const stripeTag = isStripeConnected
                ? "✓ Connected"
                : stripeStatus === "needs_info"
                ? "Setup Incomplete"
                : "Setup Required";
              const tagColor = isStripeConnected ? "#34FF7A22" : "#ffffff0a";
              const tagTextColor = isStripeConnected ? "#34FF7A" : "#555";

              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.methodRow, active && s.methodRowActive]}
                  onPress={() => { setSelectedMethod(m); Haptics.selectionAsync(); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.methodIconWrap, active && s.methodIconWrapActive]}>
                    <Ionicons name={m.icon as any} size={20} color={active ? "#000" : "#CCCCCC"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={[s.methodLabel, { fontFamily: "Inter_600SemiBold" }, active && { color: "#34FF7A" }]}>
                        {m.label}
                      </Text>
                      {m.instant && (
                        <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "#FFD70022" }}>
                          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFD700", letterSpacing: 0.5 }}>⚡ INSTANT</Text>
                        </View>
                      )}
                      <View style={[s.stripeTag, { backgroundColor: tagColor }]}>
                        <Text style={[s.stripeTagText, { fontFamily: "Inter_600SemiBold", color: tagTextColor }]}>
                          {stripeTag}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 3 }}>
                      <View style={[s.speedChip, { backgroundColor: isStripeConnected ? "#34FF7A15" : "#1a1a1a" }]}>
                        <Ionicons name={m.instant ? "flash-outline" : "time-outline"} size={10} color={isStripeConnected ? "#34FF7A" : "#555"} />
                        <Text style={[s.speedChipText, { fontFamily: "Inter_500Medium", color: isStripeConnected ? "#34FF7A" : "#555" }]}>
                          {m.speed}
                        </Text>
                      </View>
                      {m.feeRate > 0 && (
                        <View style={[s.speedChip, { backgroundColor: "#FFD70011" }]}>
                          <Text style={[s.speedChipText, { fontFamily: "Inter_500Medium", color: "#FFD700" }]}>{m.fee}</Text>
                        </View>
                      )}
                      {m.feeRate === 0 && (
                        <View style={[s.speedChip, { backgroundColor: "#34FF7A11" }]}>
                          <Text style={[s.speedChipText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>No fee</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#34FF7A" />}
                </TouchableOpacity>
              );
            })}
          </View>

          {!isStripeConnected && (
            <View style={s.manualNote}>
              <Ionicons name="information-circle-outline" size={16} color="#f59e0b" />
              <Text style={[s.manualNoteText, { fontFamily: "Inter_400Regular" }]}>
                One-time setup required. Go to Payout Settings, connect your Stripe account, and all future withdrawals are 100% automatic — no TheLawn involvement.
              </Text>
            </View>
          )}

          <TouchableOpacity style={s.proceedBtn} onPress={proceedFromWithdraw} activeOpacity={0.85}>
            <Ionicons
              name={selectedMethod?.id === "stripe_instant" ? "flash-outline" : "arrow-forward-outline"}
              size={18}
              color="#000"
            />
            <Text style={[s.proceedBtnText, { fontFamily: "Inter_700Bold" }]}>
              {selectedMethod?.id === "stripe_instant" ? "⚡ Withdraw Instantly" : "Withdraw Funds"}
            </Text>
          </TouchableOpacity>

          <Text style={[s.securityNote, { fontFamily: "Inter_400Regular" }]}>
            🔒 Withdrawals are processed securely. Your banking details are never stored by TheLawnServices.
          </Text>
        </ScrollView>
      )}

      {/* ── SUCCESS ──────────────────────────────────────────────── */}
      {screen === "success" && (
        <ScrollView
          contentContainerStyle={[s.successRoot, { paddingBottom: bottomPad + 48 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.successIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#34FF7A" />
          </View>
          <Text style={[s.successTitle, { fontFamily: "Inter_700Bold" }]}>
            Payout Initiated!
          </Text>

          <View style={s.successCard}>
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Amount</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_700Bold" }, { color: "#34FF7A" }]}>${fmt(amountNum)}</Text>
            </View>
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Method</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_600SemiBold" }]}>{selectedMethod?.label}</Text>
            </View>
            {withdrawResult?.transferId && (
              <View style={s.successRow}>
                <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Transfer ID</Text>
                <Text style={[s.successRowVal, { fontFamily: "Inter_400Regular", fontSize: 11, color: "#888" }]}>
                  {withdrawResult.transferId}
                </Text>
              </View>
            )}
            {withdrawResult?.payoutId && (
              <View style={s.successRow}>
                <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Payout ID</Text>
                <Text style={[s.successRowVal, { fontFamily: "Inter_400Regular", fontSize: 11, color: "#888" }]}>
                  {withdrawResult.payoutId}
                </Text>
              </View>
            )}
            <View style={[s.successRow, { borderTopWidth: 1, borderTopColor: "#222", marginTop: 6, paddingTop: 12 }]}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Est. Arrival</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_600SemiBold", color: "#f59e0b" }]}>
                {withdrawResult?.arrivalDate ?? selectedMethod?.speedDays}
              </Text>
            </View>
          </View>

          <View style={s.successNote}>
            <Ionicons
              name="card-outline"
              size={18}
              color="#34FF7A"
            />
            <Text style={[s.successNoteText, { fontFamily: "Inter_400Regular" }]}>
              {selectedMethod?.id === "stripe_instant"
                ? "Your funds have been transferred via Stripe and are on their way to your bank or debit card within minutes."
                : "Your funds have been transferred via Stripe and will arrive in your bank account within 1–2 business days."}
            </Text>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={reset} activeOpacity={0.85}>
            <Text style={[s.doneBtnText, { fontFamily: "Inter_700Bold" }]}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },

  balanceCard: {
    margin: 16, backgroundColor: "#0d2e18",
    borderRadius: 24, borderWidth: 1, borderColor: "#34FF7A33",
    padding: 24, gap: 6,
  },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  badgeText: { fontSize: 11, color: "#34FF7A", letterSpacing: 0.5 },
  balLabel: { fontSize: 13, color: "rgba(255,255,255,0.55)" },
  balAmount: { fontSize: 42, color: "#FFFFFF", letterSpacing: -1 },
  balStats: { flexDirection: "row", marginTop: 12 },
  balStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  balStatDivider: { width: 1, backgroundColor: "#ffffff1a", marginHorizontal: 12 },
  balStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  balStatVal: { fontSize: 15, color: "#FFFFFF", marginTop: 1 },

  stripeBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    borderWidth: 1, padding: 14,
  },
  stripeBannerConnected: { backgroundColor: "#0d2e1855", borderColor: "#34FF7A33" },
  stripeBannerDisconnected: { backgroundColor: "#1A1A1A", borderColor: "#222" },
  stripeIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stripeBannerTitle: { fontSize: 14 },
  stripeBannerSub: { fontSize: 12, color: "#888", marginTop: 2 },

  withdrawBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16, paddingVertical: 16,
    marginHorizontal: 16, marginBottom: 6,
  },
  withdrawBtnText: { fontSize: 16, color: "#000" },
  minNoticeText: { fontSize: 12, color: "#555", textAlign: "center", marginBottom: 20 },

  sectionLabel: { fontSize: 11, color: "#666", letterSpacing: 1, marginHorizontal: 16, marginBottom: 8 },
  emptyRow: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },

  txRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  txIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  txDesc: { fontSize: 14, color: "#FFFFFF" },
  txDate: { fontSize: 12, color: "#666" },
  txAmount: { fontSize: 15 },
  pendingChip: { backgroundColor: "#f59e0b22", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pendingChipText: { fontSize: 11, color: "#f59e0b" },

  payoutSectionLabel: { fontSize: 16, color: "#FFFFFF", marginBottom: 4 },
  payoutSectionSub: { fontSize: 13, color: "#888", lineHeight: 19, marginBottom: 16 },

  stripeConnectCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, gap: 14,
  },
  stripeConnectCardOn: { backgroundColor: "#0d2e18", borderColor: "#34FF7A33" },
  stripeConnectCardOff: { backgroundColor: "#141414", borderColor: "#222" },
  stripeConnectTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  stripeConnectIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  stripeConnectTitle: { fontSize: 16, marginBottom: 4 },
  stripeConnectSub: { fontSize: 12, color: "#888", lineHeight: 18 },

  howItWorks: { gap: 10, paddingLeft: 4 },
  howItWorksRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  howItWorksIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#0d2e18", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#1a5c30",
  },
  howItWorksText: { fontSize: 13, color: "#CCCCCC", flex: 1 },

  stripeConnectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#34FF7A", borderRadius: 14, paddingVertical: 14,
  },
  stripeConnectBtnAlt: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#34FF7A44" },
  stripeConnectBtnText: { fontSize: 15 },

  stripeLegal: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  stripeLegalText: { flex: 1, fontSize: 11, color: "#555", lineHeight: 16 },

  manualGroup: { backgroundColor: "#141414", borderRadius: 14, borderWidth: 1, borderColor: "#222", padding: 16, marginBottom: 12 },
  manualFieldLabel: { fontSize: 13, color: "#888", marginBottom: 8 },
  manualInput: {
    backgroundColor: "#1A1A1A", borderWidth: 1.5, borderColor: "#2A2A2A",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#FFFFFF",
  },
  saveManualBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16, paddingVertical: 16, marginTop: 4,
  },
  saveManualBtnText: { fontSize: 16, color: "#000" },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  availBal: { fontSize: 32, color: "#34FF7A", marginTop: 4 },
  fieldLabel: { fontSize: 13, color: "#CCCCCC", marginBottom: 10 },
  amountInputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1A1A1A", borderRadius: 16,
    borderWidth: 1, borderColor: "#333", paddingHorizontal: 16,
  },
  dollarSign: { fontSize: 24, color: "#FFFFFF", marginRight: 4 },
  amountInput: { flex: 1, fontSize: 28, color: "#FFFFFF", paddingVertical: 14 },
  maxBtn: { alignSelf: "flex-end", marginTop: 10 },
  maxBtnText: { fontSize: 13, color: "#34FF7A" },

  methodRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1A1A1A", borderRadius: 16, borderWidth: 1, borderColor: "#222",
    padding: 14, marginBottom: 10,
  },
  methodRowActive: { borderColor: "#34FF7A44", backgroundColor: "#0d2e18" },
  methodRowDisabled: { opacity: 0.5 },
  methodIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#252525", alignItems: "center", justifyContent: "center",
  },
  methodIconWrapActive: { backgroundColor: "#34FF7A" },
  methodLabel: { fontSize: 15, color: "#FFFFFF" },
  stripeTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  stripeTagText: { fontSize: 10, letterSpacing: 0.3 },
  speedChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  speedChipText: { fontSize: 11 },
  manualChip: { backgroundColor: "#1e1e1e", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  manualChipText: { fontSize: 11, color: "#666" },

  manualNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#1C1400", borderRadius: 14, borderWidth: 1, borderColor: "#f59e0b33",
    marginHorizontal: 16, marginBottom: 16, padding: 14,
  },
  manualNoteText: { flex: 1, fontSize: 13, color: "#f59e0b", lineHeight: 19 },

  proceedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 12,
  },
  proceedBtnText: { fontSize: 16, color: "#000" },
  securityNote: { fontSize: 12, color: "#555", textAlign: "center", marginHorizontal: 24, lineHeight: 18 },

  successRoot: { paddingHorizontal: 20, alignItems: "center", paddingTop: 20 },
  successIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "#0d2e18", alignItems: "center", justifyContent: "center",
    marginBottom: 20, borderWidth: 1, borderColor: "#34FF7A33",
  },
  successTitle: { fontSize: 24, color: "#FFFFFF", marginBottom: 24 },
  successCard: {
    width: "100%", backgroundColor: "#1A1A1A",
    borderRadius: 20, borderWidth: 1, borderColor: "#222", padding: 20, marginBottom: 16,
  },
  successRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  successRowLabel: { fontSize: 14, color: "#888" },
  successRowVal: { fontSize: 14, color: "#FFFFFF", flex: 1, textAlign: "right", marginLeft: 16 },
  successNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    width: "100%", backgroundColor: "#0d2e18",
    borderRadius: 14, borderWidth: 1, borderColor: "#34FF7A22",
    padding: 14, marginBottom: 24,
  },
  successNoteText: { flex: 1, fontSize: 13, color: "#AAAAAA", lineHeight: 19 },
  doneBtn: {
    width: "100%", backgroundColor: "#34FF7A",
    borderRadius: 16, paddingVertical: 16, alignItems: "center",
  },
  doneBtnText: { fontSize: 16, color: "#000" },
});
