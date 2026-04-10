import React, { createContext, useContext, useState } from "react";

export type BookedSlot = { time: string; durationMinutes: number; service: string };

export const SERVICE_BLOCK_MINUTES: Record<string, number> = {
  "Mowing/Edging":            60,
  "Weeding/Mulching":         240,
  "Sod Installation":         480,
  "Full Service":             240,
  "Tree Removal":             360,
};

export type LandscaperAvailability = {
  days: Record<string, boolean>;
  startTime: string;
  endTime: string;
  upcomingDates: string[];
  city: string;
  state: string;
  zip: string;
  saved: boolean;
};

const DEFAULT_AVAIL: LandscaperAvailability = {
  days: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
  startTime: "8:00 AM",
  endTime: "6:00 PM",
  upcomingDates: [],
  city: "Ellenton",
  state: "FL",
  zip: "34222",
  saved: false,
};

// ── My Services shared state ──────────────────────────────────────────────────

export type ServiceAvailItem = { days: string[]; startTime: string; endTime: string };
export type PricingTierItem  = { label: string; range: string; price: string };

export type MyServicesState = {
  offered:          string[];
  avail:            Record<string, ServiceAvailItem>;
  pricing:          Record<string, PricingTierItem[]>;
  acceptedPayments: string[];
  blockedDates:     string[];   // "Apr 10, 2026" style keys the landscaper marked off
};

const ALL_SVC = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Full Service", "Tree Removal"];

const BASE_TIERS: PricingTierItem[] = [
  { label: "Small",  range: "Up to 2,000 sq ft",  price: "$45" },
  { label: "Medium", range: "2,000 – 5,000 sq ft", price: "$65" },
  { label: "Large",  range: "5,000+ sq ft",         price: "$95" },
];

const SOD_TIERS_DEFAULT: PricingTierItem[] = [
  { label: "St. Augustine",   range: "Dense, shade-tolerant",             price: "$420" },
  { label: "Zoysia Grass",    range: "Low-maintenance, drought-resistant", price: "$480" },
  { label: "Bermuda Grass",   range: "Heat-resistant, durable",           price: "$390" },
  { label: "Bahia Grass",     range: "Low-input, sandy soils",            price: "$320" },
  { label: "Centipede Grass", range: "Low-maintenance, acidic soil",      price: "$360" },
  { label: "Xeriscaping",     range: "Drought-resistant design",          price: "$520" },
];

const TREE_TIERS_DEFAULT: PricingTierItem[] = [
  { label: "Small",       range: "1 – 6 ft tall",  price: "$250" },
  { label: "Medium",      range: "Up to 10 ft",     price: "$500" },
  { label: "Large",       range: "Up to 20 ft",     price: "$900" },
  { label: "Extra Large", range: "Over 20 ft",       price: "$1500" },
];

function makeDefaultPricing(): Record<string, PricingTierItem[]> {
  return {
    "Mowing/Edging":    BASE_TIERS.map((t) => ({ ...t })),
    "Weeding/Mulching": BASE_TIERS.map((t) => ({ ...t, price: t.label === "Small" ? "$90" : t.label === "Medium" ? "$130" : "$175" })),
    "Sod Installation": SOD_TIERS_DEFAULT.map((t) => ({ ...t })),
    "Full Service":     BASE_TIERS.map((t) => ({ ...t })),
    "Tree Removal":     TREE_TIERS_DEFAULT.map((t) => ({ ...t })),
  };
}

const DEFAULT_MY_SERVICES: MyServicesState = {
  offered: [...ALL_SVC],
  avail: {
    "Mowing/Edging":            { days: ["Mon","Tue","Wed","Thu","Fri"], startTime: "8:00 AM", endTime: "6:00 PM" },
    "Weeding/Mulching":         { days: ["Tue","Thu"],                   startTime: "9:00 AM", endTime: "5:00 PM" },
    "Sod Installation":         { days: ["Mon","Wed","Fri"],             startTime: "7:00 AM", endTime: "5:00 PM" },
    "Full Service":             { days: ["Mon","Wed","Fri"],             startTime: "8:00 AM", endTime: "5:00 PM" },
    "Tree Removal":             { days: ["Mon","Tue","Wed","Thu","Fri"], startTime: "7:00 AM", endTime: "4:00 PM" },
  },
  pricing: makeDefaultPricing(),
  acceptedPayments: ["Stripe", "In Person"],
  blockedDates: [],
};

// ── Context ───────────────────────────────────────────────────────────────────

type LandscaperProfileContextType = {
  availability:      LandscaperAvailability;
  saveAvailability:  (a: LandscaperAvailability) => void;
  bookedSlots:       Record<string, BookedSlot[]>;
  addBookedSlot:     (dateKey: string, time: string, durationMinutes: number, service: string) => void;
  removeBookedSlot:  (dateKey: string, time: string) => void;
  myServices:        MyServicesState;
  saveMyServices:    (s: MyServicesState) => void;
};

const LandscaperProfileContext = createContext<LandscaperProfileContextType>({
  availability:     DEFAULT_AVAIL,
  saveAvailability: () => {},
  bookedSlots:      {},
  addBookedSlot:    () => {},
  removeBookedSlot: () => {},
  myServices:       DEFAULT_MY_SERVICES,
  saveMyServices:   () => {},
});

export function LandscaperProfileProvider({ children }: { children: React.ReactNode }) {
  const [availability, setAvailability] = useState<LandscaperAvailability>(DEFAULT_AVAIL);
  const [bookedSlots, setBookedSlots]   = useState<Record<string, BookedSlot[]>>({});
  const [myServices, setMyServices]     = useState<MyServicesState>(DEFAULT_MY_SERVICES);

  function saveAvailability(a: LandscaperAvailability) {
    setAvailability({ ...a, saved: true });
  }

  function addBookedSlot(dateKey: string, time: string, durationMinutes: number, service: string) {
    setBookedSlots((prev) => {
      const existing = prev[dateKey] ?? [];
      // Idempotent: don't add duplicate (same time+service)
      if (existing.some((s) => s.time === time && s.service === service)) return prev;
      return { ...prev, [dateKey]: [...existing, { time, durationMinutes, service }] };
    });
  }

  function removeBookedSlot(dateKey: string, time: string) {
    setBookedSlots((prev) => {
      const filtered = (prev[dateKey] ?? []).filter((s) => s.time !== time);
      return { ...prev, [dateKey]: filtered };
    });
  }

  function saveMyServices(s: MyServicesState) {
    setMyServices(s);
  }

  return (
    <LandscaperProfileContext.Provider
      value={{ availability, saveAvailability, bookedSlots, addBookedSlot, removeBookedSlot, myServices, saveMyServices }}
    >
      {children}
    </LandscaperProfileContext.Provider>
  );
}

export function useLandscaperProfile() {
  return useContext(LandscaperProfileContext);
}
