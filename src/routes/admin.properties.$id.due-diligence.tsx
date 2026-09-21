import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DiligenceUploader } from "@/components/DiligenceUploader";

export const Route = createFileRoute("/admin/properties/$id/due-diligence")({
  head: () => ({
    meta: [
      { title: "Due diligence inventory — divieight admin" },
      {
        name: "description",
        content: "Place and amend due-diligence documents for a property's acknowledgment gate.",
      },
      { property: "og:title", content: "Due diligence inventory — divieight admin" },
      {
        property: "og:description",
        content: "Place and amend due-diligence documents for a property's acknowledgment gate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPropertyDiligence,
});

function AdminPropertyDiligence() {
  const { id } = Route.useParams();
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("properties")
        .select("address, city, state")
        .eq("id", id)
        .maybeSingle();
      if (data) setLabel(`${data.address}, ${data.city} ${data.state}`);
    })();
  }, [id]);

  return (
    <div>
      <Link
        to="/admin/properties"
        className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        ← Properties
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
        Due diligence inventory
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {label || "Subject property"} — documents placed here feed the Acknowledgment Gate.
      </p>

      <div className="mt-6">
        <DiligenceUploader propertyId={id} mode="admin" />
      </div>
    </div>
  );
}
