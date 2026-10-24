"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Mic, PackageCheck, BarChart3, ReceiptText } from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function MobileNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-h-[44px]",
            pathname === "/dashboard" ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">{t("nav.dashboard")}</span>
        </Link>

        {/* Bills History */}
        <Link
          href="/bills"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-h-[44px]",
            pathname === "/bills" ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <ReceiptText className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">{t("bills.title")}</span>
        </Link>

        {/* Elevated New Order Button */}
        <Link
          href="/"
          className="relative -top-4 flex flex-col items-center justify-center group select-none"
        >
          <div
            className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95",
              pathname === "/" || pathname === "/billing"
                ? "bg-emerald-700 ring-4 ring-emerald-200 shadow-pulseGlow"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-glow"
            )}
          >
            <Mic className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-bold text-emerald-800 mt-1">{t("nav.newOrder")}</span>
        </Link>

        {/* Stock */}
        <Link
          href="/stock"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors min-h-[44px]",
            pathname === "/stock" ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <PackageCheck className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">{t("nav.stock")}</span>
        </Link>

        {/* Summary */}
        <Link
          href="/summary"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors min-h-[44px]",
            pathname === "/summary" ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">{t("nav.summary")}</span>
        </Link>
      </div>
    </nav>
  );
}
