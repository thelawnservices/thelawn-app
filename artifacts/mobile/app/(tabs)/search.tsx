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
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";
import { useJobs } from "@/contexts/jobs";
import { useLandscaperProfile } from "@/contexts/landscaperProfile";

const FILTERS = ["All", "Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Artificial Turf"];

const PROS = [
  {
    id: "1",
    name: "John Rivera",
    specialty: "Lawn Specialist",
    rating: 4.9,
    reviews: 128,
    price: 45,
    distance: "0.8 mi",
    tags: ["Mowing/Edging"],
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
    tags: ["Mowing/Edging", "Weeding/Mulching", "Sod Installation"],
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
    tags: ["Weeding/Mulching", "Mowing/Edging"],
    initials: "MS",
    color: "#4CAF50",
    trusted: false,
  },
  {
    id: "4",
    name: "EcoGreen Services",
    specialty: "Sod & Turf Specialists",
    rating: 4.6,
    reviews: 43,
    price: 350,
    distance: "2.8 mi",
    tags: ["Sod Installation", "Artificial Turf"],
    initials: "EG",
    color: "#2E7D32",
    trusted: false,
  },
];

const SORT_OPTIONS = ["Recommended", "Closest", "Highest Rated", "Price: Low to High", "Price: High to Low"];
const PRICE_RANGES = [
  { label: "Any Price", min: 0,   max: Infinity },
  { label: "Under $50", min: 0,   max: 50 },
  { label: "$50 – $100", min: 50, max: 100 },
  { label: "$100+",      min: 100, max: Infinity },
];

const SERVICE_REQUESTS = [
  { id: "r1", service: "Mowing/Edging",    size: "Medium", customer: "Alex T.",   distance: "1.4 mi", zip: "34222", date: "Apr 14", time: "Flexible",          budget: "$70",   description: "Front and back yard, medium lot. Edge along the driveway and sidewalk.",              address: "8910 45th Ave E, Ellenton, FL" },
  { id: "r2", service: "Weeding/Mulching", size: "Small",  customer: "Priya N.",  distance: "3.1 mi", zip: "34208", date: "Apr 16", time: "Morning preferred",  budget: "$90",   description: "Flower beds need weeding and about 2 yards of fresh mulch around shrubs.",            address: "22 Palmetto Dr, Bradenton, FL" },
  { id: "r3", service: "Sod Installation", size: "Large",  customer: "Carlos R.", distance: "3.8 mi", zip: "34208", date: "Apr 16", time: "8:30 AM",            budget: "$850",  description: "Large back yard needs full sod replacement — approx 1,000 sq ft.",                   address: "4400 53rd Ave E, Bradenton, FL" },
  { id: "r4", service: "Artificial Turf",  size: "Small",  customer: "Sarah B.",  distance: "0.9 mi", zip: "34219", date: "Apr 17", time: "10:00 AM",           budget: "$1200", description: "Small side yard conversion to artificial turf. Pet-friendly material preferred.",      address: "712 Riviera Dunes Way, Palmetto, FL" },
  { id: "r5", service: "Mowing/Edging",    size: "Large",  customer: "James W.",  distance: "4.5 mi", zip: "34211", date: "Apr 18", time: "7:30 AM",            budget: "$100",  description: "Large corner lot, front and back. Edge along sidewalk and entire driveway perimeter.", address: "6021 Greenfield Way, Lakewood Ranch, FL" },
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
  const [selectedPro, setSelectedPro] = useState<(typeof PROS)[0] | null>(null);
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
    if (sortIdx === 3) return a.price - b.price;
    if (sortIdx === 4) return b.price - a.price;
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
                  {/* Tappable avatar + info → opens profile */}
                  <TouchableOpacity
                    style={{ flexDirection: "row", flex: 1, gap: 12, alignItems: "flex-start" }}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPro(pro); }}
                    activeOpacity={0.75}
                  >
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
                  </TouchableOpacity>
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

      <SearchProProfileModal
        pro={selectedPro}
        onClose={() => setSelectedPro(null)}
        onBook={(pro) => {
          setSelectedPro(null);
          router.push({
            pathname: "/pay",
            params: { proName: pro.name, proInitials: pro.initials, proColor: pro.color, price: pro.price.toString() },
          });
        }}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────
   Full-screen landscaper profile modal (Search screen)
───────────────────────────────────────────────────────── */
type SearchPro = (typeof PROS)[0];

function SearchProProfileModal({
  pro,
  onClose,
  onBook,
}: {
  pro: SearchPro | null;
  onClose: () => void;
  onBook: (pro: SearchPro) => void;
}) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 20 : insets.top;
  const { availability } = useLandscaperProfile();

  if (!pro) return null;

  const pricingTiers = [
    { size: "Small Yard",  desc: "Up to 2,000 sq ft",   price: `$${pro.price}` },
    { size: "Medium Yard", desc: "2,000 – 5,000 sq ft",  price: `$${Math.round(pro.price * 1.5)}` },
    { size: "Large Yard",  desc: "5,000+ sq ft",          price: `$${Math.round(pro.price * 2.2)}+` },
  ];

  const recentWorkIcons: ("leaf-outline" | "cut-outline" | "flower-outline" | "leaf" | "construct-outline" | "tree-outline")[] =
    ["leaf-outline", "cut-outline", "flower-outline", "leaf", "construct-outline", "tree-outline"];

  return (
    <Modal visible={!!pro} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={proStyles.container}>
        {/* Back button */}
        <TouchableOpacity
          style={[proStyles.backBtn, { top: topPad + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero */}
          <View style={[proStyles.hero, { paddingTop: topPad + 56 }]}>
            <View style={proStyles.avatarWrap}>
              <View style={[proStyles.avatarInner, { backgroundColor: pro.color }]}>
                <Text style={proStyles.avatarInitials}>{pro.initials}</Text>
              </View>
            </View>
            <Text style={[proStyles.heroName, { fontFamily: "Inter_700Bold" }]}>{pro.name}</Text>
            <View style={proStyles.heroBadgeRow}>
              <View style={proStyles.ratingPill}>
                <Text style={[proStyles.ratingText, { fontFamily: "Inter_600SemiBold" }]}>★ {pro.rating}</Text>
              </View>
              {pro.trusted && (
                <View style={proStyles.proBadge}>
                  <Text style={[proStyles.proBadgeText, { fontFamily: "Inter_700Bold" }]}>PRO</Text>
                </View>
              )}
              <Text style={[proStyles.jobsText, { fontFamily: "Inter_400Regular" }]}>{pro.reviews} reviews</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={14} color="#CCCCCC" />
              <Text style={[proStyles.location, { fontFamily: "Inter_400Regular" }]}>
                Sarasota / Ellenton, FL · {pro.distance}
              </Text>
            </View>
          </View>

          {/* Body */}
          <View style={proStyles.body}>

            {/* Call / Text */}
            <View style={proStyles.contactRow}>
              <TouchableOpacity
                style={proStyles.contactBtn}
                activeOpacity={0.8}
                onPress={() => Linking.openURL("tel:+19415550000").catch(() => Alert.alert("Calling", pro.name))}
              >
                <Ionicons name="call-outline" size={22} color="#34FF7A" />
                <Text style={[proStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={proStyles.contactBtn}
                activeOpacity={0.8}
                onPress={() => Linking.openURL("sms:+19415550000").catch(() => Alert.alert("Message", "Texting " + pro.name))}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#34FF7A" />
                <Text style={[proStyles.contactLabel, { fontFamily: "Inter_600SemiBold" }]}>Text</Text>
              </TouchableOpacity>
            </View>

            {/* Book Now */}
            <TouchableOpacity
              style={proStyles.bookBtn}
              activeOpacity={0.85}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onBook(pro); }}
            >
              <Ionicons name="calendar-outline" size={20} color="#000" />
              <Text style={[proStyles.bookBtnText, { fontFamily: "Inter_600SemiBold" }]}>Book Now</Text>
            </TouchableOpacity>

            {/* About */}
            <Text style={[proStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 28 }]}>ABOUT</Text>
            <Text style={[proStyles.aboutText, { fontFamily: "Inter_400Regular" }]}>
              {pro.specialty} — professional landscaping services with outstanding reviews. Specializing in {pro.tags.join(", ").toLowerCase()} for residential properties in the Sarasota / Ellenton area.
            </Text>

            {/* Services & Pricing */}
            <Text style={[proStyles.sectionLabel, { fontFamily: "Inter_600SemiBold" }]}>SERVICES & PRICING (BY YARD SIZE)</Text>
            <View style={proStyles.pricingCard}>
              {pricingTiers.map((tier, i, arr) => (
                <View key={tier.size} style={[proStyles.pricingRow, i < arr.length - 1 && proStyles.pricingRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[proStyles.pricingSize, { fontFamily: "Inter_600SemiBold" }]}>{tier.size}</Text>
                    <Text style={[proStyles.pricingDesc, { fontFamily: "Inter_400Regular" }]}>{tier.desc}</Text>
                  </View>
                  <Text style={[proStyles.pricingPrice, { fontFamily: "Inter_700Bold" }]}>{tier.price}</Text>
                </View>
              ))}
            </View>

            {/* Services Offered */}
            <Text style={[proStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>SERVICES OFFERED</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {pro.tags.map((tag) => (
                <View key={tag} style={proStyles.serviceTag}>
                  <Ionicons name="leaf" size={12} color="#34FF7A" />
                  <Text style={[proStyles.serviceTagText, { fontFamily: "Inter_500Medium" }]}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Recent Work */}
            <Text style={[proStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>RECENT WORK</Text>
            <View style={proStyles.photoGrid}>
              {recentWorkIcons.map((icon, i) => (
                <View key={i} style={proStyles.photoTile}>
                  <Ionicons name={icon} size={32} color="#34FF7A" />
                </View>
              ))}
            </View>

            {/* Availability indicator */}
            {availability.saved && (
              <>
                <Text style={[proStyles.sectionLabel, { fontFamily: "Inter_600SemiBold", marginTop: 24 }]}>AVAILABILITY</Text>
                <View style={proStyles.availCard}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
                      <View key={day} style={[proStyles.dayChip, availability.days[day] && proStyles.dayChipOn]}>
                        <Text style={[proStyles.dayChipText, { fontFamily: "Inter_600SemiBold" }, availability.days[day] && proStyles.dayChipTextOn]}>
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                    <Ionicons name="time-outline" size={14} color="#CCCCCC" />
                    <Text style={[{ fontSize: 13, color: "#CCCCCC" }, { fontFamily: "Inter_400Regular" }]}>
                      {availability.startTime} – {availability.endTime}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const proStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: "#111",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#34FF7A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#34FF7A",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 34, color: "#fff", fontWeight: "700" },
  heroName: { fontSize: 24, color: "#FFFFFF", textAlign: "center", marginBottom: 8 },
  heroBadgeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  ratingPill: { backgroundColor: "#1a1200", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  ratingText: { fontSize: 14, color: "#f59e0b" },
  proBadge: { backgroundColor: "#34FF7A", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  proBadgeText: { fontSize: 11, color: "#000", letterSpacing: 1 },
  jobsText: { fontSize: 14, color: "rgba(255,255,255,0.6)" },
  location: { fontSize: 13, color: "#CCCCCC" },
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 0 },
  sectionLabel: { fontSize: 11, color: "#CCCCCC", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
  aboutText: { fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 22, marginBottom: 24 },
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#34FF7A",
    backgroundColor: "transparent",
  },
  contactLabel: { fontSize: 15, color: "#34FF7A" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#34FF7A",
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 4,
  },
  bookBtnText: { fontSize: 17, color: "#000" },
  pricingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 4,
    overflow: "hidden",
  },
  pricingRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  pricingRowBorder: { borderBottomWidth: 1, borderBottomColor: "#222" },
  pricingSize: { fontSize: 15, color: "#FFFFFF", marginBottom: 2 },
  pricingDesc: { fontSize: 12, color: "#888" },
  pricingPrice: { fontSize: 22, color: "#34FF7A" },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#0d2e18",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#34FF7A33",
  },
  serviceTagText: { fontSize: 13, color: "#34FF7A" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  photoTile: {
    width: "30.5%",
    aspectRatio: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  availCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    marginBottom: 4,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
  },
  dayChipOn: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  dayChipText: { fontSize: 11, color: "#999" },
  dayChipTextOn: { color: "#000" },
});

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
