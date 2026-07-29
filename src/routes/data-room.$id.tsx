import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import {
  DATA_ROOM_TYPE_LABELS,
  formatUploadedAt,
  groupByType,
  normalizeType,
  type DataRoomDocument,
} from "@/lib/data-room";
import { getDataRoom, type DataRoomPayload } from "@/lib/data-room.functions";

export const Route = createFileRoute("/data-room/$id")({
  head: () => ({
    meta: [
      { title: "Virtual Data Room — divieight" },
      {
        name: "description",
        content:
          "Golden Ticket holders review inspection reports, title documents and rental projections for this fractional home.",
      },
      { property: "og:title", content: "Virtual Data Room — divieight" },
      {
        property: "og:description",
        content: "Gated diligence documents for vetted divieight buyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataRoomPage,
});

type Doc = DataRoomDocument & { signed_url: string | null };

function DataRoomPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchDataRoom = useServerFn(getDataRoom);

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<DataRoomPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        navigate({ to: "/buyer/login" });
        return;
      }

      let result: DataRoomPayload | null = null;
      try {
        result = await fetchDataRoom({ data: { propertyId: id } });
      } catch {
        result = null;
      }
      if (cancelled) return;

      // Hard gate: anyone without a Golden Ticket goes back to the listing,
      // which renders the locked Virtual Data Room message.
      if (!result || !result.allowed) {
        if (result?.reason === "no_buyer_account") {
          toast.error("Buyer accounts only. Register as a buyer to request access.");
          navigate({ to: "/buyer/register" });
          return;
        }
        toast.error(
          "Complete your vetting to unlock the Virtual Data Room for this home.",
        );
        navigate({ to: "/properties/$id", params: { id } });
        return;
      }

      setPayload(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, fetchDataRoom]);

  async function openDoc(doc: Doc) {
    if (!doc.signed_url) {
      toast.error("This document is temporarily unavailable. Please refresh.");
      return;
    }
    window.open(doc.signed_url, "_blank", "noopener,noreferrer");
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await logAudit({
        actorId: auth.user.id,
        actorType: "buyer",
        actionType: "buyer.data_room_document_viewed",
        entityType: "property_document",
        entityId: doc.id,
        metadata: {
          property_id: doc.property_id,
          document_name: doc.document_name,
          document_type: doc.document_type,
        },
      });
    }
  }

  if (loading || !payload?.property) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Unlocking the data room…</p>
      </div>
    );
  }

  const property = payload.property;
  const groups = groupByType(payload.documents as DataRoomDocument[]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/properties/$id"
        params={{ id }}
        className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        ← Back to the listing
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Diligence
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
        Virtual Data Room
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {property.address} · {property.city}, {property.state} {property.zip}
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p>
          Access granted through your Golden Ticket. Every document you open is
          recorded in the divieight audit trail.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          The seller hasn't published any diligence documents for this home yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.type}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {DATA_ROOM_TYPE_LABELS[group.type]}
              </h2>
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {group.docs.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {doc.document_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {formatUploadedAt(doc.uploaded_at)} ·{" "}
                          {DATA_ROOM_TYPE_LABELS[normalizeType(doc.document_type)]}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDoc(doc as Doc)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
