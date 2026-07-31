import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const PERKS_CONSENT_TEXT =
  "I want access to exclusive divieight Member Perks. I agree that divieight may share anonymized demographic and budgetary data with curated partners for preferred pricing. My personal information will not be shared without further explicit consent.";

/**
 * Block 3 — Lifestyle Perks / Anonymized Data Sharing consent.
 *
 * Shown as a dismissible dashboard prompt (rather than a blocking onboarding
 * screen) because the consent is entirely optional: buyers can decline or
 * dismiss and continue using the platform normally.
 */
export function LifestylePerksConsent({
  buyerAccountId,
  authUserId,
}: {
  buyerAccountId: string;
  authUserId: string;
}) {
  const [state, setState] = useState<{
    consent: boolean;
    consentAt: string | null;
    dismissedAt: string | null;
  } | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("buyer_accounts")
        .select(
          "lifestyle_perks_consent, lifestyle_perks_consent_at, lifestyle_perks_prompt_dismissed_at",
        )
        .eq("id", buyerAccountId)
        .maybeSingle();
      if (cancelled || !data) return;
      setState({
        consent: data.lifestyle_perks_consent,
        consentAt: data.lifestyle_perks_consent_at,
        dismissedAt: data.lifestyle_perks_prompt_dismissed_at,
      });
      setChecked(data.lifestyle_perks_consent);
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerAccountId]);

  if (!state) return null;
  if (!state.consent && state.dismissedAt) return null;

  async function save(optIn: boolean) {
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("buyer_accounts")
      .update({
        lifestyle_perks_consent: optIn,
        lifestyle_perks_consent_at: optIn ? now : null,
        lifestyle_perks_prompt_dismissed_at: now,
      })
      .eq("id", buyerAccountId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your preference");
      return;
    }
    await logAudit({
      actorId: authUserId,
      actorType: "buyer",
      actionType: optIn ? "buyer.perks_consent_given" : "buyer.perks_consent_declined",
      entityType: "buyer_account",
      entityId: buyerAccountId,
      metadata: { consent_text: PERKS_CONSENT_TEXT, consent: optIn },
    });
    setState({ consent: optIn, consentAt: optIn ? now : null, dismissedAt: now });
    toast.success(optIn ? "Member Perks enabled" : "Preference saved — no data sharing");
  }

  if (state.consent) {
    return (
      <section className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-display text-base font-semibold text-foreground">
              Member Perks active
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You opted in on{" "}
              {state.consentAt ? new Date(state.consentAt).toLocaleDateString() : "—"}. Only
              anonymized demographic and budgetary data is shared with curated partners.
            </p>
            <button
              type="button"
              onClick={() => save(false)}
              disabled={saving}
              className="mt-3 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
            >
              Withdraw consent
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mt-6 rounded-xl border border-border bg-card p-5">
      <button
        type="button"
        aria-label="Dismiss Member Perks prompt"
        onClick={() => save(false)}
        disabled={saving}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-display text-base font-semibold text-foreground">
            divieight Member Perks
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Decline and your account continues exactly as it is.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[hsl(var(--accent))]"
            />
            <span className="text-sm leading-relaxed text-foreground">{PERKS_CONSENT_TEXT}</span>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!checked || saving}
              onClick={() => save(true)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Enable Member Perks"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
