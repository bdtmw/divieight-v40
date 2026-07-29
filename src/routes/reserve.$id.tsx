import { createFileRoute, Link } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/reserve/$id")({
  head: () => ({
    meta: [
      { title: "Secure Your Priority Rank — divieight" },
      {
        name: "description",
        content:
          "Reserve your place in line for a 1/8th share of this divieight home. Priority rank is assigned in the order buyers complete enrollment.",
      },
      { property: "og:title", content: "Secure Your Priority Rank — divieight" },
      {
        property: "og:description",
        content: "Start the reservation flow for a fractional share of this home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReservePage,
});

function ReservePage() {
  const { id } = Route.useParams();
  return (
    <div>
      <PagePlaceholder
        eyebrow="Reservation"
        title="Secure your priority rank"
        description="The share reservation flow — rank confirmation, share selection and escrow instructions — is coming next."
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
