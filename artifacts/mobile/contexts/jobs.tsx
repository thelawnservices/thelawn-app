import React, { createContext, useContext, useState } from "react";

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
};

type JobsContextType = {
  acceptedJobs: AcceptedJob[];
  cancelledJobs: AcceptedJob[];
  acceptJob: (job: AcceptedJob) => void;
  cancelAccepted: (id: string) => void;
};

const JobsContext = createContext<JobsContextType>({
  acceptedJobs: [],
  cancelledJobs: [],
  acceptJob: () => {},
  cancelAccepted: () => {},
});

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [acceptedJobs, setAcceptedJobs] = useState<AcceptedJob[]>([]);
  const [cancelledJobs, setCancelledJobs] = useState<AcceptedJob[]>([]);

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
    <JobsContext.Provider value={{ acceptedJobs, cancelledJobs, acceptJob, cancelAccepted }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobsContext);
}
