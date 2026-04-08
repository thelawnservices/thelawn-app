import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";

const FILTERS = ["All", "Lawn Mowing", "Hedge Trimming", "Mulching", "Cleanup"];

const PROS = [
  {
    id: "1",
    name: "John Rivera",
    specialty: "Lawn Specialist",
    rating: 4.9,
    reviews: 128,
    price: 45,
    distance: "0.8 mi",
    tags: ["Lawn Mowing"],
    initials: "JR",
    color: "#FFFFFF",
    trusted: true,
  },
  {
    id: "2",
    name: "GreenScape Pros",
    specialty: "Full Service Landscaping",
    rating: 4.7,
    reviews: 84,
    price: 65,
    distance: "1.2 mi",
    tags: ["Lawn Mowing", "Hedge Trimming", "Mulching"],
    initials: "GP",
    color: "#166D42",
    trusted: true,
  },
  {
    id: "3",
    name: "Maria Santos",
    specialty: "Garden Expert",
    rating: 4.8,
    reviews: 61,
    price: 40,
    distance: "2.1 mi",
    tags: ["Hedge Trimming", "Cleanup"],
    initials: "MS",
    color: "#4CAF50",
    trusted: false,
  },
  {
    id: "4",
    name: "EcoGreen Services",
    specialty: "Mulching & Yard Care",
    rating: 4.6,
    reviews: 43,
    price: 50,
    distance: "2.8 mi",
    tags: ["Mulching", "Cleanup"],
    initials: "EG",
    color: "#2E7D32",
    trusted: false,
  },
];

const SORT_OPTIONS = ["Recommended", "Closest", "Highest Rated"];

const SERVICE_REQUESTS = [
  { id: "r1", service: "Lawn Mowing", size: "Medium", customer: "Alex T.", distance: "1.4 mi", zip: "34222", date: "Apr 14", time: "Flexible", budget: "$65", description: "Medium yard, front and back. Nothing special, straightforward job.", address: "8910 45th Ave E, Ellenton, FL" },
  { id: "r2", service: "Hedge Trimming", size: "Small", customer: "Priya N.", distance: "3.1 mi", zip: "34208", date: "Apr 16", time: "Morning preferred", budget: "$55", description: "Small hedges along fence line. Should take about 1 hour.", address: "22 Palmetto Dr, Bradenton, FL" },
  { id: "r3", service: "Mulching", size: "Large", customer: "Carlos R.", distance: "3.8 mi", zip: "34208", date: "Apr 16", time: "8:30 AM", budget: "$180", description: "Large backyard needs fresh mulch around all flower beds and trees.", address: "4400 53rd Ave E, Bradenton, FL" },
  { id: "r4", service: "Clean Up", size: "Small", customer: "Sarah B.", distance: "0.9 mi", zip: "34219", date: "Apr 17", time: "10:00 AM", budget: "$30", description: "Light cleanup — leaves and debris in driveway and side yard.", address: "712 Riviera Dunes Way, Palmetto, FL" },
  { id: "r5", service: "Lawn Mowing", size: "Large", customer: "James W.", distance: "4.5 mi", zip: "34211", date: "Apr 18", time: "7:30 AM", budget: "$120", description: "Large corner lot. Needs edging along sidewalk and driveway too.", address: "6021 Greenfield Way, Lakewood Ranch, FL" },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortIdx, setSortIdx] = useState(0);
  const [showSort, setShowSort] = useState(false);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const { acceptJob } = useJobs();

  const filtered = PROS.filter((p) => {
    const matchesQuery =
      query.trim() === "" ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.specialty.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      activeFilter === "All" || p.tags.includes(activeFilter);
    return matchesQuery && matchesFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortIdx === 1) return parseFloat(a.distance) - parseFloat(b.distance);
    if (sortIdx === 2) return b.rating - a.rating;
    return 0;
  });

  const handleBook = (pro: (typeof PROS)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/pay",
      params: { proName: pro.name, proInitials: pro.initials, proColor: pro.color, price: pro.price.toString() },
    });
  };

  if (role === "landscaper") {
    const visibleRequests = SERVICE_REQUESTS.filter((r) => !acceptedIds.includes(r.id));

    const openMaps = (address: string) => {
      const encoded = encodeURIComponent(address);
      const url = Platform.OS === "ios"
        ? `maps://?q=${encoded}`
        : `geo:0,0?q=${encoded}`;
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`)
      );
    };

    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
          <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
            Incoming Requests
          </Text>
          <Text style={[styles.reqSubtitle, { fontFamily: "Inter_400Regular" }]}>
            Within 25 mi · ZIP 34222
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {visibleRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={40} color="#333" />
              <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>No pending requests</Text>
              <Text style={[styles.emptySubText, { fontFamily: "Inter_400Regular" }]}>Check back soon for new jobs</Text>
            </View>
          ) : (
            visibleRequests.map((req) => (
              <View key={req.id} style={styles.reqCard}>
                <View style={styles.reqTopRow}>
                  <View style={styles.reqServiceBadge}>
                    <Ionicons name="leaf" size={14} color="#34FF7A" />
                    <Text style={[styles.reqServiceText, { fontFamily: "Inter_600SemiBold" }]}>{req.service}</Text>
                  </View>
                  <Text style={[styles.reqBudget, { fontFamily: "Inter_700Bold" }]}>{req.budget}</Text>
                </View>

                {req.description ? (
                  <Text style={[styles.reqDescription, { fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {req.description}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.reqAddressRow}
                  activeOpacity={0.7}
                  onPress={() => openMaps(req.address ?? "")}
                >
                  <Ionicons name="location" size={13} color="#34FF7A" />
                  <Text style={[styles.reqAddressText, { fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {req.address}
                  </Text>
                  <Ionicons name="open-outline" size={12} color="#34FF7A" />
                </TouchableOpacity>

                <View style={styles.reqMeta}>
                  <Ionicons name="resize-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.reqMetaText, { fontFamily: "Inter_400Regular" }]}>{req.size} yard</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="navigate-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.reqMetaText, { fontFamily: "Inter_400Regular" }]}>{req.distance} · ZIP {req.zip}</Text>
                </View>
                <View style={styles.reqMeta}>
                  <Ionicons name="calendar-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.reqMetaText, { fontFamily: "Inter_400Regular" }]}>{req.date} · {req.time}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Ionicons name="person-outline" size={13} color="#CCCCCC" />
                  <Text style={[styles.reqMetaText, { fontFamily: "Inter_400Regular" }]}>{req.customer}</Text>
                </View>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Alert.alert(
                      "Agree to Customer's Price?",
                      `By accepting, you agree to complete this ${req.service} job for ${req.budget} — the price set by the customer. No counter-offers.\n\nDo you want to accept?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Accept at " + req.budget,
                          onPress: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setAcceptedIds((prev) => [...prev, req.id]);
                            acceptJob({
                              id: req.id,
                              service: req.service,
                              size: req.size,
                              customer: req.customer,
                              date: req.date,
                              time: req.time,
                              budget: req.budget,
                              distance: req.distance,
                              zip: req.zip,
                            });
                            Alert.alert(
                              "Job Accepted ✓",
                              `You agreed to ${req.customer}'s ${req.service} job for ${req.budget}. It's been added to your Appointments.`
                            );
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.acceptBtnText, { fontFamily: "Inter_600SemiBold" }]}>Accept at {req.budget}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Find Landscapers
        </Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#CCCCCC" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search by name, service, or location..."
            placeholderTextColor="#777"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Find Pros */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => { setActiveFilter(f); Haptics.selectionAsync(); }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { fontFamily: "Inter_500Medium" },
                  activeFilter === f && styles.filterChipTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Row */}
        <View style={styles.sortRow}>
          <Text style={[styles.resultCount, { fontFamily: "Inter_400Regular" }]}>
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
            <Ionicons name="options-outline" size={16} color="#34FF7A" />
            <Text style={[styles.sortBtnText, { fontFamily: "Inter_500Medium" }]}>
              Sort: {SORT_OPTIONS[sortIdx]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown */}
        {showSort && (
          <View style={styles.sortDropdown}>
            {SORT_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortOption, i === sortIdx && styles.sortOptionActive]}
                onPress={() => { setSortIdx(i); setShowSort(false); Haptics.selectionAsync(); }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { fontFamily: "Inter_400Regular" },
                    i === sortIdx && { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {opt}
                </Text>
                {i === sortIdx && <Ionicons name="checkmark" size={16} color="#34FF7A" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results */}
        <View style={styles.results}>
          {sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color="#333" />
              <Text style={[styles.emptyText, { fontFamily: "Inter_500Medium" }]}>
                No landscapers found
              </Text>
              <Text style={[styles.emptySubText, { fontFamily: "Inter_400Regular" }]}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            sorted.map((pro) => (
              <View key={pro.id} style={styles.proCard}>
                <View style={styles.proCardTop}>
                  <View style={[styles.proAvatar, { backgroundColor: pro.color }]}>
                    <Text style={styles.proInitials}>{pro.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.proNameRow}>
                      <Text style={[styles.proName, { fontFamily: "Inter_600SemiBold" }]}>
                        {pro.name}
                      </Text>
                      {pro.trusted && (
                        <View style={styles.trustedBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#34FF7A" />
                          <Text style={[styles.trustedText, { fontFamily: "Inter_500Medium" }]}>
                            Trusted
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.proSpec, { fontFamily: "Inter_400Regular" }]}>
                      {pro.specialty}
                    </Text>
                    <View style={styles.proMeta}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={[styles.proRating, { fontFamily: "Inter_500Medium" }]}>
                        {pro.rating}
                      </Text>
                      <Text style={[styles.proReviews, { fontFamily: "Inter_400Regular" }]}>
                        ({pro.reviews})
                      </Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="location-outline" size={12} color="#CCCCCC" />
                      <Text style={[styles.proDist, { fontFamily: "Inter_400Regular" }]}>
                        {pro.distance}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.proPrice, { fontFamily: "Inter_700Bold" }]}>
                    ${pro.price}
                    <Text style={[styles.pricePer, { fontFamily: "Inter_400Regular" }]}>/hr</Text>
                  </Text>
                </View>

                <View style={styles.tagsRow}>
                  {pro.tags.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={[styles.tagText, { fontFamily: "Inter_400Regular" }]}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => handleBook(pro)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.bookBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                    Book Now
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  header: {
    backgroundColor: "#161616",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF", marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#FFFFFF" },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#161616",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  filterChipText: { fontSize: 13, color: "#FFFFFF" },
  filterChipTextActive: { color: "#000" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  resultCount: { fontSize: 13, color: "#BBBBBB" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#161616",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  sortBtnText: { fontSize: 13, color: "#FFFFFF" },
  sortDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
    marginBottom: 8,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  sortOptionActive: { backgroundColor: "#0d2e18" },
  sortOptionText: { fontSize: 14, color: "#FFFFFF" },
  results: { padding: 16, gap: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: "#BBBBBB" },
  emptySubText: { fontSize: 13, color: "#777" },
  proCard: {
    backgroundColor: "#161616",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  proCardTop: { flexDirection: "row", gap: 12, marginBottom: 12 },
  proAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  proInitials: { color: "#fff", fontSize: 18, fontWeight: "700" },
  proNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  proName: { fontSize: 15, color: "#FFFFFF" },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trustedText: { fontSize: 11, color: "#34FF7A" },
  proSpec: { fontSize: 13, color: "#BBBBBB", marginBottom: 5 },
  proMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  proRating: { fontSize: 12, color: "#FFFFFF" },
  proReviews: { fontSize: 12, color: "#BBBBBB" },
  metaDot: { color: "#555", fontSize: 12 },
  proDist: { fontSize: 12, color: "#BBBBBB" },
  proPrice: { fontSize: 20, color: "#FFFFFF" },
  pricePer: { fontSize: 12, color: "#BBBBBB" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: "#0d2e18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, color: "#FFFFFF" },
  bookBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 13,
    borderRadius: 22,
    alignItems: "center",
  },
  bookBtnText: { color: "#000", fontSize: 15 },
  innerTabRow: {
    flexDirection: "row",
    backgroundColor: "#111111",
    borderRadius: 22,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  innerTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 18,
    gap: 5,
  },
  innerTabActive: { backgroundColor: "#1A1A1A" },
  innerTabText: { fontSize: 13, color: "#BBBBBB" },
  innerTabTextActive: { color: "#FFFFFF" },
  notifDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34FF7A",
  },
  myReqCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 10,
    marginBottom: 12,
  },
  myReqCardFaded: { opacity: 0.55 },
  statusPill: {
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillOffered: { backgroundColor: "#34FF7A" },
  statusPillDeclined: { backgroundColor: "#2d0a0a" },
  statusPillAccepted: { backgroundColor: "#0d2e18" },
  statusPillText: { fontSize: 11, color: "#BBBBBB" },
  offerBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0d2e18",
    borderRadius: 18,
    padding: 14,
    marginTop: 2,
  },
  offerBoxLeft: { gap: 2 },
  offerLabel: { fontSize: 12, color: "#CCCCCC" },
  offerPrice: { fontSize: 22, color: "#FFFFFF" },
  offerActions: { flexDirection: "row", gap: 8 },
  acceptOfferBtn: {
    backgroundColor: "#34FF7A",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  acceptOfferText: { fontSize: 13, color: "#000" },
  declineOfferBtn: {
    backgroundColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  declineOfferText: { fontSize: 13, color: "#BBBBBB" },
  offerProRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#1a1200", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  ratingText: { fontSize: 11, color: "#f59e0b" },
  viewProfileLink: { fontSize: 12, color: "#34FF7A", marginTop: 4 },
  newReqCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#34FF7A33",
    marginBottom: 4,
  },
  newReqIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#0d2e18",
    alignItems: "center",
    justifyContent: "center",
  },
  newReqTitle: { fontSize: 15, color: "#FFFFFF", marginBottom: 3 },
  newReqSub: { fontSize: 12, color: "#CCCCCC" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, color: "#FFFFFF", marginBottom: 4 },
  modalSubLabel: { fontSize: 12, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
  modalChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#111",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  modalChipText: { fontSize: 13, color: "#FFFFFF" },
  modalSubmitBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 15,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitText: { fontSize: 16, color: "#000" },
  modalCancelBtn: { paddingVertical: 12, alignItems: "center" },
  modalCancelText: { fontSize: 14, color: "#BBBBBB" },
  modalScrollOuter: { flexGrow: 1, justifyContent: "flex-end" },
  modalTextArea: {
    backgroundColor: "#111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#333",
    padding: 14,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 100,
  },
  budgetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 10,
  },
  budgetDollar: {
    fontSize: 30,
    color: "#34FF7A",
  },
  budgetInput: {
    flex: 1,
    fontSize: 30,
    color: "#FFFFFF",
  },
  uploadZone: {
    borderWidth: 2,
    borderColor: "#34FF7A44",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e1822",
  },
  uploadZoneText: { fontSize: 14, color: "#FFFFFF" },
  uploadZoneSubText: { fontSize: 12, color: "#CCCCCC" },
  photoPreviewRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
  photoThumb: { width: 72, height: 72, borderRadius: 14, overflow: "hidden", position: "relative" },
  photoThumbImg: { width: "100%", height: "100%" },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  reqSubtitle: { fontSize: 13, color: "#CCCCCC", marginTop: 4 },
  reqCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222222",
    gap: 10,
    marginBottom: 12,
  },
  reqTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reqServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reqServiceText: { fontSize: 14, color: "#34FF7A" },
  reqBudget: { fontSize: 20, color: "#FFFFFF" },
  reqDescription: {
    fontSize: 13,
    color: "#CCCCCC",
    lineHeight: 19,
    marginBottom: 8,
  },
  reqAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0d2e18",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  reqAddressText: {
    flex: 1,
    fontSize: 12,
    color: "#34FF7A",
  },
  reqMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  reqMetaText: { fontSize: 13, color: "#CCCCCC" },
  acceptBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 13,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 4,
  },
  acceptBtnText: { color: "#000", fontSize: 15 },
});
