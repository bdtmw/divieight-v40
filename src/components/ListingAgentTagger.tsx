import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMarkets } from "@/lib/markets";
import { Input } from "@/components/ui/input";
import {
  getListingAgentTagState,
  inviteListingAgent,
  searchListingAgents,
  requestHumanComplianceReview,
  rescanCompliance,
  autoAssignListingAgent,
  type ListingAgentOption,
  type ListingAgentTagState,
} from "@/lib/listing-approval.functions";
import { tagListingAgent } from "@/lib/listing-approval.functions";
import {
  APPROVAL_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
} from "@/lib/listing-approval";

/** Seller-facing: tag or invite the Listing Agent, and see both review gates. */
export function ListingAgentTagger({ propertyId }: { propertyId: string }) {
  const [state, setState] = useState<ListingAgentTagState | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingAgentOption[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setState(await getListingAgentTagState({ data: { propertyId } }));
    } catch {
      setState(null);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function runSearch() {
    setBusy(true);
    setSearched(false);
    try {
      const rows = await searchListingAgents({ data: { query } });
      setResults(rows);
      setSearched(true);
    } catch (e) {
      setResults([]);
      setSearched(true);
      toast.error(e instanceof Error ? e.message : "Search failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function tag(agentId: string) {
    setBusy(true);
    try {
      const res = await tagListingAgent({ data: { propertyId, agentId } });
      toast.success(`${res.agentName} is now your Listing Agent.`);
      setResults([]);
      setQuery("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not tag that agent.");
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!email.includes("@")) return toast.error("Enter a valid email address.");
    setBusy(true);
    try {
      const res = await inviteListingAgent({ data: { propertyId, email } });
      toast.success(res.invited ? "Invitation sent." : `${res.agentName} was tagged.`);
      setEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display text-lg font-semibold text-foreground">Listing Agent</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your Listing Agent reviews and approves all public listing content before it
        can go live on the marketplace.
      </p>

      {state?.listingRejectionReason && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-foreground">
            Your Listing Agent rejected this property
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{state.listingRejectionReason}</p>
        </div>
      )}

      {state?.engagementStatus === "declined" && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-foreground">
            That agent declined the engagement
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {state.engagementDeclineReason ?? "No reason given."} Choose another Listing Agent
            below, or let divieight assign one for you.
          </p>
        </div>
      )}

      {state?.agentName ? (
        <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
          <p className="text-sm font-medium text-foreground">{state.agentName}</p>
          <p className="text-xs text-muted-foreground">
            {state.engagementStatus === "accepted"
              ? "Accepted — this agent is your Listing Agent"
              : "Invited — waiting for this agent to accept"}
          </p>
        </div>
      ) : state?.invitedEmail ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Invitation pending for <span className="font-medium text-foreground">{state.invitedEmail}</span>.
        </div>
      ) : null}

      {!state?.agentName && (
        <div className="mt-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-foreground">Search Listing Agents</p>
            <div className="mt-2 flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or email"
              />
              <Button type="button" variant="secondary" onClick={runSearch} disabled={busy}>
                Search
              </Button>
            </div>
            {results.length > 0 && (
              <ul className="mt-3 space-y-2">
                {results.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatMarkets(a.markets)} · {a.license_state ?? "—"}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => tag(a.id)} disabled={busy}>
                      Tag
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Or let divieight choose for you</p>
            <p className="mt-1 text-xs text-muted-foreground">
              We pick a licensed Listing Agent serving your area and send them the request.
            </p>
            <Button
              type="button"
              className="mt-2"
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await autoAssignListingAgent({ data: { propertyId } });
                  if (res.ok) toast.success(`${res.agentName} was invited as your Listing Agent.`);
                  else toast.error(res.message ?? "No Listing Agent is available right now.");
                  await refresh();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not assign an agent.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Choose one for me
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Or invite by email</p>
            <div className="mt-2 flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@brokerage.com"
                type="email"
              />
              <Button type="button" variant="secondary" onClick={invite} disabled={busy}>
                Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {state && (
        <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <p className="text-muted-foreground">
            Gate 1:{" "}
            <span className="font-medium text-foreground">
              {APPROVAL_STATUS_LABELS[state.contentApprovalStatus] ?? state.contentApprovalStatus}
            </span>
          </p>
          <p className="text-muted-foreground">
            Gate 2:{" "}
            <span className="font-medium text-foreground">
              {COMPLIANCE_STATUS_LABELS[state.complianceStatus] ?? state.complianceStatus}
            </span>
          </p>

          {state.rejectedItems.length > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-foreground">Changes requested</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {state.rejectedItems.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium text-foreground">{r.label}:</span> {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.flaggedPhrases.length > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-foreground">
                Held in compliance review for: {state.flaggedPhrases.join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await rescanCompliance({ data: { propertyId } });
                      toast.success(
                        res.flagged.length === 0
                          ? "Compliance cleared."
                          : `Still flagged: ${res.flagged.join(", ")}`,
                      );
                      await refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  I revised the copy — rescan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await requestHumanComplianceReview({ data: { propertyId } });
                      toast.success("Human review requested.");
                      await refresh();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Request human review
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
