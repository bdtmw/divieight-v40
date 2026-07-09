import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Seller Dashboard — divieight" },
      {
        name: "description",
        content: "Manage your listings, shares, and offers from your seller dashboard.",
      },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Seller Dashboard"
      title="Your listings and shares"
      description="Portfolio overview, share status, and offer activity will live here."
    />
  ),
});
