import { BackendStockItem, Product, ProductFormData } from "@/types/product";
import { INITIAL_PRODUCTS } from "@/lib/mock-data";
import { apiFetch } from "./api-client";

// In-memory inventory state for development fallback
let localStoreFallback: Product[] = [...INITIAL_PRODUCTS];

/**
 * GET /stock
 * Fetches real stock inventory listing from backend.
 * Returns array of { item_id, name, quantity, unit } mapped to Product.
 */
export async function fetchStock(): Promise<Product[]> {
  try {
    const backendItems = await apiFetch<BackendStockItem[]>("/stock");

    if (Array.isArray(backendItems) && backendItems.length > 0) {
      return backendItems.map((item) => {
        // Find existing mock metadata (category, price, hindiName) if matching
        const existing = INITIAL_PRODUCTS.find(
          (p) => p.name.toLowerCase() === item.name.toLowerCase() || p.id === `prod-${item.item_id}`
        );

        return {
          id: `item-${item.item_id}`,
          itemId: item.item_id,
          name: item.name,
          hindiName: existing?.hindiName,
          category: existing?.category || "General Grocery",
          unit: item.unit || "packet",
          price: existing?.price || 0,
          stockQuantity: Number(item.quantity) || 0,
          lowStockThreshold: existing?.lowStockThreshold || 10,
          aliases: existing?.aliases || [],
        };
      });
    }

    // If server returned an empty list (e.g. database unseeded), return empty array
    if (Array.isArray(backendItems)) {
      return [];
    }

    return [];
  } catch (err: any) {
    console.warn("Backend /stock fetch failed, falling back to local dataset:", err?.message);
    // Return local dataset for standalone UI testing
    return [...localStoreFallback];
  }
}

/**
 * Local UI helpers for product form (client-side catalog management)
 */
export async function addProductRemote(data: ProductFormData): Promise<Product> {
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name: data.name,
    category: data.category,
    unit: data.unit,
    price: data.price,
    stockQuantity: data.stockQuantity,
    lowStockThreshold: data.lowStockThreshold || 10,
    aliases: data.aliases ? data.aliases.split(",").map((s) => s.trim().toLowerCase()) : [],
  };

  localStoreFallback = [newProduct, ...localStoreFallback];
  return newProduct;
}

export async function updateProductRemote(id: string, updates: Partial<Product>): Promise<Product> {
  const index = localStoreFallback.findIndex((p) => p.id === id);
  if (index !== -1) {
    localStoreFallback[index] = { ...localStoreFallback[index], ...updates };
    return localStoreFallback[index];
  }
  return { id, name: "Product", category: "General Grocery", unit: "packet", price: 0, stockQuantity: 0, lowStockThreshold: 10, ...updates };
}

export async function deleteProductRemote(id: string): Promise<boolean> {
  localStoreFallback = localStoreFallback.filter((p) => p.id !== id);
  return true;
}

export async function deductStockForSale(items: Array<{ productId: string; quantity: number }>): Promise<void> {
  for (const item of items) {
    const p = localStoreFallback.find((prod) => prod.id === item.productId);
    if (p) {
      p.stockQuantity = Math.max(0, p.stockQuantity - item.quantity);
    }
  }
}
