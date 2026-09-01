import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout route so /reset-password and /reset-password/confirm can coexist. */
export const Route = createFileRoute("/reset-password")({
  component: () => <Outlet />,
});
