import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthCard({ eyebrow, title, description, footer, children }: Props) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-12">
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export function GoogleButton({
  onClick,
  disabled,
  label = "Continue with Google",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-background text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleIcon className="h-4 w-4" />
      {label}
    </button>
  );
}

export function Divider() {
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-card px-2 text-muted-foreground">or</span>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.42-1.7 4.15-5.5 4.15-3.31 0-6.01-2.74-6.01-6.13S8.69 5.99 12 5.99c1.88 0 3.15.8 3.87 1.49l2.64-2.55C16.86 3.4 14.66 2.4 12 2.4 6.72 2.4 2.45 6.67 2.45 12s4.27 9.6 9.55 9.6c5.51 0 9.16-3.87 9.16-9.31 0-.63-.07-1.11-.16-1.59H12z"
      />
    </svg>
  );
}
