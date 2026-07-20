import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type SliceState = "retained" | "reserved" | "available";

export interface EightSlicesTrackerProps {
  /** Property ID to fetch retained/reserved shares from. Ignored when `retainedShares` is provided. */
  propertyId?: string;
  /** Override: number of shares retained by seller (Hybrid Exit). 0 for full exit. */
  retainedShares?: number;
  /** Override: number of shares reserved by buyers. Defaults to 0 (Buyer Module — Month 2). */
  reservedShares?: number;
  /** Compact renders a smaller bar with tighter text. */
  compact?: boolean;
  className?: string;
}

const TOTAL_SHARES = 8;

export function EightSlicesTracker({
  propertyId,
  retainedShares: retainedProp,
  reservedShares: reservedProp,
  compact = false,
  className,
}: EightSlicesTrackerProps) {
  const hasOverride = typeof retainedProp === "number";
  const [retained, setRetained] = useState<number>(retainedProp ?? 0);
  const [reserved, setReserved] = useState<number>(reservedProp ?? 0);
  const [loading, setLoading] = useState<boolean>(!hasOverride && !!propertyId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasOverride) {
      setRetained(retainedProp ?? 0);
      setReserved(reservedProp ?? 0);
      return;
    }
    if (!propertyId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: err } = await supabase
        .from("properties")
        .select("seller_id, sellers ( exit_type, retained_shares )")
        .eq("id", propertyId)
        .maybeSingle();

      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const seller = (data as { sellers?: { exit_type?: string | null; retained_shares?: number | null } } | null)?.sellers;
      const r =
        seller?.exit_type === "hybrid_exit" && typeof seller.retained_shares === "number"
          ? Math.max(0, Math.min(7, seller.retained_shares))
          : 0;
      setRetained(r);
      // TODO(buyer-module): read from `reservations` / `share_holdings` when Month 2 lands.
      setReserved(0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyId, hasOverride, retainedProp, reservedProp]);

  const safeRetained = Math.max(0, Math.min(TOTAL_SHARES, retained));
  const safeReserved = Math.max(0, Math.min(TOTAL_SHARES - safeRetained, reserved));
  const available = TOTAL_SHARES - safeRetained - safeReserved;

  // Layout order: retained first (locked by seller), then reserved, then available.
  const slices: SliceState[] = [
    ...Array<SliceState>(safeRetained).fill("retained"),
    ...Array<SliceState>(safeReserved).fill("reserved"),
    ...Array<SliceState>(available).fill("available"),
  ];

  return (
    <div className={cn("w-full", className)} aria-live="polite">
      <div
        className={cn("flex w-full gap-1", compact ? "h-2.5" : "h-3.5")}
        role="img"
        aria-label={`${available} of 8 shares available, ${safeReserved} reserved, ${safeRetained} retained by seller`}
      >
        {slices.map((state, i) => (
          <div
            key={i}
            title={sliceLabel(state, i)}
            className={cn(
              "flex-1 rounded-sm border transition-colors",
              state === "retained" && "border-muted-foreground/30 bg-muted-foreground/25",
              state === "reserved" && "border-accent bg-accent",
              state === "available" && "border-border bg-transparent",
            )}
          />
        ))}
      </div>

      <div className={cn("mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1", compact && "mt-2")}>
        <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
          {loading ? "Loading share status…" : `${available} of 8 shares available`}
        </p>
        {safeRetained > 0 && !loading ? (
          <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>
            Seller retaining {safeRetained} {safeRetained === 1 ? "share" : "shares"}
            <span className="ml-1 opacity-80">(subject to 12-month Retention Lock)</span>
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive">Couldn't load share status.</p>
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <LegendSwatch className="border-border bg-transparent" label="Available" />
          <LegendSwatch className="border-accent bg-accent" label="Reserved" />
          <LegendSwatch className="border-muted-foreground/30 bg-muted-foreground/25" label="Seller retained" />
        </div>
      ) : null}
    </div>
  );
}

function sliceLabel(state: SliceState, i: number): string {
  const which = `Share ${i + 1} of 8`;
  if (state === "retained") return `${which} — retained by seller`;
  if (state === "reserved") return `${which} — reserved`;
  return `${which} — available`;
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2.5 w-4 rounded-sm border", className)} aria-hidden />
      {label}
    </span>
  );
}
