import { BackendSummaryResponse, SummaryAnalytics } from "@/types/dashboard";
import { Transaction } from "@/types/transaction";
import { apiFetch } from "./api-client";

let transactionsStore: Transaction[] = [];

/**
 * GET /summary?date=YYYY-MM-DD
 * Retrieves daily sales summary according to the Section 4.3 shared contract
 */
export async function fetchSummary(
  range: "today" | "week" | "month" = "today",
  targetDate?: string
): Promise<SummaryAnalytics> {
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  const backendData = await apiFetch<BackendSummaryResponse>(`/summary?date=${dateStr}`);

  if (backendData && typeof backendData.total === "number") {
    const topSelling = (backendData.top_items || []).map((item: any, idx: number) => {
      const name = typeof item === "string" ? item : item.name || `Item ${item.item_id || idx + 1}`;
      return {
        name,
        quantity: typeof item === "object" ? item.quantity || 1 : 1,
        unit: "units",
        revenue: typeof item === "object" ? item.revenue || item.amount || 0 : 0,
      };
    });

    const avgOrder =
      backendData.count > 0 ? Math.round((backendData.total / backendData.count) * 100) / 100 : 0;

    return {
      totalRevenue: backendData.total,
      totalOrders: backendData.count,
      avgOrderValue: avgOrder,
      cashRevenue: Math.round(backendData.total * 0.45),
      upiRevenue: Math.round(backendData.total * 0.45),
      khataRevenue: Math.round(backendData.total * 0.1),
      lowStockItems: backendData.low_stock || [],
      hourlyTrends: [],
      dailyTrends: [],
      topSellingProducts: topSelling,
    };
  }

  return {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    cashRevenue: 0,
    upiRevenue: 0,
    khataRevenue: 0,
    lowStockItems: [],
    hourlyTrends: [],
    dailyTrends: [],
    topSellingProducts: [],
  };
}

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    return await apiFetch<Transaction[]>("/transactions");
  } catch {
    return [...transactionsStore];
  }
}

export function recordNewTransaction(transaction: Transaction): void {
  transactionsStore = [transaction, ...transactionsStore];
}
