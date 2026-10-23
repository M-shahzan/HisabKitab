import { BillItem } from "./billing";

export type TransactionStatus = "completed" | "pending" | "refunded";

export interface Transaction {
  id: string;
  billNumber: string;
  customerName?: string;
  items: BillItem[];
  itemCount: number;
  total: number;
  paymentMode: "cash" | "upi" | "khata";
  createdAt: string;
  status: TransactionStatus;
}
