import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveSignIn } from "@/lib/account-routing";
import { signInWithGoogle } from "@/lib/google-auth";

import { AuthCard, GoogleButton, Divider } from "@/components/AuthCard";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/buyer/login")({
  head: () => ({
    meta: [
      { title: "Buyer sign in — divieight" },
      {
        name: "description",
        content: "Sign in to your divieight buyer account to track shares and reservations.",
      },
      { property: "og:title", content: "Buyer sign in — divieight" },
      {
        property: "og:description",
        content: "Sign in to your divieight buyer account.",
      },
    ],
  }),
  component: BuyerLoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

function BuyerLoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error || !data.user) {
      toast.error(error?.message ?? "Unable to sign in");
      return;
    }

    // Role routing is decided by which table holds this auth user.
    const outcome = await resolveSignIn(data.user, "buyer");
    if (outcome.error) {
      toast.error(outcome.error);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: outcome.to! });
  }

  async function onGoogle() {
    const { error } = await signInWithGoogle("buyer");
    if (error) toast.error(error);
  }


  return (
    <AuthCard
      eyebrow="Buyer Account"
      title="Buyer sign in"
      description="Access your reservations, vetting status, and saved homes."
      footer={
        <>
          New buyer?{" "}
          <Link to="/buyer/register" className="font-medium text-foreground hover:text-accent">
            Create a buyer account
          </Link>
          <br />
          <span className="text-xs">
            Listing a property instead?{" "}
            <Link to="/login" className="font-medium text-foreground hover:text-accent">
              Seller sign in
            </Link>
          </span>
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
          placeholder="you@example.com"
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
          placeholder="Your password"
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          required
        />

        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>

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
