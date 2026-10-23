"use client";

import React, { useState } from "react";
import { useStock } from "@/hooks/useStock";
import { Product, ProductFormData } from "@/types/product";
import { formatINR, formatQuantity } from "@/lib/formatters";
import { ProductFormModal } from "@/components/stock/ProductFormModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/States";
import {
  PackagePlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit2,
  Trash2,
  Boxes,
  RefreshCw,
} from "lucide-react";

export default function StockPage() {
  const {
    products,
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
  } = useStock();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setModalOpen(true);
  };

  const handleFormSubmit = async (data: ProductFormData) => {
    const parsedAliases = data.aliases
      ? data.aliases.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    if (editingProduct) {
      await updateProduct(editingProduct.id, {
        ...data,
        aliases: parsedAliases,
      });
    } else {
      await addProduct(data);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) {
      await deleteProduct(id);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStock();
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Stock Management
            </h2>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {counts.total} items
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor inventory quantities, unit types, and low-stock indicators
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="bg-white min-h-[40px]"
            title="Refresh stock list from server"
          >
            <RefreshCw className={`h-4 w-4 mr-1 text-slate-600 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Button onClick={handleOpenAdd} className="shadow-sm min-h-[40px]">
            <PackagePlus className="h-4 w-4 mr-2" />
            <span>Add New Product</span>
          </Button>
        </div>
      </div>

      {/* Toolbar: Search & Stock Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="w-full sm:max-w-md">
          <Input
            placeholder="Search by product name, unit, or category..."
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
              activeFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("low_stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
              activeFilter === "low_stock"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 hover:text-amber-700"
            }`}
          >
            Low Stock ({counts.lowStock})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("out_of_stock")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
              activeFilter === "out_of_stock"
                ? "bg-red-600 text-white shadow-xs"
                : "text-slate-600 hover:text-red-700"
            }`}
          >
            Out of Stock ({counts.outOfStock})
          </button>
        </div>
      </div>

      {/* Error state if fetch fails */}
      {error && (
        <ErrorState
          title="Could not load stock items"
          message={error}
          onRetry={loadStock}
          className="my-6"
        />
      )}

      {/* Products Display */}
      {isLoading ? (
        <LoadingState message="Loading inventory stock catalog..." className="py-20" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products found in stock"
          description={
            searchQuery
              ? `No items found matching "${searchQuery}". Clear your search or add a new product.`
              : "Your inventory stock is empty. Add items or ensure backend database is seeded."
          }
          actionLabel="Add Product"
          onAction={handleOpenAdd}
        />
      ) : (
        <Card className="overflow-hidden shadow-card">
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5 sm:px-6">Product & Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {products.map((prod) => {
                    const isOutOfStock = prod.stockQuantity === 0;
                    const isLowStock = prod.stockQuantity > 0 && prod.stockQuantity <= prod.lowStockThreshold;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3.5 px-5 sm:px-6">
                          <div>
                            <p className="font-bold text-slate-900">{prod.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {prod.hindiName ? `${prod.hindiName} • ` : ""}
                              <span className="font-medium text-slate-600">{prod.category}</span>
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums">
                          {prod.price > 0 ? (
                            <>
                              {formatINR(prod.price)}{" "}
                              <span className="text-xs font-normal text-slate-500">/ {prod.unit}</span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Standard Unit</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums">
                          {formatQuantity(prod.stockQuantity, prod.unit)}
                        </td>
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <Badge variant="red">
                              <XCircle className="h-3 w-3" />
                              <span>Out of Stock</span>
                            </Badge>
                          ) : isLowStock ? (
                            <Badge variant="amber">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low Stock</span>
                            </Badge>
                          ) : (
                            <Badge variant="emerald">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>In Stock</span>
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-5 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prod)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(prod.id, prod.name)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (optimized for shopkeeper phones) */}
            <div className="md:hidden divide-y divide-slate-100">
              {products.map((prod) => {
                const isOutOfStock = prod.stockQuantity === 0;
                const isLowStock = prod.stockQuantity > 0 && prod.stockQuantity <= prod.lowStockThreshold;

                return (
                  <div key={prod.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{prod.name}</h4>
                        <p className="text-xs text-slate-500">
                          {prod.hindiName ? `${prod.hindiName} • ` : ""}
                          {prod.category}
                        </p>
                      </div>
                      <div>
                        {isOutOfStock ? (
                          <Badge variant="red">
                            <XCircle className="h-3 w-3" />
                            <span>Out</span>
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="amber">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Low</span>
                          </Badge>
                        ) : (
                          <Badge variant="emerald">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>OK</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <div>
                        <span className="text-slate-500">Price: </span>
                        <span className="font-bold text-slate-900">
                          {prod.price > 0 ? formatINR(prod.price) : "Standard"}
                        </span>
                        <span className="text-slate-400">/{prod.unit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Stock: </span>
                        <span className="font-bold text-slate-900">
                          {formatQuantity(prod.stockQuantity, prod.unit)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 min-h-[36px]"
                          aria-label={`Edit ${prod.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(prod.id, prod.name)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 min-h-[36px]"
                          aria-label={`Delete ${prod.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
