/**
 * TheLawnServices — Content Moderation Utility
 * Profanity filter + AI-powered photo review system
 */

const BLOCKED_WORDS = [
  "fuck","shit","ass","bitch","bastard","crap","damn","hell","piss","cunt",
  "dick","cock","pussy","slut","whore","nigger","nigga","faggot","fag",
  "retard","rape","kill","murder","hate","racist","nazi","porn","sex",
  "nude","naked","sexy","explicit","violence","drug","meth","cocaine","heroin",
  "weed","arse","bollocks","bugger","tosser","twat","wanker",
  "fucker","motherfucker","asshole","dumbass","jackass","dipshit","bullshit",
  "prick","douche","idiot","moron","stupid","loser","pathetic","creep",
];

const PROFANITY_PATTERN = new RegExp(
  BLOCKED_WORDS.map((w) => `\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`).join("|"),
  "gi"
);

export function containsProfanity(text: string): boolean {
  if (!text || !text.trim()) return false;
  PROFANITY_PATTERN.lastIndex = 0;
  return PROFANITY_PATTERN.test(text);
}

export function filterProfanity(text: string): string {
  if (!text) return text;
  PROFANITY_PATTERN.lastIndex = 0;
  return text.replace(PROFANITY_PATTERN, (match) => "*".repeat(match.length));
}

export function validateText(text: string): { ok: boolean; reason?: string } {
  if (!text || !text.trim()) return { ok: true };
  if (containsProfanity(text)) {
    return {
      ok: false,
      reason: "Your message contains language that is not allowed. Please revise and try again.",
    };
  }
  return { ok: true };
}

export type PhotoStatus = "pending" | "approved" | "rejected";

export interface ManagedPhoto {
  uri: string;
  status: PhotoStatus;
  id: string;
}

let _photoCounter = 0;
export function createManagedPhoto(uri: string): ManagedPhoto {
  return { uri, status: "pending", id: String(++_photoCounter) };
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

/**
 * Convert a local file URI to base64.
 */
async function uriToBase64(uri: string): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Send an image URI to the AI moderation endpoint.
 * Returns { approved: boolean, reason: string }.
 * Falls back to approved=true on network errors so uploads are never silently blocked.
 */
export async function reviewImageWithAI(uri: string): Promise<{ approved: boolean; reason: string }> {
  try {
    const imageBase64 = await uriToBase64(uri);
    const ext = uri.split(".").pop()?.toLowerCase();
    const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    const resp = await fetch(`${API_URL}/api/moderate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });

    if (!resp.ok) return { approved: true, reason: "" };
    return await resp.json();
  } catch {
    return { approved: true, reason: "" };
  }
}

/**
 * Review a photo with the AI and return the result as a Promise.
 */
export async function simulatePhotoReview(photo: ManagedPhoto): Promise<ManagedPhoto> {
  const result = await reviewImageWithAI(photo.uri);
  return { ...photo, status: result.approved ? "approved" : "rejected" };
}
