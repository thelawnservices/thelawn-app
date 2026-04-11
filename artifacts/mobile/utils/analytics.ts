import { Platform } from "react-native";

let posthog: any = null;

export async function initAnalytics() {
  if (Platform.OS === "web") return;
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  try {
    const { PostHog } = await import("posthog-react-native");
    posthog = new PostHog(key, { host: "https://us.i.posthog.com" });
  } catch {}
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  try { posthog?.identify(userId, properties); } catch {}
}

export function resetUser() {
  try { posthog?.reset(); } catch {}
}

export function track(event: string, properties?: Record<string, unknown>) {
  try { posthog?.capture(event, properties); } catch {}
}
