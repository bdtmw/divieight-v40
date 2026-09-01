import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/agent/")({
  component: () => <Navigate to="/agent/dashboard" replace />,
});
