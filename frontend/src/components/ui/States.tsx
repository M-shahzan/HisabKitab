import React from "react";
import { Loader2, AlertCircle, RefreshCw, FolderOpen } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function LoadingState({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon?: any;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-10 text-center bg-white rounded-card border border-dashed border-slate-200", className)}>
      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-emerald-600" />
      </div>
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="emeraldSubtle" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-red-50/50 rounded-card border border-red-200/60", className)}>
      <div className="h-11 w-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-red-950">{title}</h4>
      {message && <p className="text-xs text-red-700 max-w-sm mt-1 mb-4">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="bg-white">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
