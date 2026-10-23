import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "emerald" | "amber" | "red" | "blue" | "gray" | "outline";
}

export function Badge({ className, variant = "emerald", children, ...props }: BadgeProps) {
  const variants = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
    amber: "bg-amber-50 text-amber-800 border-amber-200/60",
    red: "bg-red-50 text-red-800 border-red-200/60",
    blue: "bg-blue-50 text-blue-800 border-blue-200/60",
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    outline: "bg-transparent text-slate-700 border-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
