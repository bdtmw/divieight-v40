import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Copy, Download, QrCode, Link2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import {
  createAttributionToken,
  deleteAttributionToken,
  getTaggedBuyerCounts,
  listAttributionTokens,
  referralUrl,
  type AttributionTokenRow,
} from "@/lib/attribution";

export const Route = createFileRoute("/agent/attribution")({
  head: () => ({
    meta: [
      { title: "Referral links & QR codes — divieight Professional Portal" },
      {
        name: "description",
        content:
          "Generate attribution links and QR codes, and see how many buyers entered divieight through them.",
      },
      { property: "og:title", content: "Referral links & QR codes — divieight" },
      {
        property: "og:description",
        content: "Track buyer attribution for your divieight referral links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentAttributionPage,
});

function AgentAttributionPage() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [tokens, setTokens] = useState<AttributionTokenRow[]>([]);
  const [counts, setCounts] = useState<{ total: number; byToken: Record<string, number> }>({
    total: 0,
    byToken: {},
  });
  const [label, setLabel] = useState("");
  const [tokenType, setTokenType] = useState<"link" | "qr">("link");
  const [submitting, setSubmitting] = useState(false);
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});

  const refresh = useCallback(async (agentId: string) => {
    const [rows, tagged] = await Promise.all([
      listAttributionTokens(agentId),
      getTaggedBuyerCounts(agentId),
    ]);
    setTokens(rows);
    setCounts(tagged);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (cancelled || !row) return;
      setAgent(row);
      void refresh(row.id);
    });
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const t of tokens) {
        next[t.token] = await QRCode.toDataURL(referralUrl(t.token), {
          width: 320,
          margin: 1,
        });
      }
      if (!cancelled) setQrPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens]);

  async function onGenerate(e: FormEvent) {
    e.preventDefault();
    if (!agent || !user) return;
    setSubmitting(true);
    const { error } = await createAttributionToken({
      agentId: agent.id,
      actorId: user.id,
      tokenType,
      campaignLabel: label,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    setLabel("");
    toast.success("Attribution token generated");
    void refresh(agent.id);
  }

  async function onDelete(id: string) {
    if (!agent) return;
    const { error } = await deleteAttributionToken(id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Token removed");
    void refresh(agent.id);
  }

  function copy(token: string) {
    navigator.clipboard
      .writeText(referralUrl(token))
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Copy failed — select the link manually"));
  }

  function downloadQr(token: string) {
    const src = qrPreviews[token];
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `divieight-referral-${token}.png`;
    a.click();
  }

  if (!agent) return <p className="text-sm text-muted-foreground">Loading your profile…</p>;

  const totalClicks = tokens.reduce((sum, t) => sum + (t.click_count ?? 0), 0);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Attribution</p>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Referral links & QR codes
        </h1>
        <p className="text-sm text-muted-foreground">
          Share a link or QR code. Any buyer who registers after following it carries your Lead
          Attribution Tag for 12 months, which is what determines the buyer-side commission split
          at closing. It is not a payment from divieight.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active tokens", value: tokens.length },
          { label: "Total clicks", value: totalClicks },
          { label: "Buyers tagged", value: counts.total },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Generate a new token</h2>
        <form onSubmit={onGenerate} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Campaign label (optional)
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              placeholder="Spring open house flyer"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Type</span>
            <select
              value={tokenType}
              onChange={(e) => setTokenType(e.target.value as "link" | "qr")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="link">Deep link</option>
              <option value="qr">QR code</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 self-end rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {submitting ? "Generating…" : "Generate"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Your tokens</h2>
        {tokens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No attribution tokens yet. Generate one above to start tracking buyers.
          </p>
        ) : (
          <div className="space-y-4">
            {tokens.map((t) => (
              <article
                key={t.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
              >
                {qrPreviews[t.token] ? (
                  <img
                    src={qrPreviews[t.token]}
                    alt={`QR code for referral token ${t.token}`}
                    className="h-24 w-24 rounded-md border border-border bg-white"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-md border border-dashed border-border" />
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {t.token_type === "qr" ? (
                      <QrCode className="h-4 w-4 text-accent" />
                    ) : (
                      <Link2 className="h-4 w-4 text-accent" />
                    )}
                    {t.campaign_label ?? "Untitled campaign"}
                  </p>
                  <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {referralUrl(t.token)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.click_count ?? 0} clicks · {counts.byToken[t.token] ?? 0} buyers tagged ·
                    created {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copy(t.token)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadQr(t.token)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" /> QR
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
