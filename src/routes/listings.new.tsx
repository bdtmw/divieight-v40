import { createFileRoute, redirect } from "@tanstack/react-router";

// The property intake flow lives inside /onboarding (property → listing → media
// → agreement). "List a Property" from the nav funnels sellers into that flow
// so there is only one path to create a listing.
export const Route = createFileRoute("/listings/new")({
  beforeLoad: () => {
    throw redirect({ to: "/onboarding/property" });
  },
});
