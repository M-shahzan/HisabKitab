import { Transaction } from "./transaction";

export interface DashboardStats {
  todaySales: number;
  salesChangePercent: number;
  transactionsCount: number;
  totalProducts: number;
  lowStockCount: number;
  averageBillValue: number;
  recentTransactions: Transaction[];
}

export interface BackendSummaryResponse {
  total: number;
  count: number;
  top_items?: Array<{
    item_id?: number;
    name?: string;
    quantity?: number;
    revenue?: number;
    amount?: number;
    [key: string]: any;
  }>;
  low_stock?: Array<{
    item_id?: number;
    name?: string;
    quantity?: number;
    unit?: string;
    [key: string]: any;
  }>;
}

export interface SummaryAnalytics {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  cashRevenue: number;
  upiRevenue: number;
  khataRevenue: number;
  lowStockItems?: Array<{
    item_id?: number;
    name?: string;
    quantity?: number;
    unit?: string;
  }>;
  hourlyTrends: Array<{
    time: string;
    sales: number;
    orders: number;
  }>;
  dailyTrends: Array<{
    date: string;
    day: string;
    sales: number;
    orders: number;
  }>;
  topSellingProducts: Array<{
    name: string;
    quantity: number;
    unit: string;
    revenue: number;
  }>;
}
