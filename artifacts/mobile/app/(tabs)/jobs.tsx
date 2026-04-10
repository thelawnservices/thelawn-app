import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  Alert,
  Image,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";
import { useNotifications } from "@/contexts/notifications";
import { useWallet } from "@/contexts/wallet";
import { simulatePhotoReview, validateText } from "@/utils/moderation";
import { requestPushPermissions, sendLocalPush } from "@/utils/pushNotifications";

// Parse "Apr 12, 2026" / "Today" + "10:30 AM" → Date
function parseJobDateTime(date: string, time: string): Date | null {
  let full = date.trim();
  if (full.toLowerCase() === "today") {
    const now = new Date();
    full = `${now.toLocaleString("en-US", { month: "short" })} ${now.getDate()}, ${now.getFullYear()}`;
  } else if (!full.match(/\d{4}/)) {
    full = `${full}, ${new Date().getFullYear()}`;
  }
  const d = new Date(`${full} ${time}`);
  return isNaN(d.getTime()) ? null : d;
}

type JobStatus = "pending" | "arrived" | "started" | "completed";

type PayMethod = "stripe" | "inperson";

const SHARED_ACTIVE_JOBS: Array<{
  id: string;
  code: string;
  service: string;
  customer: string;
  landscaper: string;
  address: string;
  date: string;
  time: string;
  paymentMethod: PayMethod;
  amount: number;
}> = [
  {
    id: "a1",
    code: "JOB-84712",
    service: "Mowing/Edging",
    customer: "Zamire Smith",
    landscaper: "GreenScape Pros",
    address: "8910 45th Ave E, Ellenton, FL",
    date: "Today",
    time: "10:30 AM",
    paymentMethod: "stripe",
    amount: 85,
  },
];

const SHARED_COMPLETED_JOBS = [
  {
    id: "c1",
    code: "JOB-61293",
    service: "Mowing/Edging",
    customer: "Marcus T.",
    landscaper: "GreenScape Pros",
    address: "88 Palmetto Ave, Ellenton, FL",
    date: "Apr 7",
    time: "9:00 AM",
  },
  {
    id: "c2",
    code: "JOB-38847",
    service: "Weeding/Mulching",
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
    code: "JOB-29341",
    service: "Mowing/Edging",
    customer: "Zamire Smith",
    landscaper: "GreenScape Pros",
    date: "Apr 7, 2026",
    amount: "$65.00",
  },
  {
    id: "h2",
    code: "JOB-74412",
    service: "Hedge Trimming",
    customer: "Marcus T.",
    landscaper: "GreenScape Pros",
    date: "Mar 28, 2026",
    amount: "$55.00",
  },
  {
    id: "h3",
    code: "JOB-51087",
    service: "Weeding/Mulching",
    customer: "Alex T.",
    landscaper: "GreenScape Pros",
    date: "Mar 15, 2026",
    amount: "$135.00",
  },
  {
    id: "h4",
    code: "JOB-66203",
    service: "Mowing/Edging",
    customer: "Priya N.",
    landscaper: "GreenScape Pros",
    date: "Feb 22, 2026",
    amount: "$52.00",
  },
];

const STATUS_STEPS: { key: JobStatus; label: string; icon: string }[] = [
  { key: "started",   label: "Arrived & Work Started", icon: "location-outline" },
  { key: "completed", label: "Mark as Complete",        icon: "checkmark-circle-outline" },
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
      icon: "chatbubble-outline",
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
        icon: "chatbubble-outline",
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
              placeholderTextColor="#777"
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

// ── Dispute Modal ─────────────────────────────────────────────────────────────

const DISPUTE_CATEGORIES = [
  { key: "not_completed",  label: "Work was not completed",   icon: "close-circle-outline" as const },
  { key: "quality",        label: "Poor quality of work",     icon: "thumbs-down-outline" as const },
  { key: "damage",         label: "Damage to my property",    icon: "warning-outline" as const },
  { key: "no_show",        label: "Landscaper didn't show",   icon: "person-remove-outline" as const },
  { key: "other",          label: "Other issue",              icon: "help-circle-outline" as const },
];

const DISPUTE_EMAIL = "TheLawnServices@gmail.com";
const MAX_DISPUTE_CHARS = 500;

function DisputeModal({
  visible,
  jobId,
  jobService,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  jobId: string;
  jobService: string;
  onClose: () => void;
  onSubmit: (jobId: string, category: string, message: string) => void;
}) {
  const [jobCodeInput, setJobCodeInput] = useState("");
  const [jobCodeErr, setJobCodeErr] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent">("idle");
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [catErr, setCatErr] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  function reset() {
    setJobCodeInput(""); setJobCodeErr(null);
    setCategory(""); setMessage(""); setSubmitState("idle");
    setMsgErr(null); setCatErr(false); successOpacity.setValue(0);
  }

  function handleSubmit() {
    let hasErr = false;
    if (!jobCodeInput.trim()) { setJobCodeErr("Please enter the Job Number from your job card."); hasErr = true; }
    else { setJobCodeErr(null); }
    if (!category) { setCatErr(true); hasErr = true; }
    if (!message.trim()) { setMsgErr("Please describe the issue before submitting."); hasErr = true; }
    else {
      const v = validateText(message, MAX_DISPUTE_CHARS);
      if (!v.valid) { setMsgErr(v.error ?? "Please revise your message."); hasErr = true; }
    }
    if (hasErr) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }

    setSubmitState("sending");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setSubmitState("sent");
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        onSubmit(jobId, category, message.trim());
        reset();
        onClose();
      }, 2000);
    }, 1400);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={() => { if (submitState !== "sending") { onClose(); reset(); } }}>
      <View style={dispStyles.container}>
        {/* Header */}
        <View style={dispStyles.header}>
          <TouchableOpacity
            style={dispStyles.closeBtn}
            onPress={() => { if (submitState !== "sending") { onClose(); reset(); } }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-down" size={22} color="#CCCCCC" />
          </TouchableOpacity>
          <Text style={[dispStyles.headerTitle, { fontFamily: "Inter_700Bold" }]}>File a Dispute</Text>
          <View style={{ width: 36 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Job reference */}
            <View style={dispStyles.jobRefRow}>
              <Ionicons name="leaf-outline" size={14} color="#34FF7A" />
              <Text style={[dispStyles.jobRefText, { fontFamily: "Inter_400Regular" }]}>
                Regarding: <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{jobService}</Text>
              </Text>
            </View>

            {/* To: field */}
            <View style={dispStyles.toCard}>
              <View style={dispStyles.toRow}>
                <Text style={[dispStyles.toLabel, { fontFamily: "Inter_600SemiBold" }]}>TO</Text>
                <View style={dispStyles.toEmailBadge}>
                  <Ionicons name="mail-outline" size={13} color="#34FF7A" />
                  <Text style={[dispStyles.toEmailText, { fontFamily: "Inter_500Medium" }]}>TheLawnServices</Text>
                </View>
              </View>
              <Text style={[dispStyles.toNote, { fontFamily: "Inter_400Regular" }]}>
                Our team reviews all disputes within 24–48 hours. Payment remains frozen until resolved.
              </Text>
            </View>

            {/* Job Number */}
            <Text style={[dispStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Job Number *</Text>
            <Text style={[dispStyles.sectionSub, { fontFamily: "Inter_400Regular" }]}>
              Found on your job card (e.g. JOB-84712)
            </Text>
            <TextInput
              style={[
                dispStyles.messageInput,
                { minHeight: 48, paddingTop: 14, paddingBottom: 14 },
                jobCodeErr ? dispStyles.messageInputError : null,
                { fontFamily: "Inter_500Medium" },
              ]}
              placeholder="JOB-XXXXX"
              placeholderTextColor="#555"
              value={jobCodeInput}
              onChangeText={(t) => { setJobCodeInput(t.toUpperCase()); if (jobCodeErr) setJobCodeErr(null); }}
              autoCapitalize="characters"
              returnKeyType="next"
              editable={submitState === "idle"}
            />
            {jobCodeErr && (
              <View style={[dispStyles.errRow, { marginBottom: 12 }]}>
                <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                <Text style={[dispStyles.errText, { fontFamily: "Inter_400Regular" }]}>{jobCodeErr}</Text>
              </View>
            )}

            {/* Category */}
            <Text style={[dispStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>What's the issue? *</Text>
            {catErr && (
              <View style={dispStyles.errRow}>
                <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                <Text style={[dispStyles.errText, { fontFamily: "Inter_400Regular" }]}>Please select a category.</Text>
              </View>
            )}
            <View style={dispStyles.categoryList}>
              {DISPUTE_CATEGORIES.map((cat) => {
                const sel = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[dispStyles.categoryItem, sel && dispStyles.categoryItemSelected]}
                    onPress={() => { setCategory(cat.key); setCatErr(false); Haptics.selectionAsync(); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={cat.icon} size={18} color={sel ? "#FF4444" : "#888"} />
                    <Text style={[dispStyles.categoryText, { fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular" }, sel && { color: "#FF4444" }]}>
                      {cat.label}
                    </Text>
                    {sel && <Ionicons name="checkmark-circle" size={16} color="#FF4444" style={{ marginLeft: "auto" }} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message */}
            <Text style={[dispStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>Describe the issue *</Text>
            <Text style={[dispStyles.sectionSub, { fontFamily: "Inter_400Regular" }]}>
              Be specific — include dates, times, and any relevant details.
            </Text>
            <TextInput
              style={[dispStyles.messageInput, msgErr ? dispStyles.messageInputError : null, { fontFamily: "Inter_400Regular" }]}
              placeholder="Example: The landscaper only mowed the front yard and left without finishing the back. The edging was also missed entirely..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={6}
              maxLength={MAX_DISPUTE_CHARS}
              value={message}
              onChangeText={(t) => { setMessage(t); if (msgErr) setMsgErr(null); }}
              textAlignVertical="top"
              editable={submitState === "idle"}
            />
            <View style={dispStyles.charCountRow}>
              {msgErr && (
                <View style={dispStyles.errRow}>
                  <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                  <Text style={[dispStyles.errText, { fontFamily: "Inter_400Regular" }]}>{msgErr}</Text>
                </View>
              )}
              <Text style={[dispStyles.charCount, { fontFamily: "Inter_400Regular", color: message.length > MAX_DISPUTE_CHARS * 0.9 ? "#FFAA00" : "#555" }]}>
                {message.length}/{MAX_DISPUTE_CHARS}
              </Text>
            </View>

            {/* Legal note */}
            <View style={dispStyles.legalNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#777" />
              <Text style={[dispStyles.legalText, { fontFamily: "Inter_400Regular" }]}>
                By submitting, your message will be sent to <Text style={{ color: "#34FF7A" }}>TheLawnServices</Text> along with your job details. False disputes may result in account review.
              </Text>
            </View>

            {/* Submit / Success */}
            {submitState !== "sent" ? (
              <TouchableOpacity
                style={[dispStyles.submitBtn, submitState === "sending" && dispStyles.submitBtnLoading]}
                onPress={submitState === "idle" ? handleSubmit : undefined}
                activeOpacity={0.85}
              >
                {submitState === "sending" ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={[dispStyles.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sending to TheLawnServices...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="send-outline" size={17} color="#fff" />
                    <Text style={[dispStyles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>Submit Dispute</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <Animated.View style={[dispStyles.sentBox, { opacity: successOpacity }]}>
                <Ionicons name="checkmark-circle" size={28} color="#34FF7A" />
                <View style={{ flex: 1 }}>
                  <Text style={[dispStyles.sentTitle, { fontFamily: "Inter_700Bold" }]}>Dispute Submitted!</Text>
                  <Text style={[dispStyles.sentSub, { fontFamily: "Inter_400Regular" }]}>
                    Sent to TheLawnServices · Our team will respond within 24–48 hours.
                  </Text>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function JobCompletionPhotoModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (photos: string[]) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to add completion photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - photos.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      Haptics.selectionAsync();
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to take completion photos."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4));
      Haptics.selectionAsync();
    }
  }

  function handleSubmit() {
    if (photos.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Photos Required", "Please add at least 1 photo of the completed work before submitting.");
      return;
    }
    onSubmit(photos);
    setPhotos([]);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={jcpStyles.overlay} onPress={onClose}>
        <Pressable style={jcpStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={jcpStyles.handle} />
          <View style={jcpStyles.headerRow}>
            <Ionicons name="camera-outline" size={20} color="#34FF7A" />
            <Text style={[jcpStyles.title, { fontFamily: "Inter_700Bold" }]}>Completion Photos</Text>
            <TouchableOpacity onPress={onClose} style={jcpStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#CCCCCC" />
            </TouchableOpacity>
          </View>

          <Text style={[jcpStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            At least 1 photo is required. Add up to 4 photos of the completed work — the customer will see these when reviewing your submission.
          </Text>

          {photos.length > 0 && (
            <View style={jcpStyles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={jcpStyles.photoThumb}>
                  <Image source={{ uri }} style={jcpStyles.photoThumbImg} />
                  <TouchableOpacity
                    style={jcpStyles.photoRemove}
                    onPress={() => { setPhotos((prev) => prev.filter((_, idx) => idx !== i)); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {photos.length < 4 && (
            <View style={jcpStyles.addRow}>
              <TouchableOpacity style={jcpStyles.addBtn} onPress={pickFromCamera} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={18} color="#34FF7A" />
                <Text style={[jcpStyles.addBtnText, { fontFamily: "Inter_500Medium" }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={jcpStyles.addBtn} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={18} color="#34FF7A" />
                <Text style={[jcpStyles.addBtnText, { fontFamily: "Inter_500Medium" }]}>Library</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={jcpStyles.infoNote}>
            <Ionicons name="alert-circle-outline" size={14} color={photos.length === 0 ? "#f59e0b" : "#34FF7A"} />
            <Text style={[jcpStyles.infoText, { fontFamily: "Inter_400Regular", color: photos.length === 0 ? "#f59e0b" : "#888" }]}>
              {photos.length === 0
                ? "1–4 photos required to submit. After submitting, the customer has 24 hours to approve or dispute."
                : `${photos.length} photo${photos.length > 1 ? "s" : ""} added. After submitting, the customer has 24 hours to approve or dispute.`}
            </Text>
          </View>

          <TouchableOpacity
            style={[jcpStyles.submitBtn, photos.length === 0 && jcpStyles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={photos.length === 0 ? "#555" : "#000"} />
            <Text style={[jcpStyles.submitBtnText, { fontFamily: "Inter_700Bold", color: photos.length === 0 ? "#555" : "#000" }]}>
              {photos.length > 0 ? `Submit ${photos.length} Photo${photos.length > 1 ? "s" : ""} & Notify Customer` : "Add Photos to Continue"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
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
  const { addFunds } = useWallet();

  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(
    Object.fromEntries(SHARED_ACTIVE_JOBS.map((j) => [j.id, "pending"]))
  );
  const [autoCancelledJobs, setAutoCancelledJobs] = useState<Set<string>>(new Set());
  const [chatJobData, setChatJobData] = useState<{ landscaper?: string; customer?: string } | null>(null);

  // ── Auto-cancel: if status stays "pending" 1 hr after appointment time ─────
  useEffect(() => {
    if (!isLandscaper) return;
    const interval = setInterval(() => {
      SHARED_ACTIVE_JOBS.forEach((job) => {
        const apptDate = parseJobDateTime(job.date, job.time);
        if (!apptDate) return;
        const msSinceAppt = Date.now() - apptDate.getTime();
        const alreadyCancelled = autoCancelledJobs.has(job.id);
        const currentStatus = jobStatuses[job.id];
        if (!alreadyCancelled && msSinceAppt >= 60 * 60 * 1000 && currentStatus === "pending") {
          setAutoCancelledJobs((prev) => new Set([...prev, job.id]));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          addNotification({
            icon: "close-circle-outline",
            title: "Job Auto-Cancelled",
            sub: `${job.service} for ${job.customer} — work was not started within 1 hour. Customer has been refunded.`,
          });
          Alert.alert(
            "Job Automatically Cancelled",
            `You did not mark "${job.service}" as started within 1 hour of the appointment time (${job.time}).\n\nThe customer's payment has been automatically refunded. If you still show up, TheLawnServices is not responsible — any arrangements are between you and the customer.`,
            [{ text: "Understood" }]
          );
        }
      });
    }, 30_000); // check every 30 s
    return () => clearInterval(interval);
  }, [isLandscaper, jobStatuses, autoCancelledJobs, addNotification]);

  // ── Request push notification permissions once on mount ─────────────────
  useEffect(() => {
    requestPushPermissions();
  }, []);

  const [completionPhotos, setCompletionPhotos] = useState<Record<string, string[]>>({});
  const [completedAt, setCompletedAt] = useState<Record<string, number>>({});
  const [photoModalJobId, setPhotoModalJobId] = useState<string | null>(null);
  const [pendingCompletionUris, setPendingCompletionUris] = useState<Set<string>>(new Set());
  // Customer side: track approval per jobId
  const [customerApproved, setCustomerApproved] = useState<Record<string, "approved" | "disputed" | null>>({});
  const [disputeJobId, setDisputeJobId] = useState<string | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<Record<string, { category: string; message: string }>>({});

  // ── 24-hour auto-release: credit landscaper wallet if no customer action ──
  useEffect(() => {
    const interval = setInterval(() => {
      SHARED_ACTIVE_JOBS.forEach((job) => {
        const ts = completedAt[job.id];
        if (!ts) return;
        if (customerApproved[job.id]) return;
        if (job.paymentMethod !== "stripe") return;
        const deadline = ts + 24 * 3600 * 1000;
        if (Date.now() >= deadline) {
          setCustomerApproved((prev) => ({ ...prev, [job.id]: "approved" }));
          addFunds(job.amount, `${job.service} — ${job.customer} (auto-released after 24h)`);
          addNotification({
            icon: "checkmark-circle",
            title: "Payment Auto-Released",
            sub: `${job.service} payment of $${job.amount.toFixed(2)} has been added to your wallet after the 24-hour review window.`,
            targetRole: "landscaper",
          });
        }
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [completedAt, customerApproved, addFunds, addNotification]);

  // ── 10-minute arrival alert: remind landscaper if they haven't confirmed ─
  const [arrivalAlertSent, setArrivalAlertSent] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!isLandscaper) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    SHARED_ACTIVE_JOBS.forEach((job) => {
      const jobDt = parseJobDateTime(job.date, job.time);
      if (!jobDt) return;
      const alertTime = jobDt.getTime() + 10 * 60 * 1000;
      const delay = alertTime - Date.now();
      if (delay <= 0) return;
      const t = setTimeout(() => {
        const currentStatus = jobStatuses[job.id] ?? "pending";
        if (statusOrder(currentStatus) < statusOrder("started") && !arrivalAlertSent.has(job.id)) {
          setArrivalAlertSent((prev) => new Set([...prev, job.id]));
          sendLocalPush(
            "⏰ Confirm Arrival Now",
            `It's been 10 minutes since your ${job.service} appointment (${job.time}). Tap "Arrived & Work Started" to notify your customer.`
          );
          Alert.alert(
            "Arrival Reminder",
            `Your ${job.service} appointment was at ${job.time}. Please tap "Arrived & Work Started" to confirm arrival for your customer.\n\nJob Code: ${job.code}`,
            [{ text: "Got It" }]
          );
        }
      }, delay);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [isLandscaper, jobStatuses, arrivalAlertSent]);

  function advanceStatus(jobId: string, next: JobStatus) {
    const current = jobStatuses[jobId];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (next === "completed") {
      setPhotoModalJobId(jobId);
      return;
    }

    setJobStatuses((prev) => ({ ...prev, [jobId]: next }));
    const job = SHARED_ACTIVE_JOBS.find((j) => j.id === jobId);

    if (next === "started" && statusOrder(current) < statusOrder("started")) {
      // Combined arrived + started: notify customer of both events at once
      addNotification({
        icon: "location-outline",
        title: "Landscaper Arrived & Work Started",
        sub: `${job?.landscaper ?? "Your landscaper"} has arrived and begun your ${job?.service ?? "service"} — ${job?.date ?? ""} at ${job?.time ?? ""}`,
        targetRole: "customer",
      });
      sendLocalPush(
        "🌿 Your Landscaper Has Arrived",
        `${job?.landscaper ?? "Your landscaper"} has arrived and started your ${job?.service ?? "job"} — ${job?.date ?? ""} at ${job?.time ?? ""}. Job: ${job?.code ?? jobId}`
      );
      setTimeout(() => {
        Alert.alert(
          "Customer Notified ✓",
          `${job?.customer ?? "The customer"} has been notified that you've arrived and work has started. Your job code is ${job?.code ?? jobId}.`,
          [{ text: "Got It" }]
        );
      }, 300);
    }
  }

  function submitCompletion(jobId: string, photos: string[]) {
    setJobStatuses((prev) => ({ ...prev, [jobId]: "completed" }));
    setCompletedAt((prev) => ({ ...prev, [jobId]: Date.now() }));
    if (photos.length > 0) {
      setCompletionPhotos((prev) => ({ ...prev, [jobId]: photos }));
      setPendingCompletionUris((prev) => new Set([...prev, ...photos]));
      photos.forEach((uri) => {
        simulatePhotoReview({ uri, id: `${jobId}-${uri}` }).then((managed) => {
          setPendingCompletionUris((prev) => {
            const next = new Set(prev);
            next.delete(uri);
            return next;
          });
          if (managed.status === "rejected") {
            setCompletionPhotos((prev) => ({
              ...prev,
              [jobId]: (prev[jobId] ?? []).filter((p) => p !== uri),
            }));
          }
        });
      });
    }
    const job = SHARED_ACTIVE_JOBS.find((j) => j.id === jobId);
    // Notify customer that work is done (customer-targeted)
    addNotification({
      icon: "checkmark-circle",
      title: "Job Complete — Action Needed",
      sub: `${job?.landscaper ?? "Your landscaper"} has completed your ${job?.service ?? "service"} — ${job?.date ?? ""} at ${job?.time ?? ""}. Review & approve within 24 hours.`,
      targetRole: "customer",
    });
    sendLocalPush(
      "✅ Job Complete — Action Needed",
      `${job?.landscaper ?? "Your landscaper"} has finished your ${job?.service ?? "service"} — ${job?.date ?? ""} at ${job?.time ?? ""}. Approve or dispute within 24 hrs. Job: ${job?.code ?? jobId}`
    );
    setTimeout(() => {
      Alert.alert(
        "Customer Notified ✓",
        `${job?.customer ?? "The customer"} has been notified and has 24 hours to approve or dispute. Payment is held in escrow.\n\nJob Code: ${job?.code ?? jobId}`,
        [{ text: "OK" }]
      );
    }, 400);
  }

  function openChat(data: { landscaper?: string; customer?: string }) {
    Haptics.selectionAsync();
    setChatJobData(data);
  }

  function simulateCall(name: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Calling…", `Connecting you to ${name}.\n\n(Demo call simulation)`);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>My Jobs</Text>
      </View>

      {/* Completion Photo Modal */}
      <JobCompletionPhotoModal
        visible={photoModalJobId !== null}
        onClose={() => setPhotoModalJobId(null)}
        onSubmit={(photos) => {
          if (photoModalJobId) {
            submitCompletion(photoModalJobId, photos);
            setPhotoModalJobId(null);
          }
        }}
      />

      {/* Dispute Modal */}
      <DisputeModal
        visible={disputeJobId !== null}
        jobId={disputeJobId ?? ""}
        jobService={SHARED_ACTIVE_JOBS.find((j) => j.id === disputeJobId)?.service ?? "Service"}
        onClose={() => setDisputeJobId(null)}
        onSubmit={(jobId, category, message) => {
          setCustomerApproved((prev) => ({ ...prev, [jobId]: "disputed" }));
          setDisputeMessages((prev) => ({ ...prev, [jobId]: { category, message } }));
          setDisputeJobId(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 40 }]}
      >
        {/* ── Active Jobs ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
          Active Jobs
        </Text>

        {SHARED_ACTIVE_JOBS.map((job) => {
          const actualStatus = jobStatuses[job.id];
          const status = actualStatus;
          const isLandscaperComplete = isLandscaper && actualStatus === "completed";
          const isAutoCancelled = autoCancelledJobs.has(job.id);

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
                    {status === "completed"
                      ? "✓ Completed"
                      : status === "started"
                      ? "🔧 Work In Progress"
                      : status === "arrived"
                      ? "📍 Arrived at Location"
                      : "⏳ Awaiting Landscaper"}
                  </Text>
                </View>
                {!isLandscaperComplete && (
                  <View style={styles.actionBtns}>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => openChat(isLandscaper ? { customer: job.customer } : { landscaper: job.landscaper })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#34FF7A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => simulateCall(isLandscaper ? job.customer : job.landscaper)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color="#CCCCCC" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{job.address}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color="#CCCCCC" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular" }]}>{job.date} · {job.time}</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="barcode-outline" size={12} color="#34FF7A" />
                <Text style={[styles.metaText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>{job.code}</Text>
              </View>

              {/* Completion photos (if landscaper attached) */}
              {status === "completed" && (completionPhotos[job.id] ?? []).length > 0 && (
                <View style={jobPhotoStyles.photoSection}>
                  <View style={jobPhotoStyles.photoHeader}>
                    <Ionicons name="camera-outline" size={13} color="#34FF7A" />
                    <Text style={[jobPhotoStyles.photoHeaderText, { fontFamily: "Inter_500Medium" }]}>
                      Completion Photos · {(completionPhotos[job.id] ?? []).length}
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {(completionPhotos[job.id] ?? []).map((uri, pi) => {
                      const isPending = pendingCompletionUris.has(uri);
                      return (
                        <View key={pi} style={{ position: "relative" }}>
                          <Image source={{ uri }} style={[jobPhotoStyles.photoThumb, isPending && { opacity: 0.45 }]} />
                          {isPending && (
                            <View style={jobPhotoStyles.pendingOverlay}>
                              <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                              <Text style={[{ fontSize: 8, color: "#FFFFFF", textAlign: "center", marginTop: 2 }, { fontFamily: "Inter_600SemiBold" }]}>
                                Pending{"\n"}Review
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Customer approval window (when job is completed) */}
              {!isLandscaper && status === "completed" && !customerApproved[job.id] && (() => {
                const deadline = (completedAt[job.id] ?? 0) + 24 * 3600 * 1000;
                const remaining = Math.max(0, deadline - Date.now());
                const h = Math.floor(remaining / 3600000);
                const m = Math.floor((remaining % 3600000) / 60000);
                const expired = remaining === 0 && (completedAt[job.id] ?? 0) > 0;
                return (
                  <View style={jobPhotoStyles.approvalBanner}>
                    <View style={jobPhotoStyles.approvalTop}>
                      <Ionicons name="notifications" size={15} color="#FFAA00" />
                      <Text style={[jobPhotoStyles.approvalTitle, { fontFamily: "Inter_700Bold" }]}>
                        Work Complete — Approve or Dispute
                      </Text>
                    </View>
                    {expired ? (
                      <View style={jobPhotoStyles.expiredRow}>
                        <Ionicons name="warning-outline" size={13} color="#FF4444" />
                        <Text style={[jobPhotoStyles.expiredText, { fontFamily: "Inter_500Medium" }]}>
                          Review window expired. Sent to TheLawnServices.
                        </Text>
                      </View>
                    ) : (
                      <View style={jobPhotoStyles.timerRow}>
                        <Ionicons name="time-outline" size={13} color="#FFAA00" />
                        <Text style={[jobPhotoStyles.timerText, { fontFamily: "Inter_400Regular" }]}>
                          {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m remaining to review
                        </Text>
                      </View>
                    )}
                    {!expired && (
                      <View style={jobPhotoStyles.approvalBtns}>
                        <TouchableOpacity
                          style={jobPhotoStyles.approveBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setCustomerApproved((prev) => ({ ...prev, [job.id]: "approved" }));
                            if (job.paymentMethod === "stripe") {
                              addFunds(job.amount, `${job.service} — approved by ${job.customer}`);
                            }
                            Alert.alert("Work Approved", "Payment has been released to the landscaper. Thank you!");
                          }}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#000" />
                          <Text style={[jobPhotoStyles.approveBtnText, { fontFamily: "Inter_700Bold" }]}>Approve Work</Text>
                        </TouchableOpacity>
                        {job.paymentMethod === "stripe" ? (
                          <TouchableOpacity
                            style={jobPhotoStyles.disputeBtn}
                            activeOpacity={0.85}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                              setDisputeJobId(job.id);
                            }}
                          >
                            <Ionicons name="alert-circle-outline" size={16} color="#FF4444" />
                            <Text style={[jobPhotoStyles.disputeBtnText, { fontFamily: "Inter_600SemiBold" }]}>Dispute Work</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={jobPhotoStyles.inPersonNote}>
                            <Ionicons name="cash-outline" size={14} color="#f59e0b" />
                            <Text style={[jobPhotoStyles.inPersonNoteText, { fontFamily: "Inter_400Regular" }]}>
                              In-person payment — please resolve any issues directly with your landscaper. TheLawnServices is not responsible for in-person payment disputes.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {job.paymentMethod === "stripe" && (
                      <Text style={[jobPhotoStyles.autoExpireText, { fontFamily: "Inter_400Regular" }]}>
                        If no action is taken within 24 hours, payment is automatically released to the landscaper.
                      </Text>
                    )}
                  </View>
                );
              })()}

              {/* Customer approved/disputed result */}
              {!isLandscaper && customerApproved[job.id] === "approved" && (
                <View style={[jobPhotoStyles.approvalBanner, { backgroundColor: "#0d2e18", borderColor: "#1a4a2a" }]}>
                  <View style={jobPhotoStyles.approvalTop}>
                    <Ionicons name="checkmark-circle" size={15} color="#34FF7A" />
                    <Text style={[jobPhotoStyles.approvalTitle, { fontFamily: "Inter_600SemiBold", color: "#34FF7A" }]}>
                      Work Approved — Payment Released
                    </Text>
                  </View>
                </View>
              )}
              {!isLandscaper && customerApproved[job.id] === "disputed" && (
                <View style={[jobPhotoStyles.approvalBanner, { backgroundColor: "#1A0505", borderColor: "#3A1010", gap: 10 }]}>
                  <View style={jobPhotoStyles.approvalTop}>
                    <Ionicons name="shield-outline" size={15} color="#FF4444" />
                    <Text style={[jobPhotoStyles.approvalTitle, { fontFamily: "Inter_600SemiBold", color: "#FF4444" }]}>
                      Dispute Under Further Review
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="shield-checkmark-outline" size={12} color="#34FF7A" />
                    <Text style={[{ fontSize: 11, color: "#34FF7A" }, { fontFamily: "Inter_500Medium" }]}>
                      Sent to TheLawnServices — under review
                    </Text>
                  </View>
                  {disputeMessages[job.id] && (
                    <View style={{ backgroundColor: "#2A0808", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#3A1010" }}>
                      <Text style={[{ fontSize: 11, color: "#FF9999", marginBottom: 4 }, { fontFamily: "Inter_600SemiBold" }]}>
                        {DISPUTE_CATEGORIES.find((c) => c.key === disputeMessages[job.id].category)?.label ?? "Issue Reported"}
                      </Text>
                      <Text style={[{ fontSize: 12, color: "#CCCCCC", lineHeight: 18 }, { fontFamily: "Inter_400Regular" }]}>
                        {disputeMessages[job.id].message}
                      </Text>
                    </View>
                  )}
                  <Text style={[{ fontSize: 11, color: "#888", lineHeight: 17 }, { fontFamily: "Inter_400Regular" }]}>
                    Our team will respond within 24–48 hours. Payment is frozen until resolved.
                  </Text>
                </View>
              )}

              {/* Auto-cancelled banner */}
              {isAutoCancelled && (
                <View style={styles.autoCancelBanner}>
                  <Ionicons name="close-circle-outline" size={15} color="#FF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.autoCancelTitle, { fontFamily: "Inter_700Bold" }]}>
                      Job Auto-Cancelled · Customer Refunded
                    </Text>
                    <Text style={[styles.autoCancelSub, { fontFamily: "Inter_400Regular" }]}>
                      Work was not started within 1 hour of {job.time}. TheLawnServices is not involved if the landscaper still arrives — the parties must handle it independently.
                    </Text>
                  </View>
                </View>
              )}

              {/* Landscaper-only: status advance buttons (hidden if auto-cancelled) */}
              {isLandscaper && !isAutoCancelled && (
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
                        <Ionicons
                          name={(done ? "checkmark-circle" : step.icon) as any}
                          size={13}
                          color={done ? "#000" : "#34FF7A"}
                        />
                        <Text style={[styles.stepBtnText, { fontFamily: "Inter_600SemiBold" }, done && styles.stepBtnTextDone]}>
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
                <Ionicons name="time-outline" size={12} color="#CCCCCC" />
                <Text style={[styles.metaText, { fontFamily: "Inter_400Regular", color: "#BBBBBB" }]}>{job.date} · {job.time}</Text>
              </View>
              <View style={[styles.metaRow, { marginTop: 2 }]}>
                <Ionicons name="barcode-outline" size={12} color="#34FF7A" />
                <Text style={[styles.metaText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>{job.code}</Text>
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
              <View style={[styles.metaRow, { marginTop: 4 }]}>
                <Ionicons name="barcode-outline" size={11} color="#34FF7A" />
                <Text style={[{ fontSize: 11, color: "#34FF7A", fontFamily: "Inter_500Medium" }]}>{entry.code}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* All sales are final notice */}
        <View style={styles.finalSaleNotice}>
          <Ionicons name="information-circle-outline" size={14} color="#CCCCCC" />
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
    color: "#CCCCCC",
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
  jobTitle: { fontSize: 16, color: "#FFFFFF", marginBottom: 2 },
  jobSub: { fontSize: 14, color: "#BBBBBB", marginBottom: 3 },
  jobStatus: { fontSize: 14, color: "#34FF7A" },

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
  metaText: { fontSize: 13, color: "#BBBBBB", flex: 1 },

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
  emptyText: { fontSize: 14, color: "#BBBBBB" },

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
  historyService: { fontSize: 15, color: "#FFFFFF" },
  historyAmount: { fontSize: 15, color: "#34FF7A" },
  historyPerson: { fontSize: 13, color: "#BBBBBB", marginBottom: 2 },
  historyDate: { fontSize: 12, color: "#BBBBBB" },

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
    color: "#BBBBBB",
    flex: 1,
    lineHeight: 16,
  },

  autoCancelBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1A0505",
    borderWidth: 1,
    borderColor: "#3A1010",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  autoCancelTitle: {
    fontSize: 13,
    color: "#FF6666",
    marginBottom: 4,
  },
  autoCancelSub: {
    fontSize: 12,
    color: "#BBBBBB",
    lineHeight: 17,
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

const jcpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 22, paddingBottom: 40, paddingTop: 10,
    borderTopWidth: 1, borderColor: "#222", gap: 16,
  },
  handle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 18, color: "#FFFFFF", flex: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center",
  },
  subtitle: { fontSize: 13, color: "#CCCCCC", lineHeight: 19 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoThumb: { width: 78, height: 78, borderRadius: 12, backgroundColor: "#1A1A1A" },
  photoThumbImg: { width: 78, height: 78, borderRadius: 12 },
  photoRemove: { position: "absolute", top: -6, right: -6 },
  addRow: { flexDirection: "row", gap: 10 },
  addBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0d2e18", borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: "#1a4a2a",
  },
  addBtnText: { fontSize: 14, color: "#34FF7A" },
  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1A1A1A", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  infoText: { fontSize: 12, color: "#BBBBBB", flex: 1, lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#34FF7A", borderRadius: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a",
  },
  submitBtnText: { fontSize: 14, color: "#000" },
});

const jobPhotoStyles = StyleSheet.create({
  photoSection: {
    backgroundColor: "#111", borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: "#222",
  },
  photoHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  photoHeaderText: { fontSize: 12, color: "#34FF7A" },
  photoThumb: { width: 72, height: 72, borderRadius: 10, marginRight: 8, backgroundColor: "#222" },
  pendingOverlay: {
    position: "absolute", top: 0, left: 0, width: 72, height: 72,
    borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  approvalBanner: {
    backgroundColor: "#1C1200", borderRadius: 14,
    borderWidth: 1, borderColor: "#FFAA0033",
    padding: 14, gap: 10,
  },
  approvalTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  approvalTitle: { fontSize: 14, color: "#FFAA00", flex: 1 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timerText: { fontSize: 13, color: "#BBBBBB" },
  expiredRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  expiredText: { fontSize: 12, color: "#FF4444", flex: 1, lineHeight: 18 },
  approvalBtns: { flexDirection: "row", gap: 10, marginTop: 2 },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#34FF7A", borderRadius: 16, paddingVertical: 12,
  },
  approveBtnText: { fontSize: 13, color: "#000" },
  disputeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1, borderColor: "#FF4444", borderRadius: 16, paddingVertical: 12,
  },
  disputeBtnText: { fontSize: 13, color: "#FF4444" },
  autoExpireText: { fontSize: 11, color: "#888", lineHeight: 17 },
  inPersonNote: {
    flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1C1400", borderRadius: 12, borderWidth: 1, borderColor: "#f59e0b33",
    padding: 10,
  },
  inPersonNoteText: { flex: 1, fontSize: 11, color: "#f59e0b", lineHeight: 16 },
});

const dispStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  jobRefRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#0d2e18", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#1a4a2a", marginBottom: 16,
  },
  jobRefText: { fontSize: 13, color: "#AAAAAA", flex: 1 },

  toCard: {
    backgroundColor: "#111", borderRadius: 16,
    borderWidth: 1, borderColor: "#222", padding: 14, marginBottom: 20,
  },
  toRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  toLabel: { fontSize: 11, color: "#777", letterSpacing: 1 },
  toEmailBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0d2e18", borderRadius: 20,
    borderWidth: 1, borderColor: "#1a4a2a",
    paddingHorizontal: 10, paddingVertical: 4,
  },
  toEmailText: { fontSize: 13, color: "#34FF7A" },
  toNote: { fontSize: 12, color: "#777", lineHeight: 18 },

  sectionLabel: { fontSize: 13, color: "#AAAAAA", letterSpacing: 0.6, marginBottom: 8 },
  sectionSub: { fontSize: 12, color: "#666", marginBottom: 10, lineHeight: 18 },

  categoryList: {
    backgroundColor: "#111", borderRadius: 16,
    borderWidth: 1, borderColor: "#222", overflow: "hidden",
  },
  categoryItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  categoryItemSelected: { backgroundColor: "#1A0505" },
  categoryText: { fontSize: 14, color: "#CCCCCC", flex: 1 },

  messageInput: {
    backgroundColor: "#141414", borderRadius: 16,
    borderWidth: 1, borderColor: "#222",
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 14, color: "#FFFFFF", minHeight: 130,
  },
  messageInputError: { borderColor: "#FF4444" },

  charCountRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginTop: 6, marginBottom: 4,
  },
  charCount: { fontSize: 11 },

  errRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  errText: { fontSize: 12, color: "#FF4444" },

  legalNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#111", borderRadius: 12, borderWidth: 1, borderColor: "#1E1E1E",
    padding: 12, marginTop: 16, marginBottom: 8,
  },
  legalText: { fontSize: 11, color: "#666", flex: 1, lineHeight: 17 },

  submitBtn: {
    backgroundColor: "#CC2222", borderRadius: 18,
    paddingVertical: 16, alignItems: "center", justifyContent: "center",
    marginTop: 16,
  },
  submitBtnLoading: { backgroundColor: "#882222" },
  submitBtnText: { fontSize: 15, color: "#FFFFFF" },

  sentBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0d2e18", borderRadius: 16,
    borderWidth: 1, borderColor: "#1a4a2a",
    padding: 16, marginTop: 16,
  },
  sentTitle: { fontSize: 15, color: "#34FF7A" },
  sentSub: { fontSize: 12, color: "#AAAAAA", marginTop: 3, lineHeight: 17 },
});
