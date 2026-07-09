import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/listings/$id")({
  head: () => ({
    meta: [
      { title: "Listing detail — divieight" },
      { name: "description", content: "Manage a fractional property listing." },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  return (
    <PagePlaceholder
      eyebrow="Listing"
      title={`Listing ${id}`}
      description="Share status, offers, documents, and closing progress will appear here."
    />
  );
}
