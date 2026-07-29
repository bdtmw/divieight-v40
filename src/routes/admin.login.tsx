import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — divieight" },
      { name: "description", content: "Restricted sign in for divieight platform administrators." },
      { property: "og:title", content: "Admin sign in — divieight" },
      { property: "og:description", content: "Restricted sign in for divieight platform administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

function AdminLoginPage() {
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
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      setSubmitting(false);
      toast.error(error?.message ?? "Unable to sign in");
      return;
    }

    // Role is validated server-side; a non-admin account never gets in.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    setSubmitting(false);

    if (!isAdmin) {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access.");
      return;
    }

    toast.success("Welcome back, admin");
    navigate({ to: "/admin" });
  }

  return (
    <AuthCard
      eyebrow="Restricted"
      title="Admin sign in"
      description="Internal operations console. Authorized staff only."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="admin@divieight.com"
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
