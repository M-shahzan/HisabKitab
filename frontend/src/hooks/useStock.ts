"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Product, ProductFormData, StockStatus } from "@/types/product";
import { fetchStock, addProductRemote, updateProductRemote, deleteProductRemote } from "@/services/stock-service";

export function useStock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "low_stock" | "out_of_stock">("all");

  const loadStock = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStock();
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const addProduct = useCallback(async (formData: ProductFormData) => {
    try {
      const created = await addProductRemote(formData);
      setProducts((prev) => [created, ...prev]);
      return created;
    } catch (err: any) {
      throw new Error(err?.message || "Could not add product");
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    try {
      const updated = await updateProductRemote(id, updates);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err: any) {
      throw new Error(err?.message || "Could not update product");
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteProductRemote(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err: any) {
      throw new Error(err?.message || "Could not delete product");
    }
  }, []);

  // Filtered products list based on search and stock status
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by stock status
    if (activeFilter === "low_stock") {
      list = list.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    } else if (activeFilter === "out_of_stock") {
      list = list.filter((p) => p.stockQuantity === 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.hindiName?.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.aliases?.some((a) => a.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, activeFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length;
    const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
    return { total, lowStock, outOfStock };
  }, [products]);

  return {
    products: filteredProducts,
    allProducts: products,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    counts,
    loadStock,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
