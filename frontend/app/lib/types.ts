
export const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type Device = "mobile" | "tablet" | "desktop";

export type JobState = {
  jobId: string;
  state: "waiting" | "active" | "delayed" | "completed" | "failed" | "unknown";
  progress: number;
  videoUrl?: string;
  error?: string;
};

export type HistoryItem = {
  _id: string;
  websiteUrl: string;
  device: Device;
  videoUrl: string;
  createdAt: string;
};

export const DEVICE_META: Record<
  Device,
  { label: string; frameClass: string; aspect: string }
> = {
  mobile: {
    label: "Mobile",
    frameClass: "rounded-[2rem] border-[6px]",
    aspect: "aspect-[390/844]",
  },
  tablet: {
    label: "Tablet",
    frameClass: "rounded-[1.25rem] border-[6px]",
    aspect: "aspect-[810/1080]",
  },
  desktop: {
    label: "Desktop",
    frameClass: "rounded-lg border-[10px] border-b-[28px]",
    aspect: "aspect-[1440/900]",
  },
};

export const ORDER: Device[] = ["mobile", "tablet", "desktop"];

export const isValidUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
