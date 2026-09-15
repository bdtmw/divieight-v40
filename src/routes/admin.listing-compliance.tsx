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

/**
 * Gate 1 escalation view — reminders and the "stalled" flag only. Nothing here
 * changes a disposition; approve / modify / reject stay with the Listing Agent
 * (or their Broker of Record via the existing unavailable-agent provision).
 */
function StalledApprovals() {
  const [items, setItems] = useState<StalledApprovalItem[]>([]);
  const [settings, setSettings] = useState<EscalationSettings>(DEFAULT_ESCALATION_SETTINGS);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const [list, cfg] = await Promise.all([listStalledApprovalItems(), getEscalationSettings()]);
      setItems(list);
      setSettings(cfg);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveSettings() {
    setBusy(true);
    try {
      setSettings(await updateEscalationSettings({ data: settings }));
      toast.success("Escalation intervals saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save intervals.");
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    try {
      const res = await runApprovalEscalationNow();
      toast.success(
        `Checked ${res.scanned} item(s): ${res.firstReminders} reminder(s), ${res.secondReminders} escalation(s), ${res.stalled} newly stalled.`,
      );
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not run the check.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof EscalationSettings, label: string) => (
    <label className="block text-xs text-muted-foreground">
      {label}
      <Input
        className="mt-1"
        type="number"
        min={1}
        value={settings[key]}
        onChange={(e) => setSettings((s) => ({ ...s, [key]: Number(e.target.value) }))}
      />
    </label>
  );

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Listing approval — stalled items
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Content sitting in a Listing Agent's queue with no decision. Reminders go out
        automatically; past the final threshold the item is flagged here so you can contact the
        seller directly.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {field("first_reminder_hours", "First reminder (hours)")}
        {field("second_reminder_hours", "Second reminder + Broker (hours)")}
        {field("stalled_hours", "Flag as stalled (hours)")}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={saveSettings}>
          Save intervals
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={runNow}>
          Run escalation check now
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Nothing stalled right now.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="break-words font-medium text-foreground">{i.address}</p>
                <span className="text-xs font-semibold text-destructive">
                  Stalled · {i.hours_waiting}h waiting
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {i.label ?? i.item_type} · queued {new Date(i.queued_at).toLocaleString()} ·
                Listing Agent: {i.listing_agent_name ?? "—"}
                {i.broker_name ? ` (${i.broker_name})` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reminders: {i.reminder_first_sent_at ? "1st sent" : "1st pending"} ·{" "}
                {i.reminder_second_sent_at ? "2nd sent (broker notified)" : "2nd pending"}
              </p>
              <p className="mt-2 break-words text-sm text-foreground">
                Seller: {i.seller_name ?? "—"} · {i.seller_email ?? "—"}
                {i.seller_phone ? ` · ${i.seller_phone}` : ""} · onboarding:{" "}
                {i.seller_onboarding_status ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
