import { Device, DEVICE_META, JobState, ORDER } from "../lib/types";

export function JobStatusList({
  jobs,
}: {
  jobs: Partial<Record<Device, JobState>>;
}) {
  const requestedDevices = ORDER.filter((d) => jobs[d]);
  if (requestedDevices.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface divide-y divide-border mb-10">
      {requestedDevices.map((d) => {
        const job = jobs[d]!;
        const isDone = job.state === "completed";
        const isFailed = job.state === "failed";
        return (
          <div key={d} className="flex items-center gap-4 px-5 py-3">
            <span className="w-20 font-mono-display text-xs tracking-widest text-muted">
              {DEVICE_META[d].label.toUpperCase()}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isFailed ? "bg-accent" : isDone ? "bg-ready" : "bg-accent"
                }`}
                style={{ width: `${isFailed ? 100 : job.progress}%` }}
              />
            </div>
            <span className="w-24 text-right font-mono-display text-xs text-muted">
              {isFailed ? "failed" : isDone ? "ready" : `${job.progress}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}