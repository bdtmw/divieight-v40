import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listComplianceReviews,
  resolveComplianceReview,
} from "@/lib/listing-approval.functions";
import {
  getEscalationSettings,
  listStalledApprovalItems,
  runApprovalEscalationNow,
  updateEscalationSettings,
} from "@/lib/approval-escalation.functions";
import {
  DEFAULT_ESCALATION_SETTINGS,
  type EscalationSettings,
  type StalledApprovalItem,
} from "@/lib/approval-escalation";
import type { ComplianceReview } from "@/lib/listing-approval";

export const Route = createFileRoute("/admin/listing-compliance")({
  head: () => ({
    meta: [
      { title: "Compliance Review Queue — divieight Admin" },
      {
        name: "description",
        content: "Resolve escalated pre-publication compliance reviews for marketplace listings.",
      },
      { property: "og:title", content: "Compliance Review Queue — divieight Admin" },
      {
        property: "og:description",
        content: "Human review of flagged listing content before publication.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComplianceQueue,
});

function ComplianceQueue() {
  const [rows, setRows] = useState<ComplianceReview[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listComplianceReviews());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function decide(review: ComplianceReview, decision: "approved" | "denied") {
    const note = notes[review.id]?.trim();
    if (!note) return toast.error("A decision note is required.");
    setBusy(true);
    try {
      await resolveComplianceReview({ data: { reviewId: review.id, decision, note } });
      toast.success(decision === "approved" ? "Approved for publication." : "Publication denied.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that decision.");
    } finally {
      setBusy(false);
    }
  }

  const open = rows.filter((r) => r.status === "flagged" || r.status === "human_review");
  const closed = rows.filter((r) => !open.includes(r));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Listing compliance review
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gate 2 escalations. A listing cannot publish while a review is open or denied.
        </p>
      </header>

      <StalledApprovals />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && open.length === 0 && (
        <p className="text-sm text-muted-foreground">No open compliance items.</p>
      )}

      {open.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-5">
          <p className="break-words font-medium text-foreground">{r.address}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Flagged phrase(s): {r.flagged_phrases.join(", ") || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            Status: {r.status} · Raised {new Date(r.created_at).toLocaleString()}
          </p>
          <Input
            className="mt-3"
            placeholder="Decision note (required)"
            value={notes[r.id] ?? ""}
            onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => decide(r, "approved")}>
              Approve for publication
            </Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide(r, "denied")}>
              Deny
            </Button>
          </div>
        </div>
      ))}

      {closed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground">Resolved</h2>
          <ul className="mt-3 space-y-2">
            {closed.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <span className="font-medium text-foreground">{r.address}</span> —{" "}
                <span className="text-muted-foreground">
                  {r.status} · {r.resolution_note ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
