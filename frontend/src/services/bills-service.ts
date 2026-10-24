import { apiFetch } from "./api-client";
import { BillSummaryRecord, BillDetailRecord, BillsApiResponse } from "@/types/bill";

/**
 * Fetch all confirmed bills from the backend SQLite database, ordered newest first.
 */
export async function fetchBills(): Promise<BillSummaryRecord[]> {
  const response = await apiFetch<any>("/bills");
  if (Array.isArray(response)) {
    return response;
  }
  return response?.bills || [];
}

/**
 * Fetch complete details for a single confirmed bill by sale ID.
 * Returns lines with historical sale-time unit prices and quantities.
 */
export async function fetchBillDetails(saleId: number | string): Promise<BillDetailRecord> {
  return await apiFetch<BillDetailRecord>(`/bills/${saleId}`);
}
