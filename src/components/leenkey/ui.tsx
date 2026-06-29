import { cn } from "@/lib/utils";
import type { ReactNode, InputHTMLAttributes } from "react";

/* ---------- Section header ---------- */
export function StepHeader({
  step,
  total,
  label,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="space-y-3 fade-up">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <span className="inline-flex h-6 items-center rounded-full bg-sky px-3">
          {label}
        </span>
        <span className="text-muted-foreground">
          Étape {step} sur {total}
        </span>
      </div>
      <h1 className="text-3xl font-semibold leading-tight text-navy md:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="max-w-2xl text-base text-sub md:text-lg">{subtitle}</p>
      )}
    </header>
  );
}

/* ---------- Selectable card (single) ---------- */
export function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-start gap-4 rounded-[14px] border-2 bg-card p-5 text-left transition-all",
        "hover:border-primary/60 hover:bg-sky/40",
        compact && "items-center p-4",
        selected
          ? "border-primary bg-sky shadow-[0_8px_24px_-12px_rgba(17,86,252,0.4)]"
          : "border-border",
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-2xl",
            selected ? "bg-primary/15" : "bg-sky",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 space-y-1">
        <span className="block font-display text-base font-semibold text-navy">
          {title}
        </span>
        {description && (
          <span className="block text-sm leading-relaxed text-sub">
            {description}
          </span>
        )}
      </span>
      <span
        className={cn(
          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          selected ? "border-primary bg-primary" : "border-border",
        )}
      >
        {selected && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

/* ---------- Toggle card (multi-select) ---------- */
export function ToggleCard({
  selected,
  onClick,
  icon,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-[12px] border-2 bg-card px-4 py-3 text-left text-sm font-medium transition-all",
        "hover:border-primary/50 hover:bg-sky/40",
        selected
          ? "border-primary bg-sky text-navy"
          : "border-border text-foreground",
      )}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="flex-1">{title}</span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition",
          selected ? "border-primary bg-primary" : "border-border",
        )}
      >
        {selected && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

/* ---------- Stepper (number row) ---------- */
export function Stepper({
  value,
  onChange,
  options,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: (number | string)[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt, idx) => {
        const numeric = typeof opt === "number" ? opt : idx;
        const active = value === numeric;
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(numeric)}
            className={cn(
              "min-w-[52px] rounded-[10px] border-2 px-4 py-3 font-display text-sm font-semibold transition",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgba(17,86,252,0.5)]"
                : "border-border bg-card text-navy hover:border-primary/60 hover:bg-sky/50",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Field ---------- */
export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2 lk-field", error && "lk-field-error")}>
      <label
        className={cn(
          "flex items-baseline gap-1.5 font-display text-sm font-semibold transition-colors",
          error ? "text-destructive" : "text-navy"
        )}
      >
        {label}
        {required && (
          <span className={error ? "text-destructive" : "text-primary"}>*</span>
        )}
        {hint && (
          <span className="font-sans text-xs font-normal text-muted-foreground">
            — {hint}
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Input ---------- */
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-[52px] w-full rounded-[10px] border-2 border-border bg-card px-4 text-base text-foreground transition",
        "placeholder:text-muted-foreground",
        "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15",
        props.className,
      )}
    />
  );
}

/* ---------- Section grouping for checkbox grids ---------- */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 font-display text-sm font-semibold uppercase tracking-wide text-navy first:mt-0">
      {children}
    </h3>
  );
}
