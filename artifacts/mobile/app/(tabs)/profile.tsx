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

  const switchType = (t: ProfileType) => { setProfileType(t); Haptics.selectionAsync(); };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 10 }]}>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, profileType === "customer" && styles.toggleBtnActive]}
            onPress={() => switchType("customer")}
          >
            <Text style={[styles.toggleBtnText, { fontFamily: "Inter_500Medium" }, profileType === "customer" && styles.toggleBtnTextActive]}>
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, profileType === "landscaper" && styles.toggleBtnActive]}
            onPress={() => switchType("landscaper")}
          >
            <Text style={[styles.toggleBtnText, { fontFamily: "Inter_500Medium" }, profileType === "landscaper" && styles.toggleBtnTextActive]}>
              Landscaper
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarBox}>
            <Ionicons name={profileType === "customer" ? "person" : "construct"} size={44} color="#34FF7A" />
          </View>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => Alert.alert("Upload Photo", "Photo picker would open here")}
          >
            <Ionicons name="camera" size={14} color="#34FF7A" />
            <Text style={[styles.uploadText, { fontFamily: "Inter_500Medium" }]}>Change Photo</Text>
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
                placeholderTextColor="#444"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Date of Birth</Text>
              <View style={[styles.field, styles.fieldRow]}>
                <Ionicons name="calendar-outline" size={16} color="#555" />
                <Text style={{ fontFamily: "Inter_400Regular", color: "#34FF7A", fontSize: 15 }}>
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
                placeholderTextColor="#444"
              />
            </View>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => Alert.alert("Change Password", "Password reset flow would open here")}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#34FF7A" />
              <Text style={[styles.outlineBtnText, { fontFamily: "Inter_500Medium" }]}>Change Password</Text>
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
                placeholderTextColor="#444"
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
                placeholderTextColor="#444"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Primary Service</Text>
              <View style={styles.serviceOptions}>
                {SERVICES_LIST.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.serviceOption, selectedService === s && styles.serviceOptionActive]}
                    onPress={() => { setSelectedService(s); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.serviceOptionText, { fontFamily: "Inter_400Regular" }, selectedService === s && { color: "#34FF7A", fontFamily: "Inter_600SemiBold" }]}>
                      {s}
                    </Text>
                    {selectedService === s && <Ionicons name="checkmark-circle" size={16} color="#34FF7A" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { fontFamily: "Inter_500Medium" }]}>Hourly Rate</Text>
              <View style={[styles.field, styles.fieldRow]}>
                <Text style={{ fontFamily: "Inter_400Regular", color: "#555", fontSize: 15 }}>$</Text>
                <TextInput
                  style={{ flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: "#34FF7A" }}
                  defaultValue="45"
                  keyboardType="numeric"
                />
                <Text style={{ fontFamily: "Inter_400Regular", color: "#555", fontSize: 13 }}>/hr</Text>
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
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222222",
  },
  headerTitle: { fontSize: 22, color: "#34FF7A" },
  scrollContent: { padding: 16, paddingBottom: 48 },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#111111",
    borderRadius: 28,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#222",
  },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 24, alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#0d2e18" },
  toggleBtnText: { fontSize: 14, color: "#555" },
  toggleBtnTextActive: { color: "#34FF7A" },
  avatarSection: { alignItems: "center", gap: 10, marginBottom: 24 },
  avatarBox: {
    width: 90,
    height: 90,
    backgroundColor: "#111111",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  uploadText: { fontSize: 13, color: "#34FF7A" },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: "#555", marginBottom: 6 },
  field: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#34FF7A",
  },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceOptions: { gap: 8 },
  serviceOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  serviceOptionActive: { borderColor: "#34C759", backgroundColor: "#0d2e18" },
  serviceOptionText: { fontSize: 14, color: "#555" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 22,
    paddingVertical: 14,
    marginBottom: 8,
  },
  outlineBtnText: { fontSize: 15, color: "#34FF7A" },
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
  saveBtnText: { color: "#000", fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, color: "#ef4444" },
});
