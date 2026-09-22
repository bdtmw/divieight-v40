import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agent/authorizations")({
  component: AgentAuthorizationsLayout,
});

function AgentAuthorizationsLayout() {
  return <Outlet />;
}
