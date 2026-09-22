import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/buyer/authorizations")({
  component: BuyerAuthorizationsLayout,
});

function BuyerAuthorizationsLayout() {
  return <Outlet />;
}
