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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";
import { useRecurring, RecurringInstance } from "@/contexts/recurring";

// ── Static demo data ────────────────────────────────────────────────────────
const SINGLE_UPCOMING = [
  {
    id: "1",
    service: "Lawn Mowing",
    date: "April 12, 2026",
    time: "10:30 AM",
    pro: "John Rivera",
    price: "$45",
    initials: "JR",
    color: "#FFFFFF",
    address: "4627 Hall's Mill Crossing, Ellenton, FL 34222",
    recurring: false,
  },
];

type CustomerAppt = typeof SINGLE_UPCOMING[0];

// ── Job Details Modal (single appointments) ─────────────────────────────────
function JobDetailsModal({
  appt,
  onClose,
  onCancel,
}: {
  appt: CustomerAppt | null;
  onClose: () => void;
  onCancel: (id: string) => void;
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

          <TouchableOpacity
            style={jdStyles.payBtn}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onClose(); router.navigate("/pay"); }}
          >
            <Ionicons name="card-outline" size={18} color="#000" />
            <Text style={[jdStyles.payBtnText, { fontFamily: "Inter_600SemiBold" }]}>Confirm &amp; Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={jdStyles.cancelApptBtn}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Cancel Appointment?",
                `Cancel ${appt.service} with ${appt.pro} on ${appt.date}? This action cannot be undone.`,
                [
                  { text: "Keep Appointment", style: "cancel" },
                  { text: "Yes, Cancel", style: "destructive", onPress: () => { onCancel(appt.id); onClose(); } },
                ]
              );
            }}
          >
            <Ionicons name="close-circle-outline" size={17} color="#FF4444" />
            <Text style={[jdStyles.cancelApptBtnText, { fontFamily: "Inter_500Medium" }]}>Cancel Appointment</Text>
          </TouchableOpacity>
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

  function handleSubmit() {
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
            Add up to 4 photos showing the completed work. These will be shared with the customer to support their approval.
          </Text>

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
          {photos.length < 4 && (
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

          <View style={cpStyles.infoNote}>
            <Ionicons name="information-circle-outline" size={14} color="#CCCCCC" />
            <Text style={[cpStyles.infoText, { fontFamily: "Inter_400Regular" }]}>
              Photos are optional — tap "Submit" to notify the customer without photos.
            </Text>
          </View>

          <TouchableOpacity style={cpStyles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#000" />
            <Text style={[cpStyles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>
              {photos.length > 0 ? `Submit ${photos.length} Photo${photos.length > 1 ? "s" : ""} & Notify Customer` : "Submit & Notify Customer"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Recurring Series Card (customer) ────────────────────────────────────────
const TWENTY_FOUR_HOURS = 24 * 3600 * 1000;

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
                Review window expired · Sent to TheLawnServices@gmail.com for further review
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
              : ` Confirming will charge ${pendingInst.price} to ${preferredPayment ?? "your saved payment method"}.`}
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
                Alert.alert(
                  "Dispute This Work?",
                  `Are you unsatisfied with the ${pendingInst.service} completed on ${pendingInst.date}?\n\nThis will flag the order and send it to TheLawnServices@gmail.com for further review. Payment will be held until resolved.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Yes, Open Dispute",
                      style: "destructive",
                      onPress: () => {
                        onDispute(pendingInst.id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        setTimeout(() => {
                          Alert.alert(
                            "Dispute Opened",
                            "Your dispute has been submitted. Our team at TheLawnServices@gmail.com will review the case and respond within 24–48 hours. Payment is frozen until resolved.",
                            [{ text: "OK" }]
                          );
                        }, 400);
                      },
                    },
                  ]
                );
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
                If no action is taken within 24 hours, the order will automatically be sent to TheLawnServices@gmail.com for further review.
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
            Our team at TheLawnServices@gmail.com is reviewing your dispute. Payment is frozen. You'll be contacted within 24–48 hours.
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
    </View>
  );
}

// ── Static landscaper data ──────────────────────────────────────────────────
const LANDSCAPER_SCHEDULED = [
  {
    id: "s1",
    service: "Lawn Mowing",
    size: "Medium",
    customer: "Alex T.",
    address: "8910 45th Ave E, Ellenton, FL",
    phone: "(941) 555-0192",
    date: "Apr 14",
    time: "9:00 AM",
    budget: "$65",
    note: null as string | null,
  },
  {
    id: "s2",
    service: "Hedge Trimming",
    size: "Small",
    customer: "Maria K.",
    address: "22 Palmetto Dr, Bradenton, FL",
    phone: "(941) 555-3381",
    date: "Apr 15",
    time: "11:00 AM",
    budget: "$55",
    note: "Gate code: 4892" as string | null,
  },
  {
    id: "s3",
    service: "Clean Up",
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
  const { instances, completionPhotos, markedDoneAt, markDone, releasePayment, disputeInstance } = useRecurring();

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
    Alert.alert(
      "Cancel Appointment?",
      `Cancel ${appt.service} with ${appt.customer} on ${appt.date}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Job",
          style: "destructive",
          onPress: () => {
            setCancelledLsAppts((prev) => [appt, ...prev]);
            setCancelledIds((prev) => [...prev, appt.id]);
          },
        },
      ]
    );
  }

  const visibleScheduled = LANDSCAPER_SCHEDULED.filter((a) => !cancelledIds.includes(a.id));

  const upcomingCustomerAppts = SINGLE_UPCOMING.filter(
    (a) => !customerCancelledIds.includes(a.id)
  );
  const cancelledCustomerAppts = SINGLE_UPCOMING.filter(
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
  const pendingRecurring = instances.filter((i) => i.status === "pending_approval");
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
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert("Cancel Appointment?", `Cancel ${job.service} with ${job.customer} on ${job.date}?`, [
                        { text: "Keep", style: "cancel" },
                        { text: "Cancel Job", style: "destructive", onPress: () => cancelAccepted(job.id) },
                      ]);
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
                <View style={styles.lsMetaRow}>
                  <Ionicons name="call-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{appt.phone}</Text>
                </View>
                {appt.note && (
                  <View style={styles.notePill}>
                    <Ionicons name="information-circle-outline" size={13} color="#34FF7A" />
                    <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>{appt.note}</Text>
                  </View>
                )}
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
                        "Zamire Smith has been notified that the job is complete. They have 24 hours to approve or dispute. Payment will be released upon approval.",
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

                    {/* Customer countdown from landscaper's perspective */}
                    <View style={lsRecStyles.customerTimerRow}>
                      <Ionicons name="time-outline" size={13} color={isExpired ? "#FF4444" : "#FFAA00"} />
                      <Text style={[lsRecStyles.customerTimerText, { fontFamily: "Inter_400Regular", color: isExpired ? "#FF4444" : "#BBBBBB" }]}>
                        {isExpired
                          ? "Customer window expired · Order sent to dispute team"
                          : `Customer has ${String(rh).padStart(2, "0")}h ${String(rm).padStart(2, "0")}m to review`}
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

                    <Text style={[lsRecStyles.awaitingNote, { fontFamily: "Inter_400Regular" }]}>
                      You marked this job complete. Waiting for the customer to confirm and release payment.
                    </Text>
                  </View>
                );
              })}

              {/* Upcoming recurring — Mark as Done */}
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
                  <TouchableOpacity
                    style={lsRecStyles.markDoneBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setPhotoModalInstId(inst.id);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#000" />
                    <Text style={[lsRecStyles.markDoneBtnText, { fontFamily: "Inter_700Bold" }]}>Mark as Done</Text>
                  </TouchableOpacity>
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
        onCancel={(id) => setCustomerCancelledIds((prev) => [...prev, id])}
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
                  Recurring Series
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
  awaitingNote: { fontSize: 12, color: "#CCCCCC", lineHeight: 18 },
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
  submitBtnText: { fontSize: 15, color: "#000" },
});

const jdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111111", borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingBottom: 52, paddingTop: 12,
    borderTopWidth: 1, borderColor: "#222222", gap: 14,
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
  payBtn: {
    backgroundColor: "#34FF7A", borderRadius: 20, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#34FF7A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  payBtnText: { fontSize: 16, color: "#000" },
  cancelApptBtn: {
    borderWidth: 1, borderColor: "#FF4444", borderRadius: 20, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  cancelApptBtnText: { fontSize: 15, color: "#FF4444" },
});
