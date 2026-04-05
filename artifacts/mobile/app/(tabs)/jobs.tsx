import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>My Jobs</Text>
      </View>

      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="location-outline" size={44} color="#34FF7A" />
        </View>
        <Text style={[styles.emptyTitle, { fontFamily: "Inter_600SemiBold" }]}>
          No active jobs yet
        </Text>
        <Text style={[styles.emptySub, { fontFamily: "Inter_400Regular" }]}>
          Live tracking will appear here once you have a job in progress.
        </Text>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={32} color="#333" />
          <Text style={[styles.mapText, { fontFamily: "Inter_400Regular" }]}>Map view</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitle: { fontSize: 22, color: "#FFFFFF" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 12,
    paddingBottom: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    backgroundColor: "#0d2e18",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, color: "#FFFFFF" },
  emptySub: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  mapPlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: "#111111",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  mapText: { fontSize: 14, color: "#555" },
});
