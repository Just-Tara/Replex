"use client";

import Image from "next/image";
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
    <main className="min-h-screen px-4 sm:px-6 py-10 sm:py-24 overflow-x-hidden">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 flex items-center gap-3">
         <Image 
          src="/replex-logo.png" 
          alt="Replex Logo" 
          width={100} 
          height={100} 
          className="object-contain animate-rec w-[30px] h-[30px] sm:w-[32px] sm:h-[32px]"
          priority
        />
          <span className="font-mono-display text-lg tracking-widest text-fg font-semibold">
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