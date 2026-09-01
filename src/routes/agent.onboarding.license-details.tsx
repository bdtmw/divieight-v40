import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getAgentProfile, type AgentRow } from "@/lib/agent";
import { AgentOnboardingStepper } from "@/components/AgentOnboardingStepper";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/agent/onboarding/license-details")({
  head: () => ({
    meta: [
      { title: "Correct license details — divieight Professional Portal" },
      {
        name: "description",
        content: "Correct your real estate license number and issuing state, then re-run the ARELLO check.",
      },
      { property: "og:title", content: "Correct license details — divieight" },
      {
        property: "og:description",
        content: "Update your license information for ARELLO verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LicenseDetailsPage,
});

const db = supabase as unknown as { from: (table: string) => any };

function LicenseDetailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getAgentProfile(user.id).then((row) => {
      if (cancelled || !row) return;
      setAgent(row);
      setLicenseNumber(row.license_number);
      setLicenseState(row.license_state);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agent) return;
    if (!licenseNumber.trim() || !licenseState.trim()) {
      toast.error("License number and state are both required.");
      return;
    }
    setSaving(true);
    const { error } = await db
      .from("agents")
      .update({
        license_number: licenseNumber.trim(),
        license_state: licenseState.trim().toUpperCase(),
        license_verified: false,
        onboarding_status: "arello_pending",
        arello_pending_since: null,
      })
      .eq("id", agent.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("License details updated — re-running verification.");
    navigate({ to: "/agent/onboarding/license-check" });
  }

  return (
    <div className="space-y-8">
      <AgentOnboardingStepper current={1} />

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Correct your license details
        </h1>
        <p className="text-sm text-muted-foreground">
          Update the license number and issuing state, then we&apos;ll re-run the ARELLO check.
        </p>
      </header>

      <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
        <Field
          label="License number"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="e.g. 02012345"
        />
        <Field
          label="License state"
          value={licenseState}
          onChange={(e) => setLicenseState(e.target.value)}
          placeholder="e.g. CA"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save and re-run verification"}
        </button>
      </form>
    </div>
  );
}
