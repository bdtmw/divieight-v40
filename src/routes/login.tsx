import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/PagePlaceholder";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — divieight" },
      { name: "description", content: "Sign in to your divieight seller account." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      eyebrow="Account"
      title="Sign in"
      description="Authentication will be wired up in the next step."
    />
  ),
});
