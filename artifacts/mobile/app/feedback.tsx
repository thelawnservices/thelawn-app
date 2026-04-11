import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

const TAGS = ["On time", "Clean work", "Friendly", "Great value"];

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const params = useLocalSearchParams<{
    proName: string;
    proInitials: string;
    proColor: string;
    serviceName: string;
  }>();

  const proName      = params.proName      || "Your Pro";
  const proInitials  = params.proInitials  || proName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const proColor     = params.proColor     || "#34C759";
  const serviceName  = params.serviceName  || "Service";
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const topPadding = isWeb ? 67 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  const handleStar = (r: number) => {
    setRating(r);
    Haptics.selectionAsync();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    Haptics.selectionAsync();
  };

  const ratingLabel = ["Poor", "Fair", "Good", "Great!", "Excellent!"][rating - 1];

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    setTimeout(() => router.replace("/"), 2000);
  };

  if (submitted) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <View style={[styles.successIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="checkmark-circle" size={60} color={colors.primary} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Thank you!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Your feedback helps us improve
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Rate Your Service
        </Text>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: bottomPadding + 24, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.proCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.proAvatar, { backgroundColor: proColor }]}>
            <Text style={styles.proInitials}>{proInitials}</Text>
          </View>
          <View>
            <Text style={[styles.proName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {proName}
            </Text>
            <Text style={[styles.proSvc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {serviceName} · Today
            </Text>
          </View>
        </View>

        <Text style={[styles.ratingQuestion, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          How was your experience?
        </Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => handleStar(s)} style={styles.starBtn}>
              <Ionicons
                name={s <= rating ? "star" : "star-outline"}
                size={42}
                color={s <= rating ? "#f59e0b" : colors.border}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.ratingLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
          {ratingLabel}
        </Text>

        <View style={styles.tagsRow}>
          {TAGS.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  {
                    backgroundColor: active ? colors.secondary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => toggleTag(tag)}
              >
                {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                <Text
                  style={[
                    styles.tagText,
                    { color: active ? colors.accent : colors.mutedForeground, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          style={[
            styles.reviewInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
            },
          ]}
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.mutedForeground}
          multiline
          value={review}
          onChangeText={setReview}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          <Text style={[styles.submitBtnText, { fontFamily: "Inter_700Bold" }]}>Submit Review</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 50, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17 },
  skipBtn: { width: 50, alignItems: "flex-end" },
  skipText: { fontSize: 14 },
  proCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    width: "100%",
    marginBottom: 24,
  },
  proAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  proInitials: { color: "#fff", fontSize: 18, fontWeight: "700" },
  proName: { fontSize: 16, marginBottom: 3 },
  proSvc: { fontSize: 13 },
  ratingQuestion: { fontSize: 20, marginBottom: 16, textAlign: "center" },
  starsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 16, marginBottom: 20 },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
    width: "100%",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: { fontSize: 13 },
  reviewInput: {
    width: "100%",
    height: 100,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 20,
  },
  submitBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 17 },
  successIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: { fontSize: 30, marginBottom: 8 },
  successSub: { fontSize: 16 },
});
