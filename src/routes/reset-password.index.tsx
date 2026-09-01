import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/reset-password/")({
  head: () => ({
    meta: [
      { title: "Set a new password — divieight" },
      { name: "description", content: "Choose a new password for your account." },
    ],
  }),
  component: ResetPasswordLanding,
});

/**
 * Recovery links land here. The password form lives at /reset-password/confirm
 * so a recovery session is never mistaken for a normal sign-in.
 */
function ResetPasswordLanding() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/reset-password/confirm" }), 400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Verifying your reset link"
      description="One moment while we open your new password form."
    >
      <p className="text-center text-sm text-muted-foreground">Please wait…</p>
    </AuthCard>
  );
}
