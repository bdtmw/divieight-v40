import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StatusToneClass, when } from "@/lib/admin";

export const Route = createFileRoute("/admin/contacts")({
  component: AdminContacts,
});

type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "in_progress", "resolved"] as const;

function AdminContacts() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("id,name,email,phone,subject,message,status,created_at")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setRows((data as ContactRow[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Could not update status");
      return;
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Marked ${status.replace("_", " ")}`);
  }

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Contact inbox
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Messages submitted through the public contact form.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </p>
        ) : (
          filtered.map((r) => (
            <article key={r.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {r.subject}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.name} · {r.email}
                    {r.phone ? ` · ${r.phone}` : ""} · {when(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${StatusToneClass(r.status)}`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                  <select
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{r.message}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
