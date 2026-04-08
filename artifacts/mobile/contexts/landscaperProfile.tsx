import React, { createContext, useContext, useState } from "react";

export type BookedSlot = { time: string; durationMinutes: number; service: string };

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

const DEFAULT: LandscaperAvailability = {
  days: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
  startTime: "8:00 AM",
  endTime: "6:00 PM",
  upcomingDates: [],
  city: "Ellenton",
  state: "FL",
  zip: "34222",
  saved: false,
};

type LandscaperProfileContextType = {
  availability: LandscaperAvailability;
  saveAvailability: (a: LandscaperAvailability) => void;
  bookedSlots: Record<string, BookedSlot[]>;
  addBookedSlot: (dateKey: string, time: string, durationMinutes: number, service: string) => void;
};

const LandscaperProfileContext = createContext<LandscaperProfileContextType>({
  availability: DEFAULT,
  saveAvailability: () => {},
  bookedSlots: {},
  addBookedSlot: () => {},
});

export function LandscaperProfileProvider({ children }: { children: React.ReactNode }) {
  const [availability, setAvailability] = useState<LandscaperAvailability>(DEFAULT);
  const [bookedSlots, setBookedSlots] = useState<Record<string, BookedSlot[]>>({});

  function saveAvailability(a: LandscaperAvailability) {
    setAvailability({ ...a, saved: true });
  }

  function addBookedSlot(dateKey: string, time: string, durationMinutes: number, service: string) {
    setBookedSlots((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] ?? []), { time, durationMinutes, service }],
    }));
  }

  return (
    <LandscaperProfileContext.Provider value={{ availability, saveAvailability, bookedSlots, addBookedSlot }}>
      {children}
    </LandscaperProfileContext.Provider>
  );
}

export function useLandscaperProfile() {
  return useContext(LandscaperProfileContext);
}
