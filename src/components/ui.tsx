import Link from "next/link";
import * as React from "react";

// ---------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "btn-brand-gradient text-white shadow-sm shadow-brand-600/20 hover:shadow-brand-600/30",
  secondary:
    "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50 hover:border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:hover:border-neutral-500",
  danger:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-700",
  ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
    />
  );
}

export interface LinkButtonProps extends Omit<React.ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  className?: string;
}

export function LinkButton({ variant = "primary", className = "", ...rest }: LinkButtonProps) {
  return (
    <Link
      {...rest}
      className={`tap-feedback inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-1 ${buttonVariants[variant]} ${className}`}
    />
  );
}

// ---------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------
const fieldClass =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:bg-neutral-800 dark:placeholder:text-neutral-500 dark:focus:ring-brand-900/50";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, name, ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      <input
        {...rest}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        className={`${fieldClass} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-700 dark:focus:ring-red-900/50" : "border-neutral-300 dark:border-neutral-600"}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>
      ) : null}
    </label>
  );
}

export interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function TextAreaField({ label, error, name, ...rest }: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      <textarea
        {...rest}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        className={`${fieldClass} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-700 dark:focus:ring-red-900/50" : "border-neutral-300 dark:border-neutral-600"}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function SelectField({ label, error, hint, name, children, ...rest }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      <select
        {...rest}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        className={`${fieldClass} ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100 dark:border-red-700 dark:focus:ring-red-900/50" : "border-neutral-300 dark:border-neutral-600"}`}
      >
        {children}
      </select>
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>
      ) : null}
    </label>
  );
}

// ---------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  action,
  helpHref,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  helpHref?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{title}</h1>
          {helpHref && (
            <a
              href={helpHref}
              title="Guide"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </a>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-brand-900/80 dark:border-brand-800/50 dark:bg-brand-950/30 dark:text-brand-200/80 animate-fade-in">
      <span className="mt-0.5 shrink-0 text-base">💡</span>
      <p>{children}</p>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white shadow-soft dark:border-neutral-700/50 dark:bg-neutral-800/80 animate-fade-in-up ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center dark:border-neutral-600 dark:bg-neutral-800/50 animate-fade-in-up">
      {icon && <div className="mb-3 text-brand-500">{icon}</div>}
      <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800"
      role="alert"
    >
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------
// Status badges
// ---------------------------------------------------------------------
const reminderStatusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
  sent: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800",
  cancelled: "bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-600",
  failed: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800",
};

const reminderStatusLabels: Record<string, string> = {
  pending: "En attente",
  sent: "Envoyé",
  cancelled: "Annulé",
  failed: "Échec",
};

export function StatusBadge({ status }: { status: string }) {
  const style = reminderStatusStyles[status] ?? reminderStatusStyles.pending;
  const label = reminderStatusLabels[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------
// Icons (SVG inline) — pas de dépendance
// ---------------------------------------------------------------------
type IconProps = { className?: string; size?: number };

export function BellIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function ClockIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CheckIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function AlertIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function PlusIcon({ className = "", size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function SparkleIcon({ className = "", size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

export function HomeIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function TagIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function UsersIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function UserIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function SendIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export function BarChartIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function BrushIcon({ className = "", size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.06 11.9 18.96 2a2 2 0 0 1 2.83 2.83l-9.9 9.9-3.83-2.83z" />
      <path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 1.31-1.16 2.06-2.07 2.06.97 1.46 2.96 2 4.5 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3.06z" />
    </svg>
  );
}

export function LogoMark({ className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-bell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5B731" />
          <stop offset="50%" stopColor="#D5940C" />
          <stop offset="100%" stopColor="#AF7008" />
        </linearGradient>
        <linearGradient id="logo-check" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#FEF6CD" />
        </linearGradient>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#logo-bg)" />
      <path d="M256 100c-8 0-16 6-16 14v18c-52 10-90 56-90 110v60l-24 32c-4 5-1 14 6 14h248c7 0 10-9 6-14l-24-32v-60c0-54-38-100-90-110v-18c0-8-8-14-16-14zm-30 268c0 17 13 30 30 30s30-13 30-30z" fill="url(#logo-bell)" />
      <rect x="68" y="210" width="48" height="10" rx="5" fill="#F5B731" opacity=".7" />
      <rect x="56" y="240" width="60" height="10" rx="5" fill="#F5B731" opacity=".5" />
      <rect x="68" y="270" width="48" height="10" rx="5" fill="#F5B731" opacity=".3" />
      <path d="M230 280l22 22 40-44" fill="none" stroke="url(#logo-check)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------
export function formatDateTime(iso: string, locale?: string, friendly?: boolean): string {
  const loc = locale ?? (typeof document !== "undefined"
    ? document.documentElement.lang === "en" ? "en-US" : "fr-FR"
    : "fr-FR");
  const d = new Date(iso);
  if (friendly) {
    return d.toLocaleString(loc, {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Montreal",
    });
  }
  return d.toLocaleString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Montreal",
  });
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
