import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/components/Field";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact divieight — Talk to Our Team" },
      {
        name: "description",
        content:
          "Questions about buying or selling a 1/8th share? Contact the divieight team — buyers, sellers, agents, and press welcome.",
      },
      { property: "og:title", content: "Contact divieight — Talk to Our Team" },
      {
        property: "og:description",
        content: "Reach the divieight team about fractional co-ownership, listings, or press.",
      },
    ],
  }),
  component: ContactPage,
});

const SUBJECTS = [
  "General Inquiry",
  "I'm a Buyer",
  "I'm a Seller",
  "I'm an Agent",
  "Press",
] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z.string().trim().max(30, "Phone number is too long").optional().or(z.literal("")),
  subject: z.enum(SUBJECTS),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(2000, "Message must be under 2000 characters"),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function ContactPage() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    subject: SUBJECTS[0] as string,
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
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
    const { error } = await supabase.from("contact_submissions").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ? parsed.data.phone : null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    setSubmitting(false);

    if (error) {
      setErrors({ message: "We couldn't send your message. Please try again." });
      return;
    }
    setSent(true);
  }

  return (
    <div>
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Buying, selling, representing a client, or writing a story — we'd like to hear from
            you.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="lg:col-span-2">
          {sent ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-accent">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">
                Message sent
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Thanks, {values.name.split(" ")[0]}. Our team typically replies within one
                business day at {values.email}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setValues({
                    name: "",
                    email: "",
                    phone: "",
                    subject: SUBJECTS[0],
                    message: "",
                  });
                }}
                className="mt-6 inline-flex items-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Send another message
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
                  label="Email"
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  error={errors.email}
                  maxLength={255}
                  placeholder="jane@example.com"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Phone (optional)"
                  name="phone"
                  type="tel"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  error={errors.phone}
                  maxLength={30}
                  placeholder="(555) 123-4567"
                />
                <div className="space-y-1.5">
                  <label htmlFor="subject" className="text-sm font-medium text-foreground">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={values.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="text-sm font-medium text-foreground">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  maxLength={2000}
                  value={values.message}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Tell us a little about what you're looking for…"
                  className={cn(
                    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                    errors.message && "border-destructive focus:ring-destructive",
                  )}
                />
                {errors.message ? (
                  <p className="text-xs text-destructive">{errors.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {values.message.trim().length}/2000 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <InfoCard icon={Mail} title="Email" lines={["hello@divieight.com"]} />
          <InfoCard icon={Phone} title="Phone" lines={["(555) 018-0080", "Mon–Fri, 9am–6pm ET"]} />
          <InfoCard
            icon={MapPin}
            title="Office"
            lines={["1201 Orange Street, Suite 600", "Wilmington, DE 19801"]}
          />
        </aside>
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  lines,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="mt-3 space-y-1">
        {lines.map((l) => (
          <p key={l} className="text-sm text-muted-foreground">
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
