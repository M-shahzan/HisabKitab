"use client";

import React from "react";
import Link from "next/link";
import { formatINR } from "@/lib/formatters";
import { Package, AlertTriangle, Calculator, Mic, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface StatCardsProps {
  totalProducts: number;
  lowStockCount: number;
  averageBillValue: number;
}

export function StatCards({ totalProducts, lowStockCount, averageBillValue }: StatCardsProps) {
  const { t, formatCurrency } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {/* Voice Billing Dominant Action Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="sm:col-span-2 lg:col-span-1 rounded-card bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-card flex flex-col justify-between group cursor-pointer hover:shadow-cardHover transition-all"
      >
        <Link href="/billing" className="h-full flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full text-emerald-50">
              {t("order.voiceAiReady")}
            </span>
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Mic className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div className="my-3">
            <h4 className="text-xl font-extrabold text-white">{t("nav.startVoiceOrder")}</h4>
            <p className="text-xs text-emerald-100/80 mt-1">
              {t("nav.voiceBannerText")}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl transition-colors w-fit">
            <span>{t("nav.startVoiceOrder")}</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </motion.div>

      {/* Total Products */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-card bg-white p-5 border border-slate-200/80 shadow-card flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("dashboard.totalProducts")}
          </span>
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalProducts}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{t("dashboard.activeCatalog")}</p>
        </div>
      </motion.div>

      {/* Low Stock Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-card bg-white p-5 border border-slate-200/80 shadow-card flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("dashboard.lowStockWarnings")}
          </span>
          <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{lowStockCount}</p>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              {t("dashboard.needsReorder")}
            </span>
          </div>
          <Link
            href="/stock"
            className="text-xs text-emerald-600 font-semibold hover:underline mt-1 inline-block"
          >
            {t("stock.title")} &rarr;
          </Link>
        </div>
      </motion.div>

      {/* Average Bill Value */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-card bg-white p-5 border border-slate-200/80 shadow-card flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("dashboard.averageBill")}
          </span>
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <Calculator className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(averageBillValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{t("dashboard.perBasket")}</p>
        </div>
      </motion.div>
    </div>
  );
}
