import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { validateText } from "@/utils/moderation";

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Base
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORT_NAME = "TheLawnServices";
const MAX_SUPPORT_CHARS = 500;

type KBEntry = {
  keywords: string[];
  answer: string;
};

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    keywords: ["what is", "about", "thelawn", "the lawn", "platform", "app", "how does it work", "marketplace"],
    answer:
      "TheLawnServices is a landscaping marketplace that connects customers with professional landscapers in their area.\n\nCustomers post jobs with their preferred service, date, time, and budget. Landscapers browse available requests and accept the ones that fit their schedule. Payment goes directly between customer and landscaper using your agreed-upon method after the work is approved.",
  },
  {
    keywords: ["service", "mowing", "edging", "weeding", "mulch", "sod", "artificial turf", "full service", "what service", "available"],
    answer:
      "TheLawnServices supports the following service types:\n\n🌿 Mowing/Edging\n🌱 Weeding/Mulching\n🟫 Sod Installation\n🌐 Artificial Turf\n⭐ Full Service\n\nWhen booking, select the service that matches your yard needs. For multiple services, choose \"Full Service\" or discuss details with your landscaper.",
  },
  {
    keywords: ["book", "booking", "hire", "how do i find", "request", "get a landscaper", "order", "schedule"],
    answer:
      "Booking a landscaper is simple:\n\n1. Go to the Search tab\n2. Browse available landscapers in your area\n3. Tap a landscaper to view their profile, services, ratings, and accepted payment methods\n4. Submit a request with your service type, preferred date, time, and budget\n5. Wait for the landscaper to accept — you'll get a notification\n6. Once accepted, it appears in your Appointments tab",
  },
  {
    keywords: ["price", "cost", "how much", "set price", "budget", "pricing", "counter", "negotiate"],
    answer:
      "On TheLawnServices, customers set the price in their request. Landscapers choose to accept or decline based on that price — no counter-offers.\n\nThis means:\n• You (the customer) decide the budget upfront\n• Landscapers who agree tap \"Accept at [your price]\"\n• You only pay what you offered — no surprises",
  },
  {
    keywords: ["pay", "payment", "venmo", "zelle", "paypal", "cash", "cash app", "method", "how to pay", "accepted payment"],
    answer:
      "Payment goes directly from customer to landscaper using their agreed method. Each landscaper lists the payment methods they accept on their profile.\n\nSupported methods include:\n• Zelle\n• Venmo\n• PayPal\n• Cash App\n• Cash\n\nPay only after you've approved the completed work — never before.",
  },
  {
    keywords: ["cancel", "cancellation", "cancel appointment", "undo", "remove appointment"],
    answer:
      "To cancel an appointment, go to the Appointments tab and open the job you'd like to cancel. You can cancel before the landscaper has arrived or marked the job in progress.\n\nPlease cancel with as much notice as possible — cancellations affect landscapers who may have reserved that time slot for you.",
  },
  {
    keywords: ["24 hour", "24-hour", "approve", "approval", "review work", "accept work", "photo", "complete", "mark complete", "done"],
    answer:
      "Once a landscaper finishes the job, they submit completion photos through the app. Here's what happens next:\n\n1. You receive a notification that the work is complete\n2. Review the photos within 24 hours\n3. Tap Approve if satisfied — this releases payment approval\n4. Tap Dispute Work if there's an issue — our team reviews it\n\n⏰ If no action is taken within 24 hours, the job is automatically forwarded to TheLawnServices for review.",
  },
  {
    keywords: ["review", "rating", "star", "feedback", "rate", "leave a review"],
    answer:
      "Customers can leave a star rating and written review after a job is approved. Your review helps other customers make informed decisions and helps great landscapers grow their business.\n\nLandscapers can reply to reviews they receive — but cannot leave reviews themselves.",
  },
  {
    keywords: ["recurring", "regular", "weekly", "bi-weekly", "repeat", "schedule", "ongoing"],
    answer:
      "Recurring appointments are regular scheduled jobs — like weekly or bi-weekly lawn maintenance.\n\nYou'll find your recurring bookings in the Appointments tab under the Recurring section. These are auto-scheduled based on your agreed frequency with your landscaper.",
  },
  {
    keywords: ["new customer fee", "platform fee", "fee", "$5", "five dollar", "deducted", "first time", "charge"],
    answer:
      "TheLawnServices charges a one-time $5 new customer fee for the first job between a landscaper and a new customer. This fee is deducted from the landscaper's payout — not charged to the customer.\n\n✅ It only applies to the very first job with each new customer — never again after that.\n\nThis fee helps TheLawnServices maintain the platform and support for all users.",
  },
  {
    keywords: ["dispute", "problem", "issue", "complaint", "unhappy", "wrong", "damage", "not done", "bad work", "poor quality", "didn't show", "no show"],
    answer:
      "If you're unhappy with the work, you can file a dispute during the 24-hour review window after the landscaper submits completion photos.\n\nDisputeable issues include:\n• Work was not completed\n• Poor quality of work\n• Damage to your property\n• Landscaper didn't show up\n\nOur team reviews all disputes within 24–48 hours. Payment remains frozen until resolved.\n\nStill need help? Scroll down and tap \"Contact TheLawnServices\" to send us a message directly.",
  },
  {
    keywords: ["accept job", "find job", "how do i accept", "get work", "job request", "browse job"],
    answer:
      "As a landscaper, here's how to find and accept jobs:\n\n1. Go to the Search tab (Home tab shows your feed)\n2. Browse open job requests from customers near you\n3. View details: service, budget, yard size, distance, date & time\n4. Tap \"Accept at [price]\" — you'll see your exact payout\n5. The job moves to your Appointments tab once accepted",
  },
  {
    keywords: ["announcement", "broadcast", "follower", "notify customer", "send message", "update"],
    answer:
      "As a landscaper, you can send announcements to all your followers directly from your Home tab.\n\nTap the \"Send Announcement\" card, write your title and message, then hit Send. Your followers will see it in their Alerts & Announcements panel.\n\nAnnouncements are great for sharing promotions, schedule updates, or seasonal service reminders.",
  },
  {
    keywords: ["completion photo", "upload photo", "submit photo", "photo", "mark done", "mark complete"],
    answer:
      "When a job is done, go to your Appointments tab, open the completed job, and tap \"Mark as Complete.\"\n\nYou can upload up to 3 completion photos showing the finished work. Photos are optional but highly recommended — they protect you if a customer disputes the quality.\n\nAfter submitting, the customer has 24 hours to approve or dispute. If there's no response, TheLawnServices steps in to review.",
  },
  {
    keywords: ["payment method", "accepted payment", "set payment", "zelle", "venmo", "paypal", "cash app", "update payment", "which payment"],
    answer:
      "Landscapers can set their accepted payment methods in their Profile. Customers see which methods you accept before booking.\n\nSupported options:\n• Zelle\n• Venmo\n• PayPal\n• Cash App\n• Cash\n\nTip: Accepting more payment methods increases the number of customers who can book you.",
  },
  {
    keywords: ["account", "profile", "edit profile", "settings", "update info", "change name", "change photo"],
    answer:
      "To edit your profile:\n• Tap the three-dot menu (⋮) in the top-right corner of your Profile tab\n• Select \"Edit Profile\"\n\nFrom Settings, you can also manage your accepted payment methods, notification preferences, and privacy settings.",
  },
  {
    keywords: ["privacy", "data", "personal info", "privacy settings", "who can see"],
    answer:
      "You control your privacy settings from the three-dot menu (⋮) on your Profile tab.\n\nCustomers can control:\n• Profile visibility\n• Price history visibility\n• Review visibility\n\nLandscapers can control:\n• Who can see their profile and service area\n\nTheLawnServices never sells your personal data. Full details are in our Privacy Policy (accessible from the three-dot menu).",
  },
  {
    keywords: ["refund", "money back", "get my money", "reimburs"],
    answer:
      "TheLawnServices does not process refunds directly — payments are made between customers and landscapers using agreed methods (Zelle, Venmo, etc.).\n\nIf you have a payment dispute:\n1. File a dispute within 24 hours of receiving the completion notice\n2. Our team will review the situation within 24–48 hours and help mediate\n3. For urgent issues, contact TheLawnServices directly via the form below",
  },
  {
    keywords: ["contact", "reach", "email", "phone", "talk to", "speak to", "human", "real person", "support team", "help"],
    answer:
      "Our support team is here to help! If you can't find your answer here, scroll down and tap \"Contact TheLawnServices\" to send us a message directly.\n\nWe respond to all inquiries within 24–48 hours. For job-related disputes, you can also use the Dispute button on any completed job in your Appointments tab.",
  },
  {
    keywords: ["how do i start", "getting started", "new user", "first time", "sign up", "create account"],
    answer:
      "Welcome to TheLawnServices! Here's a quick start guide:\n\n👤 As a Customer:\n1. Browse landscapers in the Search tab\n2. Post a job request with your service, date, and budget\n3. Wait for a landscaper to accept\n4. Approve their work within 24 hours\n\n🌿 As a Landscaper:\n1. Browse open job requests in the Search tab\n2. Accept jobs that match your schedule and rate\n3. Complete the work and submit photos\n4. Get paid via your accepted payment method",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AI Matching Logic
// ─────────────────────────────────────────────────────────────────────────────

function findAnswer(query: string): string | null {
  const q = query.toLowerCase();
  let bestMatch: KBEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestScore >= 3 ? bestMatch!.answer : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
};

type Screen = "chat" | "contact";

const SUPPORT_CATEGORIES = [
  { key: "billing",    label: "Billing / Payment issue",      icon: "card-outline" as const },
  { key: "booking",   label: "Booking problem",               icon: "calendar-outline" as const },
  { key: "quality",   label: "Quality / Work complaint",      icon: "thumbs-down-outline" as const },
  { key: "account",   label: "Account / Profile issue",       icon: "person-outline" as const },
  { key: "other",     label: "Other",                         icon: "help-circle-outline" as const },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function HelpSupportModal({
  visible,
  onClose,
  role,
}: {
  visible: boolean;
  onClose: () => void;
  role: "customer" | "landscaper";
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const [screen, setScreen] = useState<Screen>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [missCount, setMissCount] = useState(0);

  const [category, setCategory] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [catErr, setCatErr] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent">("idle");
  const successOpacity = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef<ScrollView>(null);
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  const greeting =
    role === "landscaper"
      ? `Hi! I'm the TheLawnServices support assistant. I can help you with jobs, payments, completion photos, announcements, and more.\n\nWhat do you need help with?`
      : `Hi! I'm the TheLawnServices support assistant. I can help you with booking, payments, approvals, disputes, and more.\n\nWhat do you need help with?`;

  useEffect(() => {
    if (visible) {
      setMessages([{ id: "init", role: "bot", text: greeting }]);
      setInputText("");
      setMissCount(0);
      setScreen("chat");
      setCategory("");
      setContactMsg("");
      setCatErr(false);
      setMsgErr(null);
      setSubmitState("idle");
      successOpacity.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (isTyping) {
      const loop = Animated.loop(
        Animated.stagger(180, [
          Animated.sequence([
            Animated.timing(dotAnim1, { toValue: -5, duration: 200, useNativeDriver: false }),
            Animated.timing(dotAnim1, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, { toValue: -5, duration: 200, useNativeDriver: false }),
            Animated.timing(dotAnim2, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, { toValue: -5, duration: 200, useNativeDriver: false }),
            Animated.timing(dotAnim3, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isTyping]);

  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function sendMessage() {
    const text = inputText.trim();
    if (!text) return;
    Haptics.selectionAsync();
    setInputText("");

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    scrollToBottom();

    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      setIsTyping(false);
      const answer = findAnswer(text);
      let newMiss = missCount;

      if (answer) {
        setMissCount(0);
        newMiss = 0;
        setMessages((prev) => [...prev, { id: Date.now().toString() + "b", role: "bot", text: answer }]);
      } else {
        newMiss = missCount + 1;
        setMissCount(newMiss);
        let fallback = "";
        if (newMiss === 1) {
          fallback =
            "I'm not sure I have an exact answer for that. Could you rephrase or give me a bit more detail? For example: \"How do I pay my landscaper?\" or \"What happens after 24 hours?\"";
        } else {
          fallback =
            "I wasn't able to find an answer for that in my knowledge base. Our support team can help — tap \"Contact TheLawnServices\" below to send us a message and we'll get back to you within 24–48 hours.";
        }
        setMessages((prev) => [...prev, { id: Date.now().toString() + "b", role: "bot", text: fallback }]);
      }
      scrollToBottom();
    }, delay);
  }

  function handleContactSubmit() {
    let hasErr = false;
    if (!category) { setCatErr(true); hasErr = true; }
    if (!contactMsg.trim()) { setMsgErr("Please describe your issue before submitting."); hasErr = true; }
    else {
      const v = validateText(contactMsg);
      if (!v.ok) { setMsgErr(v.reason ?? "Please revise your message."); hasErr = true; }
    }
    if (hasErr) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }

    setSubmitState("sending");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setSubmitState("sent");
      Animated.timing(successOpacity, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  }

  const showContactButton = missCount >= 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => { if (submitState !== "sending") onClose(); }}
    >
      <View style={[s.root, { paddingTop: topPad }]}>
        {/* ── Header ── */}
        <View style={s.header}>
          {screen === "contact" ? (
            <TouchableOpacity style={s.backBtn} onPress={() => setScreen("chat")} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color="#CCCCCC" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.backBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={22} color="#CCCCCC" />
            </TouchableOpacity>
          )}
          <View style={s.headerCenter}>
            <View style={s.botAvatar}>
              <Ionicons name="leaf" size={16} color="#34FF7A" />
            </View>
            <View>
              <Text style={[s.headerTitle, { fontFamily: "Inter_700Bold" }]}>
                {screen === "contact" ? "Contact Support" : "Help & Support"}
              </Text>
              <Text style={[s.headerSub, { fontFamily: "Inter_400Regular" }]}>
                {screen === "contact" ? SUPPORT_NAME : "AI Support Assistant"}
              </Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Chat Screen ── */}
        {screen === "chat" && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              ref={scrollRef}
              style={s.chatScroll}
              contentContainerStyle={s.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => (
                <View key={msg.id} style={msg.role === "user" ? s.bubbleRowUser : s.bubbleRowBot}>
                  {msg.role === "bot" && (
                    <View style={s.botBubbleAvatar}>
                      <Ionicons name="leaf" size={12} color="#34FF7A" />
                    </View>
                  )}
                  <View style={msg.role === "user" ? s.bubbleUser : s.bubbleBot}>
                    <Text style={[msg.role === "user" ? s.bubbleTextUser : s.bubbleTextBot, { fontFamily: "Inter_400Regular" }]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              ))}

              {isTyping && (
                <View style={s.bubbleRowBot}>
                  <View style={s.botBubbleAvatar}>
                    <Ionicons name="leaf" size={12} color="#34FF7A" />
                  </View>
                  <View style={s.bubbleBot}>
                    <View style={s.typingRow}>
                      {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
                        <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: anim }] }]} />
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Quick topic chips */}
              {messages.length <= 1 && (
                <View style={s.chipsContainer}>
                  <Text style={[s.chipsLabel, { fontFamily: "Inter_500Medium" }]}>Common questions</Text>
                  <View style={s.chipsRow}>
                    {[
                      "How do I book a landscaper?",
                      "How does payment work?",
                      "What is the 24-hour approval?",
                      role === "landscaper" ? "What is the new customer fee?" : "Can I cancel my appointment?",
                      role === "landscaper" ? "How do I submit completion photos?" : "How do I leave a review?",
                    ].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={s.chip}
                        onPress={() => { setInputText(q); }}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, { fontFamily: "Inter_400Regular" }]}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Contact support escalation */}
              {showContactButton && !isTyping && (
                <TouchableOpacity
                  style={s.escalateBtn}
                  onPress={() => setScreen("contact")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="mail-outline" size={17} color="#34FF7A" />
                  <Text style={[s.escalateBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    Contact {SUPPORT_NAME}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Input bar */}
            <View style={s.inputBar}>
              <TextInput
                style={[s.input, { fontFamily: "Inter_400Regular" }]}
                placeholder="Ask me anything..."
                placeholderTextColor="#555"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                blurOnSubmit={false}
                editable={!isTyping}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!inputText.trim() || isTyping) && s.sendBtnDisabled]}
                onPress={sendMessage}
                activeOpacity={0.8}
                disabled={!inputText.trim() || isTyping}
              >
                <Ionicons name="send" size={18} color={inputText.trim() && !isTyping ? "#000" : "#555"} />
              </TouchableOpacity>
            </View>

            {/* Always-visible contact link at bottom of chat */}
            {!showContactButton && (
              <TouchableOpacity
                style={s.contactLink}
                onPress={() => setScreen("contact")}
                activeOpacity={0.7}
              >
                <Ionicons name="headset-outline" size={14} color="#555" />
                <Text style={[s.contactLinkText, { fontFamily: "Inter_400Regular" }]}>
                  Contact {SUPPORT_NAME} directly
                </Text>
              </TouchableOpacity>
            )}
          </KeyboardAvoidingView>
        )}

        {/* ── Contact Screen ── */}
        {screen === "contact" && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.contactContent}
              keyboardShouldPersistTaps="handled"
            >
              {submitState !== "sent" ? (
                <>
                  {/* Info card */}
                  <View style={s.contactInfoCard}>
                    <View style={s.contactInfoRow}>
                      <Ionicons name="time-outline" size={15} color="#34FF7A" />
                      <Text style={[s.contactInfoText, { fontFamily: "Inter_400Regular" }]}>
                        We respond within <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>24–48 hours</Text>
                      </Text>
                    </View>
                    <View style={s.contactInfoRow}>
                      <Ionicons name="shield-checkmark-outline" size={15} color="#34FF7A" />
                      <Text style={[s.contactInfoText, { fontFamily: "Inter_400Regular" }]}>
                        Your message is sent securely to{" "}
                        <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>{SUPPORT_NAME}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Category */}
                  <Text style={[s.formLabel, { fontFamily: "Inter_600SemiBold" }]}>What can we help you with? *</Text>
                  {catErr && (
                    <View style={s.errRow}>
                      <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                      <Text style={[s.errText, { fontFamily: "Inter_400Regular" }]}>Please select a category.</Text>
                    </View>
                  )}
                  <View style={s.categoryList}>
                    {SUPPORT_CATEGORIES.map((cat) => {
                      const sel = category === cat.key;
                      return (
                        <TouchableOpacity
                          key={cat.key}
                          style={[s.categoryItem, sel && s.categoryItemSelected]}
                          onPress={() => { setCategory(cat.key); setCatErr(false); Haptics.selectionAsync(); }}
                          activeOpacity={0.75}
                        >
                          <Ionicons name={cat.icon} size={18} color={sel ? "#34FF7A" : "#666"} />
                          <Text style={[s.categoryText, { fontFamily: sel ? "Inter_600SemiBold" : "Inter_400Regular" }, sel && { color: "#34FF7A" }]}>
                            {cat.label}
                          </Text>
                          {sel && <Ionicons name="checkmark-circle" size={16} color="#34FF7A" style={{ marginLeft: "auto" }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Message */}
                  <Text style={[s.formLabel, { fontFamily: "Inter_600SemiBold", marginTop: 20 }]}>Describe your issue *</Text>
                  <Text style={[s.formSub, { fontFamily: "Inter_400Regular" }]}>
                    Be specific — include relevant dates, job details, or screenshots if possible.
                  </Text>
                  <TextInput
                    style={[s.messageInput, msgErr ? s.messageInputError : null, { fontFamily: "Inter_400Regular" }]}
                    placeholder="Describe your issue here..."
                    placeholderTextColor="#555"
                    multiline
                    numberOfLines={6}
                    maxLength={MAX_SUPPORT_CHARS}
                    value={contactMsg}
                    onChangeText={(t) => { setContactMsg(t); if (msgErr) setMsgErr(null); }}
                    textAlignVertical="top"
                    editable={submitState === "idle"}
                  />
                  <View style={s.charCountRow}>
                    {msgErr && (
                      <View style={s.errRow}>
                        <Ionicons name="alert-circle-outline" size={13} color="#FF4444" />
                        <Text style={[s.errText, { fontFamily: "Inter_400Regular" }]}>{msgErr}</Text>
                      </View>
                    )}
                    <Text style={[s.charCount, { fontFamily: "Inter_400Regular", color: contactMsg.length > MAX_SUPPORT_CHARS * 0.9 ? "#FFAA00" : "#555" }]}>
                      {contactMsg.length}/{MAX_SUPPORT_CHARS}
                    </Text>
                  </View>

                  <View style={s.legalNote}>
                    <Ionicons name="lock-closed-outline" size={13} color="#555" />
                    <Text style={[s.legalText, { fontFamily: "Inter_400Regular" }]}>
                      Your message will be forwarded securely to {SUPPORT_NAME}. False or abusive submissions may result in account review.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[s.submitBtn, submitState === "sending" && s.submitBtnLoading]}
                    onPress={submitState === "idle" ? handleContactSubmit : undefined}
                    activeOpacity={0.85}
                  >
                    {submitState === "sending" ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={[s.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                          Sending to {SUPPORT_NAME}...
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="send-outline" size={17} color="#fff" />
                        <Text style={[s.submitBtnText, { fontFamily: "Inter_700Bold" }]}>Send to {SUPPORT_NAME}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Animated.View style={[s.sentBox, { opacity: successOpacity }]}>
                  <View style={s.sentIconCircle}>
                    <Ionicons name="checkmark-circle" size={42} color="#34FF7A" />
                  </View>
                  <Text style={[s.sentTitle, { fontFamily: "Inter_700Bold" }]}>Message Sent!</Text>
                  <Text style={[s.sentSub, { fontFamily: "Inter_400Regular" }]}>
                    {SUPPORT_NAME} received your message and will respond within 24–48 hours. Check your notifications for updates.
                  </Text>
                  <TouchableOpacity style={s.sentCloseBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={[s.sentCloseBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0D2010",
    borderWidth: 1,
    borderColor: "#34FF7A33",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, color: "#FFFFFF" },
  headerSub: { fontSize: 11, color: "#777", marginTop: 1 },

  // Chat
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24, gap: 12 },

  bubbleRowBot: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  bubbleRowUser: { flexDirection: "row", justifyContent: "flex-end" },
  botBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0D2010",
    borderWidth: 1,
    borderColor: "#34FF7A22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubbleBot: {
    maxWidth: "82%",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  bubbleUser: {
    maxWidth: "78%",
    backgroundColor: "#1A3020",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: "#34FF7A22",
  },
  bubbleTextBot: { fontSize: 14, color: "#DDDDDD", lineHeight: 20 },
  bubbleTextUser: { fontSize: 14, color: "#FFFFFF", lineHeight: 20 },

  typingRow: { flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#34FF7A66" },

  // Chips
  chipsContainer: { marginTop: 8 },
  chipsLabel: { fontSize: 11, color: "#555", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#181818",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, color: "#AAAAAA" },

  // Escalate
  escalateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#0D2010",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34FF7A33",
    paddingVertical: 14,
  },
  escalateBtnText: { fontSize: 15, color: "#34FF7A" },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E1E1E",
    backgroundColor: "#0A0A0A",
  },
  input: {
    flex: 1,
    backgroundColor: "#181818",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#FFFFFF",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1A1A1A" },

  contactLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 16,
    paddingTop: 4,
  },
  contactLinkText: { fontSize: 12, color: "#555" },

  // Contact form
  contactContent: { padding: 20, paddingBottom: 60 },
  contactInfoCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    marginBottom: 24,
    gap: 8,
  },
  contactInfoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  contactInfoText: { fontSize: 13, color: "#999", flex: 1 },

  formLabel: { fontSize: 14, color: "#FFFFFF", marginBottom: 6 },
  formSub: { fontSize: 12, color: "#666", marginBottom: 10 },

  categoryList: { gap: 8 },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    padding: 13,
  },
  categoryItemSelected: { borderColor: "#34FF7A44", backgroundColor: "#0D1A0D" },
  categoryText: { fontSize: 14, color: "#AAAAAA", flex: 1 },

  messageInput: {
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 120,
  },
  messageInputError: { borderColor: "#FF4444" },
  charCountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  charCount: { fontSize: 11 },

  errRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errText: { fontSize: 12, color: "#FF4444" },

  legalNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#111",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  legalText: { fontSize: 11, color: "#555", flex: 1, lineHeight: 16 },

  submitBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnLoading: { backgroundColor: "#1A3020" },
  submitBtnText: { fontSize: 15, color: "#000" },

  // Sent state
  sentBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 16,
  },
  sentIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0D2010",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#34FF7A33",
    marginBottom: 8,
  },
  sentTitle: { fontSize: 22, color: "#FFFFFF" },
  sentSub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 21, paddingHorizontal: 24 },
  sentCloseBtn: {
    marginTop: 16,
    backgroundColor: "#34FF7A",
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  sentCloseBtnText: { fontSize: 15, color: "#000" },
});
