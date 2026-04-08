import React, { createContext, useContext, useState } from "react";

export type InstanceStatus = "upcoming" | "pending_approval" | "completed";

export type RecurringInstance = {
  id: string;
  parentId: string;
  service: string;
  date: string;
  time: string;
  pro: string;
  price: string;
  address: string;
  initials: string;
  color: string;
  status: InstanceStatus;
};

type RecurringContextType = {
  instances: RecurringInstance[];
  markDone: (instanceId: string) => void;
  releasePayment: (instanceId: string) => void;
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function generateDates(
  startDateStr: string,
  freq: "Weekly" | "Bi-Weekly" | "Monthly",
  count: number
): string[] {
  const parts = startDateStr.split(/[\s,]+/).filter(Boolean);
  const monthIdx = MONTHS.indexOf(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  const start = new Date(year, monthIdx, day);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    if (freq === "Weekly") d.setDate(start.getDate() + 7 * i);
    else if (freq === "Bi-Weekly") d.setDate(start.getDate() + 14 * i);
    else d.setMonth(start.getMonth() + i);
    dates.push(`${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
  }
  return dates;
}

const biWeeklyDates = generateDates("April 18, 2026", "Bi-Weekly", 7);

const INITIAL_INSTANCES: RecurringInstance[] = biWeeklyDates.map((date, i) => ({
  id: `r2-inst-${i}`,
  parentId: "2",
  service: "Hedge Trimming",
  date,
  time: "9:00 AM",
  pro: "GreenScape Pros",
  price: "$65",
  address: "22 Palmetto Dr, Bradenton, FL 34208",
  initials: "GP",
  color: "#166D42",
  status: i === 0 ? ("pending_approval" as InstanceStatus) : ("upcoming" as InstanceStatus),
}));

const RecurringContext = createContext<RecurringContextType>({
  instances: INITIAL_INSTANCES,
  markDone: () => {},
  releasePayment: () => {},
});

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<RecurringInstance[]>(INITIAL_INSTANCES);

  function markDone(instanceId: string) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: "pending_approval" } : inst
      )
    );
  }

  function releasePayment(instanceId: string) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: "completed" } : inst
      )
    );
  }

  return (
    <RecurringContext.Provider value={{ instances, markDone, releasePayment }}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  return useContext(RecurringContext);
}
