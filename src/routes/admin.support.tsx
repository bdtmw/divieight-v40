import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { StatusToneClass, when } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  statusLabel,
  type SupportTicketRow,
} from "@/lib/support";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupport,
});

type SortKey = "newest" | "oldest" | "category" | "status";

function AdminSupport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select(
          "id,submitter_auth_user_id,submitter_name,submitter_email,category,description,channel,status,internal_note,resolved_at,created_at",
        )
        .order("created_at", { ascending: false });
      if (error) console.error("[support] load failed", error);
      setRows((data as SupportTicketRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  async function setTicketStatus(row: SupportTicketRow, next: string) {
    if (next === row.status) return;
    const patch: Record<string, unknown> = {
      status: next,
      updated_at: new Date().toISOString(),
      resolved_at: next === "resolved" ? new Date().toISOString() : null,
    };
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update(patch)
      .eq("id", row.id);
    if (error) {
      toast.error("Could not update the ticket");
      return;
    }
    setRows((rs) =>
      rs.map((r) =>
        r.id === row.id
          ? { ...r, status: next, resolved_at: (patch['resolved_at'] as string | null) ?? null }
          : r,
      ),
    );
    if (user) {
      await logAudit({
        actorId: user.id,
        actorType: "admin",
        actionType: "support.ticket_status_changed",
        entityType: "support_ticket",
        entityId: row.id,
        metadata: { from: row.status, to: next, category: row.category },
      });
    }
    toast.success(`Marked ${statusLabel(next)}`);
  }

  async function saveNote(row: SupportTicketRow) {
    const note = (noteDraft[row.id] ?? "").trim();
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({ internal_note: note || null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast.error("Could not save the note");
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, internal_note: note || null } : r)));
    setNoteDraft((d) => ({ ...d, [row.id]: "" }));
    if (user) {
      await logAudit({
        actorId: user.id,
        actorType: "admin",
        actionType: "support.ticket_note_added",
        entityType: "support_ticket",
        entityId: row.id,
        metadata: { length: note.length },
      });
    }
    toast.success("Internal note saved");
  }

  const visible = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        (category === "all" || r.category === category) &&
        (status === "all" || r.status === status),
    );
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "category") return a.category.localeCompare(b.category);
      if (sort === "status") return a.status.localeCompare(b.status);
      return b.created_at.localeCompare(a.created_at);
    });
    return sorted;
  }, [rows, category, status, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Support tickets
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Requests submitted through the on-site support form.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={category} onChange={setCategory} label="Category">
            <option value="all">All categories</option>
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={setStatus} label="Status">
            <option value="all">All statuses</option>
            {SUPPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(v) => setSort(v as SortKey)} label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="category">By category</option>
            <option value="status">By status</option>
          </Select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No support tickets match these filters.
          </p>
        ) : (
          visible.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {r.category}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.submitter_name} · {r.submitter_email} ·{" "}
                    {r.submitter_auth_user_id ? "signed-in account" : "not signed in"} ·{" "}
                    {r.channel} · {when(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${StatusToneClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => setTicketStatus(r, e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {SUPPORT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                  {r.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => setTicketStatus(r, "resolved")}
                      className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:opacity-90"
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{r.description}</p>

              {r.internal_note ? (
                <p className="mt-3 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Internal note: </span>
                  {r.internal_note}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={noteDraft[r.id] ?? ""}
                  onChange={(e) => setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                  maxLength={1000}
                  placeholder={r.internal_note ? "Replace internal note…" : "Add an internal note…"}
                  className="h-9 min-w-[16rem] flex-1 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => saveNote(r)}
                  disabled={!(noteDraft[r.id] ?? "").trim()}
                  className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save note
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}
