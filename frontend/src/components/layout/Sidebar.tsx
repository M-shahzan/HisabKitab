"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Mic,
  PackageCheck,
  BarChart3,
  Settings,
  Store,
  Sparkles,
  ChevronRight,
  ReceiptText,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      name: t("nav.newOrder"),
      href: "/",
      icon: Mic,
      badge: t("order.voiceAiReady"),
    },
    {
      name: t("nav.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: t("nav.stock"),
      href: "/stock",
      icon: PackageCheck,
    },
    {
      name: t("nav.billsHistory"),
      href: "/bills",
      icon: ReceiptText,
    },
    {
      name: t("nav.summary"),
      href: "/summary",
      icon: BarChart3,
    },
    {
      name: t("nav.settings"),
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-emerald-950 text-white border-r border-emerald-900/60 select-none">
      {/* Brand Header */}
      <div className="p-6 pb-5 flex items-center gap-3 border-b border-emerald-900/40">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-glow">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-white">Hisab Kitab</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {t("nav.pro")}
            </span>
          </div>
          <p className="text-[11px] text-emerald-300/70 font-medium">{t("nav.posSubtitle")}</p>
        </div>
      </div>

      {/* Voice Billing Banner */}
      <div className="p-4 mx-3 my-4 rounded-2xl bg-gradient-to-br from-emerald-900/90 to-emerald-800/60 border border-emerald-600/30">
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>{t("nav.voiceIntelligence")}</span>
        </div>
        <p className="text-[11px] text-emerald-200/80 leading-relaxed">
          {t("nav.voiceBannerText")}
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center justify-between w-full px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <span>{t("nav.startVoiceOrder")}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname === "/billing"
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-100/70 hover:text-white hover:bg-emerald-900/50"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white" : "text-emerald-400 group-hover:text-emerald-300"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    isActive
                      ? "bg-emerald-800 text-emerald-100"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Shop Profile Section */}
      <div className="p-4 border-t border-emerald-900/40 mt-auto bg-emerald-950/70">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold text-xs border border-emerald-700">
            GS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Gupta Kirana Store</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-300/70">Bengaluru • {t("nav.online")}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
