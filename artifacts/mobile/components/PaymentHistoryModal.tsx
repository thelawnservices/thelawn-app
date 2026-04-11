import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type PayStatus = "paid" | "pending" | "refunded" | "failed";

const PAY_STATUS_CONFIG: Record<PayStatus, { label: string; color: string; bg: string }> = {
  paid:     { label: "Paid",     color: "#34FF7A", bg: "#0d2e18" },
  pending:  { label: "Pending",  color: "#FFAA00", bg: "#2A1F00" },
  refunded: { label: "Refunded", color: "#60a5fa", bg: "#0d1f3c" },
  failed:   { label: "Failed",   color: "#ef4444", bg: "#2A0808" },
};

type CustomerPayRecord = {
  id: string; orderId: string; date: string; service: string; pro: string;
  amount: string; status: PayStatus; yardSize: string; address: string; payMethod: string;
};
type LandscaperPayRecord = {
  id: string; orderId: string; date: string; service: string; customer: string;
  earned: string; commission: string; status: PayStatus; yardSize: string; address: string; payMethod: string;
};

export const CUSTOMER_PAYMENT_HISTORY: CustomerPayRecord[] = [];

export const LANDSCAPER_PAYMENT_HISTORY: LandscaperPayRecord[] = [];

export default function PaymentHistoryModal({
  visible,
  onClose,
  role,
}: {
  visible: boolean;
  onClose: () => void;
  role: "customer" | "landscaper";
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={[s.title, { fontFamily: "Inter_700Bold" }]}>
              {role === "customer" ? "Payment History" : "Earnings History"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={s.emailNote}>
            <Ionicons name="mail-outline" size={13} color="#34FF7A" />
            <Text style={[s.emailNoteText, { fontFamily: "Inter_400Regular" }]}>
              All transactions are logged and sent to TheLawnServices for dispute resolution.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {role === "customer" && CUSTOMER_PAYMENT_HISTORY.length === 0 && (
              <View style={s.emptyWrap}>
                <Ionicons name="card-outline" size={40} color="#333" />
                <Text style={[s.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>No payments yet</Text>
                <Text style={[s.emptySub, { fontFamily: "Inter_400Regular" }]}>
                  Your payment receipts will appear here after your first booking.
                </Text>
              </View>
            )}
            {role === "landscaper" && LANDSCAPER_PAYMENT_HISTORY.length === 0 && (
              <View style={s.emptyWrap}>
                <Ionicons name="cash-outline" size={40} color="#333" />
                <Text style={[s.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>No earnings yet</Text>
                <Text style={[s.emptySub, { fontFamily: "Inter_400Regular" }]}>
                  Your earnings will appear here once you complete your first job.
                </Text>
              </View>
            )}
            {role === "customer"
              ? CUSTOMER_PAYMENT_HISTORY.map((item) => {
                  const cfg = PAY_STATUS_CONFIG[item.status];
                  const isExp = expandedId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={s.record}
                      activeOpacity={0.85}
                      onPress={() => { setExpandedId(isExp ? null : item.id); Haptics.selectionAsync(); }}
                    >
                      <View style={s.recordTop}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={[s.recordService, { fontFamily: "Inter_600SemiBold" }]}>{item.service}</Text>
                            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                              <Text style={[s.statusText, { fontFamily: "Inter_600SemiBold", color: cfg.color }]}>{cfg.label}</Text>
                            </View>
                          </View>
                          <Text style={[s.recordSub, { fontFamily: "Inter_400Regular" }]}>{item.pro} · {item.date}</Text>
                          <Text style={[s.recordOrderId, { fontFamily: "Inter_500Medium" }]}>Order {item.orderId}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <Text style={[s.recordAmount, { fontFamily: "Inter_700Bold" }]}>{item.amount}</Text>
                          <Ionicons name={isExp ? "chevron-up" : "chevron-down"} size={15} color="#CCCCCC" />
                        </View>
                      </View>
                      {isExp && (
                        <View style={s.recordDetails}>
                          <View style={s.detailRow}>
                            <Ionicons name="resize-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>Yard size: {item.yardSize}</Text>
                          </View>
                          <View style={s.detailRow}>
                            <Ionicons name="location-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>{item.address}</Text>
                          </View>
                          <View style={s.detailRow}>
                            <Ionicons name="card-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>Paid via {item.payMethod}</Text>
                          </View>
                          <View style={s.disputeNote}>
                            <Ionicons name="shield-checkmark-outline" size={13} color="#FFAA00" />
                            <Text style={[s.disputeNoteText, { fontFamily: "Inter_400Regular" }]}>
                              For disputes, reference Order ID {item.orderId} when contacting TheLawnServices
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              : LANDSCAPER_PAYMENT_HISTORY.map((item) => {
                  const cfg = PAY_STATUS_CONFIG[item.status];
                  const isExp = expandedId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={s.record}
                      activeOpacity={0.85}
                      onPress={() => { setExpandedId(isExp ? null : item.id); Haptics.selectionAsync(); }}
                    >
                      <View style={s.recordTop}>
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={[s.recordService, { fontFamily: "Inter_600SemiBold" }]}>{item.service}</Text>
                            <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                              <Text style={[s.statusText, { fontFamily: "Inter_600SemiBold", color: cfg.color }]}>{cfg.label}</Text>
                            </View>
                          </View>
                          <Text style={[s.recordSub, { fontFamily: "Inter_400Regular" }]}>{item.customer} · {item.date}</Text>
                          <Text style={[s.recordOrderId, { fontFamily: "Inter_500Medium" }]}>Order {item.orderId}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          <Text style={[s.recordAmount, { fontFamily: "Inter_700Bold", color: "#34FF7A" }]}>{item.earned}</Text>
                          <Ionicons name={isExp ? "chevron-up" : "chevron-down"} size={15} color="#CCCCCC" />
                        </View>
                      </View>
                      {isExp && (
                        <View style={s.recordDetails}>
                          <View style={s.detailRow}>
                            <Ionicons name="resize-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>Yard size: {item.yardSize}</Text>
                          </View>
                          <View style={s.detailRow}>
                            <Ionicons name="location-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>{item.address}</Text>
                          </View>
                          <View style={s.detailRow}>
                            <Ionicons name="card-outline" size={13} color="#34FF7A" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>Customer paid via {item.payMethod}</Text>
                          </View>
                          <View style={s.detailRow}>
                            <Ionicons name="remove-circle-outline" size={13} color="#FFAA00" />
                            <Text style={[s.detailText, { fontFamily: "Inter_400Regular" }]}>Platform fee: {item.commission}</Text>
                          </View>
                          <View style={s.disputeNote}>
                            <Ionicons name="shield-checkmark-outline" size={13} color="#FFAA00" />
                            <Text style={[s.disputeNoteText, { fontFamily: "Inter_400Regular" }]}>
                              For disputes, reference Order ID {item.orderId} when contacting TheLawnServices
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 12, paddingBottom: 40,
    borderTopWidth: 1, borderColor: "#222",
    maxHeight: "90%",
  },
  handle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1E1E1E",
  },
  title: { fontSize: 18, color: "#FFFFFF" },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  emailNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#0d2e18", margin: 16, marginTop: 14,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#1a4a2a",
  },
  emailNoteText: { fontSize: 12, color: "#BBBBBB", flex: 1, lineHeight: 18 },
  record: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: "#1A1A1A", borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: "#222",
  },
  recordTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  recordService: { fontSize: 14, color: "#FFFFFF" },
  recordSub: { fontSize: 12, color: "#CCCCCC" },
  recordOrderId: { fontSize: 11, color: "#34FF7A", letterSpacing: 0.4 },
  recordAmount: { fontSize: 17, color: "#FFFFFF" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11 },
  recordDetails: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderColor: "#222", gap: 8,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailText: { fontSize: 13, color: "#CCCCCC", flex: 1 },
  disputeNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1C1500", borderRadius: 12,
    padding: 10, marginTop: 4,
  },
  disputeNoteText: { fontSize: 12, color: "#FFAA00", flex: 1, lineHeight: 18 },
  emptyWrap: { alignItems: "center", paddingTop: 60, paddingBottom: 40, gap: 14, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, color: "#FFFFFF" },
  emptySub: { fontSize: 13, color: "#BBBBBB", textAlign: "center", lineHeight: 20 },
});
