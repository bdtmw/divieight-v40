import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/listings/new")({
  head: () => ({
    meta: [
      { title: "List a new property — divieight" },
      {
        name: "description",
        content: "Create a new fractional property listing on divieight.",
      },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="New Listing"
      title="List a new property"
      description="The property intake form and 1/8th share configuration will appear here."
    />
  ),
});
