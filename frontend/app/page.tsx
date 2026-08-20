"use client";

import { useVideoJobs } from "./hooks/useVideoJobs";
import { useHistory } from "./hooks/useHistory";
import { GenerateForm } from "./components/GenerateForm";
import { JobStatusList } from "./components/JobStatusList";
import { PreviewPanel } from "./components/PreviewPanel";
import { HistoryPanel } from "./components/HistoryPanel";

export default function Home() {
  const history = useHistory();
  const { jobs, activeTab, setActiveTab, submitting, formError, generate } =
    useVideoJobs(history.load);

  return (
    <main className="min-h-screen px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full bg-accent animate-rec"
            aria-hidden="true"
          />
          <span className="font-mono-display text-sm tracking-widest text-muted">
            Replex
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-fg mb-2">
          Turn a URL into a demo reel
        </h1>
        <p className="text-muted mb-10">
          Paste a link. Get back mobile and desktop walkthrough videos, ready to post.
        </p>

        <GenerateForm submitting={submitting} formError={formError} onGenerate={generate} />

        <JobStatusList jobs={jobs} />

        <PreviewPanel jobs={jobs} activeTab={activeTab} setActiveTab={setActiveTab} />

        <HistoryPanel
          history={history.history}
          loading={history.loading}
          error={history.error}
          deletingId={history.deletingId}
          onRefresh={history.load}
          onDelete={history.remove}
        />
      </div>
    </main>
  );
}