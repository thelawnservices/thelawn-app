import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPushPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const granted = await requestPushPermissions();
    if (!granted) return null;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function registerPushTokenWithServer(
  username: string,
  role: string
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const token = await getExpoPushToken();
    if (!token) return;
    await fetch(`${API_URL}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role, token }),
    });
  } catch {}
}

export async function sendLocalPush(title: string, body: string, subtitle?: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        subtitle: subtitle ?? "TheLawn Services",
        sound: true,
        data: { source: "TheLawnServices" },
      },
      trigger: null,
    });
  } catch (_) {}
}
