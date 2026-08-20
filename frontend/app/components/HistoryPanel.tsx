"use client";

import { useState } from "react";
import { Device, DEVICE_META, HistoryItem, ORDER } from "../lib/types";
import { DeviceFrame } from "./DeviceFrame";

export function HistoryPanel({
  history,
  loading,
  error,
  deletingId,
  onRefresh,
  onDelete,
}: {
  history: HistoryItem[];
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Device | "all">("all");

  const filtered = history.filter((h) => filter === "all" || h.device === filter);

  const handleDelete = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4">
        <h2 className="font-mono-display text-xs tracking-widest text-muted">HISTORY</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {(["all", ...ORDER] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  filter === f
                    ? "border-accent text-fg"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {f === "all" ? "All" : DEVICE_META[f].label}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-muted hover:text-fg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border overflow-hidden">
        {loading && (
          <p className="px-5 py-8 text-sm text-muted text-center font-mono-display animate-pulse">
            Loading…
          </p>
        )}

        {/* Enhanced Error State */}
        {!loading && error && (
          <div className="px-5 py-8 bg-red-500/5 text-center">
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Enhanced Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-5 py-12 text-center flex flex-col items-center justify-center">
            <p className="text-sm text-muted">
              Nothing generated yet — your past demos will show up here.
            </p>
          </div>
        )}

        {!loading &&
          filtered.map((item) => {
            const isOpen = expandedId === item._id;
            return (
              <div key={item._id}>
                <div className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-surface-raised transition-colors min-w-0">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : item._id)}
                    className="flex-1 flex items-center gap-3 sm:gap-4 text-left min-w-0"
                  >
                    <span className="w-14 sm:w-16 shrink-0 font-mono-display text-[10px] sm:text-[11px] tracking-widest text-muted">
                      {item.device ? item.device.toUpperCase() : "—"}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm text-fg">
                      {item.websiteUrl}
                    </span>
                    <span className="hidden sm:inline font-mono-display text-[11px] text-muted shrink-0">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>

                  {confirmDeleteId === item._id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                        className="text-xs text-accent hover:brightness-110"
                      >
                        {deletingId === item._id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-muted hover:text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(item._id)}
                      aria-label="Delete video"
                      className="shrink-0 text-muted hover:text-accent transition-colors text-sm px-1"
                    >
                      ×
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 flex flex-col items-center bg-surface-raised/30">
                    <DeviceFrame device={item.device} videoUrl={item.videoUrl} />
                    <a
                      href={item.videoUrl}
                      download
                      className="mt-4 px-4 py-1.5 rounded-md border border-border text-xs text-fg hover:border-accent transition"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}