/**
 * TheLawnServices — Content Moderation Utility
 * Profanity filter + photo review system
 */

const BLOCKED_WORDS = [
  "fuck","shit","ass","bitch","bastard","crap","damn","hell","piss","cunt",
  "dick","cock","pussy","slut","whore","nigger","nigga","faggot","fag",
  "retard","rape","kill","murder","hate","racist","nazi","porn","sex",
  "nude","naked","sexy","explicit","violence","drug","meth","cocaine","heroin",
  "weed","weed","arse","bollocks","bugger","tosser","twat","wanker",
  "fucker","motherfucker","asshole","dumbass","jackass","dipshit","bullshit",
  "crap","prick","douche","idiot","moron","stupid","loser","pathetic","creep",
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

export function simulatePhotoReview(
  photo: ManagedPhoto,
  onResult: (result: PhotoStatus) => void,
  delayMs = 3000
): () => void {
  const timeout = setTimeout(() => {
    onResult("approved");
  }, delayMs);
  return () => clearTimeout(timeout);
}
