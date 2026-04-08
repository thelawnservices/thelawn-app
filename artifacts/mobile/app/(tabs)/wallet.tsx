import React, { useState } from "react";
import {
  Alert,
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

type Screen = "main" | "withdraw" | "pin" | "success";

type WithdrawMethod = {
  id: string;
  label: string;
  icon: keyof typeof import("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json");
  speed: string;
  speedDays: string;
  fee: string;
  instant: boolean;
};

const METHODS: WithdrawMethod[] = [
  { id: "paypal",  label: "PayPal",       icon: "logo-paypal",            speed: "Instant",           speedDays: "within minutes",    fee: "1.5% fee", instant: true  },
  { id: "zelle",   label: "Zelle",        icon: "swap-horizontal-outline", speed: "Instant",           speedDays: "within minutes",    fee: "Free",     instant: true  },
  { id: "debit",   label: "Debit Card",   icon: "card-outline",           speed: "Instant",           speedDays: "within minutes",    fee: "1% fee",   instant: true  },
  { id: "venmo",   label: "Venmo",        icon: "phone-portrait-outline", speed: "Instant",           speedDays: "within minutes",    fee: "1% fee",   instant: true  },
  { id: "bank",    label: "Bank Transfer",icon: "business-outline",       speed: "1–3 Business Days", speedDays: "1–3 business days", fee: "Free",     instant: false },
  { id: "check",   label: "Check by Mail",icon: "mail-outline",           speed: "5–7 Business Days", speedDays: "5–7 business days", fee: "Free",     instant: false },
];

function calcFee(amount: number, method: WithdrawMethod): number {
  if (method.fee === "1.5% fee") return parseFloat((amount * 0.015).toFixed(2));
  if (method.fee === "1% fee")   return parseFloat((amount * 0.01).toFixed(2));
  return 0;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 0 : insets.bottom;

  const { balance, transactions, recordWithdrawal } = useWallet();

  const [screen, setScreen] = useState<Screen>("main");
  const [amountText, setAmountText] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<WithdrawMethod | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const amountNum = parseFloat(amountText) || 0;
  const fee = selectedMethod ? calcFee(amountNum, selectedMethod) : 0;
  const netAmount = amountNum - fee;

  function reset() {
    setScreen("main");
    setAmountText("");
    setSelectedMethod(null);
    setPin("");
    setPinError(false);
  }

  function proceedToPin() {
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
    if (amountNum < 5) {
      Alert.alert("Minimum Withdrawal", "The minimum withdrawal amount is $5.00.");
      return;
    }
    setScreen("pin");
  }

  function appendPin(digit: string) {
    if (pin.length >= 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin + digit;
    setPin(next);
    setPinError(false);
    if (next.length === 4) {
      setTimeout(() => {
        recordWithdrawal(amountNum, selectedMethod!.label);
        setScreen("success");
      }, 300);
    }
  }

  function deletePin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((p) => p.slice(0, -1));
    setPinError(false);
  }

  const creditTotal   = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const withdrawTotal = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <View style={s.header}>
        {screen !== "main" ? (
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => {
              if (screen === "pin")      setScreen("withdraw");
              else if (screen === "withdraw") setScreen("main");
              else if (screen === "success")  reset();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={[s.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          {screen === "main"     ? "My Wallet"
           : screen === "withdraw" ? "Withdraw Funds"
           : screen === "pin"      ? "Confirm Withdrawal"
           :                         "Withdrawal Initiated"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      {screen === "main" && (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPad + 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance card */}
          <View style={s.balanceCard}>
            <View style={s.badge}>
              <Ionicons name="shield-checkmark" size={13} color="#34FF7A" />
              <Text style={[s.badgeText, { fontFamily: "Inter_500Medium" }]}>FDIC Protected · Secured</Text>
            </View>
            <Text style={[s.balLabel, { fontFamily: "Inter_400Regular" }]}>Available Balance</Text>
            <Text style={[s.balAmount, { fontFamily: "Inter_700Bold" }]}>${fmt(balance)}</Text>
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

          {/* Withdraw button */}
          <TouchableOpacity
            style={s.withdrawBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setScreen("withdraw"); }}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={20} color="#000" />
            <Text style={[s.withdrawBtnText, { fontFamily: "Inter_700Bold" }]}>Withdraw Funds</Text>
          </TouchableOpacity>

          {/* Transactions */}
          <Text style={[s.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>TRANSACTION HISTORY</Text>
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

      {/* ── WITHDRAW ─────────────────────────────────────────── */}
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

          {selectedMethod && amountNum > 0 && (
            <View style={s.feeBox}>
              <View style={s.feeRow}>
                <Text style={[s.feeLabel, { fontFamily: "Inter_400Regular" }]}>Withdrawal Amount</Text>
                <Text style={[s.feeVal, { fontFamily: "Inter_500Medium" }]}>${fmt(amountNum)}</Text>
              </View>
              {fee > 0 && (
                <View style={s.feeRow}>
                  <Text style={[s.feeLabel, { fontFamily: "Inter_400Regular" }]}>Processing Fee ({selectedMethod.fee})</Text>
                  <Text style={[s.feeVal, { fontFamily: "Inter_500Medium" }, { color: "#ff6b6b" }]}>−${fmt(fee)}</Text>
                </View>
              )}
              <View style={[s.feeRow, { borderTopWidth: 1, borderTopColor: "#222", marginTop: 6, paddingTop: 10 }]}>
                <Text style={[s.feeLabel, { fontFamily: "Inter_600SemiBold" }, { color: "#FFF" }]}>You Receive</Text>
                <Text style={[s.feeVal, { fontFamily: "Inter_700Bold" }, { color: "#34FF7A" }]}>${fmt(netAmount > 0 ? netAmount : 0)}</Text>
              </View>
            </View>
          )}

          <View style={s.section}>
            <Text style={[s.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Withdrawal Method</Text>
            {METHODS.map((m) => {
              const active = selectedMethod?.id === m.id;
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
                    <Text style={[s.methodLabel, { fontFamily: "Inter_600SemiBold" }, active && { color: "#34FF7A" }]}>{m.label}</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                      <View style={[s.speedChip, m.instant ? s.speedChipInstant : s.speedChipSlow]}>
                        <Ionicons name={m.instant ? "flash" : "time-outline"} size={10} color={m.instant ? "#34FF7A" : "#f59e0b"} />
                        <Text style={[s.speedChipText, { fontFamily: "Inter_500Medium" }, { color: m.instant ? "#34FF7A" : "#f59e0b" }]}>{m.speed}</Text>
                      </View>
                      <View style={s.feeChip}>
                        <Text style={[s.feeChipText, { fontFamily: "Inter_400Regular" }]}>{m.fee}</Text>
                      </View>
                    </View>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#34FF7A" />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.proceedBtn} onPress={proceedToPin} activeOpacity={0.85}>
            <Ionicons name="lock-closed-outline" size={18} color="#000" />
            <Text style={[s.proceedBtnText, { fontFamily: "Inter_700Bold" }]}>Continue — Enter PIN</Text>
          </TouchableOpacity>

          <Text style={[s.securityNote, { fontFamily: "Inter_400Regular" }]}>
            🔒  Withdrawals are encrypted and monitored for fraud. A confirmation email will be sent after processing.
          </Text>
        </ScrollView>
      )}

      {/* ── PIN ──────────────────────────────────────────────── */}
      {screen === "pin" && (
        <View style={s.pinRoot}>
          <Ionicons name="lock-closed" size={44} color="#34FF7A" style={{ marginBottom: 16 }} />
          <Text style={[s.pinTitle, { fontFamily: "Inter_700Bold" }]}>Enter Your 4-Digit PIN</Text>
          <Text style={[s.pinSub, { fontFamily: "Inter_400Regular" }]}>
            Confirming ${fmt(amountNum)} withdrawal via {selectedMethod?.label}
          </Text>
          <View style={s.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[s.pinDot, pin.length > i && s.pinDotFilled]} />
            ))}
          </View>
          {pinError && (
            <Text style={[s.pinError, { fontFamily: "Inter_500Medium" }]}>Incorrect PIN. Please try again.</Text>
          )}
          <View style={s.numpad}>
            {[["1","2","3"],["4","5","6"],["7","8","9"],["","0","⌫"]].map((row, ri) => (
              <View key={ri} style={s.numpadRow}>
                {row.map((key, ki) => {
                  if (key === "") return <View key={ki} style={s.numpadKey} />;
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={s.numpadKey}
                      onPress={() => key === "⌫" ? deletePin() : appendPin(key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.numpadKeyText, { fontFamily: key === "⌫" ? "Inter_400Regular" : "Inter_600SemiBold" }]}>{key}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          <Text style={[s.pinHint, { fontFamily: "Inter_400Regular" }]}>
            Enter any 4-digit PIN to authorize this withdrawal
          </Text>
        </View>
      )}

      {/* ── SUCCESS ──────────────────────────────────────────── */}
      {screen === "success" && (
        <ScrollView contentContainerStyle={[s.successRoot, { paddingBottom: bottomPad + 48 }]} showsVerticalScrollIndicator={false}>
          <View style={s.successIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#34FF7A" />
          </View>
          <Text style={[s.successTitle, { fontFamily: "Inter_700Bold" }]}>Withdrawal Initiated!</Text>
          <View style={s.successCard}>
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Amount</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_700Bold" }, { color: "#34FF7A" }]}>${fmt(amountNum)}</Text>
            </View>
            {fee > 0 && (
              <View style={s.successRow}>
                <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Processing Fee</Text>
                <Text style={[s.successRowVal, { fontFamily: "Inter_500Medium" }, { color: "#ff6b6b" }]}>−${fmt(fee)}</Text>
              </View>
            )}
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>You Receive</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_700Bold" }]}>${fmt(netAmount > 0 ? netAmount : amountNum)}</Text>
            </View>
            <View style={[s.successRow, { borderTopWidth: 1, borderTopColor: "#222", marginTop: 6, paddingTop: 12 }]}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Method</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_600SemiBold" }]}>{selectedMethod?.label}</Text>
            </View>
            <View style={s.successRow}>
              <Text style={[s.successRowLabel, { fontFamily: "Inter_400Regular" }]}>Estimated Arrival</Text>
              <Text style={[s.successRowVal, { fontFamily: "Inter_600SemiBold" }, { color: selectedMethod?.instant ? "#34FF7A" : "#f59e0b" }]}>
                {selectedMethod?.speedDays}
              </Text>
            </View>
          </View>
          <View style={[s.timingAlert, { borderColor: selectedMethod?.instant ? "#34FF7A33" : "#f59e0b44", backgroundColor: selectedMethod?.instant ? "#0d2e1855" : "#2e1f0055" }]}>
            <Ionicons name={selectedMethod?.instant ? "flash" : "time-outline"} size={18} color={selectedMethod?.instant ? "#34FF7A" : "#f59e0b"} />
            <Text style={[s.timingAlertText, { fontFamily: "Inter_400Regular" }, { color: selectedMethod?.instant ? "#34FF7A" : "#f59e0b" }]}>
              {selectedMethod?.instant
                ? "Your funds will arrive within minutes. Check your account shortly."
                : `Your funds will arrive in ${selectedMethod?.speedDays}. You'll receive a notification once transferred.`}
            </Text>
          </View>
          <View style={s.emailNotice}>
            <Ionicons name="mail-outline" size={18} color="#CCCCCC" />
            <Text style={[s.emailNoticeText, { fontFamily: "Inter_400Regular" }]}>
              A confirmation email has been sent to your registered email address with full withdrawal details and a reference number.
            </Text>
          </View>
          <TouchableOpacity style={s.doneBtn} onPress={reset} activeOpacity={0.85}>
            <Text style={[s.doneBtnText, { fontFamily: "Inter_700Bold" }]}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reset} style={{ marginTop: 14, alignItems: "center" }}>
            <Text style={[{ fontSize: 14, color: "#666" }, { fontFamily: "Inter_400Regular" }]}>View transaction history</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
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

  withdrawBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 24,
  },
  withdrawBtnText: { fontSize: 16, color: "#000" },

  sectionLabel: { fontSize: 11, color: "#666", letterSpacing: 1, marginHorizontal: 16, marginBottom: 8 },
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
  feeBox: {
    backgroundColor: "#1A1A1A", borderRadius: 16, borderWidth: 1, borderColor: "#222",
    marginHorizontal: 16, marginBottom: 16, padding: 16,
  },
  feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  feeLabel: { fontSize: 13, color: "#888" },
  feeVal: { fontSize: 13, color: "#FFFFFF" },
  methodRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1A1A1A", borderRadius: 16, borderWidth: 1, borderColor: "#222",
    padding: 14, marginBottom: 10,
  },
  methodRowActive: { borderColor: "#34FF7A44", backgroundColor: "#0d2e18" },
  methodIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#252525", alignItems: "center", justifyContent: "center",
  },
  methodIconWrapActive: { backgroundColor: "#34FF7A" },
  methodLabel: { fontSize: 15, color: "#FFFFFF" },
  speedChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  speedChipInstant: { backgroundColor: "#34FF7A15" },
  speedChipSlow: { backgroundColor: "#f59e0b15" },
  speedChipText: { fontSize: 11 },
  feeChip: { backgroundColor: "#1e1e1e", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  feeChipText: { fontSize: 11, color: "#888" },
  proceedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#34FF7A", borderRadius: 16,
    paddingVertical: 16, marginHorizontal: 16, marginBottom: 12,
  },
  proceedBtnText: { fontSize: 16, color: "#000" },
  securityNote: { fontSize: 12, color: "#555", textAlign: "center", marginHorizontal: 24, lineHeight: 18 },

  pinRoot: { flex: 1, alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  pinTitle: { fontSize: 22, color: "#FFFFFF", marginBottom: 8 },
  pinSub: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 32, lineHeight: 20 },
  pinDots: { flexDirection: "row", gap: 16, marginBottom: 16 },
  pinDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#333" },
  pinDotFilled: { backgroundColor: "#34FF7A" },
  pinError: { fontSize: 13, color: "#ff6b6b", marginBottom: 12 },
  numpad: { width: "100%", maxWidth: 300, marginTop: 12 },
  numpadRow: { flexDirection: "row", justifyContent: "center" },
  numpadKey: {
    flex: 1, aspectRatio: 1.6, alignItems: "center", justifyContent: "center",
    margin: 6, backgroundColor: "#1A1A1A", borderRadius: 16,
    borderWidth: 1, borderColor: "#222",
  },
  numpadKeyText: { fontSize: 22, color: "#FFFFFF" },
  pinHint: { fontSize: 12, color: "#555", marginTop: 20, textAlign: "center" },

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
  successRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  successRowLabel: { fontSize: 14, color: "#888" },
  successRowVal: { fontSize: 14, color: "#FFFFFF" },
  timingAlert: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    width: "100%", borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 14,
  },
  timingAlertText: { flex: 1, fontSize: 13, lineHeight: 19 },
  emailNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    width: "100%", backgroundColor: "#1A1A1A",
    borderRadius: 14, padding: 14, marginBottom: 24,
  },
  emailNoticeText: { flex: 1, fontSize: 13, color: "#888", lineHeight: 19 },
  doneBtn: {
    width: "100%", backgroundColor: "#34FF7A",
    borderRadius: 16, paddingVertical: 16,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 16, color: "#000" },
});
