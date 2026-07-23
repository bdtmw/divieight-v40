import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { Field } from "@/components/Field";
import { cn } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/onboarding/property")({
  head: () => ({
    meta: [
      { title: "Property verification — divieight" },
      { name: "description", content: "Confirm ownership and disclose encumbrances for your property." },
    ],
  }),
  component: PropertyScreen,
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per doc
const ENCUMBRANCE_OPTIONS = [
  { key: "liens", label: "Liens" },
  { key: "easements", label: "Easements" },
  { key: "covenants", label: "Covenants / CC&Rs" },
  { key: "other", label: "Other" },
] as const;

type EncumbranceKey = (typeof ENCUMBRANCE_OPTIONS)[number]["key"];

type AddressFields = {
  address: string;
  city: string;
  state: string;
  zip: string;
};

function PropertyScreen() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log(user);

  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [addr, setAddr] = useState<AddressFields>({
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFields | "owner", string>>>({});

  const [hasCoOwners, setHasCoOwners] = useState<boolean>(false);
  const [coOwners, setCoOwners] = useState<string[]>([""]);

  const [encumbrances, setEncumbrances] = useState<Record<EncumbranceKey, boolean>>({
    liens: false,
    easements: false,
    covenants: false,
    other: false,
  });
  const [encumbranceDetails, setEncumbranceDetails] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const anyEncumbrance = Object.values(encumbrances).some(Boolean);

  function validate(): boolean {
    const next: Partial<Record<keyof AddressFields | "owner", string>> = {};
    if (!ownerConfirmed) next.owner = "Please confirm you are the owner or authorized agent.";
    if (!addr.address.trim()) next.address = "Street address is required.";
    if (!addr.city.trim()) next.city = "City is required.";
    if (!addr.state.trim()) next.state = "State is required.";
    if (!addr.zip.trim()) next.zip = "ZIP is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addCoOwner() {
    setCoOwners((s) => [...s, ""]);
  }
  function updateCoOwner(i: number, value: string) {
    setCoOwners((s) => s.map((v, idx) => (idx === i ? value : v)));
  }
  function removeCoOwner(i: number) {
    setCoOwners((s) => (s.length === 1 ? [""] : s.filter((_, idx) => idx !== i)));
  }

  function handleFilesPicked(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      toast.error(`${tooBig.name} exceeds 20MB.`);
      return;
    }
    setFiles((s) => [...s, ...picked]);
  }
  function removeFile(i: number) {
    setFiles((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!user) {
      toast.error("You need to be signed in.");
      navigate({ to: "/login" });
      return;
    }
    if (!validate()) return;

    setSubmitting(true);

    // Upload supporting docs first
    const uploaded: { name: string; path: string; size: number; type: string }[] = [];
    for (const f of files) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("property-documents")
        .upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) {
        setSubmitting(false);
        toast.error(`Upload failed: ${upErr.message}`);
        return;
      }
      uploaded.push({ name: f.name, path, size: f.size, type: f.type });
    }

    const cleanedCoOwners = hasCoOwners ? coOwners.map((n) => n.trim()).filter(Boolean) : [];

    // Snapshot the seller's current exit election onto this property so future
    // changes to the seller-wide default don't retroactively alter old listings.
    const { data: sellerSnap } = await supabase
      .from("sellers")
      .select("exit_type, retained_shares")
      .eq("id", user.id)
      .maybeSingle();
    const snapshotExit = sellerSnap?.exit_type ?? "full_exit";
    const snapshotRetained =
      snapshotExit === "hybrid_exit" && typeof sellerSnap?.retained_shares === "number"
        ? sellerSnap.retained_shares
        : 0;

    const { data: property, error: insertErr } = await supabase
      .from("properties")
      .insert({
        seller_id: user.id,
        address: addr.address.trim(),
        city: addr.city.trim(),
        state: addr.state.trim(),
        zip: addr.zip.trim(),
        status: "draft",
        exit_type: snapshotExit,
        retained_shares: snapshotRetained,
        has_co_owners: hasCoOwners,
        co_owners: cleanedCoOwners,
        encumbrances: {
          types: Object.entries(encumbrances)
            .filter(([, v]) => v)
            .map(([k]) => k),
          details: anyEncumbrance ? encumbranceDetails.trim() : "",
        },
        supporting_documents: uploaded,
      })
      .select("id")
      .single();

    if (insertErr || !property) {
      setSubmitting(false);
      toast.error(insertErr?.message ?? "Couldn't save property.");
      return;
    }

    const { error: sellerErr } = await supabase
      .from("sellers")
      .update({ onboarding_status: "listing_creation_pending" })
      .eq("id", user.id);

    setSubmitting(false);
    if (sellerErr) {
      toast.error(sellerErr.message);
      return;
    }
    await logAudit({
      actorId: user.id,
      actionType: "seller.property_created",
      entityType: "property",
      entityId: property.id,
      metadata: {
        city: addr.city.trim(),
        state: addr.state.trim(),
        exit_type: snapshotExit,
        retained_shares: snapshotRetained,
        has_co_owners: hasCoOwners,
      },
    });
    toast.success("Property saved.");
    navigate({ to: "/onboarding/listing" });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <OnboardingStepper current={3} />

      <div className="mt-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Step 3 · Property</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Verify your property
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Confirm ownership and disclose anything that could affect title.
        </p>
      </div>

      {/* Ownership + address */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Ownership</h2>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={ownerConfirmed}
            onChange={(e) => setOwnerConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
          />
          <span>I confirm I am the owner of record, or the authorized agent of the owner, of the property below.</span>
        </label>
        {errors.owner ? <p className="mt-2 text-xs text-destructive">{errors.owner}</p> : null}

        <div className="mt-6 grid gap-4">
          <Field
            label="Street address"
            name="address"
            value={addr.address}
            onChange={(e) => setAddr((s) => ({ ...s, address: e.target.value }))}
            error={errors.address}
            placeholder="123 Market St, Apt 4B"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="City"
              name="city"
              value={addr.city}
              onChange={(e) => setAddr((s) => ({ ...s, city: e.target.value }))}
              error={errors.city}
            />
            <Field
              label="State"
              name="state"
              value={addr.state}
              onChange={(e) => setAddr((s) => ({ ...s, state: e.target.value }))}
              error={errors.state}
              placeholder="CA"
            />
            <Field
              label="ZIP"
              name="zip"
              value={addr.zip}
              onChange={(e) => setAddr((s) => ({ ...s, zip: e.target.value }))}
              error={errors.zip}
              placeholder="94103"
            />
          </div>
        </div>
      </section>

      {/* Co-owners */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Co-owners</h2>
        <p className="mt-1 text-sm text-muted-foreground">Does anyone else appear on title with you?</p>
        <div className="mt-4 inline-flex overflow-hidden rounded-md border border-border">
          {[
            { label: "No", value: false },
            { label: "Yes", value: true },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setHasCoOwners(opt.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                hasCoOwners === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasCoOwners ? (
          <div className="mt-5 space-y-3">
            {coOwners.map((name, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label={`Co-owner ${i + 1}`}
                    name={`co_owner_${i}`}
                    value={name}
                    onChange={(e) => updateCoOwner(i, e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCoOwner(i)}
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:bg-muted"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCoOwner}
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              + Add another co-owner
            </button>
          </div>
        ) : null}
      </section>

      {/* Encumbrance disclosure */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Encumbrance disclosure</h2>
        <p className="mt-1 text-sm text-muted-foreground">Select anything that applies to this property.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ENCUMBRANCE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={encumbrances[opt.key]}
                onChange={(e) => setEncumbrances((s) => ({ ...s, [opt.key]: e.target.checked }))}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              {opt.label}
            </label>
          ))}
        </div>

        {anyEncumbrance ? (
          <div className="mt-5">
            <label htmlFor="encumbrance_details" className="text-sm font-medium text-foreground">
              Please provide details
            </label>
            <textarea
              id="encumbrance_details"
              value={encumbranceDetails}
              onChange={(e) => setEncumbranceDetails(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              placeholder="Describe the liens, easements, covenants, or other encumbrances."
            />
          </div>
        ) : null}
      </section>

      {/* Supporting documents */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-foreground">Supporting documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. Upload deed, prior title insurance, or anything relevant. PDFs or images, up to 20MB each.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Add files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              handleFilesPicked(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {files.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="truncate text-foreground">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save and continue"}
        </button>
      </div>
    </div>
  );
}
