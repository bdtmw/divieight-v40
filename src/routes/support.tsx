import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LifeBuoy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Field } from "@/components/Field";
import { cn } from "@/lib/utils";
import {
  SUPPORT_ACK,
  SUPPORT_CATEGORIES,
  supportTicketSchema,
  type SupportTicketInput,
} from "@/lib/support";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — divieight Help Requests" },
      {
        name: "description",
        content:
          "Submit a support request to the divieight team about your account, a payment, a technical problem, or a general question.",
      },
      { property: "og:title", content: "Support — divieight Help Requests" },
      {
        property: "og:description",
        content: "Send the divieight support team a request and we'll respond soon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

type Errors = Partial<Record<keyof SupportTicketInput, string>>;

function SupportPage() {
  const { user, loading } = useAuth();
  const [values, setValues] = useState({
    name: "",
    email: "",
    category: SUPPORT_CATEGORIES[0] as string,
    description: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Pre-fill from the signed-in account when we have one.
  useEffect(() => {
    if (loading || !user) return;
    setValues((v) => ({
      ...v,
      email: v.email || user.email || "",
      name:
        v.name ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : ""),
    }));
  }, [user, loading]);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = supportTicketSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      });
      setErrors(next);
      return;
    }

    setSubmitting(true);
    const { error } = await (supabase as any).from("support_tickets").insert({
      submitter_auth_user_id: user?.id ?? null,
      submitter_name: parsed.data.name,
      submitter_email: parsed.data.email,
      category: parsed.data.category,
      description: parsed.data.description,
      channel: "form",
      status: "new",
    });
    setSubmitting(false);

    if (error) {
      console.error("[support] insert failed", error);
      setErrors({ description: "We couldn't submit your request. Please try again." });
      return;
    }
    setSent(true);
  }

  return (
    <div>
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card text-accent shadow-sm">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Support
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Tell us what's happening and our team will take it from here. Everything is handled
            on-site — no need to email or call.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {sent ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-accent">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
              Request received
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {SUPPORT_ACK} We'll reply to {values.email}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setValues((v) => ({ ...v, category: SUPPORT_CATEGORIES[0], description: "" }));
              }}
              className="mt-6 inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Name"
                name="name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                error={errors.name}
                maxLength={100}
                placeholder="Jane Doe"
              />
              <Field
                label="Account email"
                name="email"
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                error={errors.email}
                maxLength={255}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium text-foreground">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={values.category}
                onChange={(e) => set("category", e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-foreground">
                What's going on?
              </label>
              <textarea
                id="description"
                name="description"
                rows={7}
                maxLength={4000}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the issue, including anything you already tried…"
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  errors.description && "border-destructive focus:ring-destructive",
                )}
              />
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {values.description.trim().length}/4000 characters
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
