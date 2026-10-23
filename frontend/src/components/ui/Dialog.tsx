"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = "md",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const maxWClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Modal Card */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={cn(
              "relative w-full bg-white rounded-card shadow-2xl border border-slate-100 overflow-hidden z-10",
              maxWClasses[maxWidth]
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
              <div>
                <h3 id="dialog-title" className="text-lg font-bold text-slate-900">
                  {title}
                </h3>
                {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
