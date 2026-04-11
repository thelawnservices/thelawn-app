import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type FeedPost = {
  id: string;
  customerName: string;
  customerInitials: string;
  customerColor: string;
  landscaperName: string;
  service: string;
  stars: number;
  text: string;
  timestamp: string;
  hasPhoto: boolean;
  photoIcon: "leaf-outline" | "cut-outline" | "flower-outline" | "grid-outline" | "layers-outline" | "construct-outline";
  likes: number;
};

const FEED_POSTS: FeedPost[] = [];

function StarRow({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name="star" size={12} color={i <= count ? "#f59e0b" : "#333"} />
      ))}
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(FEED_POSTS.map((p) => [p.id, p.likes]))
  );
  const [filter, setFilter] = useState<"All" | "Photos" | "Reviews">("All");

  const visible = FEED_POSTS.filter((p) => {
    if (filter === "Photos") return p.hasPhoto;
    if (filter === "Reviews") return !p.hasPhoto;
    return true;
  });

  const toggleLike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCounts((c) => ({ ...c, [id]: c[id] - 1 }));
      } else {
        next.add(id);
        setCounts((c) => ({ ...c, [id]: c[id] + 1 }));
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Community Feed</Text>
        <Text style={[styles.headerSub, { fontFamily: "Inter_400Regular" }]}>
          Recent reviews &amp; photos from customers
        </Text>

        {/* Filter pills */}
        <View style={styles.filterRow}>
          {(["All", "Photos", "Reviews"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { fontFamily: "Inter_500Medium" }, filter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.countLabel, { fontFamily: "Inter_400Regular" }]}>
          {visible.length} post{visible.length !== 1 ? "s" : ""}
        </Text>

        {visible.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 64, paddingBottom: 40, gap: 16 }}>
            <Ionicons name="leaf-outline" size={48} color="#333" />
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_500Medium" }}>
              No posts yet
            </Text>
            <Text style={{ color: "#BBBBBB", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 20 }}>
              When customers in your area complete bookings and leave reviews, they'll appear here.
            </Text>
          </View>
        )}

        {visible.map((post) => (
          <View key={post.id} style={styles.card}>
            {/* Card header: avatar + name + time */}
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: post.customerColor }]}>
                <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{post.customerInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {/* Customer name is plain text — not tappable */}
                <Text style={[styles.customerName, { fontFamily: "Inter_600SemiBold" }]}>
                  {post.customerName}
                </Text>
                <Text style={[styles.timestamp, { fontFamily: "Inter_400Regular" }]}>
                  {post.timestamp}
                </Text>
              </View>
              <View style={styles.serviceTag}>
                <Ionicons name="leaf" size={10} color="#34FF7A" />
                <Text style={[styles.serviceTagText, { fontFamily: "Inter_500Medium" }]}>
                  {post.service}
                </Text>
              </View>
            </View>

            {/* Landscaper reference */}
            <View style={styles.landscaperRow}>
              <Ionicons name="person-circle-outline" size={14} color="#888" />
              <Text style={[styles.landscaperRef, { fontFamily: "Inter_400Regular" }]}>
                Reviewed{" "}
                <Text style={{ color: "#34FF7A", fontFamily: "Inter_600SemiBold" }}>
                  {post.landscaperName}
                </Text>
              </Text>
            </View>

            {/* Stars */}
            <StarRow count={post.stars} />

            {/* Review text */}
            <Text style={[styles.reviewText, { fontFamily: "Inter_400Regular" }]}>
              {post.text}
            </Text>

            {/* Photo placeholder */}
            {post.hasPhoto && (
              <View style={styles.photoPlaceholder}>
                <Ionicons name={post.photoIcon} size={40} color="#34FF7A" />
                <Text style={[styles.photoLabel, { fontFamily: "Inter_400Regular" }]}>
                  Photo attached
                </Text>
              </View>
            )}

            {/* Like button */}
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.likeBtn}
                onPress={() => toggleLike(post.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={liked.has(post.id) ? "heart" : "heart-outline"}
                  size={18}
                  color={liked.has(post.id) ? "#ef4444" : "#888"}
                />
                <Text style={[styles.likeCount, { fontFamily: "Inter_400Regular" }, liked.has(post.id) && { color: "#ef4444" }]}>
                  {counts[post.id]}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.helpfulLabel, { fontFamily: "Inter_400Regular" }]}>
                {post.stars === 5 ? "Highly recommended" : post.stars >= 4 ? "Recommended" : "Mixed review"}
              </Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
    gap: 4,
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "#888888", marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: { backgroundColor: "#34FF7A", borderColor: "#34FF7A" },
  filterChipText: { fontSize: 13, color: "#FFFFFF" },
  filterChipTextActive: { color: "#000" },
  feed: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  countLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, color: "#fff" },
  customerName: { fontSize: 14, color: "#FFFFFF" },
  timestamp: { fontSize: 12, color: "#888888", marginTop: 1 },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d2e18",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#34FF7A33",
  },
  serviceTagText: { fontSize: 10, color: "#34FF7A" },
  landscaperRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  landscaperRef: { fontSize: 12, color: "#888" },
  reviewText: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 21 },
  photoPlaceholder: {
    backgroundColor: "#111",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoLabel: { fontSize: 12, color: "#555" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#222",
    paddingTop: 10,
  },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  likeCount: { fontSize: 13, color: "#888" },
  helpfulLabel: { fontSize: 12, color: "#555" },
});
