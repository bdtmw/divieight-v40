import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create an account — divieight" },
      { name: "description", content: "Create your divieight seller account." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Account"
      title="Create your seller account"
      description="Registration flow will be wired up in the next step."
    />
  ),
});
