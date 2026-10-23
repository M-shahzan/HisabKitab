"use client";

import React from "react";
import { formatINR } from "@/lib/formatters";
import { TrendingUp, ArrowUpRight, Receipt, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface SalesOverviewProps {
  todaySales: number;
  salesChangePercent: number;
  transactionsCount: number;
}

export function SalesOverview({
  todaySales,
  salesChangePercent,
  transactionsCount,
}: SalesOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-card bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white p-6 sm:p-8 shadow-card border border-emerald-600/30"
    >
      {/* Decorative ambient background curves */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/20 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-300" />
              Today&apos;s Revenue
            </span>
            <span className="text-[11px] text-emerald-200/60 font-medium">Demonstration Data</span>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums text-white">
              {formatINR(todaySales)}
            </h2>
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/20">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+{salesChangePercent}%</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/70 mt-1 font-medium">
            Compared with ₹7,360 yesterday • Healthy business growth
          </p>
        </div>

        {/* Secondary KPI inside card */}
        <div className="flex items-center gap-4 sm:gap-6 bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-sm self-start md:self-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-emerald-200/70 font-semibold uppercase tracking-wider">
                Sales Count
              </p>
              <p className="text-xl font-bold tabular-nums text-white">
                {transactionsCount}{" "}
                <span className="text-xs font-normal text-emerald-200/60">bills</span>
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-emerald-700/50" />

          <div>
            <p className="text-[11px] text-emerald-200/70 font-semibold uppercase tracking-wider">
              Avg Ticket
            </p>
            <p className="text-xl font-bold tabular-nums text-white">
              {formatINR(todaySales / (transactionsCount || 1))}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
