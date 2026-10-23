"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardStats } from "@/types/dashboard";
import { fetchSummary, fetchTransactions } from "@/services/summary-service";
import { fetchStock } from "@/services/stock-service";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, transactions, stock] = await Promise.all([
        fetchSummary("today"),
        fetchTransactions(),
        fetchStock(),
      ]);

      const lowStockCount = stock.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;

      setStats({
        todaySales: summary.totalRevenue,
        salesChangePercent: 14.8, // +14.8% compared to yesterday
        transactionsCount: summary.totalOrders,
        totalProducts: stock.length,
        lowStockCount,
        averageBillValue: summary.avgOrderValue,
        recentTransactions: transactions.slice(0, 5),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    stats,
    isLoading,
    error,
    refresh: loadDashboard,
  };
}
