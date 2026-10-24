"use client";

import React, { useState, useEffect } from "react";
import { SummaryAnalytics } from "@/types/dashboard";
import { Transaction } from "@/types/transaction";
import { fetchSummary, fetchTransactions } from "@/services/summary-service";
import { formatINR, formatDateTime } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import {
  TrendingUp,
  Receipt,
  Calculator,
  QrCode,
  Wallet,
  BookOpen,
  Calendar,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DailySummaryPage() {
  const { t, formatCurrency } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [summary, setSummary] = useState<SummaryAnalytics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [sumData, txnsData] = await Promise.all([
        fetchSummary("today", selectedDate),
        fetchTransactions(),
      ]);
      setSummary(sumData);
      setTransactions(txnsData);
    } catch (err: any) {
      setError(err?.message || "Failed to load summary analytics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  if (isLoading) {
    return <LoadingState message={t("common.loading")} className="py-24" />;
  }

  if (error || !summary) {
    return (
      <ErrorState
        title={t("common.error")}
        message={error || "An unexpected error occurred while fetching the sales report."}
        onRetry={() => loadData()}
        className="my-12"
      />
    );
  }

  const chartData = summary.hourlyTrends.map((t) => ({
    name: t.time,
    sales: t.sales,
    orders: t.orders,
  }));

  const productChartData = summary.topSellingProducts.map((p) => ({
    name: p.name.split(" ")[0] + " " + (p.name.split(" ")[1] || ""),
    revenue: p.revenue,
    qty: p.quantity,
  }));

  const lowStockList = summary.lowStockItems || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {t("summary.title")}
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {t("summary.today")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("summary.subtitle")}
          </p>
        </div>

        {/* Date Selector & Refresh Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="bg-white min-h-[38px]"
            title="Refresh summary data"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 text-slate-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? t("common.loading") : t("stock.refresh")}</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sales */}
        <Card className="p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t("summary.salesToday")}</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-800 mt-2 tabular-nums">
            {formatCurrency(summary.totalRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{selectedDate}</p>
        </Card>

        {/* Total Orders / Bills */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t("summary.billsCount")}</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {summary.totalOrders}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t("summary.completed")}</p>
        </Card>

        {/* Avg Ticket Value */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t("summary.averageTicket")}</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {formatCurrency(summary.avgOrderValue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t("dashboard.perBasket")}</p>
        </Card>
      </div>

      {/* Low Stock Items Section (Returned by /summary) */}
      <Card className="border-amber-200/80 bg-amber-50/20 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>{t("summary.lowStockAlert")} ({lowStockList.length})</span>
            </div>
            {lowStockList.length > 0 && (
              <Badge variant="amber">{t("dashboard.needsReorder")}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockList.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">
              {t("dashboard.healthy")}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {lowStockList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border border-amber-200/80 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {item.name || `Item #${item.item_id}`}
                    </p>
                    <p className="text-[11px] text-slate-500">ID: {item.item_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-amber-700 tabular-nums">
                      {item.quantity} {item.unit || "units"}
                    </span>
                    <p className="text-[10px] text-red-600 font-semibold">{t("stock.lowStockBadge")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modes Split */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("bill.paymentMode")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t("summary.upiDigital")}</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.upiRevenue)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t("summary.cashCollections")}</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.cashRevenue)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t("summary.khataCredit")}</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.khataRevenue)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Sales Trend Area Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span>{t("summary.hourlyTrend")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#087F5B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#087F5B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), "Revenue"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#087F5B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#emeraldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top-Selling Products Bar Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              <span>{t("summary.topProducts")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), "Sales"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                  />
                  <Bar dataKey="revenue" fill="#087F5B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Transaction History Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("summary.recentHistory")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-5 sm:px-6">{t("summary.colBillNo")}</th>
                  <th className="py-3 px-4">{t("summary.colItems")}</th>
                  <th className="py-3 px-4">{t("summary.colPayment")}</th>
                  <th className="py-3 px-4">{t("summary.colTime")}</th>
                  <th className="py-3 px-5 sm:px-6 text-right">{t("summary.colAmount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 sm:px-6 font-mono font-bold text-slate-900 text-xs">
                      #{txn.billNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 text-xs sm:text-sm">
                      {txn.customerName || "Walk-in Customer"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          txn.paymentMode === "upi"
                            ? "blue"
                            : txn.paymentMode === "cash"
                            ? "emerald"
                            : "amber"
                        }
                      >
                        <span className="uppercase text-[10px]">{txn.paymentMode}</span>
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums">
                      {formatDateTime(txn.createdAt)}
                    </td>
                    <td className="py-3.5 px-5 sm:px-6 text-right font-extrabold text-slate-900 tabular-nums">
                      {formatCurrency(txn.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
