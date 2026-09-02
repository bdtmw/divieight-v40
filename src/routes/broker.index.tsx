import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { brokerRedirect, getBrokerProfile } from "@/lib/broker";

export const Route = createFileRoute("/broker/")({
  head: () => ({
    meta: [
      { title: "Broker portal — divieight" },
      {
        name: "description",
        content: "Continue your divieight Broker of Record credentialing.",
      },
      { property: "og:title", content: "Broker portal — divieight" },
      {
        property: "og:description",
        content: "Broker of Record credentialing and onboarding for divieight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerIndex,
});

function BrokerIndex() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/broker/login", replace: true });
      return;
    }
    getBrokerProfile(user.id).then((row) => {
      navigate({
        to: row ? brokerRedirect(row.onboarding_status) : "/broker/register",
        replace: true,
      });
    });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Loading your broker portal…
    </div>
  );
}
