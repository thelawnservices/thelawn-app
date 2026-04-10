import React, { createContext, useContext, useState } from "react";

export type InstanceStatus = "upcoming" | "arrived" | "started" | "pending_approval" | "completed" | "disputed";

export type RecurringInstance = {
  id: string;
  parentId: string;
  code: string;
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
  completionPhotos: Record<string, string[]>;
  markedDoneAt: Record<string, number>;
  markDone: (instanceId: string, photos?: string[]) => void;
  releasePayment: (instanceId: string) => void;
  disputeInstance: (instanceId: string) => void;
  advanceStatus: (instanceId: string, toStatus: "arrived" | "started") => void;
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

const RECURRING_CODES = ["JOB-48312","JOB-59274","JOB-63891","JOB-77042","JOB-81534","JOB-92065","JOB-15728"];

const INITIAL_INSTANCES: RecurringInstance[] = biWeeklyDates.map((date, i) => ({
  id: `r2-inst-${i}`,
  parentId: "2",
  code: RECURRING_CODES[i] ?? `JOB-${10000 + i * 7213}`,
  service: "Mowing/Edging",
  date,
  time: "9:00 AM",
  pro: "GreenScape Pros",
  price: "$65",
  address: "22 Palmetto Dr, Bradenton, FL 34208",
  initials: "GP",
  color: "#166D42",
  // inst-0 already pending customer approval, inst-1 is active (arrived — in My Jobs for demo)
  status: i === 0 ? ("pending_approval" as InstanceStatus)
        : i === 1 ? ("arrived" as InstanceStatus)
        : ("upcoming" as InstanceStatus),
}));

// Simulate instance 0 was marked done 23.5 hours ago (30 min remaining in demo)
const INITIAL_MARKED_DONE_AT: Record<string, number> = {
  "r2-inst-0": Date.now() - (23 * 3600 + 30 * 60) * 1000,
};

const RecurringContext = createContext<RecurringContextType>({
  instances: INITIAL_INSTANCES,
  completionPhotos: {},
  markedDoneAt: INITIAL_MARKED_DONE_AT,
  markDone: () => {},
  releasePayment: () => {},
  disputeInstance: () => {},
  advanceStatus: () => {},
});

export function RecurringProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<RecurringInstance[]>(INITIAL_INSTANCES);
  const [completionPhotos, setCompletionPhotos] = useState<Record<string, string[]>>({});
  const [markedDoneAt, setMarkedDoneAt] = useState<Record<string, number>>(INITIAL_MARKED_DONE_AT);

  function advanceStatus(instanceId: string, toStatus: "arrived" | "started") {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: toStatus } : inst
      )
    );
  }

  function markDone(instanceId: string, photos?: string[]) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: "pending_approval" } : inst
      )
    );
    setMarkedDoneAt((prev) => ({ ...prev, [instanceId]: Date.now() }));
    if (photos && photos.length > 0) {
      setCompletionPhotos((prev) => ({ ...prev, [instanceId]: photos }));
    }
  }

  function releasePayment(instanceId: string) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: "completed" } : inst
      )
    );
  }

  function disputeInstance(instanceId: string) {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId ? { ...inst, status: "disputed" } : inst
      )
    );
  }

  return (
    <RecurringContext.Provider value={{ instances, completionPhotos, markedDoneAt, markDone, releasePayment, disputeInstance, advanceStatus }}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurring() {
  return useContext(RecurringContext);
}
