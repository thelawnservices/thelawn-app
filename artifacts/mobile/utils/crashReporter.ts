import Constants from "expo-constants";
import { Platform } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

let _username: string | undefined;
let _role: string | undefined;

export function setCrashUser(username: string, role: string) {
  _username = username;
  _role = role;
}

export function clearCrashUser() {
  _username = undefined;
  _role = undefined;
}

export async function reportCrash(error: unknown, context?: string) {
  if (Platform.OS === "web") return;
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    await fetch(`${API_URL}/api/crash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message,
        stack: err.stack,
        context,
        username: _username,
        role: _role,
        appVersion: Constants.expoConfig?.version ?? "unknown",
      }),
    });
  } catch {}
}
