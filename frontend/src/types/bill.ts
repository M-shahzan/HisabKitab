export interface BillSummaryRecord {
  id: number;
  sale_id: number;
  bill_number: string;
  created_at: string;
  total: number;
  item_count: number;
}

export interface BillLineDetail {
  item_id: number;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

export interface BillDetailRecord {
  id: number;
  sale_id: number;
  bill_number: string;
  created_at: string;
  total: number;
  item_count: number;
  items: BillLineDetail[];
  payment_method?: string;
}

export interface BillsApiResponse {
  bills: BillSummaryRecord[];
}
