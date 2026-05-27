"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyViewProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyView({
  icon: Icon,
  title,
  description,
  action,
}: EmptyViewProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/[0.06] bg-ink-900">
        <Icon className="h-5 w-5 text-helix/70" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-base font-medium text-white/85">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-white/40">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-6">
      <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
      <div className="h-20 rounded-lg bg-white/[0.04]" />
      <div className="h-20 rounded-lg bg-white/[0.04]" />
    </div>
  );
}

export function FieldLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-white/70">{children}</span>
      {hint && <span className="mt-0.5 block text-[11px] text-white/30">{hint}</span>}
    </label>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "mt-1.5 w-full rounded-lg border border-white/[0.06] bg-ink-900 px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:border-white/[0.12] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "mt-1.5 w-full rounded-lg border border-white/[0.06] bg-ink-900 px-3 py-2 text-sm text-white/90 focus:border-white/[0.12] focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Button({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger";
}) {
  return (
    <button
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm transition duration-200 disabled:opacity-40",
        variant === "primary" &&
          "bg-helix text-ink-900 shadow-helix-glow hover:bg-helix/90",
        variant === "danger" &&
          "border border-red-400/30 text-red-300 hover:bg-red-400/10",
        variant === "default" &&
          "border border-white/[0.06] text-white/70 hover:border-white/[0.12] hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
