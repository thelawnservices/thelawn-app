import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { login } = useAuth();

  function handleLogin(role: "customer" | "landscaper") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    login(role);
    router.replace("/(tabs)");
  }

  return (
    <View style={[styles.container, { paddingTop: isWeb ? 60 : insets.top, paddingBottom: isWeb ? 40 : insets.bottom }]}>
      <View style={styles.logoSection}>
        <Text style={[styles.logo, { fontFamily: "GreatVibes_400Regular" }]}>theLawn</Text>
        <Text style={[styles.welcomeText, { fontFamily: "Inter_400Regular" }]}>Welcome back</Text>
      </View>

      <View style={styles.buttonsSection}>
        <TouchableOpacity
          style={styles.customerBtn}
          onPress={() => handleLogin("customer")}
          activeOpacity={0.88}
        >
          <Text style={[styles.customerBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign in as Customer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.landscaperBtn}
          onPress={() => handleLogin("landscaper")}
          activeOpacity={0.88}
        >
          <Text style={[styles.landscaperBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign in as Landscaper
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.demoNote, { fontFamily: "Inter_400Regular" }]}>
        Demo mode – no real login required
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 0,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 64,
  },
  logo: {
    fontSize: 72,
    color: "#34FF7A",
    letterSpacing: -4,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  buttonsSection: {
    gap: 14,
    marginBottom: 40,
  },
  customerBtn: {
    backgroundColor: "#34FF7A",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#34FF7A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  customerBtnText: {
    color: "#000000",
    fontSize: 17,
  },
  landscaperBtn: {
    backgroundColor: "#111111",
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#34FF7A",
  },
  landscaperBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
  demoNote: {
    textAlign: "center",
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
});
