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

type JobStatus = "pending" | "arrived" | "started" | "completed";

const ACTIVE_JOBS = [
  {
    id: "1",
    service: "Lawn Mowing",
    customer: "Zamire Smith",
    landscaper: "GreenScape Pros",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Today",
    time: "10:30 AM",
  },
];

const LANDSCAPER_APPOINTMENTS = [
  {
    id: "1",
    customer: "Zamire Smith",
    address: "8910 45th Ave E, Ellenton, FL",
    phone: "(941) 555-0192",
    date: "Apr 9",
    time: "10:30 AM",
    note: "Screenshots attached",
  },
  {
    id: "2",
    customer: "Marcus T.",
    address: "88 Palmetto Ave, Ellenton, FL",
    phone: "(555) 987-6543",
    date: "Apr 12",
    time: "9:00 AM",
    note: null,
  },
];

const CUSTOMER_JOBS = [
  {
    id: "c1",
    service: "Lawn Mowing",
    landscaper: "GreenScape Pros",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Today",
    time: "10:30 AM",
    status: "In Progress",
    active: true,
  },
  {
    id: "c2",
    service: "Hedge Trimming",
    landscaper: "Rivera Lawn Care",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Apr 12",
    time: "9:00 AM",
    status: "Scheduled",
    active: false,
  },
];

const STATUS_STEPS: { key: JobStatus; label: string }[] = [
  { key: "arrived", label: "Arrived" },
  { key: "started", label: "Work Started" },
  { key: "completed", label: "Completed" },
];

function statusOrder(s: JobStatus): number {
  return { pending: 0, arrived: 1, started: 2, completed: 3 }[s];
}

type ChatMessage = { id: string; text: string; fromMe: boolean };

function ChatModal({
  visible,
  jobId,
  isLandscaper,
  jobData,
  insets,
  isWeb,
  onClose,
}: {
  visible: boolean;
  jobId: string | null;
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

  const otherParty = isLandscaper
    ? (jobData?.customer ?? "Customer")
    : (jobData?.landscaper ?? "Landscaper");

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg: ChatMessage = { id: String(Date.now()), text, fromMe: true };
    setMessages((prev) => [...prev, msg]);
    setInput("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: String(Date.now() + 1),
        text: isLandscaper ? "Thanks!" : "On my way!",
        fromMe: false,
      };
      setMessages((prev) => [...prev, reply]);
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
              <View
                style={[
                  chatStyles.bubble,
                  item.fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem,
                ]}
              >
                <Text
                  style={[
                    chatStyles.bubbleText,
                    { fontFamily: "Inter_400Regular" },
                    item.fromMe && chatStyles.bubbleTextMe,
                  ]}
                >
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

  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(
    Object.fromEntries(ACTIVE_JOBS.map((j) => [j.id, "pending"]))
  );
  const [chatJobId, setChatJobId] = useState<string | null>(null);
  const [chatJobData, setChatJobData] = useState<{ landscaper?: string; customer?: string } | null>(null);

  function advanceStatus(jobId: string, next: JobStatus) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJobStatuses((prev) => ({ ...prev, [jobId]: next }));
  }

  function openChat(jobId: string, data: { landscaper?: string; customer?: string }) {
    Haptics.selectionAsync();
    setChatJobId(jobId);
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

      {isLandscaper ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
        >
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Job Status Tracking
          </Text>

          {ACTIVE_JOBS.map((job) => {
            const status = jobStatuses[job.id];
            const isComplete = status === "completed";
            const isActive = !isComplete;
            return (
              <View key={job.id} style={styles.trackingCard}>
                <View style={styles.trackingTopRow}>
                  <Text style={[styles.trackingTitle, { fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {job.service} – {job.customer}
                  </Text>
                  <View style={styles.topRowRight}>
                    {isActive && (
                      <>
                        <TouchableOpacity
                          style={styles.chatBtn}
                          onPress={() => openChat(job.id, { customer: job.customer })}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.chatBtnIcon}>💬</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => simulateCall(job.customer)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.callBtnIcon}>📞</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <View style={[styles.statusPill, isComplete && styles.statusPillComplete]}>
                      <Text style={[styles.statusPillText, { fontFamily: "Inter_600SemiBold" }, isComplete && styles.statusPillTextComplete]}>
                        {isComplete ? "Completed" : "In Progress"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={[styles.trackingMeta, { fontFamily: "Inter_400Regular" }]}>
                  {job.address} · {job.date} {job.time}
                </Text>

                <View style={styles.actionRow}>
                  {STATUS_STEPS.map((step) => {
                    const done = statusOrder(status) >= statusOrder(step.key);
                    return (
                      <TouchableOpacity
                        key={step.key}
                        style={[styles.actionBtn, done && styles.actionBtnDone]}
                        onPress={() => advanceStatus(job.id, step.key)}
                        activeOpacity={done ? 1 : 0.8}
                      >
                        {done && <Ionicons name="checkmark" size={12} color="#000" />}
                        <Text style={[styles.actionBtnText, { fontFamily: "Inter_500Medium" }, done && styles.actionBtnTextDone]}>
                          {step.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            Active & Future Appointments
          </Text>

          {LANDSCAPER_APPOINTMENTS.map((appt) => (
            <View key={appt.id} style={styles.apptCard}>
              <View style={styles.apptTopRow}>
                <Text style={[styles.apptCustomer, { fontFamily: "Inter_600SemiBold" }]}>
                  {appt.customer}
                </Text>
                <Text style={[styles.apptDateTime, { fontFamily: "Inter_400Regular" }]}>
                  {appt.date} · {appt.time}
                </Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="location-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{appt.address}</Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="call-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{appt.phone}</Text>
              </View>
              {appt.note && (
                <View style={styles.notePill}>
                  <Ionicons name="image-outline" size={12} color="#34FF7A" />
                  <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>{appt.note}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
        >
          <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
            Your Jobs
          </Text>
          {CUSTOMER_JOBS.map((job) => (
            <View key={job.id} style={[styles.trackingCard, !job.active && styles.trackingCardInactive]}>
              <View style={styles.trackingTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trackingTitle, { fontFamily: "Inter_600SemiBold" }]}>
                    {job.service}
                  </Text>
                  <Text style={[styles.trackingMeta, { fontFamily: "Inter_400Regular", marginTop: 2 }]}>
                    {job.landscaper}
                  </Text>
                </View>
                <View style={styles.topRowRight}>
                  {job.active && (
                    <>
                      <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => openChat(job.id, { landscaper: job.landscaper })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.chatBtnIcon}>💬</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => simulateCall(job.landscaper)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.callBtnIcon}>📞</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <View style={[styles.statusPill, !job.active && styles.statusPillPending]}>
                    <Text style={[styles.statusPillText, { fontFamily: "Inter_600SemiBold" }, !job.active && styles.statusPillTextPending]}>
                      {job.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.apptMetaRow, { marginTop: 6 }]}>
                <Ionicons name="location-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{job.address}</Text>
              </View>
              <View style={styles.apptMetaRow}>
                <Ionicons name="time-outline" size={12} color="#888888" />
                <Text style={[styles.apptMeta, { fontFamily: "Inter_400Regular" }]}>{job.date} · {job.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <ChatModal
        visible={chatJobId !== null}
        jobId={chatJobId}
        isLandscaper={isLandscaper}
        jobData={chatJobData}
        insets={insets}
        isWeb={isWeb}
        onClose={() => { setChatJobId(null); setChatJobData(null); }}
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

  scrollContent: { padding: 20, gap: 12 },
  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  trackingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 10,
    marginBottom: 4,
  },
  trackingCardInactive: {
    opacity: 0.75,
  },
  trackingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  topRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trackingTitle: { fontSize: 14, color: "#FFFFFF", flex: 1 },
  trackingMeta: { fontSize: 12, color: "#888888" },

  chatBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#222222",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtnIcon: { fontSize: 18 },
  callBtn: {
    width: 36,
    height: 36,
    backgroundColor: "#34FF7A",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  callBtnIcon: { fontSize: 18 },

  statusPill: {
    backgroundColor: "#34FF7A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPillComplete: { backgroundColor: "#0d2e18", borderWidth: 1, borderColor: "#34FF7A" },
  statusPillPending: { backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#555" },
  statusPillText: { fontSize: 11, color: "#000000" },
  statusPillTextComplete: { color: "#34FF7A" },
  statusPillTextPending: { color: "#888888" },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
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
  actionBtnDone: {
    backgroundColor: "#34FF7A",
    borderColor: "#34FF7A",
  },
  actionBtnText: { fontSize: 11, color: "#34FF7A", textAlign: "center" },
  actionBtnTextDone: { color: "#000000" },

  apptCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 18,
    gap: 6,
  },
  apptTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  apptCustomer: { fontSize: 15, color: "#FFFFFF" },
  apptDateTime: { fontSize: 12, color: "#888888" },
  apptMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  apptMeta: { fontSize: 13, color: "#888888" },
  notePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  noteText: { fontSize: 12, color: "#34FF7A" },
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
