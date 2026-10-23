export type UnitOfMeasure = "kg" | "g" | "litre" | "ml" | "packet" | "piece" | "bottle" | "box" | string;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface BackendStockItem {
  item_id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  itemId?: number;
  name: string;
  hindiName?: string;
  category: "Grains & Staples" | "Oils & Ghee" | "Spices & Masalas" | "Snacks & Packaged" | "Dairy" | "Personal Care" | "General Grocery" | string;
  unit: UnitOfMeasure;
  price: number; // in INR rupees (e.g. 60.00)
  stockQuantity: number;
  lowStockThreshold: number;
  aliases?: string[]; // Voice recognition synonyms e.g. ["chawal", "bhaat", "rice"]
}

export interface ProductFormData {
  name: string;
  category: Product["category"];
  unit: UnitOfMeasure;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  aliases?: string;
}
