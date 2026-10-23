import { BackendSummaryResponse, SummaryAnalytics } from "@/types/dashboard";
import { Transaction } from "@/types/transaction";
import { INITIAL_TRANSACTIONS, MOCK_SUMMARY } from "@/lib/mock-data";
import { apiFetch } from "./api-client";

let transactionsStore: Transaction[] = [...INITIAL_TRANSACTIONS];
let summaryStore: SummaryAnalytics = { ...MOCK_SUMMARY };

/**
 * GET /summary?date=YYYY-MM-DD
 * Retrieves daily sales summary according to the Section 4.3 shared contract
 */
export async function fetchSummary(
  range: "today" | "week" | "month" = "today",
  targetDate?: string
): Promise<SummaryAnalytics> {
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  try {
    const backendData = await apiFetch<BackendSummaryResponse>(`/summary?date=${dateStr}`);

    if (backendData && typeof backendData.total === "number") {
      const topSelling = (backendData.top_items || []).map((item, idx) => ({
        name: item.name || `Item ${item.item_id || idx + 1}`,
        quantity: item.quantity || 1,
        unit: "units",
        revenue: item.revenue || item.amount || 0,
      }));

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
        hourlyTrends: summaryStore.hourlyTrends,
        dailyTrends: summaryStore.dailyTrends,
        topSellingProducts: topSelling.length > 0 ? topSelling : summaryStore.topSellingProducts,
      };
    }

    return { ...summaryStore };
  } catch (err: any) {
    console.warn("Backend /summary fetch failed, using local session state:", err?.message);
    return { ...summaryStore };
  }
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
  summaryStore.totalRevenue += transaction.total;
  summaryStore.totalOrders += 1;
  summaryStore.avgOrderValue = Math.round((summaryStore.totalRevenue / summaryStore.totalOrders) * 100) / 100;

  if (transaction.paymentMode === "upi") {
    summaryStore.upiRevenue += transaction.total;
  } else if (transaction.paymentMode === "cash") {
    summaryStore.cashRevenue += transaction.total;
  } else {
    summaryStore.khataRevenue += transaction.total;
  }
}
