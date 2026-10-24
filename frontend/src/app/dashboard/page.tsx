"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { StatCards } from "@/components/dashboard/StatCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { stats, isLoading, error, refresh } = useDashboard();

  if (isLoading) {
    return <LoadingState message={t("common.loading")} className="py-24" />;
  }

  if (error || !stats) {
    return (
      <ErrorState
        title={t("common.error")}
        message={error || "An unexpected error occurred while fetching metrics."}
        onRetry={refresh}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Emerald Sales Card */}
      <SalesOverview
        todaySales={stats.todaySales}
        salesChangePercent={stats.salesChangePercent}
        transactionsCount={stats.transactionsCount}
      />

      {/* Secondary Metric Cards & Dominant Voice Billing Action */}
      <StatCards
        totalProducts={stats.totalProducts}
        lowStockCount={stats.lowStockCount}
        averageBillValue={stats.averageBillValue}
      />

      {/* Recent Transactions List */}
      <RecentTransactions transactions={stats.recentTransactions} />
    </div>
  );
}
