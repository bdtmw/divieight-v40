import { createFileRoute, Link } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/data-room/$id")({
  head: () => ({
    meta: [
      { title: "Virtual Data Room — divieight" },
      {
        name: "description",
        content:
          "Golden Ticket holders review inspection reports, title documents and rental projections for this fractional home.",
      },
      { property: "og:title", content: "Virtual Data Room — divieight" },
      {
        property: "og:description",
        content: "Gated diligence documents for vetted divieight buyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DataRoomPage,
});

function DataRoomPage() {
  const { id } = Route.useParams();
  return (
    <div>
      <PagePlaceholder
        eyebrow="Diligence"
        title="Virtual Data Room"
        description="Inspection reports, title documents and rental projections for this home will live here for Golden Ticket holders."
      />
      <div className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <Link
          to="/properties/$id"
          params={{ id }}
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          ← Back to the listing
        </Link>
      </div>
    </div>
  );
}
