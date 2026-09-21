import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const TYPED_INITIALS_VERIFICATION = "typed_initials";

function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((part) => part[0]).join("").slice(0, 4).toUpperCase();
}

export function SecondaryVerification({
  signerName,
  value,
  onChange,
  onVerifiedChange,
  disabled = false,
}: {
  signerName: string;
  value: string;
  onChange: (method: string) => void;
  onVerifiedChange: (verified: boolean) => void;
  disabled?: boolean;
}) {
  const [typedInitials, setTypedInitials] = useState("");
  const expectedInitials = useMemo(() => initialsFor(signerName), [signerName]);
  const verified =
    expectedInitials.length > 0 &&
    typedInitials.trim().replace(/\s+/g, "").toUpperCase() === expectedInitials;

  useEffect(() => {
    if (value !== TYPED_INITIALS_VERIFICATION) onChange(TYPED_INITIALS_VERIFICATION);
  }, [onChange, value]);

  useEffect(() => {
    onVerifiedChange(verified);
  }, [onVerifiedChange, verified]);

  useEffect(() => {
    setTypedInitials("");
  }, [signerName]);

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Secondary verification</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Type the Account Member's initials to verify this acknowledgment.
          </p>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </span>
        ) : null}
      </div>
      <Label htmlFor="secondary-initials" className="mt-4 block text-xs text-muted-foreground">
        Initials
      </Label>
      <Input
        id="secondary-initials"
        value={typedInitials}
        onChange={(event) => setTypedInitials(event.target.value)}
        disabled={disabled}
        placeholder={expectedInitials || "Initials"}
        autoComplete="off"
        className="mt-2 max-w-48 uppercase tracking-[0.18em]"
      />
      {typedInitials && !verified ? (
        <p className="mt-2 text-xs text-destructive">Initials must match the selected Account Member.</p>
      ) : null}
    </div>
  );
}