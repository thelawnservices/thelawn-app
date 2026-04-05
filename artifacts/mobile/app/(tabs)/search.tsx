import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

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
    color: "#34C759",
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

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortIdx, setSortIdx] = useState(0);
  const [showSort, setShowSort] = useState(false);

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Find Landscapers
        </Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#555" />
          <TextInput
            style={[styles.searchInput, { fontFamily: "Inter_400Regular" }]}
            placeholder="Search by name, service, or location..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#555" />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
            <Ionicons name="options-outline" size={16} color="#34C759" />
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
                    i === sortIdx && { color: "#34C759", fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {opt}
                </Text>
                {i === sortIdx && <Ionicons name="checkmark" size={16} color="#34C759" />}
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
                          <Ionicons name="checkmark-circle" size={12} color="#34C759" />
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
                      <Ionicons name="location-outline" size={12} color="#555" />
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitle: { fontSize: 22, color: "#34C759", marginBottom: 12 },
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
  searchInput: { flex: 1, fontSize: 14, color: "#34C759" },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#111111",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: { backgroundColor: "#34C759", borderColor: "#34C759" },
  filterChipText: { fontSize: 13, color: "#34C759" },
  filterChipTextActive: { color: "#000" },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  resultCount: { fontSize: 13, color: "#555" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111111",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  sortBtnText: { fontSize: 13, color: "#34C759" },
  sortDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: "#111111",
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
  sortOptionActive: { backgroundColor: "#1a3a1a" },
  sortOptionText: { fontSize: 14, color: "#34C759" },
  results: { padding: 16, gap: 12 },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, color: "#555" },
  emptySubText: { fontSize: 13, color: "#444" },
  proCard: {
    backgroundColor: "#111111",
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
  proName: { fontSize: 15, color: "#34C759" },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#1a3a1a",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trustedText: { fontSize: 11, color: "#34C759" },
  proSpec: { fontSize: 13, color: "#555", marginBottom: 5 },
  proMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  proRating: { fontSize: 12, color: "#34C759" },
  proReviews: { fontSize: 12, color: "#555" },
  metaDot: { color: "#333", fontSize: 12 },
  proDist: { fontSize: 12, color: "#555" },
  proPrice: { fontSize: 20, color: "#34C759" },
  pricePer: { fontSize: 12, color: "#555" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  tag: {
    backgroundColor: "#1a3a1a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, color: "#34C759" },
  bookBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 13,
    borderRadius: 22,
    alignItems: "center",
  },
  bookBtnText: { color: "#000", fontSize: 15 },
});
