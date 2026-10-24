"use client";

import React, { useState } from "react";
import { Product } from "@/types/product";
import { BillItem } from "@/types/billing";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, Plus, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onSelectProduct: (item: Omit<BillItem, "id" | "lineTotal">) => void;
}

export function ProductPicker({
  open,
  onOpenChange,
  products,
  onSelectProduct,
}: ProductPickerProps) {
  const { t, formatCurrency } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.hindiName?.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedProduct) return;
    onSelectProduct({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unit: selectedProduct.unit,
      unitPrice: selectedProduct.price,
    });
    setSelectedProduct(null);
    setQuantity(1);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("order.addItemManually")}
      description={t("stock.subtitle")}
      maxWidth="md"
    >
      <div className="space-y-4">
        <Input
          placeholder={t("stock.searchPlaceholder")}
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Product List */}
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {t("common.none")}
            </div>
          ) : (
            filtered.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id;
              return (
                <div
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? "bg-emerald-50 border-l-4 border-emerald-600" : "hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{prod.name}</p>
                    <p className="text-xs text-slate-500">
                      {prod.hindiName ? `${prod.hindiName} • ` : ""}
                      {formatCurrency(prod.price)} / {prod.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700">
                      {formatCurrency(prod.price)}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quantity selection if product picked */}
        {selectedProduct && (
          <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-700">{t("bill.quantity")} ({selectedProduct.unit})</p>
              <p className="text-xs text-slate-500">
                {t("bill.lineTotal")}: {formatCurrency(selectedProduct.price * quantity)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                className="w-20 px-2 py-1 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button size="sm" onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("bill.addItem")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
