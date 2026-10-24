"use client";

import React from "react";
import Link from "next/link";
import { Mic, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Header() {
  const { t, formatDate, language } = useLanguage();
  const todayDate = formatDate(new Date(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const langLabels: Record<string, string> = {
    en: "English",
    hi: "हिन्दी",
    kn: "ಕನ್ನಡ",
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      {/* Greeting & Date */}
      <div className="flex flex-col">
        <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
          <span>{t("header.greeting")}</span>
          <span className="hidden sm:inline">🙏</span>
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-500 font-medium">{todayDate}</p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Indicator */}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/60 transition-colors"
          title={t("header.languageSettings")}
        >
          <Globe className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-bold">{langLabels[language] || "English"}</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">• {t("header.languageSettings")}</span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          aria-label={t("header.notifications")}
          title={t("header.notifications")}
          className="relative h-9 w-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-white" />
        </button>

        {/* Start Voice Billing Shortcut Button */}
        <Link href="/">
          <Button size="sm" className="hidden sm:flex items-center gap-1.5 shadow-sm">
            <Mic className="h-3.5 w-3.5" />
            <span>{t("header.newOrderBtn")}</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
