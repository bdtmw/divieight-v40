import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resolveAttributionToken } from "@/lib/attribution.functions";
import { setReferralCookie } from "@/lib/attribution";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Redirecting — divieight" },
      {
        name: "description",
        content: "Following an agent referral link into the divieight marketplace.",
      },
      { property: "og:title", content: "Redirecting — divieight" },
      {
        property: "og:description",
        content: "Following an agent referral link into the divieight marketplace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReferralResolver,
});

function ReferralResolver() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const resolve = useServerFn(resolveAttributionToken);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    resolve({ data: { token } })
      .then((result) => {
        if (result.found && result.agentId) {
          setReferralCookie(`${result.token}|${result.agentId}`);
        }
      })
      .catch(() => {
        /* attribution is best-effort — never block marketplace entry */
      })
      .finally(() => {
        navigate({ to: "/properties", replace: true });
      });
  }, [token, resolve, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">Taking you to the divieight marketplace…</p>
    </div>
  );
}
