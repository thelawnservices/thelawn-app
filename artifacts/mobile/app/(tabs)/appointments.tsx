import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  Modal,
  Pressable,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";
import { useRecurring, RecurringInstance } from "@/contexts/recurring";
import { useNotifications } from "@/contexts/notifications";

function parseApptDateTime(date: string, time: string): Date | null {
  let full = date.trim();
  if (!full.match(/\d{4}/)) full = `${full}, ${new Date().getFullYear()}`;
  const d = new Date(`${full} ${time}`);
  return isNaN(d.getTime()) ? null : d;
}

function canCancelAppt(date: string, time: string): { ok: boolean; reason: string } {
  const apptTime = parseApptDateTime(date, time);
  if (!apptTime) return { ok: true, reason: "" };
  const now = Date.now();
  const apptMs = apptTime.getTime();
  if (now >= apptMs) {
    return { ok: false, reason: "This job has already started. Once a job is in progress it cannot be cancelled — it must be completed." };
  }
  if (now >= apptMs - 2 * 3600 * 1000) {
    return { ok: false, reason: "Appointments can only be cancelled up to 2 hours before the service begins. This appointment is too close to cancel." };
  }
  return { ok: true, reason: "" };
}

// ── Static demo data ────────────────────────────────────────────────────────
const SINGLE_UPCOMING = [
  {
    id: "1",
    code: "JOB-37594",
    service: "Mowing/Edging",
    date: "April 12, 2026",
    time: "10:30 AM",
    pro: "John Rivera",
    price: "$70",
    initials: "JR",
    color: "#FFFFFF",
    address: "4627 Hall's Mill Crossing, Ellenton, FL 34222",
    recurring: false,
    size: "Medium",
    notes: "Please edge along the driveway and bag all clippings. Gate code is 1234.",
  },
];

type CustomerAppt = typeof SINGLE_UPCOMING[0];

// ── Job Details Modal (single appointments) ─────────────────────────────────
function JobDetailsModal({
  appt,
  onClose,
  onCancel,
  addNotification,
}: {
  appt: CustomerAppt | null;
  onClose: () => void;
  onCancel: (id: string) => void;
  addNotification: (n: { icon: string; title: string; sub: string }) => void;
}) {
  if (!appt) return null;

  function openMapsAddress() {
    const encoded = encodeURIComponent(appt!.address);
    const url =
      Platform.OS === "ios"
        ? `maps://?daddr=${encoded}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`)
    );
  }

  return (
    <Modal visible={!!appt} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={jdStyles.overlay} onPress={onClose}>
        <Pressable style={jdStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={jdStyles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
          <View style={jdStyles.headerRow}>
            <TouchableOpacity style={jdStyles.backBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#34FF7A" />
            </TouchableOpacity>
            <Text style={[jdStyles.title, { fontFamily: "Inter_700Bold" }]}>Job Details</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={jdStyles.dateCard}>
            <Ionicons name="calendar-outline" size={18} color="#34FF7A" />
            <Text style={[jdStyles.dateText, { fontFamily: "Inter_500Medium" }]}>
              {appt.date} at {appt.time}
            </Text>
          </View>

          <View style={jdStyles.proRow}>
            <View style={[jdStyles.proAvatar, { backgroundColor: appt.color }]}>
              <Text style={[jdStyles.proInitials, { fontFamily: "Inter_700Bold" }]}>{appt.initials}</Text>
            </View>
            <View>
              <Text style={[jdStyles.proLabel, { fontFamily: "Inter_400Regular" }]}>Service Pro</Text>
              <Text style={[jdStyles.proName, { fontFamily: "Inter_600SemiBold" }]}>{appt.pro}</Text>
            </View>
            <Text style={[jdStyles.priceTag, { fontFamily: "Inter_700Bold" }]}>{appt.price}</Text>
          </View>

          <Text style={[jdStyles.sectionLabel, { fontFamily: "Inter_500Medium" }]}>Service Address</Text>
          <TouchableOpacity
            style={jdStyles.addressCard}
            onPress={() => { Haptics.selectionAsync(); openMapsAddress(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={20} color="#34FF7A" />
            <Text style={[jdStyles.addressText, { fontFamily: "Inter_400Regular" }]}>{appt.address}</Text>
            <Ionicons name="navigate-outline" size={16} color="#34FF7A" />
          </TouchableOpacity>
          <Text style={[jdStyles.addressHint, { fontFamily: "Inter_400Regular" }]}>
            Tap address to open directions
          </Text>

          {/* Service Request Summary */}
          <Text style={[jdStyles.sectionLabel, { fontFamily: "Inter_500Medium" }]}>Your Service Request</Text>
          <View style={jdStyles.requestSummaryCard}>
            {/* Service + size row */}
            <View style={jdStyles.reqRow}>
              <View style={jdStyles.reqIconWrap}>
                <Ionicons name="leaf-outline" size={15} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[jdStyles.reqLabel, { fontFamily: "Inter_400Regular" }]}>Service</Text>
                <Text style={[jdStyles.reqValue, { fontFamily: "Inter_600SemiBold" }]}>{appt.service}</Text>
              </View>
            </View>
            <View style={jdStyles.reqDivider} />
            <View style={jdStyles.reqRow}>
              <View style={jdStyles.reqIconWrap}>
                <Ionicons name="resize-outline" size={15} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[jdStyles.reqLabel, { fontFamily: "Inter_400Regular" }]}>Yard Size</Text>
                <Text style={[jdStyles.reqValue, { fontFamily: "Inter_600SemiBold" }]}>{appt.size} yard</Text>
              </View>
            </View>
            {appt.notes ? (
              <>
                <View style={jdStyles.reqDivider} />
                <View style={jdStyles.reqRow}>
                  <View style={jdStyles.reqIconWrap}>
                    <Ionicons name="chatbubble-ellipses-outline" size={15} color="#34FF7A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[jdStyles.reqLabel, { fontFamily: "Inter_400Regular" }]}>Your Notes</Text>
                    <Text style={[jdStyles.reqValue, { fontFamily: "Inter_400Regular" }]}>{appt.notes}</Text>
                  </View>
                </View>
              </>
            ) : null}
            <View style={jdStyles.reqDivider} />
            {/* Agreed price row */}
            <View style={jdStyles.reqRow}>
              <View style={jdStyles.reqIconWrap}>
                <Ionicons name="cash-outline" size={15} color="#34FF7A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[jdStyles.reqLabel, { fontFamily: "Inter_400Regular" }]}>Agreed Price</Text>
                <Text style={[jdStyles.reqLabel, { fontFamily: "Inter_400Regular", fontSize: 11, color: "#666", marginTop: 1 }]}>
                  Charged only after you approve the completed work
                </Text>
              </View>
              <Text style={[jdStyles.reqAgreedPrice, { fontFamily: "Inter_700Bold" }]}>{appt.price}</Text>
            </View>
          </View>

          {/* Confirmed status — no action needed from customer */}
          <View style={jdStyles.confirmedBanner}>
            <View style={jdStyles.confirmedBannerTop}>
              <Ionicons name="checkmark-circle" size={18} color="#34FF7A" />
              <Text style={[jdStyles.confirmedBannerTitle, { fontFamily: "Inter_700Bold" }]}>
                Appointment Confirmed
              </Text>
            </View>
            <Text style={[jdStyles.confirmedBannerSub, { fontFamily: "Inter_400Regular" }]}>
              {appt.pro} has accepted your request. No further action needed — just be available on {appt.date} at {appt.time}. Payment is only charged once you approve the completed work.
            </Text>
          </View>

          <View style={jdStyles.waitingRow}>
            <Ionicons name="time-outline" size={14} color="#FFAA00" />
            <Text style={[jdStyles.waitingText, { fontFamily: "Inter_400Regular" }]}>
              Waiting for {appt.pro} to arrive and mark the job complete
            </Text>
          </View>

          <TouchableOpacity
            style={jdStyles.cancelApptBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const { ok, reason } = canCancelAppt(appt.date, appt.time);
              if (!ok) {
                Alert.alert("Cannot Cancel", reason);
                return;
              }
              Alert.alert(
                "Cancel Appointment?",
                `Cancel ${appt.service} with ${appt.pro} on ${appt.date}?\n\nYour payment will be fully refunded and released immediately. This action cannot be undone.`,
                [
                  { text: "Keep Appointment", style: "cancel" },
                  {
                    text: "Yes, Cancel & Refund",
                    style: "destructive",
                    onPress: () => {
                      onCancel(appt.id);
                      addNotification({
                        icon: "close-circle",
                        title: "Appointment Cancelled",
                        sub: `Your ${appt.service} with ${appt.pro} on ${appt.date} was cancelled by you. A full refund has been issued instantly to your payment method.`,
                      });
                      onClose();
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="close-circle-outline" size={17} color="#FF4444" />
            <Text style={[jdStyles.cancelApptBtnText, { fontFamily: "Inter_500Medium" }]}>Cancel Appointment</Text>
          </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Completion Photo Modal (landscaper) ─────────────────────────────────────
function CompletionPhotoModal({
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

  const MIN_PHOTOS = 2;
  const MAX_PHOTOS = 4;
  const canSubmit = photos.length >= MIN_PHOTOS;

  function handleSubmit() {
    if (!canSubmit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Photos Required", `Please add at least ${MIN_PHOTOS} photos showing the completed work before submitting.`);
      return;
    }
    onSubmit(photos);
    setPhotos([]);
    onClose();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cpStyles.overlay} onPress={onClose}>
        <Pressable style={cpStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={cpStyles.handle} />
          <View style={cpStyles.headerRow}>
            <Ionicons name="camera-outline" size={20} color="#34FF7A" />
            <Text style={[cpStyles.title, { fontFamily: "Inter_700Bold" }]}>Completion Photos</Text>
            <TouchableOpacity onPress={onClose} style={cpStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#CCCCCC" />
            </TouchableOpacity>
          </View>

          <Text style={[cpStyles.subtitle, { fontFamily: "Inter_400Regular" }]}>
            At least 2 photos are required (up to 4). These will be shared with the customer to confirm the completed work.
          </Text>

          {/* Photo counter progress */}
          <View style={cpStyles.photoCounterRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  cpStyles.photoCounterDot,
                  i < photos.length && cpStyles.photoCounterDotFilled,
                  i < MIN_PHOTOS && i >= photos.length && cpStyles.photoCounterDotRequired,
                ]}
              >
                {i < photos.length ? (
                  <Ionicons name="checkmark" size={10} color="#000" />
                ) : (
                  <Text style={[cpStyles.photoCounterNum, { fontFamily: "Inter_700Bold" }]}>{i + 1}</Text>
                )}
              </View>
            ))}
            <Text style={[cpStyles.photoCounterLabel, { fontFamily: "Inter_400Regular" }]}>
              {photos.length < MIN_PHOTOS
                ? `${MIN_PHOTOS - photos.length} more required`
                : photos.length === MAX_PHOTOS
                ? "Maximum reached"
                : `${photos.length} of ${MAX_PHOTOS} added`}
            </Text>
          </View>

          {/* Photo grid */}
          {photos.length > 0 && (
            <View style={cpStyles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={cpStyles.photoThumb}>
                  <Image source={{ uri }} style={cpStyles.photoThumbImg} />
                  <TouchableOpacity
                    style={cpStyles.photoRemove}
                    onPress={() => { setPhotos((prev) => prev.filter((_, idx) => idx !== i)); Haptics.selectionAsync(); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Add photo buttons */}
          {photos.length < MAX_PHOTOS && (
            <View style={cpStyles.addRow}>
              <TouchableOpacity style={cpStyles.addBtn} onPress={pickFromCamera} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={18} color="#34FF7A" />
                <Text style={[cpStyles.addBtnText, { fontFamily: "Inter_500Medium" }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cpStyles.addBtn} onPress={pickFromLibrary} activeOpacity={0.8}>
                <Ionicons name="images-outline" size={18} color="#34FF7A" />
                <Text style={[cpStyles.addBtnText, { fontFamily: "Inter_500Medium" }]}>Library</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[cpStyles.infoNote, !canSubmit && cpStyles.infoNoteWarn]}>
            <Ionicons
              name={canSubmit ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={14}
              color={canSubmit ? "#34FF7A" : "#FFAA00"}
            />
            <Text style={[cpStyles.infoText, { fontFamily: "Inter_400Regular", color: canSubmit ? "#CCCCCC" : "#FFAA00" }]}>
              {canSubmit
                ? "Photo requirement met — you're ready to submit."
                : `${MIN_PHOTOS - photos.length} more photo${MIN_PHOTOS - photos.length > 1 ? "s" : ""} required before you can submit.`}
            </Text>
          </View>

          <TouchableOpacity
            style={[cpStyles.submitBtn, !canSubmit && cpStyles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={canSubmit ? 0.85 : 1}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={canSubmit ? "#000" : "#666"} />
            <Text style={[cpStyles.submitBtnText, { fontFamily: "Inter_700Bold", color: canSubmit ? "#000" : "#666" }]}>
              {canSubmit
                ? `Submit ${photos.length} Photo${photos.length > 1 ? "s" : ""} & Notify Customer`
                : `Add ${MIN_PHOTOS - photos.length} More Photo${MIN_PHOTOS - photos.length > 1 ? "s" : ""} to Continue`}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Recurring Series Card (customer) ────────────────────────────────────────
const TWENTY_FOUR_HOURS = 24 * 3600 * 1000;
const RECURRING_CUSTOMER_PHONE = "(941) 555-1820";

function useCountdown(targetMs: number | undefined): { h: number; m: number; s: number; expired: boolean } {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (targetMs === undefined) return { h: 0, m: 0, s: 0, expired: false };
  const remaining = Math.max(0, targetMs - now);
  const expired = remaining === 0 && targetMs > 0;
  const totalSecs = Math.floor(remaining / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return { h, m, s, expired };
}

function RecurringSeriesCard({
  instances,
  preferredPayment,
  completionPhotos,
  markedDoneAt,
  onMarkDone,
  onRelease,
  onDispute,
}: {
  instances: RecurringInstance[];
  preferredPayment: string | null;
  completionPhotos: Record<string, string[]>;
  markedDoneAt: Record<string, number>;
  onMarkDone: (id: string) => void;
  onRelease: (id: string) => void;
  onDispute: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  // Dispute modal state
  const [dispModalVisible, setDispModalVisible] = useState(false);
  const [dispJobCode, setDispJobCode] = useState("");
  const [dispJobCodeErr, setDispJobCodeErr] = useState<string | null>(null);
  const [dispDesc, setDispDesc] = useState("");
  const [dispDescErr, setDispDescErr] = useState<string | null>(null);
  const [dispPhotos, setDispPhotos] = useState<string[]>([]);
  const [dispSubmitting, setDispSubmitting] = useState(false);

  async function pickDisputePhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      setDispPhotos((prev) => [...prev, res.assets[0].uri].slice(0, 4));
    }
  }

  function removeDisputePhoto(uri: string) {
    setDispPhotos((prev) => prev.filter((p) => p !== uri));
  }

  function openDisputeModal() {
    setDispJobCode("");
    setDispJobCodeErr(null);
    setDispDesc("");
    setDispDescErr(null);
    setDispPhotos([]);
    setDispSubmitting(false);
    setDispModalVisible(true);
  }

  function submitDispute() {
    let hasErr = false;
    if (!dispJobCode.trim()) {
      setDispJobCodeErr("Please enter the Job Number from your job card.");
      hasErr = true;
    } else {
      setDispJobCodeErr(null);
    }
    if (!dispDesc.trim() || dispDesc.trim().length < 10) {
      setDispDescErr("Please describe the issue in at least 10 characters.");
      hasErr = true;
    } else {
      setDispDescErr(null);
    }
    if (hasErr) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setDispSubmitting(true);
    setTimeout(() => {
      setDispModalVisible(false);
      setDispSubmitting(false);
      onDispute(pendingInst!.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(() => {
        Alert.alert(
          "Dispute Opened",
          "Your dispute has been submitted. Our team at TheLawnServices will review the case and respond within 24–48 hours. Payment is frozen until resolved.",
          [{ text: "OK" }]
        );
      }, 400);
    }, 1200);
  }

  if (instances.length === 0) return null;

  const parent = instances[0];
  const pendingInst = instances.find((i) => i.status === "pending_approval");
  const nextUpcoming = instances.find((i) => i.status === "upcoming");
  const completedCount = instances.filter((i) => i.status === "completed").length;
  const disputedCount = instances.filter((i) => i.status === "disputed").length;
  const isInPerson = preferredPayment === "In Person";

  // 24h countdown for pending instance
  const pendingDeadline = pendingInst ? (markedDoneAt[pendingInst.id] ?? 0) + TWENTY_FOUR_HOURS : undefined;
  const countdown = useCountdown(pendingDeadline);
  const pendingPhotos = pendingInst ? (completionPhotos[pendingInst.id] ?? []) : [];

  function handleConfirm(inst: RecurringInstance) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInPerson) {
      Alert.alert(
        "Confirm Work Complete",
        `Confirm that ${inst.pro} has finished the ${inst.service}?\n\nSince you pay In Person, no online charge will be made — just pay ${inst.pro.split(" ")[0]} directly.`,
        [
          { text: "Not Yet", style: "cancel" },
          {
            text: "Yes, Confirmed",
            onPress: () => {
              onRelease(inst.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      const payLabel = preferredPayment ?? "your saved payment method";
      Alert.alert(
        "Confirm & Release Payment",
        `Confirm that ${inst.pro} has finished the ${inst.service}?\n\n${inst.price} will be automatically charged to ${payLabel}.`,
        [
          { text: "Not Yet", style: "cancel" },
          {
            text: `Confirm · Release ${inst.price}`,
            onPress: () => {
              onRelease(inst.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  }

  return (
    <View style={rcStyles.card}>
      {/* Header */}
      <TouchableOpacity
        style={rcStyles.header}
        activeOpacity={0.8}
        onPress={() => { setExpanded((v) => !v); Haptics.selectionAsync(); }}
      >
        <View style={rcStyles.headerLeft}>
          <View style={[rcStyles.avatar, { backgroundColor: parent.color }]}>
            <Text style={[rcStyles.avatarText, { fontFamily: "Inter_700Bold" }]}>{parent.initials}</Text>
          </View>
          <View>
            <Text style={[rcStyles.serviceName, { fontFamily: "Inter_600SemiBold" }]}>{parent.service}</Text>
            <View style={rcStyles.freqRow}>
              <Ionicons name="repeat" size={11} color="#34FF7A" />
              <Text style={[rcStyles.freqText, { fontFamily: "Inter_500Medium" }]}>
                Bi-Weekly · {parent.time}
              </Text>
            </View>
            <Text style={[rcStyles.proName, { fontFamily: "Inter_400Regular" }]}>with {parent.pro}</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[rcStyles.price, { fontFamily: "Inter_700Bold" }]}>{parent.price}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#CCCCCC" />
        </View>
      </TouchableOpacity>

      {/* Stats row */}
      <View style={rcStyles.statsRow}>
        <View style={rcStyles.statPill}>
          <Text style={[rcStyles.statNum, { fontFamily: "Inter_700Bold" }]}>{completedCount}</Text>
          <Text style={[rcStyles.statLabel, { fontFamily: "Inter_400Regular" }]}>Done</Text>
        </View>
        <View style={rcStyles.statPill}>
          <Text style={[rcStyles.statNum, { fontFamily: "Inter_700Bold" }]}>{instances.filter((i) => i.status === "upcoming").length}</Text>
          <Text style={[rcStyles.statLabel, { fontFamily: "Inter_400Regular" }]}>Scheduled</Text>
        </View>
        {isInPerson && (
          <View style={[rcStyles.statPill, { backgroundColor: "#1a1a1a" }]}>
            <Ionicons name="handshake-outline" size={12} color="#34FF7A" />
            <Text style={[rcStyles.statLabel, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>Pay In Person</Text>
          </View>
        )}
      </View>

      {/* Pending Approval Banner — always shown if pending or expired */}
      {pendingInst && (
        <View style={rcStyles.pendingBanner}>
          {/* Title + countdown */}
          <View style={rcStyles.pendingBannerTop}>
            <Ionicons name="notifications" size={16} color="#FFAA00" />
            <Text style={[rcStyles.pendingBannerTitle, { fontFamily: "Inter_700Bold" }]}>
              Work Complete — Your Approval Needed
            </Text>
          </View>

          {/* Countdown timer */}
          {countdown.expired ? (
            <View style={rcStyles.expiredBox}>
              <Ionicons name="warning-outline" size={15} color="#FF4444" />
              <Text style={[rcStyles.expiredText, { fontFamily: "Inter_600SemiBold" }]}>
                Review window expired · Payment auto-released to landscaper
              </Text>
            </View>
          ) : (
            <View style={rcStyles.countdownRow}>
              <Ionicons name="time-outline" size={14} color="#FFAA00" />
              <Text style={[rcStyles.countdownLabel, { fontFamily: "Inter_400Regular" }]}>Time remaining to review:</Text>
              <Text style={[rcStyles.countdownTimer, { fontFamily: "Inter_700Bold" }]}>
                {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
              </Text>
            </View>
          )}

          <Text style={[rcStyles.pendingBannerSub, { fontFamily: "Inter_400Regular" }]}>
            {pendingInst.pro} has marked the {pendingInst.date} appointment as done.
            {isInPerson
              ? " Confirm completion and pay them directly."
              : ` Confirming will mark the ${pendingInst.price} job as complete.`}
          </Text>

          {/* Completion photos (if landscaper attached any) */}
          {pendingPhotos.length > 0 && (
            <View style={rcStyles.photosSection}>
              <View style={rcStyles.photosSectionHeader}>
                <Ionicons name="camera-outline" size={13} color="#34FF7A" />
                <Text style={[rcStyles.photosSectionLabel, { fontFamily: "Inter_500Medium" }]}>
                  Completion Photos ({pendingPhotos.length})
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={rcStyles.photosScroll}>
                {pendingPhotos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={rcStyles.photoThumb} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Approve button */}
          {!countdown.expired && (
            <TouchableOpacity
              style={rcStyles.confirmBtn}
              activeOpacity={0.85}
              onPress={() => handleConfirm(pendingInst)}
            >
              <Ionicons name={isInPerson ? "handshake-outline" : "lock-open-outline"} size={16} color="#000" />
              <Text style={[rcStyles.confirmBtnText, { fontFamily: "Inter_700Bold" }]}>
                {isInPerson ? "Confirm Complete · Pay In Person" : `Confirm & Release ${pendingInst.price}`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Dispute button */}
          {!countdown.expired && (
            <TouchableOpacity
              style={rcStyles.disputeBtn}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                openDisputeModal();
              }}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FF4444" />
              <Text style={[rcStyles.disputeBtnText, { fontFamily: "Inter_600SemiBold" }]}>Dispute Work</Text>
            </TouchableOpacity>
          )}

          {/* Auto-expire note */}
          {!countdown.expired && (
            <View style={rcStyles.autoExpireNote}>
              <Ionicons name="mail-outline" size={12} color="#888" />
              <Text style={[rcStyles.autoExpireText, { fontFamily: "Inter_400Regular" }]}>
                If no action is taken within 24 hours, payment will automatically be released to your landscaper.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Disputed banner */}
      {instances.some((i) => i.status === "disputed") && (
        <View style={rcStyles.disputedBanner}>
          <View style={rcStyles.disputedBannerTop}>
            <Ionicons name="shield-outline" size={16} color="#FF4444" />
            <Text style={[rcStyles.disputedBannerTitle, { fontFamily: "Inter_700Bold" }]}>Dispute Under Further Review</Text>
          </View>
          <Text style={[rcStyles.disputedBannerSub, { fontFamily: "Inter_400Regular" }]}>
            Our team at TheLawnServices is reviewing your dispute. Payment is frozen. You'll be contacted within 24–48 hours.
          </Text>
        </View>
      )}

      {/* Instance list */}
      {expanded && (
        <View style={rcStyles.instanceList}>
          {instances.map((inst, idx) => (
            <View key={inst.id} style={[rcStyles.instanceRow, idx < instances.length - 1 && rcStyles.instanceRowBorder]}>
              <View style={rcStyles.instanceLeft}>
                {inst.status === "completed" && (
                  <View style={rcStyles.statusDot}>
                    <Ionicons name="checkmark" size={10} color="#000" />
                  </View>
                )}
                {inst.status === "pending_approval" && (
                  <View style={[rcStyles.statusDot, { backgroundColor: "#FFAA00" }]}>
                    <Ionicons name="time" size={10} color="#000" />
                  </View>
                )}
                {inst.status === "upcoming" && (
                  <View style={[rcStyles.statusDot, { backgroundColor: "#2a2a2a", borderWidth: 1.5, borderColor: "#444" }]} />
                )}
                <View>
                  <Text style={[rcStyles.instanceDate, { fontFamily: "Inter_600SemiBold" }]}>{inst.date}</Text>
                  <Text style={[rcStyles.instanceTime, { fontFamily: "Inter_400Regular" }]}>{inst.time}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                    <Ionicons name="barcode-outline" size={10} color="#34FF7A" />
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: "#34FF7A" }}>{inst.code}</Text>
                  </View>
                </View>
              </View>
              <View style={rcStyles.instanceRight}>
                {inst.status === "completed" && (
                  <View style={rcStyles.completedBadge}>
                    <Text style={[rcStyles.completedBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                      {isInPerson ? "Done · Paid In Person" : "Payment Released"}
                    </Text>
                  </View>
                )}
                {inst.status === "pending_approval" && (
                  <View style={rcStyles.pendingBadge}>
                    <Text style={[rcStyles.pendingBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Awaiting You</Text>
                  </View>
                )}
                {inst.status === "disputed" && (
                  <View style={[rcStyles.pendingBadge, { backgroundColor: "#2A1010" }]}>
                    <Text style={[rcStyles.pendingBadgeText, { fontFamily: "Inter_600SemiBold", color: "#FF4444" }]}>Disputed</Text>
                  </View>
                )}
                {inst.status === "upcoming" && (
                  <Text style={[rcStyles.scheduledText, { fontFamily: "Inter_400Regular" }]}>Scheduled</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Footer: next scheduled date */}
      {nextUpcoming && !pendingInst && (
        <View style={rcStyles.nextDateRow}>
          <Ionicons name="calendar-outline" size={13} color="#34FF7A" />
          <Text style={[rcStyles.nextDateText, { fontFamily: "Inter_500Medium" }]}>
            Next: {nextUpcoming.date} at {nextUpcoming.time}
          </Text>
        </View>
      )}

      {/* ── Dispute Detail Modal ─────────────────────────────── */}
      <Modal
        visible={dispModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!dispSubmitting) setDispModalVisible(false); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={dispStyles.overlay}
        >
          <ScrollView
            style={dispStyles.sheet}
            contentContainerStyle={dispStyles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header */}
            <View style={dispStyles.header}>
              <View style={dispStyles.headerLeft}>
                <Ionicons name="alert-circle" size={20} color="#FF4444" />
                <Text style={[dispStyles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Open a Dispute</Text>
              </View>
              {!dispSubmitting && (
                <TouchableOpacity onPress={() => setDispModalVisible(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color="#CCCCCC" />
                </TouchableOpacity>
              )}
            </View>

            {/* Info banner */}
            <View style={dispStyles.infoBanner}>
              <Ionicons name="shield-outline" size={14} color="#FFAA00" />
              <Text style={[dispStyles.infoBannerText, { fontFamily: "Inter_400Regular" }]}>
                Describe the issue and attach photos as evidence. Payment is held until TheLawnServices resolves the dispute.
              </Text>
            </View>

            {/* Job Number */}
            <Text style={[dispStyles.fieldLabel, { fontFamily: "Inter_600SemiBold" }]}>
              Job Number *
            </Text>
            <Text style={[dispStyles.infoBannerText, { fontFamily: "Inter_400Regular", color: "#888", marginBottom: 8 }]}>
              Found on your job card (e.g. JOB-84712)
            </Text>
            <TextInput
              style={[dispStyles.descInput, { minHeight: 48 }, dispJobCodeErr && dispStyles.inputErr, { fontFamily: "Inter_500Medium" }]}
              placeholder="JOB-XXXXX"
              placeholderTextColor="#555"
              value={dispJobCode}
              onChangeText={(t) => { setDispJobCode(t.toUpperCase()); if (dispJobCodeErr) setDispJobCodeErr(null); }}
              autoCapitalize="characters"
              returnKeyType="next"
              editable={!dispSubmitting}
            />
            {dispJobCodeErr && (
              <Text style={[dispStyles.errText, { fontFamily: "Inter_400Regular", marginBottom: 10 }]}>{dispJobCodeErr}</Text>
            )}

            {/* Description */}
            <Text style={[dispStyles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 6 }]}>
              Describe the Issue *
            </Text>
            <TextInput
              style={[dispStyles.descInput, dispDescErr && dispStyles.inputErr, { fontFamily: "Inter_400Regular" }]}
              placeholder="e.g. The lawn was not edged properly and large patches were missed along the driveway…"
              placeholderTextColor="#555"
              value={dispDesc}
              onChangeText={(t) => { setDispDesc(t); if (dispDescErr) setDispDescErr(null); }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
              editable={!dispSubmitting}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              {dispDescErr
                ? <Text style={[dispStyles.errText, { fontFamily: "Inter_400Regular" }]}>{dispDescErr}</Text>
                : <Text />}
              <Text style={[dispStyles.charCount, { fontFamily: "Inter_400Regular" }]}>{dispDesc.length}/500</Text>
            </View>

            {/* Photo upload */}
            <Text style={[dispStyles.fieldLabel, { fontFamily: "Inter_600SemiBold", marginTop: 14 }]}>
              Evidence Photos{" "}
              <Text style={{ color: "#777", fontFamily: "Inter_400Regular" }}>(Optional — up to 4)</Text>
            </Text>
            <View style={dispStyles.photoGrid}>
              {dispPhotos.map((uri) => (
                <View key={uri} style={dispStyles.photoThumb}>
                  <Image source={{ uri }} style={dispStyles.photoImg} />
                  <TouchableOpacity
                    style={dispStyles.photoRemove}
                    onPress={() => removeDisputePhoto(uri)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {dispPhotos.length < 4 && (
                <TouchableOpacity
                  style={dispStyles.photoAddBtn}
                  onPress={pickDisputePhoto}
                  activeOpacity={0.75}
                  disabled={dispSubmitting}
                >
                  <Ionicons name="camera-outline" size={24} color="#FFAA00" />
                  <Text style={[dispStyles.photoAddText, { fontFamily: "Inter_500Medium" }]}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[dispStyles.submitBtn, dispSubmitting && dispStyles.submitBtnLoading]}
              onPress={submitDispute}
              activeOpacity={0.85}
              disabled={dispSubmitting}
            >
              {dispSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="alert-circle-outline" size={18} color="#fff" />
                  <Text style={[dispStyles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>Submit Dispute</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={dispStyles.cancelBtn}
              onPress={() => setDispModalVisible(false)}
              disabled={dispSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[dispStyles.cancelBtnText, { fontFamily: "Inter_400Regular" }]}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Static landscaper data ──────────────────────────────────────────────────
const LANDSCAPER_SCHEDULED = [
  {
    id: "s1",
    service: "Mowing/Edging",
    size: "Medium",
    customer: "Alex T.",
    address: "8910 45th Ave E, Ellenton, FL",
    phone: "(941) 555-0192",
    date: "Apr 14",
    time: "9:00 AM",
    budget: "$70",
    note: null as string | null,
  },
  {
    id: "s2",
    service: "Weeding/Mulching",
    size: "Small",
    customer: "Maria K.",
    address: "22 Palmetto Dr, Bradenton, FL",
    phone: "(941) 555-3381",
    date: "Apr 15",
    time: "11:00 AM",
    budget: "$90",
    note: "Gate code: 4892" as string | null,
  },
  {
    id: "s3",
    service: "Sod Installation",
    size: "Small",
    customer: "Sarah B.",
    address: "14 Manatee Ave, Ellenton, FL",
    phone: "(941) 555-7743",
    date: "Apr 17",
    time: "10:00 AM",
    budget: "$30",
    note: null as string | null,
  },
];

type LsAppt = typeof LANDSCAPER_SCHEDULED[0];

// ── Main screen ─────────────────────────────────────────────────────────────
export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role, preferredPayment } = useAuth();
  const isLandscaper = role === "landscaper";

  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [cancelledLsAppts, setCancelledLsAppts] = useState<LsAppt[]>([]);
  const [customerCancelledIds, setCustomerCancelledIds] = useState<string[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<CustomerAppt | null>(null);

  const { acceptedJobs, cancelledJobs, cancelAccepted } = useJobs();

  const acceptedAsAppts: CustomerAppt[] = acceptedJobs.map((j) => ({
    id:        j.id,
    code:      j.code,
    service:   j.service,
    date:      j.date,
    time:      j.time,
    pro:       j.pro,
    price:     j.budget,
    initials:  j.initials,
    color:     j.color,
    address:   j.address,
    recurring: false,
    size:      j.size,
    notes:     j.notes,
  }));
  const { instances, completionPhotos, markedDoneAt, markDone, releasePayment, disputeInstance } = useRecurring();
  const { addNotification } = useNotifications();

  // Landscaper: which instance is awaiting photo modal
  const [photoModalInstId, setPhotoModalInstId] = useState<string | null>(null);

  function openMaps(address: string) {
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === "ios"
      ? `maps://?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`)
    );
  }

  function handleCancelLsAppt(appt: LsAppt) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { ok, reason } = canCancelAppt(appt.date, appt.time);
    if (!ok) {
      Alert.alert("Cannot Cancel", reason);
      return;
    }
    Alert.alert(
      "Cancel Appointment?",
      `Cancel ${appt.service} with ${appt.customer} on ${appt.date}?\n\nThe customer will be notified immediately and their payment will be refunded in full.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Job",
          style: "destructive",
          onPress: () => {
            setCancelledLsAppts((prev) => [appt, ...prev]);
            setCancelledIds((prev) => [...prev, appt.id]);
            addNotification({
              icon: "close-circle",
              title: "Appointment Cancelled",
              sub: `${appt.customer}'s ${appt.service} on ${appt.date} was cancelled by you. Their payment has been refunded in full immediately.`,
            });
          },
        },
      ]
    );
  }

  const visibleScheduled = LANDSCAPER_SCHEDULED.filter((a) => !cancelledIds.includes(a.id));

  const allCustomerAppts: CustomerAppt[] = [
    ...SINGLE_UPCOMING,
    ...acceptedAsAppts,
  ];

  const upcomingCustomerAppts = allCustomerAppts.filter(
    (a) => !customerCancelledIds.includes(a.id)
  );
  const cancelledCustomerAppts = allCustomerAppts.filter(
    (a) => customerCancelledIds.includes(a.id)
  );

  const allLsCancelledAppts = [
    ...cancelledJobs.map((j) => ({
      id: j.id, service: j.service, size: j.size, customer: j.customer,
      date: j.date, time: j.time, budget: j.budget, note: null as string | null, fromAccepted: true,
    })),
    ...cancelledLsAppts.map((a) => ({ ...a, fromAccepted: false })),
  ];

  // Recurring instances split by status for landscaper view
  const upcomingRecurring = instances.filter((i) => i.status === "upcoming");
  const pendingRecurring  = instances.filter((i) => i.status === "pending_approval");
  const completedRecurring = instances.filter((i) => i.status === "completed");

  // ── LANDSCAPER VIEW ────────────────────────────────────────────────────────
  if (isLandscaper) {
    const totalActive = acceptedJobs.length + visibleScheduled.length;
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Appointments</Text>
          <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>Scheduled & Confirmed Jobs</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Recently accepted */}
          {acceptedJobs.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Recently Accepted</Text>
              {acceptedJobs.map((job) => (
                <View key={job.id} style={[styles.lsCard, styles.newJobCard]}>
                  <View style={styles.newJobBadge}>
                    <Text style={[styles.newJobBadgeText, { fontFamily: "Inter_700Bold" }]}>NEW</Text>
                  </View>
                  <View style={styles.lsTopRow}>
                    <View style={styles.lsServiceBadge}>
                      <Ionicons name="leaf" size={14} color="#34FF7A" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{job.service}</Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>{job.budget}</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{job.date} at {job.time}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="resize-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.size} yard</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.customer}</Text>
                    {job.distance && (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="location-outline" size={13} color="#CCCCCC" />
                        <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.distance}</Text>
                      </>
                    )}
                  </View>
                  {job.address ? (
                    <TouchableOpacity
                      style={styles.lsMetaRow}
                      activeOpacity={0.7}
                      onPress={() => { Haptics.selectionAsync(); openMaps(job.address); }}
                    >
                      <Ionicons name="location-outline" size={13} color="#34FF7A" />
                      <Text
                        style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }, styles.mapAddressLink]}
                        numberOfLines={1}
                      >
                        {job.address}
                      </Text>
                      <Ionicons name="navigate-outline" size={12} color="#34FF7A" />
                    </TouchableOpacity>
                  ) : null}
                  {job.phone && (
                    <View style={styles.lsContactRow}>
                      <TouchableOpacity
                        style={styles.lsCallBtn}
                        activeOpacity={0.8}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${job.phone}`); }}
                      >
                        <Ionicons name="call" size={14} color="#000" />
                        <Text style={[styles.lsCallBtnText, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.lsTextBtn}
                        activeOpacity={0.8}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`sms:${job.phone}`); }}
                      >
                        <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                        <Text style={[styles.lsTextBtnText, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      const { ok, reason } = canCancelAppt(job.date, job.time);
                      if (!ok) {
                        Alert.alert("Cannot Cancel", reason);
                        return;
                      }
                      Alert.alert(
                        "Cancel Appointment?",
                        `Cancel ${job.service} with ${job.customer} on ${job.date}?\n\nThe customer will be notified and their payment refunded in full immediately.`,
                        [
                          { text: "Keep", style: "cancel" },
                          {
                            text: "Cancel Job",
                            style: "destructive",
                            onPress: () => {
                              cancelAccepted(job.id);
                              addNotification({
                                icon: "close-circle",
                                title: "Appointment Cancelled",
                                sub: `${job.customer}'s ${job.service} on ${job.date} was cancelled by you. Their payment has been refunded in full immediately.`,
                              });
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.cancelBtnText, { fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Scheduled (single) */}
          {visibleScheduled.length > 0 && (
            <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }, acceptedJobs.length > 0 && { marginTop: 8 }]}>
              Scheduled
            </Text>
          )}

          {totalActive === 0 && allLsCancelledAppts.length === 0 && upcomingRecurring.length === 0 && pendingRecurring.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#555" />
              <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>No scheduled appointments</Text>
              <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>Accept requests to fill your schedule</Text>
            </View>
          ) : (
            visibleScheduled.map((appt) => (
              <View key={appt.id} style={styles.lsCard}>
                <View style={styles.lsTopRow}>
                  <View style={styles.lsServiceBadge}>
                    <Ionicons name="leaf" size={14} color="#34FF7A" />
                    <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{appt.service}</Text>
                  </View>
                  <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>{appt.budget}</Text>
                </View>
                <View style={styles.lsMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{appt.date} at {appt.time}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="resize-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{appt.size} yard</Text>
                </View>
                <View style={styles.lsMetaRow}>
                  <Ionicons name="person-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{appt.customer}</Text>
                </View>
                <TouchableOpacity style={styles.lsMetaRow} activeOpacity={0.7} onPress={() => openMaps(appt.address)}>
                  <Ionicons name="location-outline" size={13} color="#34FF7A" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }, styles.mapAddressLink]} numberOfLines={1}>{appt.address}</Text>
                  <Ionicons name="navigate-outline" size={12} color="#34FF7A" />
                </TouchableOpacity>
                {appt.note && (
                  <View style={styles.notePill}>
                    <Ionicons name="information-circle-outline" size={13} color="#34FF7A" />
                    <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>{appt.note}</Text>
                  </View>
                )}
                <View style={styles.lsContactRow}>
                  <TouchableOpacity
                    style={styles.lsCallBtn}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${appt.phone}`); }}
                  >
                    <Ionicons name="call" size={14} color="#000" />
                    <Text style={[styles.lsCallBtnText, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.lsTextBtn}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`sms:${appt.phone}`); }}
                  >
                    <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                    <Text style={[styles.lsTextBtnText, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={() => handleCancelLsAppt(appt)}>
                  <Text style={[styles.cancelBtnText, { fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ── Recurring Jobs ── */}
          {(upcomingRecurring.length > 0 || pendingRecurring.length > 0) && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Recurring Jobs</Text>

              {/* Completion Photo Modal */}
              <CompletionPhotoModal
                visible={photoModalInstId !== null}
                onClose={() => setPhotoModalInstId(null)}
                onSubmit={(photos) => {
                  if (photoModalInstId) {
                    markDone(photoModalInstId, photos);
                    setPhotoModalInstId(null);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(() => {
                      Alert.alert(
                        "Customer Notified",
                        "Zamire Smith has been notified that the job is complete. They have 24 hours to approve or dispute. If no action is taken within 24 hours, payment will be automatically released to you.",
                        [{ text: "OK" }]
                      );
                    }, 400);
                  }
                }}
              />

              {/* Awaiting customer approval */}
              {pendingRecurring.map((inst) => {
                const instPhotos = completionPhotos[inst.id] ?? [];
                const deadline = (markedDoneAt[inst.id] ?? 0) + TWENTY_FOUR_HOURS;
                const remaining = Math.max(0, deadline - Date.now());
                const totalSecs = Math.floor(remaining / 1000);
                const rh = Math.floor(totalSecs / 3600);
                const rm = Math.floor((totalSecs % 3600) / 60);
                const isExpired = remaining === 0 && (markedDoneAt[inst.id] ?? 0) > 0;
                return (
                  <View key={inst.id} style={[styles.lsCard, lsRecStyles.awaitingCard]}>
                    <View style={lsRecStyles.awaitingBadge}>
                      <Ionicons name="time-outline" size={13} color="#FFAA00" />
                      <Text style={[lsRecStyles.awaitingBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Awaiting Customer Approval</Text>
                    </View>
                    <View style={styles.lsTopRow}>
                      <View style={styles.lsServiceBadge}>
                        <Ionicons name="repeat" size={13} color="#34FF7A" />
                        <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{inst.service}</Text>
                      </View>
                      <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>{inst.price}</Text>
                    </View>
                    <View style={styles.lsMetaRow}>
                      <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                      <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{inst.date} at {inst.time}</Text>
                    </View>
                    <View style={styles.lsMetaRow}>
                      <Ionicons name="person-outline" size={13} color="#CCCCCC" />
                      <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>Zamire Smith</Text>
                    </View>
                    <View style={styles.lsContactRow}>
                      <TouchableOpacity
                        style={styles.lsCallBtn}
                        activeOpacity={0.8}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${RECURRING_CUSTOMER_PHONE}`); }}
                      >
                        <Ionicons name="call" size={14} color="#000" />
                        <Text style={[styles.lsCallBtnText, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.lsTextBtn}
                        activeOpacity={0.8}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`sms:${RECURRING_CUSTOMER_PHONE}`); }}
                      >
                        <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                        <Text style={[styles.lsTextBtnText, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Customer countdown from landscaper's perspective */}
                    <View style={lsRecStyles.customerTimerRow}>
                      <Ionicons name="time-outline" size={13} color={isExpired ? "#FF4444" : "#FFAA00"} />
                      <Text style={[lsRecStyles.customerTimerText, { fontFamily: "Inter_400Regular", color: isExpired ? "#FF4444" : "#BBBBBB" }]}>
                        {isExpired
                          ? "Customer window expired · Payment auto-released to you"
                          : `Customer has ${String(rh).padStart(2, "0")}h ${String(rm).padStart(2, "0")}m to approve or dispute`}
                      </Text>
                    </View>

                    {/* Completion photos the landscaper attached */}
                    {instPhotos.length > 0 && (
                      <View>
                        <View style={[styles.lsMetaRow, { marginBottom: 6 }]}>
                          <Ionicons name="camera-outline" size={13} color="#34FF7A" />
                          <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium", color: "#34FF7A" }]}>
                            {instPhotos.length} completion photo{instPhotos.length > 1 ? "s" : ""} attached
                          </Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {instPhotos.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={lsRecStyles.photoThumb} />
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {isExpired ? (
                      <View style={lsRecStyles.autoPayBanner}>
                        <Ionicons name="checkmark-circle" size={14} color="#34FF7A" />
                        <Text style={[lsRecStyles.autoPayBannerText, { fontFamily: "Inter_600SemiBold" }]}>
                          24-hour window closed — payment has been automatically released to you.
                        </Text>
                      </View>
                    ) : (
                      <View style={lsRecStyles.autoPayNote}>
                        <Ionicons name="information-circle-outline" size={13} color="#888" />
                        <Text style={[lsRecStyles.awaitingNote, { fontFamily: "Inter_400Regular" }]}>
                          You marked this job complete. If the customer takes no action within 24 hours of completion, payment will be automatically released to you.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Upcoming recurring — awaiting service date */}
              {upcomingRecurring.map((inst) => (
                <View key={inst.id} style={[styles.lsCard, lsRecStyles.recurringCard]}>
                  <View style={styles.lsTopRow}>
                    <View style={styles.lsServiceBadge}>
                      <Ionicons name="repeat" size={13} color="#34FF7A" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{inst.service}</Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>{inst.price}</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{inst.date} at {inst.time}</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>Zamire Smith</Text>
                  </View>
                  <View style={styles.lsContactRow}>
                    <TouchableOpacity
                      style={styles.lsCallBtn}
                      activeOpacity={0.8}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${RECURRING_CUSTOMER_PHONE}`); }}
                    >
                      <Ionicons name="call" size={14} color="#000" />
                      <Text style={[styles.lsCallBtnText, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.lsTextBtn}
                      activeOpacity={0.8}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`sms:${RECURRING_CUSTOMER_PHONE}`); }}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                      <Text style={[styles.lsTextBtnText, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Locked notice — cannot mark done early */}
                  <View style={myJobStyles.lockedNotice}>
                    <Ionicons name="lock-closed-outline" size={13} color="#FFAA00" />
                    <Text style={[myJobStyles.lockedNoticeText, { fontFamily: "Inter_400Regular" }]}>
                      Available on {inst.date}. When the service date arrives this job will move to the{" "}
                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}>My Jobs tab</Text>
                      {" "}where you must mark Arrived → Start Work → Complete with photos.
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Completed recurring */}
          {completedRecurring.length > 0 && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Completed Recurring</Text>
              {completedRecurring.map((inst, idx) => (
                <View key={inst.id} style={[styles.lsCard, styles.cancelledCard]}>
                  <View style={styles.lsTopRow}>
                    <View style={[styles.lsServiceBadge, { backgroundColor: "#0d2e18" }]}>
                      <Ionicons name="checkmark-circle" size={13} color="#34FF7A" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>{inst.service}</Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold", color: "#34FF7A", fontSize: 16 }]}>{inst.price}</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium", color: "#BBBBBB" }]}>{inst.date} at {inst.time}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Previous / Cancelled */}
          {allLsCancelledAppts.length > 0 && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 4 }]}>Previous Jobs · Cancelled</Text>
              {allLsCancelledAppts.map((appt, idx) => (
                <View key={appt.id + idx} style={[styles.lsCard, styles.cancelledCard]}>
                  <View style={styles.cancelledBadgeRow}>
                    <View style={styles.cancelledBadge}>
                      <Ionicons name="close-circle" size={13} color="#FF4444" />
                      <Text style={[styles.cancelledBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Cancelled</Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold", color: "#BBBBBB", fontSize: 16 }]}>{appt.budget}</Text>
                  </View>
                  <View style={styles.lsTopRow}>
                    <View style={[styles.lsServiceBadge, { backgroundColor: "#1A1A1A" }]}>
                      <Ionicons name="leaf" size={14} color="#CCCCCC" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold", color: "#BBBBBB" }]}>{appt.service}</Text>
                    </View>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#777" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium", color: "#BBBBBB" }]}>{appt.date} at {appt.time}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="resize-outline" size={13} color="#777" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular", color: "#BBBBBB" }]}>{appt.size} yard</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#777" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular", color: "#BBBBBB" }]}>{appt.customer}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── CUSTOMER VIEW ───────────────────────────────────────────────────────────
  const hasAnything = upcomingCustomerAppts.length > 0 || instances.length > 0 || cancelledCustomerAppts.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Appointments</Text>
        <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>Upcoming & Recurring</Text>
      </View>

      <JobDetailsModal
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onCancel={(id) => {
          setCustomerCancelledIds((prev) => [...prev, id]);
          if (acceptedJobs.some((j) => j.id === id)) {
            cancelAccepted(id);
          }
        }}
        addNotification={addNotification}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {!hasAnything ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#555" />
            <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>No upcoming appointments</Text>
            <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>Book a landscaper to get started</Text>
          </View>
        ) : (
          <>
            {/* Single upcoming appointments */}
            {upcomingCustomerAppts.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Upcoming</Text>
                {upcomingCustomerAppts.map((appt) => (
                  <TouchableOpacity
                    key={appt.id}
                    style={styles.card}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.selectionAsync(); setSelectedAppt(appt); }}
                  >
                    <View style={[styles.avatar, { backgroundColor: appt.color }]}>
                      <Text style={styles.avatarText}>{appt.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold" }]}>{appt.service}</Text>
                        <Text style={[styles.priceText, { fontFamily: "Inter_700Bold" }]}>{appt.price}</Text>
                      </View>
                      <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>{appt.date} · {appt.time}</Text>
                      <Text style={[styles.proText, { fontFamily: "Inter_400Regular" }]}>with {appt.pro}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Ionicons name="barcode-outline" size={12} color="#34FF7A" />
                        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: "#34FF7A" }}>{appt.code}</Text>
                      </View>
                      <View style={styles.confirmedPill}>
                        <Ionicons name="checkmark-circle" size={11} color="#34FF7A" />
                        <Text style={[styles.confirmedPillText, { fontFamily: "Inter_600SemiBold" }]}>Confirmed</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#34FF7A" />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Recurring series */}
            {instances.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }, upcomingCustomerAppts.length > 0 && { marginTop: 8 }]}>
                  Recurring Service Appointments
                </Text>
                <RecurringSeriesCard
                  instances={instances}
                  preferredPayment={preferredPayment}
                  completionPhotos={completionPhotos}
                  markedDoneAt={markedDoneAt}
                  onMarkDone={markDone}
                  onRelease={releasePayment}
                  onDispute={disputeInstance}
                />
              </>
            )}

            {/* Cancelled */}
            {cancelledCustomerAppts.length > 0 && (
              <>
                <View style={[styles.sectionDivider, { marginTop: 12 }]} />
                <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>Cancelled</Text>
                {cancelledCustomerAppts.map((appt) => (
                  <View key={appt.id} style={[styles.card, styles.cancelledCustomerCard]}>
                    <View style={[styles.avatar, { backgroundColor: appt.color + "40" }]}>
                      <Text style={[styles.avatarText, { color: "#CCCCCC" }]}>{appt.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold", color: "#BBBBBB" }]}>{appt.service}</Text>
                        <View style={styles.cancelledBadge}>
                          <Ionicons name="close-circle" size={12} color="#FF4444" />
                          <Text style={[styles.cancelledBadgeText, { fontFamily: "Inter_600SemiBold" }]}>Cancelled</Text>
                        </View>
                      </View>
                      <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>{appt.date} · {appt.time}</Text>
                      <Text style={[styles.proText, { fontFamily: "Inter_400Regular" }]}>with {appt.pro}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
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
  headerSub: { fontSize: 13, color: "#CCCCCC", marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    color: "#CCCCCC",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionDivider: { height: 1, backgroundColor: "#1E1E1E", marginVertical: 8 },
  emptyState: { paddingVertical: 80, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: "#888" },
  emptySub: { fontSize: 13, color: "#777" },
  newJobCard: { borderColor: "#34FF7A33", borderWidth: 1.5, position: "relative" },
  newJobBadge: {
    position: "absolute", top: -1, right: 14,
    backgroundColor: "#34FF7A",
    paddingHorizontal: 10, paddingVertical: 3,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  newJobBadgeText: { fontSize: 10, color: "#000", letterSpacing: 0.8 },
  lsCard: {
    backgroundColor: "#1A1A1A", borderRadius: 22,
    padding: 16, borderWidth: 1, borderColor: "#222222", gap: 9,
  },
  cancelledCard: { opacity: 0.75, borderColor: "#2A1A1A", backgroundColor: "#111111" },
  cancelledBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancelledBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#2A1010", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  cancelledBadgeText: { fontSize: 11, color: "#FF4444" },
  lsTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lsServiceBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0d2e18", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  lsServiceText: { fontSize: 14, color: "#34FF7A" },
  lsBudget: { fontSize: 20, color: "#FFFFFF" },
  lsMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lsMetaText: { fontSize: 13, color: "#CCCCCC", flex: 1 },
  mapAddressLink: { color: "#34FF7A", textDecorationLine: "underline", flex: 1 },
  metaDot: { color: "#555", fontSize: 12 },
  notePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0d2e18", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  noteText: { fontSize: 12, color: "#34FF7A" },
  cancelBtn: {
    borderWidth: 1, borderColor: "#FF4444",
    paddingVertical: 11, borderRadius: 20, alignItems: "center", marginTop: 4,
  },
  cancelBtnText: { fontSize: 14, color: "#FF4444" },
  lsContactRow: {
    flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 4,
  },
  lsCallBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#34FF7A", borderRadius: 20, paddingVertical: 11,
  },
  lsCallBtnText: { fontSize: 14, color: "#000000" },
  lsTextBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#1E1E1E", borderRadius: 20, paddingVertical: 11,
    borderWidth: 1, borderColor: "#333333",
  },
  lsTextBtnText: { fontSize: 14, color: "#FFFFFF" },
  card: {
    backgroundColor: "#1A1A1A", borderRadius: 22, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: "#222222",
  },
  cancelledCustomerCard: { opacity: 0.65, borderColor: "#2A1A1A", backgroundColor: "#111111" },
  recurringPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0d2e18", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 4,
  },
  recurringPillText: { fontSize: 11, color: "#34FF7A" },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  serviceText: { fontSize: 15, color: "#FFFFFF" },
  priceText: { fontSize: 15, color: "#FFFFFF" },
  subText: { fontSize: 12, color: "#888", marginBottom: 3 },
  proText: { fontSize: 12, color: "#888" },
  confirmedPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", marginTop: 6,
    backgroundColor: "#0d2e18", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "#1a4a2a",
  },
  confirmedPillText: { fontSize: 11, color: "#34FF7A" },
});

// ── Recurring series card styles ─────────────────────────────────────────────
const rcStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A1A", borderRadius: 22,
    borderWidth: 1, borderColor: "#34FF7A33", overflow: "hidden",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, color: "#000" },
  serviceName: { fontSize: 15, color: "#FFFFFF", marginBottom: 2 },
  freqRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  freqText: { fontSize: 12, color: "#34FF7A" },
  proName: { fontSize: 12, color: "#CCCCCC" },
  price: { fontSize: 18, color: "#FFFFFF" },
  statsRow: {
    flexDirection: "row", gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  statPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#111", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statNum: { fontSize: 13, color: "#FFFFFF" },
  statLabel: { fontSize: 12, color: "#CCCCCC" },
  pendingBanner: {
    backgroundColor: "#1C1500",
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#FFAA0033",
    padding: 16, gap: 10,
  },
  pendingBannerTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  pendingBannerTitle: { fontSize: 14, color: "#FFAA00", flex: 1 },
  pendingBannerSub: { fontSize: 13, color: "#CCCCCC", lineHeight: 20 },
  confirmBtn: {
    backgroundColor: "#34FF7A", borderRadius: 18,
    paddingVertical: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#34FF7A", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  confirmBtnText: { fontSize: 15, color: "#000" },
  instanceList: { borderTopWidth: 1, borderColor: "#222" },
  instanceRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  instanceRowBorder: { borderBottomWidth: 1, borderColor: "#1e1e1e" },
  instanceLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#34FF7A", alignItems: "center", justifyContent: "center",
  },
  instanceDate: { fontSize: 14, color: "#FFFFFF" },
  instanceTime: { fontSize: 12, color: "#CCCCCC", marginTop: 1 },
  instanceRight: { alignItems: "flex-end" },
  completedBadge: {
    backgroundColor: "#0d2e18", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  completedBadgeText: { fontSize: 11, color: "#34FF7A" },
  pendingBadge: {
    backgroundColor: "#2A1F00", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 11, color: "#FFAA00" },
  scheduledText: { fontSize: 12, color: "#CCCCCC" },
  nextDateRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderColor: "#222",
  },
  nextDateText: { fontSize: 13, color: "#34FF7A" },

  // Countdown
  countdownRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#1C1200", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  countdownLabel: { fontSize: 12, color: "#CCCCCC" },
  countdownTimer: { fontSize: 14, color: "#FFAA00", marginLeft: "auto", letterSpacing: 0.5 },
  expiredBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1A0505", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#3A1010",
  },
  expiredText: { fontSize: 13, color: "#FF4444", flex: 1, lineHeight: 18 },

  // Completion photos (customer view)
  photosSection: {
    backgroundColor: "#111", borderRadius: 14, padding: 12, gap: 8,
  },
  photosSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  photosSectionLabel: { fontSize: 12, color: "#34FF7A" },
  photosScroll: { marginTop: 4 },
  photoThumb: {
    width: 72, height: 72, borderRadius: 10,
    marginRight: 8, backgroundColor: "#1A1A1A",
  },

  // Dispute button
  disputeBtn: {
    borderWidth: 1, borderColor: "#FF4444", borderRadius: 18,
    paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  disputeBtnText: { fontSize: 14, color: "#FF4444" },

  // Auto-expire note
  autoExpireNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
  },
  autoExpireText: { fontSize: 11, color: "#888", flex: 1, lineHeight: 17 },

  // Disputed banner
  disputedBanner: {
    backgroundColor: "#1A0505", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#FF444433",
    padding: 16, gap: 8,
  },
  disputedBannerTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  disputedBannerTitle: { fontSize: 14, color: "#FF4444", flex: 1 },
  disputedBannerSub: { fontSize: 13, color: "#CCCCCC", lineHeight: 19 },
});

// ── Landscaper recurring styles ──────────────────────────────────────────────
const lsRecStyles = StyleSheet.create({
  recurringCard: { borderColor: "#34FF7A22" },
  awaitingCard: { borderColor: "#FFAA0033", backgroundColor: "#181200" },
  awaitingBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#2A1F00", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  awaitingBadgeText: { fontSize: 12, color: "#FFAA00" },
  awaitingNote: { fontSize: 12, color: "#CCCCCC", lineHeight: 18, flex: 1 },
  autoPayNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4 },
  autoPayBanner: {
    flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6,
    backgroundColor: "#0D2B1A", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: "#1A5C32",
  },
  autoPayBannerText: { fontSize: 12, color: "#34FF7A", flex: 1, lineHeight: 17 },
  customerTimerRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0f0f0f", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  customerTimerText: { fontSize: 12, flex: 1 },
  photoThumb: {
    width: 68, height: 68, borderRadius: 10, marginRight: 8, backgroundColor: "#222",
  },
  markDoneBtn: {
    backgroundColor: "#34FF7A", borderRadius: 18,
    paddingVertical: 12, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
  },
  markDoneBtnText: { fontSize: 14, color: "#000" },
});

// ── Completion Photo Modal styles ─────────────────────────────────────────────
const cpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 22, paddingBottom: 40, paddingTop: 10,
    borderTopWidth: 1, borderColor: "#222",
    gap: 16,
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
  photoCounterRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  photoCounterDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#222", borderWidth: 1.5, borderColor: "#444",
    alignItems: "center", justifyContent: "center",
  },
  photoCounterDotFilled: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  photoCounterDotRequired: { borderColor: "#FFAA00", borderStyle: "dashed" },
  photoCounterNum: { fontSize: 10, color: "#888" },
  photoCounterLabel: { fontSize: 12, color: "#888", marginLeft: 4, flex: 1 },
  infoNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1A1A1A", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  infoNoteWarn: { backgroundColor: "#1A1200", borderWidth: 1, borderColor: "#2E2000" },
  infoText: { fontSize: 12, color: "#BBBBBB", flex: 1, lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#34FF7A", borderRadius: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitBtnDisabled: { backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#333" },
  submitBtnText: { fontSize: 15, color: "#000" },
});

const jdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: 52, paddingTop: 12,
    borderTopWidth: 1, borderColor: "#222222",
  },
  handle: { width: 40, height: 4, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, color: "#FFFFFF" },
  dateCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#1A1A1A", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#222",
  },
  dateText: { fontSize: 15, color: "#FFFFFF" },
  proRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  proAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  proInitials: { fontSize: 16, color: "#000" },
  proLabel: { fontSize: 11, color: "#CCCCCC", marginBottom: 2 },
  proName: { fontSize: 16, color: "#FFFFFF" },
  priceTag: { fontSize: 20, color: "#34FF7A", marginLeft: "auto" },
  sectionLabel: { fontSize: 11, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1 },
  addressCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#1A1A1A", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#222",
  },
  addressText: { flex: 1, fontSize: 14, color: "#FFFFFF" },
  addressHint: { fontSize: 11, color: "#888", textAlign: "center" },
  requestSummaryCard: {
    backgroundColor: "#1A1A1A", borderRadius: 18,
    borderWidth: 1, borderColor: "#222222",
    overflow: "hidden",
  },
  reqRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  reqIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: "#0d2e18", alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  reqLabel: { fontSize: 11, color: "#888", marginBottom: 2 },
  reqValue: { fontSize: 14, color: "#FFFFFF" },
  reqDivider: { height: 1, backgroundColor: "#222222", marginHorizontal: 16 },
  reqAgreedPrice: { fontSize: 20, color: "#34FF7A", alignSelf: "center" },
  confirmedBanner: {
    backgroundColor: "#0d2e18", borderRadius: 18,
    borderWidth: 1, borderColor: "#1a4a2a",
    padding: 16, gap: 8,
  },
  confirmedBannerTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  confirmedBannerTitle: { fontSize: 15, color: "#34FF7A" },
  confirmedBannerSub: { fontSize: 13, color: "#BBBBBB", lineHeight: 19 },
  waitingRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#1C1200", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#FFAA0022",
  },
  waitingText: { fontSize: 13, color: "#BBBBBB", flex: 1, lineHeight: 18 },
  cancelApptBtn: {
    borderWidth: 1, borderColor: "#FF4444", borderRadius: 20, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  cancelApptBtnText: { fontSize: 15, color: "#FF4444" },
});

const dispStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "#FF444420",
    maxHeight: "92%",
  },
  sheetContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1A1200",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFAA0030",
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: { fontSize: 13, color: "#CCCCCC", flex: 1, lineHeight: 18 },
  fieldLabel: { fontSize: 13, color: "#CCCCCC", marginBottom: 8 },
  descInput: {
    backgroundColor: "#1A1A1A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    color: "#FFFFFF",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 120,
    marginBottom: 4,
  },
  inputErr: { borderColor: "#FF4444" },
  errText: { fontSize: 12, color: "#FF4444", flex: 1 },
  charCount: { fontSize: 11, color: "#555", textAlign: "right" },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
    marginTop: 6,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 11,
  },
  photoAddBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFAA0060",
    borderStyle: "dashed",
    backgroundColor: "#1A1200",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoAddText: { fontSize: 10, color: "#FFAA00" },
  submitBtn: {
    backgroundColor: "#FF4444",
    borderRadius: 22,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  submitBtnLoading: { backgroundColor: "#AA2222" },
  submitBtnText: { fontSize: 16, color: "#FFFFFF" },
  cancelBtn: { paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 14, color: "#BBBBBB" },
});

const myJobStyles = StyleSheet.create({
  activeCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#34FF7A",
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#2A2000", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  statusBadgeStarted: { backgroundColor: "#0D2B1A" },
  statusBadgeText: { fontSize: 11 },
  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#FFAA00", borderRadius: 22,
    paddingVertical: 13, marginTop: 10,
  },
  startBtnText: { fontSize: 14, color: "#000" },
  completeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#34FF7A", borderRadius: 22,
    paddingVertical: 13, marginTop: 10,
  },
  completeBtnText: { fontSize: 14, color: "#000" },
  lockedNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: 7,
    backgroundColor: "#1A1500", borderRadius: 10, borderWidth: 1, borderColor: "#2E2500",
    paddingVertical: 10, paddingHorizontal: 12, marginTop: 10,
  },
  lockedNoticeText: { fontSize: 12, color: "#AAAAAA", flex: 1, lineHeight: 18 },
});
