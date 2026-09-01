import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/google-auth";
import { AuthCard, GoogleButton, Divider } from "@/components/AuthCard";
import { Field } from "@/components/Field";
import { agentRedirect, getAgentProfile } from "@/lib/agent";

export const Route = createFileRoute("/agent/login")({
  head: () => ({
    meta: [
      { title: "Agent sign in — divieight Professional Portal" },
      {
        name: "description",
        content: "Sign in to the divieight Professional Portal for licensed agents and brokers.",
      },
      { property: "og:title", content: "Agent sign in — divieight" },
      {
        property: "og:description",
        content: "Access your divieight Professional Portal account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentLoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

function AgentLoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);

    if (error || !data.user) {
      toast.error(error?.message ?? "Unable to sign in");
      return;
    }

    const agent = await getAgentProfile(data.user.id);
    if (!agent) {
      await supabase.auth.signOut();
      toast.error("This account is not registered as a licensed agent.");
      return;
    }

    toast.success("Welcome back");
    navigate({ to: agentRedirect(agent.onboarding_status) });
  }

  async function onGoogle() {
    const { error } = await signInWithGoogle("agent");
    if (error) toast.error(error);
  }

  return (
    <AuthCard
      eyebrow="Professional Portal"
      title="Agent sign in"
      description="Licensed agents and brokers only."
      footer={
        <>
          Not registered yet?{" "}
          <Link to="/agent/register" className="font-medium text-foreground hover:text-accent">
            Create a professional account
          </Link>
        </>
      }
    >
      <GoogleButton onClick={onGoogle} disabled={submitting} />
      <Divider />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@brokerage.com"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
          required
        />
        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}
