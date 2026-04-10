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
import { useLandscaperProfile, SERVICE_BLOCK_MINUTES } from "@/contexts/landscaperProfile";

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function normalizeDateKey(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 3) return raw;
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1]}, ${new Date().getFullYear()}`;
  }
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

type RequestStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

const CUSTOMER_REQUESTS = [
  {
    id: "r1",
    service: "Mowing/Edging",
    description: "Full front and back yard, approx 1/4 acre. Gate on left side.",
    date: "Apr 12, 2026",
    time: "10:30 AM",
    budget: "$45 – $70",
    status: "accepted" as RequestStatus,
    pro: "John Rivera",
    postedAgo: "2 days ago",
  },
  {
    id: "r2",
    service: "Weeding/Mulching",
    description: "Flower beds around the house, roughly 40 sq ft. Needs fresh mulch too.",
    date: "Apr 18, 2026",
    time: "9:00 AM",
    budget: "$90 – $130",
    status: "pending" as RequestStatus,
    pro: null,
    postedAgo: "5 hours ago",
  },
  {
    id: "r3",
    service: "Sod Installation",
    description: "Back yard needs fresh sod — about 800 sq ft total.",
    date: "Mar 28, 2026",
    time: "11:00 AM",
    budget: "$350 – $550",
    status: "completed" as RequestStatus,
    pro: "GreenScape Pros",
    postedAgo: "11 days ago",
  },
];

const LANDSCAPER_INCOMING = [
  {
    id: "in1",
    service: "Mowing/Edging",
    description: "Medium yard, front and back. Edge along driveway and sidewalk.",
    address: "8910 45th Ave E, Ellenton, FL",
    budget: "$55 – $70",
    date: "Apr 14",
    time: "Flexible",
    customer: "Alex T.",
    distance: "1.4 mi",
  },
  {
    id: "in2",
    service: "Weeding/Mulching",
    description: "Front flower beds need weeding and about 3 yards of fresh mulch.",
    address: "22 Palmetto Dr, Bradenton, FL",
    budget: "$90 – $130",
    date: "Apr 16",
    time: "Morning preferred",
    customer: "Priya N.",
    distance: "3.1 mi",
  },
  {
    id: "in3",
    service: "Sod Installation",
    description: "Back yard — roughly 600 sq ft of bare dirt that needs new sod.",
    address: "104 Riverside Blvd, Palmetto, FL",
    budget: "$350 – $550",
    date: "Apr 17",
    time: "Anytime",
    customer: "Marcus R.",
    distance: "5.8 mi",
  },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: "time-outline" | "checkmark-circle-outline" | "close-circle-outline" | "leaf" | "reload-outline" }> = {
  pending: { label: "Pending", color: "#FFAA00", bg: "#2A1F00", icon: "time-outline" },
  accepted: { label: "Accepted", color: "#34FF7A", bg: "#0d2e18", icon: "checkmark-circle-outline" },
  in_progress: { label: "In Progress", color: "#34FF7A", bg: "#0d2e18", icon: "reload-outline" },
  completed: { label: "Completed", color: "#BBBBBB", bg: "#1A1A1A", icon: "checkmark-circle-outline" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "#2A0808", icon: "close-circle-outline" },
};

const TREE_SERVICES_REQ = ["Tree Removal"];
const SOD_SERVICES_REQ  = ["Sod Installation"];
const YARD_SERVICES_REQ = ["Mowing/Edging", "Weeding/Mulching"];

const YARD_SIZE_OPTS = ["Small (under ¼ acre)", "Medium (¼ – ½ acre)", "Large (over ½ acre)"];
const TREE_SIZE_OPTS = [
  { label: "Small",  sub: "1 – 6 ft" },
  { label: "Medium", sub: "up to 10 ft" },
  { label: "Large",  sub: "up to 20 ft" },
  { label: "XLarge", sub: "over 20 ft" },
];
const SOD_TYPE_OPTS = [
  "St. Augustine", "Zoysia Grass", "Bermuda Grass",
  "Bahia Grass",   "Centipede Grass", "Xeriscaping",
];

function NewRequestModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (service: string, desc: string, budget: string, address: string, zip: string, detail: string) => void;
}) {
  const [service, setService] = useState("");
  const [yardSize, setYardSize] = useState("");
  const [treeSize, setTreeSize] = useState("");
  const [sodType,  setSodType]  = useState("");
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");

  const SERVICES = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Tree Removal"];

  function pickService(s: string) {
    Haptics.selectionAsync();
    setService(s);
    setYardSize(""); setTreeSize(""); setSodType("");
  }

  function getDetail() {
    if (TREE_SERVICES_REQ.includes(service)) return treeSize;
    if (SOD_SERVICES_REQ.includes(service))  return sodType;
    return yardSize;
  }

  function handleSubmit() {
    if (!service) {
      Alert.alert("Service Required", "Please select a service type.");
      return;
    }
    if (TREE_SERVICES_REQ.includes(service) && !treeSize) {
      Alert.alert("Tree Size Required", "Please select the size of the tree to be removed.");
      return;
    }
    if (SOD_SERVICES_REQ.includes(service) && !sodType) {
      Alert.alert("Sod Type Required", "Please select the type of sod you want installed.");
      return;
    }
    if (YARD_SERVICES_REQ.includes(service) && !yardSize) {
      Alert.alert("Yard Size Required", "Please select your yard size so landscapers can estimate the job.");
      return;
    }
    if (!desc.trim()) {
      Alert.alert("Description Required", "Please describe the job so landscapers know what to expect.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Address Required", "Please enter the service address so a landscaper can find you.");
      return;
    }
    if (!zip.trim() || zip.trim().length < 5) {
      Alert.alert("Zip Code Required", "Please enter a valid 5-digit zip code.");
      return;
    }
    if (!budget.trim()) {
      Alert.alert("Offer Required", "Please enter the amount you're willing to pay. This becomes the locked price if a landscaper accepts your request — it cannot be changed later.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(service, desc, budget.trim(), address.trim(), zip.trim(), getDetail());
    setService(""); setYardSize(""); setTreeSize(""); setSodType("");
    setDesc(""); setBudget(""); setAddress(""); setZip("");
    onClose();
  }

  const needsYard = YARD_SERVICES_REQ.includes(service);
  const needsTree = TREE_SERVICES_REQ.includes(service);
  const needsSod  = SOD_SERVICES_REQ.includes(service);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={modalStyles.handleBar} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[modalStyles.title, { fontFamily: "Inter_700Bold" }]}>New Service Request</Text>

            <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SERVICES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[modalStyles.chip, service === s && modalStyles.chipActive]}
                    onPress={() => pickService(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[modalStyles.chipText, { fontFamily: "Inter_500Medium" }, service === s && modalStyles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* ── Yard size (Mowing / Weeding) ─── */}
            {needsYard && (
              <>
                <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>
                  Yard Size <Text style={modalStyles.required}>*</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {YARD_SIZE_OPTS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[modalStyles.chip, yardSize === opt && modalStyles.chipActive]}
                      onPress={() => { Haptics.selectionAsync(); setYardSize(opt); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[modalStyles.chipText, { fontFamily: "Inter_500Medium" }, yardSize === opt && modalStyles.chipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Tree size (Tree Removal) ─── */}
            {needsTree && (
              <>
                <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>
                  Tree Size <Text style={modalStyles.required}>*</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {TREE_SIZE_OPTS.map(({ label, sub }) => (
                    <TouchableOpacity
                      key={label}
                      style={[modalStyles.chip, treeSize === label && modalStyles.chipActive, { paddingVertical: 10 }]}
                      onPress={() => { Haptics.selectionAsync(); setTreeSize(label); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[modalStyles.chipText, { fontFamily: "Inter_600SemiBold" }, treeSize === label && modalStyles.chipTextActive]}>
                        {label}
                      </Text>
                      <Text style={[{ fontSize: 10, color: treeSize === label ? "#34FF7A" : "#888", fontFamily: "Inter_400Regular" }]}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ── Sod type (Sod Installation) ─── */}
            {needsSod && (
              <>
                <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>
                  Sod Type <Text style={modalStyles.required}>*</Text>
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {SOD_TYPE_OPTS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[modalStyles.chip, sodType === opt && modalStyles.chipActive]}
                      onPress={() => { Haptics.selectionAsync(); setSodType(opt); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[modalStyles.chipText, { fontFamily: "Inter_500Medium" }, sodType === opt && modalStyles.chipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>Description</Text>
            <TextInput
              style={[modalStyles.textArea, { fontFamily: "Inter_400Regular" }]}
              placeholder="Describe the job — specific needs, gate codes, access instructions, etc."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={desc}
              onChangeText={setDesc}
            />

            <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }]}>
              Service Address <Text style={modalStyles.required}>*</Text>
            </Text>
            <TextInput
              style={[modalStyles.input, { fontFamily: "Inter_400Regular" }]}
              placeholder="Street address"
              placeholderTextColor="#666"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }, { marginTop: 10 }]}>
              Zip Code <Text style={modalStyles.required}>*</Text>
            </Text>
            <TextInput
              style={[modalStyles.input, { fontFamily: "Inter_400Regular" }]}
              placeholder="e.g. 34222"
              placeholderTextColor="#666"
              value={zip}
              onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))}
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="done"
            />

            <Text style={[modalStyles.label, { fontFamily: "Inter_500Medium" }, { marginTop: 10 }]}>Your Offer — Amount You'll Pay <Text style={{ color: "#34FF7A" }}>*</Text></Text>
            <TextInput
              style={[modalStyles.input, { fontFamily: "Inter_400Regular" }]}
              placeholder="e.g. $75"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />

            <View style={modalStyles.requiredNote}>
              <Ionicons name="information-circle-outline" size={13} color="#888" />
              <Text style={[modalStyles.requiredNoteText, { fontFamily: "Inter_400Regular" }]}>
                Your offer becomes the locked price if a landscaper accepts — it overrides their standard rates and cannot be changed later. Address and zip code are required so landscapers can locate your property.
              </Text>
            </View>

            <TouchableOpacity style={modalStyles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Ionicons name="send-outline" size={16} color="#000" />
              <Text style={[modalStyles.submitText, { fontFamily: "Inter_600SemiBold" }]}>Post Request</Text>
            </TouchableOpacity>
          </ScrollView>
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
  const { addBookedSlot } = useLandscaperProfile();

  const isLandscaper = role === "landscaper";

  const [accepted, setAccepted] = useState<string[]>([]);
  const [newModalVisible, setNewModalVisible] = useState(false);
  const [extraRequests, setExtraRequests] = useState<typeof CUSTOMER_REQUESTS>([]);

  function handleAccept(id: string, service: string, customer: string, budget: string, rawDate: string, rawTime: string, address: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAccepted((prev) => [...prev, id]);
    acceptJob({ id, service, customer, address, date: rawDate, time: rawTime, budget });
    const blockMins = SERVICE_BLOCK_MINUTES[service] ?? 120;
    const dateKey = normalizeDateKey(rawDate);
    const timeKey = normalizeTime(rawTime);
    addBookedSlot(dateKey, timeKey, blockMins, service);
    Alert.alert(
      "Job Accepted ✓",
      `You agreed to complete ${customer}'s ${service} job for ${budget} — the price the customer set.`
    );
  }

  function handlePostRequest(service: string, desc: string, budget: string, address: string, zip: string, detail: string) {
    const newReq = {
      id: `new-${Date.now()}`,
      service,
      description: desc,
      detail,
      address,
      zip,
      date: "TBD",
      time: "TBD",
      budget,
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
            <Text style={[styles.radiusText, { fontFamily: "Inter_500Medium" }]}>Within 25 mi</Text>
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
                    <Ionicons name="cash-outline" size={12} color="#34FF7A" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>
                      Customer's Offer: {req.budget}
                    </Text>
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
                            `By accepting, you agree to complete this ${req.service} job for ${req.budget} — the price set by the customer.\n\nThis overrides your standard service rates for this job. No counter-offers.\n\nDo you want to accept?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: `Accept at ${req.budget}`,
                                onPress: () => handleAccept(req.id, req.service, req.customer, req.budget, req.date, req.time, req.address),
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

                  {"detail" in req && req.detail ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="options-outline" size={12} color="#CCCCCC" />
                      <Text style={[styles.metaText, { fontFamily: "Inter_500Medium" }]}>{req.detail}</Text>
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#CCCCCC" />
                    <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{req.date} · {req.time}</Text>
                  </View>
                  {req.budget ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="cash-outline" size={12} color="#34FF7A" />
                      <Text style={[styles.metaText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>
                        Your Offer: {req.budget}
                      </Text>
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
    maxHeight: "92%",
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
  required: { color: "#FF4444", fontSize: 13 },
  requiredNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#111111",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  requiredNoteText: { fontSize: 12, color: "#888", flex: 1, lineHeight: 17 },
  submitBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 28,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  submitText: { fontSize: 16, color: "#000" },
});
