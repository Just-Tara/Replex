import { Device, DEVICE_META } from "../lib/types";

export function DeviceFrame({
  device,
  videoUrl,
  maxHeight = "60vh",
}: {
  device?: Device; // Notice the question mark? This tells TypeScript it might be missing
  videoUrl: string;
  maxHeight?: string;
}) {
  // BULLETPROOF FALLBACK: If the device is missing, force it to 'mobile' so it never crashes
  const safeDevice = device && DEVICE_META[device] ? device : "mobile";
  const meta = DEVICE_META[safeDevice];

  return (
    <div
      className={`border-surface-raised bg-black overflow-hidden ${meta.frameClass} ${meta.aspect}`}
      style={{ maxHeight, width: "auto" }}
    >
      <video src={videoUrl} controls className="h-full w-full object-contain" />
    </div>
  );
}