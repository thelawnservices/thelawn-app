import React, { createContext, useContext, useState } from "react";

export type BookedSlot = { time: string; durationMinutes: number; service: string };

export const SERVICE_BLOCK_MINUTES: Record<string, number> = {
  "Mowing/Edging":    120,
  "Weeding/Mulching": 240,
  "Sod Installation": 480,
  "Artificial Turf":  1200,
  "Full Service":     240,
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

const ALL_SVC = ["Mowing/Edging", "Weeding/Mulching", "Sod Installation", "Artificial Turf", "Full Service"];

const BASE_TIERS: PricingTierItem[] = [
  { label: "Small",  range: "Up to 2,000 sq ft",  price: "$45" },
  { label: "Medium", range: "2,000 – 5,000 sq ft", price: "$65" },
  { label: "Large",  range: "5,000+ sq ft",         price: "$95" },
];

const DEFAULT_MY_SERVICES: MyServicesState = {
  offered: [...ALL_SVC],
  avail: {
    "Mowing/Edging":    { days: ["Mon","Tue","Wed","Thu","Fri"], startTime: "8:00 AM", endTime: "6:00 PM" },
    "Weeding/Mulching": { days: ["Tue","Thu"],                   startTime: "9:00 AM", endTime: "5:00 PM" },
    "Sod Installation": { days: ["Mon","Wed","Fri"],             startTime: "7:00 AM", endTime: "5:00 PM" },
    "Artificial Turf":  { days: ["Mon","Tue","Wed","Thu","Fri"], startTime: "7:00 AM", endTime: "4:00 PM" },
    "Full Service":     { days: ["Mon","Wed","Fri"],             startTime: "8:00 AM", endTime: "5:00 PM" },
  },
  pricing: Object.fromEntries(ALL_SVC.map((s) => [s, BASE_TIERS.map((t) => ({ ...t }))])),
  acceptedPayments: ["Stripe", "In Person"],
  blockedDates: [],
};

// ── Context ───────────────────────────────────────────────────────────────────

type LandscaperProfileContextType = {
  availability:    LandscaperAvailability;
  saveAvailability:(a: LandscaperAvailability) => void;
  bookedSlots:     Record<string, BookedSlot[]>;
  addBookedSlot:   (dateKey: string, time: string, durationMinutes: number, service: string) => void;
  myServices:      MyServicesState;
  saveMyServices:  (s: MyServicesState) => void;
};

const LandscaperProfileContext = createContext<LandscaperProfileContextType>({
  availability:    DEFAULT_AVAIL,
  saveAvailability:() => {},
  bookedSlots:     {},
  addBookedSlot:   () => {},
  myServices:      DEFAULT_MY_SERVICES,
  saveMyServices:  () => {},
});

export function LandscaperProfileProvider({ children }: { children: React.ReactNode }) {
  const [availability, setAvailability] = useState<LandscaperAvailability>(DEFAULT_AVAIL);
  const [bookedSlots, setBookedSlots]   = useState<Record<string, BookedSlot[]>>({});
  const [myServices, setMyServices]     = useState<MyServicesState>(DEFAULT_MY_SERVICES);

  function saveAvailability(a: LandscaperAvailability) {
    setAvailability({ ...a, saved: true });
  }

  function addBookedSlot(dateKey: string, time: string, durationMinutes: number, service: string) {
    setBookedSlots((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] ?? []), { time, durationMinutes, service }],
    }));
  }

  function saveMyServices(s: MyServicesState) {
    setMyServices(s);
  }

  return (
    <LandscaperProfileContext.Provider
      value={{ availability, saveAvailability, bookedSlots, addBookedSlot, myServices, saveMyServices }}
    >
      {children}
    </LandscaperProfileContext.Provider>
  );
}

export function useLandscaperProfile() {
  return useContext(LandscaperProfileContext);
}
