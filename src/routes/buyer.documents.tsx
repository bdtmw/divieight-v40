import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BLOCK_5_DOCUMENT_TYPE,
  BLOCK_5_TEXT,
} from "@/components/Block5AdviceNotice";

export const Route = createFileRoute("/buyer/documents")({
  head: () => ({
    meta: [
      { title: "My documents — divieight" },
      {
        name: "description",
        content: "Every agreement you've signed on your divieight Buyer Account.",
      },
      { property: "og:title", content: "My documents — divieight" },
      {
        property: "og:description",
        content: "Every agreement you've signed on your divieight Buyer Account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyerDocumentsPage,
});

interface SignedDoc {
  id: string;
  document_type: string;
  document_version: string;
  signed_name: string;
  document_hash: string | null;
  created_at: string;
}

const LABELS: Record<string, string> = {
  PRA: "Priority Reservation Agreement",
  HOLD_HARMLESS: "Hold Harmless & Background Check Consent",
  [BLOCK_5_DOCUMENT_TYPE]: "Independent Professional Advice Acknowledgment",
};

function BuyerDocumentsPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<SignedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        navigate({ to: "/buyer/login" });
        return;
      }
      const { data: acct } = await supabase
        .from("buyer_accounts")
        .select("id")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!acct) {
        navigate({ to: "/buyer/register" });
        return;
      }
      const { data } = await supabase
        .from("signed_documents")
        .select("id, document_type, document_version, signed_name, document_hash, created_at")
        .eq("buyer_account_id", acct.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setDocs((data as SignedDoc[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Buyer Account
      </p>
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
        My documents
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed agreements are stored immutably with a hash and timestamp.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            You haven't signed any documents yet.
          </p>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="flex items-start gap-3 border-b border-border/60 px-5 py-4 last:border-0"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {LABELS[d.document_type] ?? d.document_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  Version {d.document_version} · signed by {d.signed_name} ·{" "}
                  {new Date(d.created_at).toLocaleString()}
                </p>
                {d.document_hash ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                    {d.document_hash}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Block 5 · Independent professional advice
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{BLOCK_5_TEXT}</p>
      </div>

      <Link
        to="/buyer/dashboard"
        className="mt-6 inline-block rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
