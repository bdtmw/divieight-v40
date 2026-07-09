interface Props {
  eyebrow: string;
  title: string;
  description: string;
}

export function PagePlaceholder({ eyebrow, title, description }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-muted-foreground">{description}</p>

      <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        This screen is part of the shell. Functionality will be added in later steps.
      </div>
    </div>
  );
}
