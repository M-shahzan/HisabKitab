import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost" | "emeraldSubtle";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

    const variants = {
      primary:
        "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm hover:shadow-md",
      secondary:
        "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60",
      outline:
        "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300",
      destructive:
        "bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-600",
      ghost:
        "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70",
      emeraldSubtle:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 font-semibold",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs rounded-lg min-h-[36px]",
      md: "h-11 px-5 text-sm rounded-xl min-h-[44px]", // 44px min touch target
      lg: "h-13 px-7 text-base rounded-2xl min-h-[52px]",
      icon: "h-11 w-11 rounded-xl min-h-[44px] min-w-[44px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
