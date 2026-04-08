import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";

type RequestStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

const CUSTOMER_REQUESTS = [
  {
    id: "r1",
    service: "Lawn Mowing",
    description: "Full front and back yard, approx 1/4 acre. Gate on left side.",
    date: "Apr 12, 2026",
    time: "10:30 AM",
    budget: "$45 – $65",
    status: "accepted" as RequestStatus,
    pro: "John Rivera",
    postedAgo: "2 days ago",
  },
  {
    id: "r2",
    service: "Hedge Trimming",
    description: "6 ft hedges along driveway, roughly 40 linear feet.",
    date: "Apr 18, 2026",
    time: "9:00 AM",
    budget: "$60 – $80",
    status: "pending" as RequestStatus,
    pro: null,
    postedAgo: "5 hours ago",
  },
  {
    id: "r3",
    service: "Mulch Installation",
    description: "Flower beds around the house need new mulch. About 5 yards.",
    date: "Mar 28, 2026",
    time: "11:00 AM",
    budget: "$120 – $160",
    status: "completed" as RequestStatus,
    pro: "GreenScape Pros",
    postedAgo: "11 days ago",
  },
];

const LANDSCAPER_INCOMING = [
  {
    id: "in1",
    service: "Lawn Mowing",
    description: "Medium yard, front and back. Nothing special, straightforward job.",
    address: "8910 45th Ave E, Ellenton, FL",
    budget: "$55 – $70",
    date: "Apr 14",
    time: "Flexible",
    customer: "Alex T.",
    distance: "1.4 mi",
  },
  {
    id: "in2",
    service: "Hedge Trimming",
    description: "Small hedges along fence line. Should take about 1 hour.",
    address: "22 Palmetto Dr, Bradenton, FL",
    budget: "$45 – $60",
    date: "Apr 16",
    time: "Morning preferred",
    customer: "Priya N.",
    distance: "3.1 mi",
  },
  {
    id: "in3",
    service: "Clean Up",
    description: "Post-storm debris cleanup. Some branches down, leaves everywhere.",
    address: "104 Riverside Blvd, Palmetto, FL",
    budget: "$80 – $110",
    date: "Apr 17",
    time: "Anytime",
    customer: "Marcus R.",
    distance: "5.8 mi",
  },
  {
    id: "in4",
    service: "Mulching",
    description: "Front flower beds, roughly 4 yards of material needed.",
    address: "67 Oak Trail, Sarasota, FL",
    budget: "$115 – $150",
    date: "Apr 20",
    time: "Afternoon",
    customer: "Diane W.",
    distance: "8.2 mi",
  },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: "time-outline" | "checkmark-circle-outline" | "close-circle-outline" | "leaf" | "reload-outline" }> = {
  pending: { label: "Pending", color: "#FFAA00", bg: "#2A1F00", icon: "time-outline" },
  accepted: { label: "Accepted", color: "#34FF7A", bg: "#0d2e18", icon: "checkmark-circle-outline" },
  in_progress: { label: "In Progress", color: "#34FF7A", bg: "#0d2e18", icon: "reload-outline" },
  completed: { label: "Completed", color: "#BBBBBB", bg: "#1A1A1A", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#2A0808", icon: "close-circle-outline" },
};

function NewRequestModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (service: string, desc: string, budget: string) => void;
}) {
  const [service, setService] = useState("");
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");

  const SERVICES = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Clean Up", "Fertilization", "Landscaping", "Other"];

  function handleSubmit() {
    if (!service || !desc.trim()) {
      Alert.alert("Required Fields", "Please select a service and add a description.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(service, desc, budget);
    setService("");
    setDesc("");
    setBudget("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={modalStyles.handleBar} />
          <Text style={[modalStyles.title, { fontFamily: "Inter_700Bold" }]}>New Service Request</Text>

          <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {SERVICES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[modalStyles.chip, service === s && modalStyles.chipActive]}
                  onPress={() => { Haptics.selectionAsync(); setService(s); }}
                  activeOpacity={0.8}
                >
                  <Text style={[modalStyles.chipText, { fontFamily: "Inter_500Medium" }, service === s && modalStyles.chipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>Description</Text>
          <TextInput
            style={[modalStyles.textArea, { fontFamily: "Inter_400Regular" }]}
            placeholder="Describe the job — yard size, specific needs, gate codes, etc."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            value={desc}
            onChangeText={setDesc}
          />

          <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>Budget Range (optional)</Text>
          <TextInput
            style={[modalStyles.input, { fontFamily: "Inter_400Regular" }]}
            placeholder="e.g. $40 – $60"
            placeholderTextColor="#666"
            value={budget}
            onChangeText={setBudget}
          />

          <TouchableOpacity style={modalStyles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Ionicons name="send-outline" size={16} color="#000" />
            <Text style={[modalStyles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Post Request</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role } = useAuth();
  const { acceptJob } = useJobs();

  const isLandscaper = role === "landscaper";

  const [accepted, setAccepted] = useState<string[]>([]);
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [extraRequests, setExtraRequests] = useState<typeof CUSTOMER_REQUESTS>([]);

  function handleAccept(id: string, service: string, customer: string, budget: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccepted((prev) => [...prev, id]);
    acceptJob({ id, service, customer, address: "", date: "", time: "", budget });
    Alert.alert(
      "Job Accepted ✓",
      `You agreed to complete ${customer}'s ${service} job for ${budget} — the price the customer set.`
    );
  }

  function handlePostRequest(service: string, desc: string, budget: string) {
    const newReq = {
      id: `new-${Date.now()}`,
      service,
      description: desc,
      date: "TBD",
      time: "TBD",
      budget: budget || "Open to quotes",
      status: "pending" as RequestStatus,
      pro: null,
      postedAgo: "Just now",
    };
    setExtraRequests((prev) => [newReq, ...prev]);
  }

  const allCustomerRequests = [...extraRequests, ...CUSTOMER_REQUESTS];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          {isLandscaper ? "Incoming Requests" : "My Requests"}
        </Text>
        {!isLandscaper && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => { Haptics.selectionAsync(); setNewModalVisible(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#000" />
            <Text style={[styles.newBtnText, { fontFamily: "Inter_600SemiBold" }]}>New</Text>
          </TouchableOpacity>
        )}
        {isLandscaper && (
          <View style={styles.radiusBadge}>
            <Ionicons name="location-outline" size={12} color="#34FF7A" />
            <Text style={[styles.radiusText, { fontFamily: "Inter_500Medium" }]}>Within 50 mi</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLandscaper ? (
          /* ── Landscaper: incoming job requests ─────────────── */
          <>
            <Text style={[styles.sectionLabel, { fontFamily: "Inter_400Regular" }]}>
              {LANDSCAPER_INCOMING.length} open requests near you
            </Text>
            {LANDSCAPER_INCOMING.map((req) => {
              const isAccepted = accepted.includes(req.id);
              return (
                <View key={req.id} style={[styles.incomingCard, isAccepted && styles.incomingCardAccepted]}>
                  <View style={styles.incomingTop}>
                    <View style={styles.servicePill}>
                      <Ionicons name="leaf" size={12} color="#34FF7A" />
                      <Text style={[styles.servicePillText, { fontFamily: "Inter_600SemiBold" }]}>{req.service}</Text>
                    </View>
                    <View style={styles.distPill}>
                      <Ionicons name="navigate-outline" size={11} color="#CCCCCC" />
                      <Text style={[styles.distText, { fontFamily: "Inter_400Regular" }]}>{req.distance}</Text>
                    </View>
                  </View>

                  <Text style={[styles.incomingDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {req.description}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#CCCCCC" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.address}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#CCCCCC" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.date} · {req.time}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="cash-outline" size={12} color="#CCCCCC" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.budget}</Text>
                  </View>

                  <View style={styles.incomingFooter}>
                    <Text style={[styles.customerLabel, { fontFamily: "Inter_500Medium" }]}>
                      Posted by {req.customer}
                    </Text>
                    {isAccepted ? (
                      <View style={styles.acceptedBadge}>
                        <Ionicons name="checkmark" size={12} color="#34FF7A" />
                        <Text style={[styles.acceptedBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Accepted · {req.budget}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => {
                          Alert.alert(
                            "Agree to Customer's Price?",
                            `By accepting, you agree to complete this ${req.service} job for ${req.budget} — the price set by the customer. No counter-offers.\n\nDo you want to accept?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: `Accept at ${req.budget}`,
                                onPress: () => handleAccept(req.id, req.service, req.customer, req.budget),
                              },
                            ]
                          );
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.acceptBtnText, { fontFamily: "Inter_600SemiBold" }]}>Accept at {req.budget}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        ) : (
          /* ── Customer: my submitted requests ───────────────── */
          <>
            <Text style={[styles.sectionLabel, { fontFamily: "Inter_400Regular" }]}>
              {allCustomerRequests.length} request{allCustomerRequests.length !== 1 ? "s" : ""} submitted
            </Text>
            {allCustomerRequests.map((req) => {
              const cfg = STATUS_CONFIG[req.status];
              return (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestTop}>
                    <View style={styles.servicePill}>
                      <Ionicons name="leaf" size={12} color="#34FF7A" />
                      <Text style={[styles.servicePillText, { fontFamily: "Inter_600SemiBold" }]}>{req.service}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
                      <Text style={[styles.statusText, { fontFamily: "Inter_600SemiBold", color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.requestDesc, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {req.description}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#CCCCCC" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.date} · {req.time}</Text>
                  </View>
                  {req.budget ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="cash-outline" size={12} color="#CCCCCC" />
                      <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.budget}</Text>
                    </View>
                  ) : null}

                  <View style={styles.requestFooter}>
                    <Text style={[styles.postedAgo, { fontFamily: "Inter_400Regular" }]}>Posted {req.postedAgo}</Text>
                    {req.pro ? (
                      <View style={styles.proAssigned}>
                        <Ionicons name="person-outline" size={12} color="#34FF7A" />
                        <Text style={[styles.proAssignedText, { fontFamily: "Inter_500Medium" }]}>{req.pro}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.awaitingText, { fontFamily: "Inter_400Regular" }]}>Awaiting pro…</Text>
                    )}
                  </View>
                </View>
              );
            })}

            {allCustomerRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={40} color="#333" />
                <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>No requests yet</Text>
                <Text style={[styles.emptySubtitle, { fontFamily: "Inter_400Regular" }]}>
                  Tap New to post your first service request.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!isLandscaper && (
        <NewRequestModal
          visible={newModalVisible}
          onClose={() => setNewModalVisible(false)}
          onSubmit={handlePostRequest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#34FF7A",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBtnText: { fontSize: 14, color: "#000" },
  radiusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#34FF7A33",
  },
  radiusText: { fontSize: 12, color: "#34FF7A" },

  scrollContent: { padding: 20, gap: 12 },
  sectionLabel: {
    fontSize: 12,
    color: "#BBBBBB",
    marginBottom: 4,
  },

  incomingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 10,
  },
  incomingCardAccepted: {
    borderColor: "#34FF7A33",
    opacity: 0.7,
  },
  incomingTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  servicePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  servicePillText: { fontSize: 12, color: "#34FF7A" },
  distPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  distText: { fontSize: 12, color: "#BBBBBB" },

  incomingDesc: { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 19 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#999999", flex: 1 },

  incomingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  customerLabel: { fontSize: 12, color: "#BBBBBB" },
  acceptBtn: {
    backgroundColor: "#34FF7A",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  acceptBtnText: { fontSize: 13, color: "#000" },
  acceptedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  acceptedBadgeText: { fontSize: 12, color: "#34FF7A" },

  requestCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 10,
  },
  requestTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11 },
  requestDesc: { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 19 },

  requestFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  postedAgo: { fontSize: 11, color: "#BBBBBB" },
  proAssigned: { flexDirection: "row", alignItems: "center", gap: 5 },
  proAssignedText: { fontSize: 12, color: "#34FF7A" },
  awaitingText: { fontSize: 12, color: "#BBBBBB", fontStyle: "italic" },

  emptyState: { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 17, color: "#FFFFFF" },
  emptySubtitle: { fontSize: 13, color: "#BBBBBB", textAlign: "center" },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: "#222222",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, color: "#FFFFFF", marginBottom: 20 },
  label: { fontSize: 13, color: "#CCCCCC", marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#222222",
    borderWidth: 1,
    borderColor: "#333",
  },
  chipActive: { backgroundColor: "#0d2e18", borderColor: "#34FF7A" },
  chipText: { fontSize: 13, color: "#FFFFFF" },
  chipTextActive: { color: "#34FF7A" },
  textArea: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 16,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 18,
    padding: 16,
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { fontSize: 16, color: "#000" },
});
