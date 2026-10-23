import { BackendStockItem, Product, ProductFormData } from "@/types/product";
import { apiFetch } from "./api-client";

// In-memory catalog cache for local edits during session
let localCatalogCache: Product[] = [];

/**
 * GET /stock
 * Fetches real stock inventory listing from backend.
 * Returns array of { item_id, name, quantity, unit } mapped to Product.
 */
export async function fetchStock(): Promise<Product[]> {
  const backendItems = await apiFetch<BackendStockItem[]>("/stock");

  if (Array.isArray(backendItems) && backendItems.length > 0) {
    const products: Product[] = backendItems.map((item) => ({
      id: `item-${item.item_id}`,
      itemId: item.item_id,
      name: item.name,
      category: "General Grocery",
      unit: item.unit || "packet",
      price: 0,
      stockQuantity: Number(item.quantity) || 0,
      lowStockThreshold: 10,
      aliases: [],
    }));
    localCatalogCache = products;
    return products;
  }

  localCatalogCache = [];
  return [];
}

/**
 * Local UI helpers for product form (client-side catalog management)
 */
export async function addProductRemote(data: ProductFormData): Promise<Product> {
  const newProduct: Product = {
    id: `item-${Date.now()}`,
    name: data.name,
    category: data.category,
    unit: data.unit,
    price: data.price,
    stockQuantity: data.stockQuantity,
    lowStockThreshold: data.lowStockThreshold || 10,
    aliases: data.aliases ? data.aliases.split(",").map((s) => s.trim().toLowerCase()) : [],
  };

  localCatalogCache = [newProduct, ...localCatalogCache];
  return newProduct;
}

export async function updateProductRemote(id: string, updates: Partial<Product>): Promise<Product> {
  const index = localCatalogCache.findIndex((p) => p.id === id);
  if (index !== -1) {
    localCatalogCache[index] = { ...localCatalogCache[index], ...updates };
    return localCatalogCache[index];
  }
  return { id, name: "Product", category: "General Grocery", unit: "packet", price: 0, stockQuantity: 0, lowStockThreshold: 10, ...updates };
}

export async function deleteProductRemote(id: string): Promise<boolean> {
  localCatalogCache = localCatalogCache.filter((p) => p.id !== id);
  return true;
}

export async function deductStockForSale(items: Array<{ productId: string; quantity: number }>): Promise<void> {
  for (const item of items) {
    const p = localCatalogCache.find((prod) => prod.id === item.productId || `item-${prod.itemId}` === item.productId);
    if (p) {
      p.stockQuantity = Math.max(0, p.stockQuantity - item.quantity);
    }
  }
}
