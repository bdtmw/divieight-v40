import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  disposeContentItem,
  listApprovalQueue,
} from "@/lib/listing-approval.functions";
import { CONTENT_TYPE_LABELS, type ContentItem } from "@/lib/listing-approval";

/**
 * Gate 1 — Listing-Content Approval Queue.
 * Used by the tagged Listing Agent, or by that agent's Broker of Record when
 * the agent is unavailable (the fallback is recorded in the audit log).
 */
export function ListingContentApprovalQueue({ propertyId }: { propertyId?: string }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [actingAsBroker, setActingAsBroker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listApprovalQueue();
      setItems(propertyId ? res.items.filter((i) => i.property_id === propertyId) : res.items);
      setActingAsBroker(res.actingAsBroker);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function act(
    item: ContentItem,
    disposition: "approved" | "approved_with_modification" | "rejected",
  ) {
    setBusy(true);
    try {
      const res = await disposeContentItem({
        data: {
          itemId: item.id,
          disposition,
          revisedText: draft[item.id],
          reason: reason[item.id],
          unavailabilityNote: actingAsBroker ? note : undefined,
        },
      });
      if (res.gateCleared) {
        toast.success(
          res.flagged.length > 0
            ? `Gate 1 cleared, but compliance flagged: ${res.flagged.join(", ")}`
            : "Both gates cleared — the listing is now live.",
        );
      } else {
        toast.success("Disposition recorded.");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record that decision.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading approval queue…</p>;
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing awaiting approval.</p>;

  return (
    <div className="space-y-4">
      {actingAsBroker && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm text-foreground">
            You are approving in place of an unavailable Listing Agent. Your decision and
            the note below are recorded in the audit log.
          </p>
          <Input
            className="mt-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note on the agent's unavailability"
          />
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {item.label ?? CONTENT_TYPE_LABELS[item.item_type]}
            </p>
            <p className="text-xs text-muted-foreground">{item.address}</p>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-sm text-foreground">
            {item.original_content}
          </p>

          <Textarea
            className="mt-3"
            rows={3}
            placeholder="Optional: edit the text to approve with modification"
            value={draft[item.id] ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, [item.id]: e.target.value }))}
          />
          <Input
            className="mt-2"
            placeholder="Reason (required to reject)"
            value={reason[item.id] ?? ""}
            onChange={(e) => setReason((r) => ({ ...r, [item.id]: e.target.value }))}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => act(item, "approved")}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || !draft[item.id]?.trim()}
              onClick={() => act(item, "approved_with_modification")}
            >
              Approve with modification
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy || !reason[item.id]?.trim()}
              onClick={() => act(item, "rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
