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
  acceptJob: (job: AcceptedJob) => void;
  cancelAccepted: (id: string) => void;
};

const JobsContext = createContext<JobsContextType>({
  acceptedJobs: [],
  acceptJob: () => {},
  cancelAccepted: () => {},
});

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [acceptedJobs, setAcceptedJobs] = useState<AcceptedJob[]>([]);

  function acceptJob(job: AcceptedJob) {
    setAcceptedJobs((prev) => {
      if (prev.some((j) => j.id === job.id)) return prev;
      return [job, ...prev];
    });
  }

  function cancelAccepted(id: string) {
    setAcceptedJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <JobsContext.Provider value={{ acceptedJobs, acceptJob, cancelAccepted }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  return useContext(JobsContext);
}
