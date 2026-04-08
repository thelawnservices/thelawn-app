import React, { useState } from "react";
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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";

const CUSTOMER_UPCOMING = [
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
  {
    id: "2",
    service: "Hedge Trimming",
    date: "April 18, 2026",
    time: "9:00 AM",
    pro: "GreenScape Pros",
    price: "$65",
    initials: "GP",
    color: "#166D42",
    address: "22 Palmetto Dr, Bradenton, FL 34208",
    recurring: true,
    recurringFreq: "Bi-Weekly",
  },
];

type CustomerAppt = typeof CUSTOMER_UPCOMING[0];

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
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
      )
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

          {(appt as any).recurring && (
            <View style={jdStyles.recurringBadge}>
              <Ionicons name="repeat" size={13} color="#34FF7A" />
              <Text style={[jdStyles.recurringBadgeText, { fontFamily: "Inter_500Medium" }]}>
                Recurring · {(appt as any).recurringFreq}
              </Text>
            </View>
          )}

          <View style={jdStyles.dateCard}>
            <Ionicons name="calendar-outline" size={18} color="#34FF7A" />
            <Text style={[jdStyles.dateText, { fontFamily: "Inter_500Medium" }]}>
              {appt.date} at {appt.time}
            </Text>
          </View>

          <View style={jdStyles.proRow}>
            <View style={[jdStyles.proAvatar, { backgroundColor: appt.color }]}>
              <Text style={[jdStyles.proInitials, { fontFamily: "Inter_700Bold" }]}>
                {appt.initials}
              </Text>
            </View>
            <View>
              <Text style={[jdStyles.proLabel, { fontFamily: "Inter_400Regular" }]}>Service Pro</Text>
              <Text style={[jdStyles.proName, { fontFamily: "Inter_600SemiBold" }]}>{appt.pro}</Text>
            </View>
            <Text style={[jdStyles.priceTag, { fontFamily: "Inter_700Bold" }]}>{appt.price}</Text>
          </View>

          <Text style={[jdStyles.sectionLabel, { fontFamily: "Inter_500Medium" }]}>
            Service Address
          </Text>
          <TouchableOpacity
            style={jdStyles.addressCard}
            onPress={() => { Haptics.selectionAsync(); openMapsAddress(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={20} color="#34FF7A" />
            <Text style={[jdStyles.addressText, { fontFamily: "Inter_400Regular" }]}>
              {appt.address}
            </Text>
            <Ionicons name="navigate-outline" size={16} color="#34FF7A" />
          </TouchableOpacity>
          <Text style={[jdStyles.addressHint, { fontFamily: "Inter_400Regular" }]}>
            Tap address to open directions
          </Text>

          <TouchableOpacity
            style={jdStyles.payBtn}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onClose();
              router.navigate("/pay");
            }}
          >
            <Ionicons name="card-outline" size={18} color="#000" />
            <Text style={[jdStyles.payBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              Confirm &amp; Pay
            </Text>
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
                  {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: () => {
                      onCancel(appt.id);
                      onClose();
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="close-circle-outline" size={17} color="#FF4444" />
            <Text style={[jdStyles.cancelApptBtnText, { fontFamily: "Inter_500Medium" }]}>
              Cancel Appointment
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
    note: null,
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
    note: "Gate code: 4892",
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
    note: null,
  },
];

type LsAppt = typeof LANDSCAPER_SCHEDULED[0];

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role } = useAuth();
  const isLandscaper = role === "landscaper";

  const [cancelledIds, setCancelledIds] = useState<string[]>([]);
  const [cancelledLsAppts, setCancelledLsAppts] = useState<LsAppt[]>([]);
  const [customerCancelledIds, setCustomerCancelledIds] = useState<string[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<CustomerAppt | null>(null);
  const { acceptedJobs, cancelledJobs, cancelAccepted } = useJobs();

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

  function handleCancelCustomerAppt(id: string) {
    setCustomerCancelledIds((prev) => [...prev, id]);
  }

  const visibleScheduled = LANDSCAPER_SCHEDULED.filter(
    (a) => !cancelledIds.includes(a.id)
  );

  const upcomingCustomerAppts = CUSTOMER_UPCOMING.filter(
    (a) => !customerCancelledIds.includes(a.id)
  );

  const cancelledCustomerAppts = CUSTOMER_UPCOMING.filter(
    (a) => customerCancelledIds.includes(a.id)
  );

  const allLsCancelledAppts = [
    ...cancelledJobs.map((j) => ({
      id: j.id,
      service: j.service,
      size: j.size,
      customer: j.customer,
      date: j.date,
      time: j.time,
      budget: j.budget,
      note: null as string | null,
      fromAccepted: true,
    })),
    ...cancelledLsAppts.map((a) => ({ ...a, fromAccepted: false })),
  ];

  if (isLandscaper) {
    const totalActive = acceptedJobs.length + visibleScheduled.length;
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Appointments
          </Text>
          <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>
            Scheduled & Confirmed Jobs
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {acceptedJobs.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
                Recently Accepted
              </Text>
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
                    <Ionicons name="calendar-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>{job.date} at {job.time}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="resize-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.size} yard</Text>
                  </View>
                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#555" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.customer}</Text>
                    {job.distance && (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Ionicons name="location-outline" size={13} color="#555" />
                        <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>{job.distance}</Text>
                      </>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert(
                        "Cancel Appointment?",
                        `Cancel ${job.service} with ${job.customer} on ${job.date}?`,
                        [
                          { text: "Keep", style: "cancel" },
                          { text: "Cancel Job", style: "destructive", onPress: () => cancelAccepted(job.id) },
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

          {visibleScheduled.length > 0 && (
            <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }, acceptedJobs.length > 0 && { marginTop: 8 }]}>
              Scheduled
            </Text>
          )}

          {totalActive === 0 && allLsCancelledAppts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#333" />
              <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>
                No scheduled appointments
              </Text>
              <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>
                Accept requests to fill your schedule
              </Text>
            </View>
          ) : (
            visibleScheduled.map((appt) => (
              <View key={appt.id} style={styles.lsCard}>
                <View style={styles.lsTopRow}>
                  <View style={styles.lsServiceBadge}>
                    <Ionicons name="leaf" size={14} color="#34FF7A" />
                    <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold" }]}>
                      {appt.service}
                    </Text>
                  </View>
                  <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold" }]}>
                    {appt.budget}
                  </Text>
                </View>

                <View style={styles.lsMetaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium" }]}>
                    {appt.date} at {appt.time}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="resize-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.size} yard
                  </Text>
                </View>

                <View style={styles.lsMetaRow}>
                  <Ionicons name="person-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.customer}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.lsMetaRow}
                  activeOpacity={0.7}
                  onPress={() => openMaps(appt.address)}
                >
                  <Ionicons name="location-outline" size={13} color="#34FF7A" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }, styles.mapAddressLink]} numberOfLines={1}>
                    {appt.address}
                  </Text>
                  <Ionicons name="navigate-outline" size={12} color="#34FF7A" />
                </TouchableOpacity>

                <View style={styles.lsMetaRow}>
                  <Ionicons name="call-outline" size={13} color="#555" />
                  <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular" }]}>
                    {appt.phone}
                  </Text>
                </View>

                {appt.note && (
                  <View style={styles.notePill}>
                    <Ionicons name="information-circle-outline" size={13} color="#34FF7A" />
                    <Text style={[styles.noteText, { fontFamily: "Inter_400Regular" }]}>
                      {appt.note}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.8}
                  onPress={() => handleCancelLsAppt(appt)}
                >
                  <Text style={[styles.cancelBtnText, { fontFamily: "Inter_500Medium" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ── Previous / Cancelled Jobs ── */}
          {allLsCancelledAppts.length > 0 && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 4 }]}>
                Previous Jobs · Cancelled
              </Text>
              {allLsCancelledAppts.map((appt, idx) => (
                <View key={appt.id + idx} style={[styles.lsCard, styles.cancelledCard]}>
                  <View style={styles.cancelledBadgeRow}>
                    <View style={styles.cancelledBadge}>
                      <Ionicons name="close-circle" size={13} color="#FF4444" />
                      <Text style={[styles.cancelledBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                        Cancelled
                      </Text>
                    </View>
                    <Text style={[styles.lsBudget, { fontFamily: "Inter_700Bold", color: "#555", fontSize: 16 }]}>
                      {appt.budget}
                    </Text>
                  </View>

                  <View style={styles.lsTopRow}>
                    <View style={[styles.lsServiceBadge, { backgroundColor: "#1A1A1A" }]}>
                      <Ionicons name="leaf" size={14} color="#555" />
                      <Text style={[styles.lsServiceText, { fontFamily: "Inter_600SemiBold", color: "#555" }]}>
                        {appt.service}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lsMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#444" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_500Medium", color: "#555" }]}>
                      {appt.date} at {appt.time}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Ionicons name="resize-outline" size={13} color="#444" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular", color: "#555" }]}>
                      {appt.size} yard
                    </Text>
                  </View>

                  <View style={styles.lsMetaRow}>
                    <Ionicons name="person-outline" size={13} color="#444" />
                    <Text style={[styles.lsMetaText, { fontFamily: "Inter_400Regular", color: "#555" }]}>
                      {appt.customer}
                    </Text>
                  </View>

                  {appt.note && (
                    <View style={[styles.notePill, { backgroundColor: "#1A1A1A" }]}>
                      <Ionicons name="information-circle-outline" size={13} color="#555" />
                      <Text style={[styles.noteText, { fontFamily: "Inter_400Regular", color: "#555" }]}>
                        {appt.note}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Customer view ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Appointments</Text>
        <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>
          Upcoming & Recurring
        </Text>
      </View>

      <JobDetailsModal
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onCancel={handleCancelCustomerAppt}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Upcoming ── */}
        {upcomingCustomerAppts.length === 0 && cancelledCustomerAppts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={40} color="#333" />
            <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>
              No upcoming appointments
            </Text>
            <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>
              Book a landscaper to get started
            </Text>
          </View>
        ) : (
          <>
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
                        <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold" }]}>
                          {appt.service}
                        </Text>
                        <Text style={[styles.priceText, { fontFamily: "Inter_700Bold" }]}>
                          {appt.price}
                        </Text>
                      </View>
                      {(appt as any).recurring && (
                        <View style={styles.recurringPill}>
                          <Ionicons name="repeat" size={11} color="#34FF7A" />
                          <Text style={[styles.recurringPillText, { fontFamily: "Inter_500Medium" }]}>
                            {(appt as any).recurringFreq}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>
                        {appt.date} · {appt.time}
                      </Text>
                      <Text style={[styles.proText, { fontFamily: "Inter_400Regular" }]}>
                        with {appt.pro}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", gap: 6 }}>
                      <Ionicons name="chevron-forward" size={16} color="#34FF7A" />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* ── Cancelled ── */}
            {cancelledCustomerAppts.length > 0 && (
              <>
                <View style={[styles.sectionDivider, { marginTop: 12 }]} />
                <Text style={[styles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>
                  Cancelled
                </Text>
                {cancelledCustomerAppts.map((appt) => (
                  <View key={appt.id} style={[styles.card, styles.cancelledCustomerCard]}>
                    <View style={[styles.avatar, { backgroundColor: appt.color + "40" }]}>
                      <Text style={[styles.avatarText, { color: "#555" }]}>{appt.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={[styles.serviceText, { fontFamily: "Inter_600SemiBold", color: "#555" }]}>
                          {appt.service}
                        </Text>
                        <View style={styles.cancelledBadge}>
                          <Ionicons name="close-circle" size={12} color="#FF4444" />
                          <Text style={[styles.cancelledBadgeText, { fontFamily: "Inter_600SemiBold" }]}>
                            Cancelled
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.subText, { fontFamily: "Inter_400Regular" }]}>
                        {appt.date} · {appt.time}
                      </Text>
                      <Text style={[styles.proText, { fontFamily: "Inter_400Regular" }]}>
                        with {appt.pro}
                      </Text>
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
  headerSub: { fontSize: 13, color: "#AAAAAA", marginTop: 4 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#1E1E1E",
    marginVertical: 8,
  },
  emptyState: { paddingVertical: 80, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: "#555" },
  emptySub: { fontSize: 13, color: "#444" },
  newJobCard: {
    borderColor: "#34FF7A33",
    borderWidth: 1.5,
    position: "relative",
  },
  newJobBadge: {
    position: "absolute",
    top: -1,
    right: 14,
    backgroundColor: "#34FF7A",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  newJobBadgeText: { fontSize: 10, color: "#000", letterSpacing: 0.8 },
  lsCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 9,
  },
  cancelledCard: {
    opacity: 0.75,
    borderColor: "#2A1A1A",
    backgroundColor: "#111111",
  },
  cancelledBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2A1010",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cancelledBadgeText: { fontSize: 11, color: "#FF4444" },
  lsTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lsServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lsServiceText: { fontSize: 14, color: "#34FF7A" },
  lsBudget: { fontSize: 20, color: "#FFFFFF" },
  lsMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lsMetaText: { fontSize: 13, color: "#AAAAAA", flex: 1 },
  mapAddressLink: { color: "#34FF7A", textDecorationLine: "underline", flex: 1 },
  metaDot: { color: "#333", fontSize: 12 },
  notePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  noteText: { fontSize: 12, color: "#34FF7A" },
  cancelBtn: {
    borderWidth: 1,
    borderColor: "#FF4444",
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 14, color: "#FF4444" },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#222222",
  },
  cancelledCustomerCard: {
    opacity: 0.65,
    borderColor: "#2A1A1A",
    backgroundColor: "#111111",
  },
  recurringPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  recurringPillText: { fontSize: 11, color: "#34FF7A" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  serviceText: { fontSize: 15, color: "#FFFFFF" },
  priceText: { fontSize: 15, color: "#FFFFFF" },
  subText: { fontSize: 12, color: "#555", marginBottom: 3 },
  proText: { fontSize: 12, color: "#555" },
});

const jdStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 52,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#222222",
    gap: 14,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, color: "#FFFFFF" },
  recurringBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recurringBadgeText: { fontSize: 13, color: "#34FF7A" },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  dateText: { fontSize: 15, color: "#FFFFFF" },
  proRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  proInitials: { fontSize: 16, color: "#000" },
  proLabel: { fontSize: 11, color: "#888", marginBottom: 2 },
  proName: { fontSize: 16, color: "#FFFFFF" },
  priceTag: { fontSize: 20, color: "#34FF7A", marginLeft: "auto" },
  sectionLabel: { fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  addressText: { flex: 1, fontSize: 14, color: "#FFFFFF" },
  addressHint: { fontSize: 11, color: "#555", textAlign: "center" },
  payBtn: {
    backgroundColor: "#34FF7A",
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  payBtnText: { fontSize: 16, color: "#000" },
  cancelApptBtn: {
    borderWidth: 1,
    borderColor: "#FF4444",
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelApptBtnText: { fontSize: 15, color: "#FF4444" },
});
