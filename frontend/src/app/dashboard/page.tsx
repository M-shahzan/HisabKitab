"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { SalesOverview } from "@/components/dashboard/SalesOverview";
import { StatCards } from "@/components/dashboard/StatCards";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { LoadingState, ErrorState } from "@/components/ui/States";

export default function DashboardPage() {
  const { stats, isLoading, error, refresh } = useDashboard();

  if (isLoading) {
    return <LoadingState message="Loading your shop's dashboard data..." className="py-24" />;
  }

  if (error || !stats) {
    return (
      <ErrorState
        title="Could not load dashboard statistics"
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
