import React, { createContext, useContext, useMemo, useState } from "react";

export type AcceptedJob = {
  id: string;
  service: string;
  size: string;
  customer: string;
  date: string;
  time: string;
  budget: string;
  distance?: string;
  zip?: string;
  phone?: string;
};

type JobsContextType = {
  acceptedJobs: AcceptedJob[];
  cancelledJobs: AcceptedJob[];
  knownCustomers: Set<string>;
  acceptJob: (job: AcceptedJob) => void;
  cancelAccepted: (id: string) => void;
};

const JobsContext = createContext<JobsContextType>({
  acceptedJobs: [],
  cancelledJobs: [],
  knownCustomers: new Set(),
  acceptJob: () => {},
  cancelAccepted: () => {},
});

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [acceptedJobs, setAcceptedJobs] = useState<AcceptedJob[]>([]);
  const [cancelledJobs, setCancelledJobs] = useState<AcceptedJob[]>([]);

  const knownCustomers = useMemo<Set<string>>(() => {
    const names = new Set<string>();
    acceptedJobs.forEach((j) => names.add(j.customer));
    cancelledJobs.forEach((j) => names.add(j.customer));
    return names;
  }, [acceptedJobs, cancelledJobs]);

  function acceptJob(job: AcceptedJob) {
    setAcceptedJobs((prev) => {
      if (prev.some((j) => j.id === job.id)) return prev;
      return [job, ...prev];
    });
  }

  function cancelAccepted(id: string) {
    setAcceptedJobs((prev) => {
      const job = prev.find((j) => j.id === id);
      if (job) {
        setCancelledJobs((c) => [job, ...c]);
      }
      return prev.filter((j) => j.id !== id);
    });
  }

  return (
    <JobsContext.Provider value={{ acceptedJobs, cancelledJobs, knownCustomers, acceptJob, cancelAccepted }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobsContext);
}
