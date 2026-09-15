import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getMySubstitutionInvitations,
  respondToSubstitutionInvitation,
} from "@/lib/substitution.functions";

/**
 * Buyer-facing substitution invitation. The body text is built server-side and
 * never names the departing member, the reason the slice vacated, or any other
 * pod member's detail — pod composition appears only after acceptance.
 */
export function SubstitutionInvitations() {
  const fetchInvitations = useServerFn(getMySubstitutionInvitations);
  const respond = useServerFn(respondToSubstitutionInvitation);
  const qc = useQueryClient();

  const { data: invitations = [] } = useQuery({
    queryKey: ["my-substitution-invitations"],
    queryFn: () => fetchInvitations(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { invitationId: string; response: "accepted" | "declined" }) =>
      respond({ data: vars }),
    onSuccess: (res, vars) => {
      if (!res.ok) {
        toast.error(
          res.reason === "expired"
            ? "This invitation has expired and has moved on to the next candidate."
            : res.reason === "pod_full"
              ? "This share has already been filled."
              : res.reason === "not_liquidity_verified"
                ? "Your verified liquidity needs to be in place before you can accept."
                : "We couldn't record your response. Please try again.",
        );
        return;
      }
      toast.success(
        vars.response === "accepted"
          ? "Share accepted — you've joined the pod."
          : "Declined. This has no effect on your Priority Rank.",
      );
      void qc.invalidateQueries({ queryKey: ["my-substitution-invitations"] });
      void qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
  });

  const live = invitations.filter((i) => i.status === "pending");
  if (live.length === 0) return null;

  return (
    <section className="space-y-4">
      {live.map((i) => (
        <article
          key={i.id}
          className="rounded-xl border border-accent/40 bg-accent/5 p-5 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Share available in a formed pod
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
            {i.address}, {i.city}, {i.state} {i.zip}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.body}</p>
          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-foreground">
            <Clock3 className="h-4 w-4 text-accent" />
            {i.windowShortened ? "Shortened window" : "Response window"}: {i.windowHours} hours ·
            closes {new Date(i.expiresAt).toLocaleString()}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ invitationId: i.id, response: "accepted" })
              }
            >
              Accept this share
            </Button>
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ invitationId: i.id, response: "declined" })
              }
            >
              Decline
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
