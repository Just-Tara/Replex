import { Device, DEVICE_META, JobState, ORDER } from "../lib/types";
import { DeviceFrame } from "./DeviceFrame";

export function PreviewPanel({
  jobs,
  activeTab,
  setActiveTab,
}: {
  jobs: Partial<Record<Device, JobState>>;
  activeTab: Device | null;
  setActiveTab: (d: Device) => void;
}) {
  const requestedDevices = ORDER.filter((d) => jobs[d]);
  if (requestedDevices.length === 0) return null;

  const active = activeTab ? jobs[activeTab] : undefined;

  return (
    <div>
      <div className="flex gap-1 mb-4 font-mono-display text-xs">
        {requestedDevices.map((d, i) => (
          <button
            key={d}
            onClick={() => setActiveTab(d)}
            className={`px-3 py-2 rounded-t-md border-b-2 tracking-widest transition-colors ${
              activeTab === d
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {String(i + 1).padStart(2, "0")} / {DEVICE_META[d].label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-8 flex flex-col items-center">
        {active?.videoUrl && activeTab ? (
          <>
            <DeviceFrame device={activeTab} videoUrl={active.videoUrl} />
            <a
              href={active.videoUrl}
              download
              className="mt-6 px-5 py-2 rounded-md border border-border text-sm text-fg hover:border-accent transition"
            >
              Download {DEVICE_META[activeTab].label} video
            </a>
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="font-mono-display text-sm text-muted">
              {active?.state === "failed"
                ? "This job failed — try generating again."
                : "Rendering…"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}