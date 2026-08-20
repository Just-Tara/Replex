import { useEffect, useRef, useState } from "react";
import { API_BASE, Device, JobState, isValidUrl } from "../lib/types";
import { getSessionId } from "../lib/session"; 

export function useVideoJobs(onAnyJobCompleted: () => void) {
  const [jobs, setJobs] = useState<Partial<Record<Device, JobState>>>({});
  const [activeTab, setActiveTab] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async (url: string, selected: Device[]) => {
    setFormError(null);

    if (!isValidUrl(url)) {
      setFormError("Enter a full URL, including https://");
      return;
    }
    if (selected.length === 0) {
      setFormError("Pick at least one device to generate for");
      return;
    }

    setSubmitting(true);
    const newJobs: Partial<Record<Device, JobState>> = {};

    try {
      for (const device of selected) {
        const res = await fetch(`${API_BASE}/generate-video`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": getSessionId(), 
          },
          body: JSON.stringify({ url, device }),
        });
        if (!res.ok) throw new Error(`Could not start ${device} job`);
        const data = await res.json();
        newJobs[device] = { jobId: data.jobId, state: "waiting", progress: 0 };
      }
      setJobs(newJobs);
      setActiveTab(selected[0]);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong starting the jobs"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Poll every device job still in flight
  useEffect(() => {
    const inFlight = Object.entries(jobs).filter(
      ([, job]) => job && job.state !== "completed" && job.state !== "failed"
    );
    if (inFlight.length === 0) return;

    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const updates: Partial<Record<Device, JobState>> = {};
      await Promise.all(
        inFlight.map(async ([device, job]) => {
          if (!job) return;
          try {
            const res = await fetch(`${API_BASE}/job-status/${job.jobId}`);
            const data = await res.json();
            updates[device as Device] = {
              jobId: job.jobId,
              state: data.state,
              progress: typeof data.progress === "number" ? data.progress : 0,
              videoUrl: data.result?.videoUrl,
            };
          } catch {
            updates[device as Device] = { ...job, state: "unknown" };
          }
        })
      );
      setJobs((prev) => ({ ...prev, ...updates }));

      if (Object.values(updates).some((u) => u?.state === "completed")) {
        onAnyJobCompleted();
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    
  }, [JSON.stringify(jobs)]);

  return { jobs, activeTab, setActiveTab, submitting, formError, generate };
}