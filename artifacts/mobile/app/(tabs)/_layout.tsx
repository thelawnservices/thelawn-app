import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth";
import { useWallet } from "@/contexts/wallet";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomInset = isWeb ? 0 : insets.bottom;
  const { role, isLoading } = useAuth();
  const { balance } = useWallet();

  // Wait for persisted session check before deciding where to navigate
  if (isLoading) return null;
  if (!role) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#34FF7A",
        tabBarInactiveTintColor: "#555555",
        tabBarStyle: {
          backgroundColor: "#1A1A1A",
          borderTopColor: "#222222",
          borderTopWidth: 1,
          height: 60 + bottomInset,
          paddingBottom: bottomInset + 6,
          paddingTop: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_500Medium",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: role === "landscaper" ? "Requests" : "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={role === "landscaper" ? "clipboard-outline" : "search"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: role === "landscaper" ? undefined : null,
          tabBarIcon: ({ color }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons name="wallet-outline" size={24} color={color} />
            </View>
          ),
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                fontSize: 11,
                color,
                fontFamily: "Inter_700Bold",
                marginTop: 2,
              }}
            >
              ${balance.toFixed(0)}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
          ...(role === "landscaper" && {
            href: null,
          }),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: role === "customer" ? "My Service" : "My Jobs",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
