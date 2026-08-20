"use client";

import { useState } from "react";
import { Device, DEVICE_META, ORDER } from "../lib/types";

export function GenerateForm({
  submitting,
  formError,
  onGenerate,
}: {
  submitting: boolean;
  formError: string | null;
  onGenerate: (url: string, selected: Device[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<Device[]>(["mobile", "desktop"]);

  const toggleDevice = (d: Device) => {
    setSelected((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5 mb-6">
      <label htmlFor="url" className="sr-only">
        Website URL
      </label>
      <input
        id="url"
        type="text"
        inputMode="url"
        placeholder="https://yoursite.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full bg-surface-raised border border-border rounded-md px-4 py-3 font-mono-display text-sm text-fg placeholder:text-muted outline-none focus-visible:border-accent"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ORDER.map((d) => {
          const isOn = selected.includes(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDevice(d)}
              aria-pressed={isOn}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isOn
                  ? "bg-accent/10 border-accent text-fg"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {DEVICE_META[d].label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onGenerate(url, selected)}
          disabled={submitting}
          className="ml-auto px-5 py-2 rounded-md bg-accent text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          {submitting ? "Starting…" : "Generate"}
        </button>
      </div>

      {formError && <p className="mt-3 text-sm text-accent">{formError}</p>}
    </div>
  );
}