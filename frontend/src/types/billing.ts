import { UnitOfMeasure } from "./product";

export type BillingState =
  | "idle"
  | "ready"
  | "listening"
  | "processing"
  | "review"
  | "saving"
  | "success"
  | "error";

export interface BackendBillLine {
  item_id: number;
  name: string;
  qty: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface BackendBill {
  bill_id: string;
  lines: BackendBillLine[];
  total: number;
  status: "draft" | "confirmed" | "cancelled" | string;
}

export interface VoiceApiResponse {
  transcript: string;
  intent: "new_sale" | "edit_bill" | "confirm" | "cancel" | "query_summary" | "query_stock" | "unclear" | string;
  bill?: BackendBill | null;
  message?: string;
}

export interface ConfirmApiResponse {
  sale_id?: number | string;
  total?: number;
  low_stock?: Array<{
    item_id?: number;
    name?: string;
    quantity?: number;
    unit?: string;
    [key: string]: any;
  }>;
  lines?: BackendBillLine[];
  bill_id?: string;
  ok?: boolean;
  message?: string;
  billNumber?: string;
}

export interface CancelApiResponse {
  ok: boolean;
  message?: string;
}

export interface BillItem {
  id: string; // unique item entry id in bill
  productId: string;
  productName: string;
  quantity: number;
  unit: UnitOfMeasure;
  unitPrice: number;
  lineTotal: number;
  itemId?: number;
}

export type BillStatus = "draft" | "reviewing" | "confirmed" | "cancelled";

export interface Bill {
  id: string;
  billNumber: string;
  items: BillItem[];
  subtotal: number;
  tax: number; // 0 unless specific GST applies
  discount: number;
  total: number;
  status: BillStatus;
  createdAt: string;
  transcript?: string;
  customerName?: string;
}

export interface VoiceParseResult {
  transcript: string;
  bill_id?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: UnitOfMeasure;
    suggestedProductId?: string;
    unitPrice: number;
    itemId?: number;
  }>;
  total?: number;
  message?: string;
  confidence: number;
}

export interface ConfirmSaleRequest {
  billId: string;
  items: BillItem[];
  total: number;
  paymentMode: "cash" | "upi" | "khata";
}

export interface ConfirmSaleResponse {
  success: boolean;
  billNumber: string;
  transactionId: string;
  total: number;
  itemCount: number;
  timestamp: string;
  lines?: BackendBillLine[];
  stockUpdates?: Array<{
    productId: string;
    newQuantity: number;
  }>;
  lowStockItems?: Array<{
    item_id?: number;
    name?: string;
    quantity?: number;
    unit?: string;
  }>;
}
