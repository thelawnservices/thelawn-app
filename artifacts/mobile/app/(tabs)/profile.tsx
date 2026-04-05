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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type ProfileType = "customer" | "landscaper";

const SERVICES_LIST = ["Lawn Mowing", "Hedge Trimming", "Mulching", "Cleanup", "Full Service"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;

  const [profileType, setProfileType] = useState<ProfileType>("customer");
  const [email, setEmail] = useState("zamire@example.com");
  const [address, setAddress] = useState("123 Main St, Ellenton, FL");
  const [yearEst, setYearEst] = useState("2018");
  const [selectedService, setSelectedService] = useState("Lawn Mowing");

  const switchType = (t: ProfileType) => {
    setProfileType(t);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, profileType === "customer" && styles.toggleBtnActive]}
            onPress={() => switchType("customer")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                { fontFamily: "Inter_500Medium" },
                profileType === "customer" && styles.toggleBtnTextActive,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, profileType === "landscaper" && styles.toggleBtnActive]}
            onPress={() => switchType("landscaper")}
          >
            <Text
              style={[
                styles.toggleBtnText,
                { fontFamily: "Inter_500Medium" },
                profileType === "landscaper" && styles.toggleBtnTextActive,
              ]}
            >
              Landscaper
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarBox}>
            <Ionicons
              name={profileType === "customer" ? "person" : "construct"}
              size={44}
              color="#9ca3af"
            />
          </View>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => Alert.alert("Upload Photo", "Photo picker would open here")}
          >
            <Ionicons name="camera" size={14} color="#34C759" />
            <Text style={[styles.uploadText, { fontFamily: "Inter_500Medium" }]}>
              Change Photo
            </Text>
          </TouchableOpacity>
        </View>

        {profileType === "customer" ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Email</Text>
              <TextInput
                style={[styles.field, { fontFamily: "Inter_400Regular" }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Email"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Date of Birth</Text>
              <View style={[styles.field, styles.fieldRow]}>
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                <Text style={[{ fontFamily: "Inter_400Regular", color: "#374151", fontSize: 15 }]}>
                  June 15, 1995
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Address</Text>
              <TextInput
                style={[styles.field, { fontFamily: "Inter_400Regular" }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => Alert.alert("Change Password", "Password reset flow would open here")}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#374151" />
              <Text style={[styles.outlineBtnText, { fontFamily: "Inter_500Medium" }]}>
                Change Password
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Business Name</Text>
              <TextInput
                style={[styles.field, { fontFamily: "Inter_400Regular" }]}
                value="Rivera Lawn Services"
                placeholder="Business Name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Year Established</Text>
              <TextInput
                style={[styles.field, { fontFamily: "Inter_400Regular" }]}
                value={yearEst}
                onChangeText={setYearEst}
                keyboardType="numeric"
                placeholder="Year"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Primary Service</Text>
              <View style={styles.serviceOptions}>
                {SERVICES_LIST.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.serviceOption,
                      selectedService === s && styles.serviceOptionActive,
                    ]}
                    onPress={() => { setSelectedService(s); Haptics.selectionAsync(); }}
                  >
                    <Text
                      style={[
                        styles.serviceOptionText,
                        { fontFamily: "Inter_400Regular" },
                        selectedService === s && { color: "#34C759", fontFamily: "Inter_600SemiBold" },
                      ]}
                    >
                      {s}
                    </Text>
                    {selectedService === s && (
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Hourly Rate</Text>
              <View style={[styles.field, styles.fieldRow]}>
                <Text style={[{ fontFamily: "Inter_400Regular", color: "#9ca3af", fontSize: 15 }]}>$</Text>
                <TextInput
                  style={[{ flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: "#374151" }]}
                  defaultValue="45"
                  keyboardType="numeric"
                />
                <Text style={[{ fontFamily: "Inter_400Regular", color: "#9ca3af", fontSize: 13 }]}>/hr</Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Saved", "Your profile has been updated.");
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={[styles.logoutText, { fontFamily: "Inter_500Medium" }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9F7" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: { fontSize: 22, color: "#111827" },
  scrollContent: { padding: 16, paddingBottom: 48 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 28,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleBtnText: { fontSize: 14, color: "#6b7280" },
  toggleBtnTextActive: { color: "#111827" },
  avatarSection: { alignItems: "center", gap: 10, marginBottom: 24 },
  avatarBox: {
    width: 90,
    height: 90,
    backgroundColor: "#f3f4f6",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  uploadText: { fontSize: 13, color: "#34C759" },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  field: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#374151",
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceOptions: { gap: 8 },
  serviceOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceOptionActive: { borderColor: "#34C759", backgroundColor: "#f0fdf4" },
  serviceOptionText: { fontSize: 14, color: "#374151" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 22,
    paddingVertical: 14,
    marginBottom: 8,
  },
  outlineBtnText: { fontSize: 15, color: "#374151" },
  saveBtn: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, color: "#ef4444" },
});
