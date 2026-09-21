import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DD_CATEGORY_LABELS,
  SECONDARY_VERIFICATION_OPTIONS,
  deviceFingerprint,
  formatDate,
} from "@/lib/due-diligence";
import {
  acknowledgeAsAgent,
  getAgentDiligenceTasks,
  type AgentDiligenceTask,
} from "@/lib/due-diligence.functions";

export const Route = createFileRoute("/agent/due-diligence")({
  head: () => ({
    meta: [
      { title: "Due diligence acknowledgments — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Parallel Resident Agent acknowledgment of due-diligence materials for your tethered Buyer Accounts.",
      },
      { property: "og:title", content: "Due diligence acknowledgments — divieight" },
      {
        property: "og:description",
        content: "Confirm review of each required due-diligence document for your clients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentDueDiligencePage,
});

async function clientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) return (await res.json()).ip ?? null;
  } catch {
    /* ignore */
  }
  return null;
}

function AgentDueDiligencePage() {
  const load = useServerFn(getAgentDiligenceTasks);
  const ack = useServerFn(acknowledgeAsAgent);
  const [tasks, setTasks] = useState<AgentDiligenceTask[]>([]);
  const [ackText, setAckText] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await load();
    setTasks(r.tasks);
    setAckText(r.ackText);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return <p className="px-6 py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  const pending = tasks.filter((t) => !t.acknowledged);
  const done = tasks.filter((t) => t.acknowledged);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Parallel Resident Agent acknowledgment
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        Due diligence
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each required document must carry your acknowledgment alongside your client's, pinned to
        the same document version. The window is 7 calendar days from placement.
      </p>

      <div className="mt-8 space-y-4">
        {pending.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Nothing awaiting your acknowledgment.
          </p>
        ) : null}
        {pending.map((task) => (
          <TaskCard
            key={`${task.documentId}:${task.buyerAccountId}`}
            task={task}
            ackText={ackText}
            onAcknowledge={async (verification, noticeShownAt, typedName) => {
              const r = await ack({
                data: {
                  documentId: task.documentId,
                  buyerAccountId: task.buyerAccountId,
                  contentHash: task.contentHash,
                  signedName: typedName,
                  secondaryVerificationMethod: verification,
                  ipAddress: await clientIp(),
                  deviceFingerprint: deviceFingerprint(),
                  noticeShownAt,
                },
              });
              if (r.error) {
                toast.error(r.error);
                return;
              }
              toast.success("Acknowledgment recorded.");
              await refresh();
            }}
          />
        ))}

        {done.length > 0 ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Acknowledged
            </p>
            <ul className="mt-3 space-y-2">
              {done.map((t) => (
                <li
                  key={`${t.documentId}:${t.buyerAccountId}`}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {t.documentTitle} — {t.buyerLabel} · {t.propertyLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  ackText,
  onAcknowledge,
}: {
  task: AgentDiligenceTask;
  ackText: string;
  onAcknowledge: (
    verification: string,
    noticeShownAt: string | null,
    typedName: string,
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [verification, setVerification] = useState<string>(
    SECONDARY_VERIFICATION_OPTIONS[0].value,
  );
  const [noticeShownAt, setNoticeShownAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && task.isGoverning && !noticeShownAt) setNoticeShownAt(new Date().toISOString());
  }, [open, task.isGoverning, noticeShownAt]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {DD_CATEGORY_LABELS[task.category]}
      </p>
      <p className="mt-1 break-words text-base font-medium text-foreground">
        {task.documentTitle}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {task.buyerLabel} · {task.propertyLabel} · placed {formatDate(task.placedAt)} · due{" "}
        {formatDate(task.dueAt)}
      </p>
      {task.overdue ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          Overdue — your Broker of Record and your client have been notified.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
      >
        <FileText className="h-4 w-4" />
        {open ? "Hide document" : "Open and review"}
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolled(true);
            }}
            className="max-h-96 overflow-y-auto rounded-lg border border-border bg-background p-4"
          >
            {task.signedUrl ? (
              <iframe
                title={task.documentTitle}
                src={task.signedUrl}
                className="h-[28rem] w-full rounded"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This document is temporarily unavailable. Please refresh.
              </p>
            )}
            <div className="h-[30rem]" aria-hidden />
            <p className="pb-2 text-center text-xs text-muted-foreground">— end of document —</p>
          </div>

          {task.isGoverning ? (
            <div className="rounded-lg border border-accent/40 bg-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Independent-Review Notice
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                This is a legal document with consequences personal to you. Neither divieight nor
                your real estate agent provides legal or tax advice. You have been advised to have
                your own attorney review this document before you acknowledge it.
              </p>
            </div>
          ) : null}

          <label className="flex items-start gap-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={checked}
              disabled={!scrolled}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              {ackText}
              {!scrolled ? (
                <span className="block text-xs text-muted-foreground">
                  Scroll the document to the end to enable this.
                </span>
              ) : null}
            </span>
          </label>

          <input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Full legal name"
            className="h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm"
          />

          <label className="block text-xs font-medium text-muted-foreground">
            Secondary verification
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className="mt-1 block h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              {SECONDARY_VERIFICATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={!checked || !scrolled || typedName.trim().length < 2 || saving}
            onClick={async () => {
              setSaving(true);
              await onAcknowledge(verification, noticeShownAt, typedName.trim());
              setSaving(false);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Recording…" : "Record acknowledgment"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
