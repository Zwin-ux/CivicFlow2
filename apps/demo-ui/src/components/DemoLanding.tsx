"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DragDrop from "@civiccopy/components/Intake/DragDrop";

type DemoSession = {
  sessionId: string;
  loanType: string;
  expiresAt: string;
};

type StreamPayload = {
  analytics?: { totalDocuments?: number; acceptedDocuments?: number; riskLevel?: string };
};

const channelName = "octodoc-demo-bus";

export function DemoLanding() {
  const [loanType, setLoanType] = useState<"504" | "5a">("504");
  const [session, setSession] = useState<DemoSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [status, setStatus] = useState<string>("Start a fresh OctoDoc session.");
  const [telemetry, setTelemetry] = useState<StreamPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSession = sessionStorage.getItem("demo_session");
    const storedLoanType = sessionStorage.getItem("demo_loan_type");
    if (storedSession) {
      setSession({
        sessionId: storedSession,
        loanType: (storedLoanType as "504" | "5a") || "504",
        expiresAt: sessionStorage.getItem("demo_expires") || new Date().toISOString(),
      });
    }
  }, []);

  useDemoStream(session?.sessionId, payload => setTelemetry(payload));

  const startDemo = useCallback(async () => {
    try {
      setIsStarting(true);
      setStatus("Contacting OctoDoc…");
      const res = await fetch("/api/v1/sba-demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanType }),
      });
      if (!res.ok) {
        throw new Error("Failed to start demo session");
      }
      const data = (await res.json()) as DemoSession;
      setSession(data);
      sessionStorage.setItem("demo_session", data.sessionId);
      sessionStorage.setItem("demo_loan_type", data.loanType);
      sessionStorage.setItem("demo_expires", data.expiresAt);
      announceDemoState("active", data);
      setStatus(`Demo ready · session ${data.sessionId.slice(0, 8)}`);
    } catch (error: any) {
      console.error(error);
      setStatus("We could not start the demo. Try again in a few seconds.");
    } finally {
      setIsStarting(false);
    }
  }, [loanType]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!session?.sessionId) {
        setStatus("Start the session before uploading documents.");
        return;
      }
      for (const file of files) {
        const form = new FormData();
        form.append("sessionId", session.sessionId);
        form.append("file", file, file.name);
        try {
          await fetch("/api/v1/sba-demo/upload", {
            method: "POST",
            body: form,
          });
          setStatus(`Uploaded ${file.name}`);
        } catch (error) {
          console.warn("Upload failed", error);
          setStatus(`Failed to upload ${file.name}`);
        }
      }
    },
    [session]
  );

  const loanLabel = loanType === "5a" ? "SBA 5(a)" : "SBA 504";
  const metrics = useMemo(() => {
    if (!telemetry?.analytics) return null;
    return {
      documents: telemetry.analytics.totalDocuments ?? 0,
      accepted: telemetry.analytics.acceptedDocuments ?? 0,
      risk: telemetry.analytics.riskLevel ?? "LOW",
    };
  }, [telemetry]);

  return (
    <div className="flex min-h-screen flex-col gap-s-12 px-s-16 py-s-16">
      <section className="glass-panel flex flex-col gap-s-8 p-s-16">
        <span className="demo-pill self-start" data-demo-status>
          Demo mode · {session ? loanLabel : "idle"}
        </span>
        <div className="flex flex-col gap-s-4">
          <h1 className="text-4xl font-semibold leading-tight">OctoDoc SBA Demo</h1>
          <p className="text-lg text-cc-muted max-w-2xl">
            Launch a deterministic OctoDoc session in seconds. Uploads auto-tag, AI validation narrates gaps, and every other CivicCopy surface stays in sync via BroadcastChannel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-s-4">
          <select
            value={loanType}
            onChange={(event) => setLoanType(event.target.value as "504" | "5a")}
            className="rounded-r-2 border border-white/10 bg-transparent px-s-8 py-s-4 text-sm"
            aria-label="Loan type"
          >
            <option value="504">SBA 504</option>
            <option value="5a">SBA 5(a)</option>
          </select>
          <button
            type="button"
            onClick={startDemo}
            disabled={isStarting}
            className="rounded-r-2 bg-cc-accent px-s-12 py-s-4 text-sm font-semibold text-cc-bg transition-[transform] duration-micro disabled:opacity-60"
          >
            {isStarting ? "Starting…" : "Start OctoDoc demo"}
          </button>
          <span className="text-sm text-cc-muted" data-demo-hint>
            {status}
          </span>
        </div>
        {metrics && (
          <div className="grid grid-cols-3 gap-s-4">
            <Metric label="Docs uploaded" value={metrics.documents} />
            <Metric label="Accepted" value={metrics.accepted} />
            <Metric label="Risk level" value={metrics.risk} />
          </div>
        )}
      </section>
      <section className="glass-panel p-s-16">
        <h2 className="mb-s-4 text-xl font-semibold">Upload workspace</h2>
        <DragDrop onFilesAdded={handleFiles} label="Drop SBA documents" description="AI tags uploads instantly and reconciles the checklist." />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-r-2 border border-white/10 bg-white/5 px-s-8 py-s-4 text-sm text-cc-muted">
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-cc-text">{value}</p>
    </article>
  );
}

function announceDemoState(state: string, context: DemoSession) {
  if (typeof window === "undefined") return;
  const detail = { state, context };
  window.dispatchEvent(new CustomEvent("demo:session-state", { detail }));
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;
  channel?.postMessage({ name: "demo:session-state", detail });
  channel?.close();
}

function useDemoStream(sessionId: string | undefined, onPayload: (payload: StreamPayload) => void) {
  useEffect(() => {
    if (!sessionId) return;
    if (typeof window === "undefined") return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;

    const connect = () => {
      source = new EventSource(`/api/v1/sba-demo/stream/${sessionId}`);
      source.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          onPayload(payload);
          window.dispatchEvent(new CustomEvent("demo:timeline-update", { detail: payload }));
          channel?.postMessage({ name: "demo:timeline-update", detail: payload });
        } catch (error) {
          console.warn("Failed to parse SSE payload", error);
        }
      };
      source.onerror = () => {
        source?.close();
        retry = setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      source?.close();
      if (retry) clearTimeout(retry);
      channel?.close();
    };
  }, [sessionId, onPayload]);
}

export default DemoLanding;
