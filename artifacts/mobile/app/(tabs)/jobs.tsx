import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useNotifications } from "@/contexts/notifications";

type JobStatus = "pending" | "arrived" | "started" | "completed";

const SHARED_ACTIVE_JOBS = [
  {
    id: "a1",
    service: "Lawn Mowing",
    customer: "Zamire Smith",
    landscaper: "GreenScape Pros",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Today",
    time: "10:30 AM",
  },
];

const SHARED_COMPLETED_JOBS = [
  {
    id: "c1",
    service: "Hedge Trimming",
    customer: "Marcus T.",
    landscaper: "GreenScape Pros",
    address: "88 Palmetto Ave, Ellenton, FL",
    date: "Apr 7",
    time: "9:00 AM",
  },
  {
    id: "c2",
    service: "Mulching",
    customer: "Alex T.",
    landscaper: "GreenScape Pros",
    address: "22 Oak St, Ellenton, FL",
    date: "Mar 28",
    time: "11:00 AM",
  },
];

const SERVICE_HISTORY = [
  {
    id: "h1",
    service: "Lawn Mowing",
    customer: "Zamire Smith",
    landscaper: "GreenScape Pros",
    date: "Apr 7, 2026",
    amount: "$65.00",
  },
  {
    id: "h2",
    service: "Hedge Trimming",
    customer: "Marcus T.",
    landscaper: "GreenScape Pros",
    date: "Mar 28, 2026",
    amount: "$55.00",
  },
  {
    id: "h3",
    service: "Mulching",
    customer: "Alex T.",
    landscaper: "GreenScape Pros",
    date: "Mar 15, 2026",
    amount: "$135.00",
  },
  {
    id: "h4",
    service: "Lawn Mowing",
    customer: "Priya N.",
    landscaper: "GreenScape Pros",
    date: "Feb 22, 2026",
    amount: "$52.00",
  },
];

const STATUS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "started", label: "Work Started" },
  { key: "completed", label: "Completed" },
];

function statusOrder(s: JobStatus): number {
  return { pending: 0, arrived: 1, started: 2, completed: 3 }[s];
}

type ChatMessage = { id: string; text: string; fromMe: boolean };

function ChatModal({
  visible,
  isLandscaper,
  jobData,
  insets,
  isWeb,
  onClose,
}: {
  visible: boolean;
  isLandscaper: boolean;
  jobData: { landscaper?: string; customer?: string } | null;
  insets: { bottom: number };
  isWeb: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", text: "Hi, I'm on my way!", fromMe: false },
    { id: "1", text: "Great! See you soon.", fromMe: true },
  ]);
  const [input, setInput] = useState("");
  const flatRef = useRef<FlatList>(null);

  const { addNotification } = useNotifications();

  const otherParty = isLandscaper
    ? (jobData?.customer ?? "Customer")
    : (jobData?.landscaper ?? "Landscaper");

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages((prev) => [...prev, { id: String(Date.now()), text, fromMe: true }]);
    addNotification({
      icon: "💬",
      title: "New message",
      sub: `${otherParty} sent you a message`,
    });
    setInput("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), text: isLandscaper ? "Thanks!" : "On my way!", fromMe: false },
      ]);
      addNotification({
        icon: "💬",
        title: "New message",
        sub: `${otherParty} replied`,
      });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }, 900);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={chatStyles.backdrop}>
        <KeyboardAvoidingView
          style={[chatStyles.sheet, { paddingBottom: isWeb ? 16 : insets.bottom }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={chatStyles.handle} />
          <View style={chatStyles.chatHeader}>
            <Text style={[chatStyles.chatTitle, { fontFamily: "Inter_600SemiBold" }]}>
              Chat with {otherParty}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={chatStyles.messagesList}
            showsVerticalScrollIndicator={false}
            onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[chatStyles.bubble, item.fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem]}>
                <Text style={[chatStyles.bubbleText, { fontFamily: "Inter_400Regular" }, item.fromMe && chatStyles.bubbleTextMe]}>
                  {item.text}
                </Text>
              </View>
            )}
          />
          <View style={chatStyles.inputRow}>
            <TextInput
              style={[chatStyles.input, { fontFamily: "Inter_400Regular" }]}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#555"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={chatStyles.sendBtn} onPress={sendMessage} activeOpacity={0.85}>
              <Ionicons name="send" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;
  const { role } = useAuth();
  const isLandscaper = role === "landscaper";
  const { addNotification } = useNotifications();

  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(
    Object.fromEntries(SHARED_ACTIVE_JOBS.map((j) => [j.id, "pending"]))
  );
  const [chatJobData, setChatJobData] = useState<{ landscaper?: string; customer?: string } | null>(null);

  function advanceStatus(jobId: string, next: JobStatus) {
    const current = jobStatuses[jobId];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJobStatuses((prev) => ({ ...prev, [jobId]: next }));
    if (next === "started" && statusOrder(current) < statusOrder("started")) {
      const job = SHARED_ACTIVE_JOBS.find((j) => j.id === jobId);
      addNotification({
        icon: "🛠️",
        title: "Work has started",
        sub: `${isLandscaper ? "You've" : "Your landscaper has"} started work on ${job?.service ?? "your job"}`,
      });
      setTimeout(() => {
        Alert.alert(
          "✅ Customer Notified",
          "The customer has been notified that you've arrived and work has started.",
          [{ text: "OK" }]
        );
      }, 300);
    }
    if (next === "completed") {
      const job = SHARED_ACTIVE_JOBS.find((j) => j.id === jobId);
      addNotification({
        icon: "✅",
        title: "Work complete!",
        sub: `${job?.service ?? "Your job"} has been completed successfully`,
      });
      setTimeout(() => {
        Alert.alert(
          "🎉 Job Complete",
          "The customer has been notified that work is complete. Payment will be released from escrow within 24 hours.",
          [{ text: "OK" }]
        );
      }, 300);
    }
  }

  function openChat(data: { landscaper?: string; customer?: string }) {
    Haptics.selectionAsync();
    setChatJobData(data);
  }

  function simulateCall(name: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("📞 Calling…", `Connecting you to ${name}.\n\n(Demo call simulation)`);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>My Jobs</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
      >
        {/* ── Active Jobs ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Active Jobs
        </Text>

        {SHARED_ACTIVE_JOBS.map((job) => {
          const status = isLandscaper ? jobStatuses[job.id] : "pending";
          const isLandscaperComplete = isLandscaper && status === "completed";

          return (
            <View key={job.id} style={styles.activeCard}>
              {/* Service name + status + chat/call */}
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.jobTitle, { fontFamily: "Inter_600SemiBold" }]}>
                    {job.service}
                  </Text>
                  <Text style={[styles.jobSub, { fontFamily: "Inter_400Regular" }]}>
                    {isLandscaper ? job.customer : job.landscaper}
                  </Text>
                  <Text style={[styles.jobStatus, { fontFamily: "Inter_500Medium" }]}>
                    {isLandscaperComplete ? "✓ Completed" : "In Progress"}
                  </Text>
                </View>
                {!isLandscaperComplete && (
                  <View style={styles.actionBtns}>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => openChat(isLandscaper ? { customer: job.customer } : { landscaper: job.landscaper })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnIcon}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => simulateCall(isLandscaper ? job.customer : job.landscaper)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnIcon}>📞</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color="#888" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{job.address}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color="#888" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{job.date} · {job.time}</Text>
              </View>

              {/* Landscaper-only: status advance buttons */}
              {isLandscaper && (
                <View style={styles.statusRow}>
                  {STATUS_STEPS.map((step) => {
                    const done = statusOrder(status) >= statusOrder(step.key);
                    return (
                      <TouchableOpacity
                        key={step.key}
                        style={[styles.stepBtn, done && styles.stepBtnDone]}
                        onPress={() => advanceStatus(job.id, step.key)}
                        activeOpacity={done ? 1 : 0.8}
                      >
                        {done && <Ionicons name="checkmark" size={11} color="#000" />}
                        <Text style={[styles.stepBtnText, { fontFamily: "Inter_500Medium" }, done && styles.stepBtnTextDone]}>
                          {step.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* ── Previous Jobs Completed ─────────────────────────── */}
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
          Previous Jobs Completed
        </Text>

        {SHARED_COMPLETED_JOBS.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={[styles.emptyText, { fontFamily: "Inter_400Regular" }]}>No completed jobs yet</Text>
          </View>
        ) : (
          SHARED_COMPLETED_JOBS.map((job) => (
            <View key={job.id} style={styles.completedCard}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.jobTitle, { fontFamily: "Inter_600SemiBold" }]}>{job.service}</Text>
                  <Text style={[styles.jobSub, { fontFamily: "Inter_400Regular" }]}>
                    {isLandscaper ? job.customer : job.landscaper}
                  </Text>
                </View>
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark" size={11} color="#34FF7A" />
                  <Text style={[styles.completedBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Completed</Text>
                </View>
              </View>
              <View style={[styles.metaRow, { marginTop: 6 }]}>
                <Ionicons name="time-outline" size={12} color="#555" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular", color: "#555" }]}>{job.date} · {job.time}</Text>
              </View>
            </View>
          ))
        )}

        {/* ── Service History ─────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
          Service History
        </Text>

        {SERVICE_HISTORY.map((entry) => (
          <View key={entry.id} style={styles.historyCard}>
            <View style={styles.historyIconCol}>
              <View style={styles.historyIconWrap}>
                <Ionicons name="leaf" size={14} color="#34FF7A" />
              </View>
              <View style={styles.historyLine} />
            </View>
            <View style={styles.historyBody}>
              <View style={styles.historyTopRow}>
                <Text style={[styles.historyService, { fontFamily: "Inter_600SemiBold" }]}>{entry.service}</Text>
                <Text style={[styles.historyAmount, { fontFamily: "Inter_600SemiBold" }]}>{entry.amount}</Text>
              </View>
              <Text style={[styles.historyPerson, { fontFamily: "Inter_400Regular" }]}>
                {isLandscaper ? entry.customer : entry.landscaper}
              </Text>
              <Text style={[styles.historyDate, { fontFamily: "Inter_400Regular" }]}>{entry.date}</Text>
            </View>
          </View>
        ))}

        {/* All sales are final notice */}
        <View style={styles.finalSaleNotice}>
          <Ionicons name="information-circle-outline" size={14} color="#555" />
          <Text style={[styles.finalSaleText, { fontFamily: "Inter_400Regular" }]}>
            All sales are final. No refunds after completion confirmation.
          </Text>
        </View>
      </ScrollView>

      <ChatModal
        visible={chatJobData !== null}
        isLandscaper={isLandscaper}
        jobData={chatJobData}
        insets={insets}
        isWeb={isWeb}
        onClose={() => setChatJobData(null)}
      />
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
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  scrollContent: { padding: 20, gap: 10 },

  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  activeCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 8,
    marginBottom: 4,
  },
  completedCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    padding: 16,
    opacity: 0.75,
    marginBottom: 4,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  jobTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 2 },
  jobSub: { fontSize: 13, color: "#888888", marginBottom: 3 },
  jobStatus: { fontSize: 13, color: "#34FF7A" },

  actionBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  chatBtn: {
    width: 38,
    height: 38,
    backgroundColor: "#222222",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtn: {
    width: 38,
    height: 38,
    backgroundColor: "#34FF7A",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  btnIcon: { fontSize: 18 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, color: "#888888", flex: 1 },

  statusRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  stepBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#34FF7A",
  },
  stepBtnDone: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  stepBtnText: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  stepBtnTextDone: { color: "#000000" },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#34FF7A22",
  },
  completedBadgeText: { fontSize: 11, color: "#34FF7A" },

  emptyRow: { paddingVertical: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#555" },

  historyCard: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 2,
  },
  historyIconCol: {
    alignItems: "center",
    width: 28,
  },
  historyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0d2e18",
    borderWidth: 1,
    borderColor: "#34FF7A33",
    alignItems: "center",
    justifyContent: "center",
  },
  historyLine: {
    flex: 1,
    width: 1,
    backgroundColor: "#222222",
    marginTop: 4,
    marginBottom: -8,
  },
  historyBody: {
    flex: 1,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1C",
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  historyService: { fontSize: 14, color: "#FFFFFF" },
  historyAmount: { fontSize: 14, color: "#34FF7A" },
  historyPerson: { fontSize: 12, color: "#888888", marginBottom: 2 },
  historyDate: { fontSize: 11, color: "#555555" },

  finalSaleNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  finalSaleText: {
    fontSize: 11,
    color: "#555555",
    flex: 1,
    lineHeight: 16,
  },
});

const chatStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#161616",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "70%",
    paddingTop: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  chatTitle: { fontSize: 16, color: "#FFFFFF" },
  messagesList: {
    padding: 20,
    gap: 10,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: "75%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: "#222222",
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  bubbleThem: {
    backgroundColor: "#34FF7A",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: 15, color: "#FFFFFF", lineHeight: 22 },
  bubbleTextMe: { color: "#FFFFFF" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#222222",
  },
  input: {
    flex: 1,
    backgroundColor: "#222222",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  sendBtn: {
    width: 46,
    height: 46,
    backgroundColor: "#34FF7A",
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});
