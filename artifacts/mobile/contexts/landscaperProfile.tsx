import React, { createContext, useContext, useState } from "react";

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
};

const LandscaperProfileContext = createContext<LandscaperProfileContextType>({
  availability: DEFAULT,
  saveAvailability: () => {},
});

export function LandscaperProfileProvider({ children }: { children: React.ReactNode }) {
  const [availability, setAvailability] = useState<LandscaperAvailability>(DEFAULT);

  function saveAvailability(a: LandscaperAvailability) {
    setAvailability({ ...a, saved: true });
  }

  return (
    <LandscaperProfileContext.Provider value={{ availability, saveAvailability }}>
      {children}
    </LandscaperProfileContext.Provider>
  );
}

export function useLandscaperProfile() {
  return useContext(LandscaperProfileContext);
}
