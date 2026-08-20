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
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5 mb-6">
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

      {/* Controls Container */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Device selection pills: Spans full-width & spaces evenly on mobile */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2">
          {ORDER.map((d) => {
            const isOn = selected.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDevice(d)}
                aria-pressed={isOn}
                className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  isOn
                    ? "bg-accent/10 border-accent text-fg"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {DEVICE_META[d].label}
              </button>
            );
          })}
        </div>

        {/* Generate button: full-width on mobile, auto-width on desktop */}
        <button
          type="button"
          onClick={() => onGenerate(url, selected)}
          disabled={submitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-accent text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition text-center"
        >
          {submitting ? "Starting…" : "Generate"}
        </button>
      </div>

      {/* Enhanced error message block */}
      {formError && (
        <div className="mt-3 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          <p className="font-medium">Something went wrong, check your internet connection or try again later.</p>
          <p className="mt-0.5 text-xs opacity-90">{formError}</p>
        </div>
      )}
    </div>
  );
}