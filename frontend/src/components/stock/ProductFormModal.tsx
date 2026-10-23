"use client";

import React, { useState, useEffect } from "react";
import { Product, ProductFormData, UnitOfMeasure } from "@/types/product";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
}

const CATEGORIES: Product["category"][] = [
  "Grains & Staples",
  "Oils & Ghee",
  "Spices & Masalas",
  "Snacks & Packaged",
  "Dairy",
  "Personal Care",
];

const UNITS: UnitOfMeasure[] = ["kg", "g", "litre", "ml", "packet", "piece", "bottle", "box"];

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSubmit,
}: ProductFormModalProps) {
  const isEditing = !!product;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Product["category"]>("Grains & Staples");
  const [unit, setUnit] = useState<UnitOfMeasure>("kg");
  const [price, setPrice] = useState<string>("50");
  const [stockQuantity, setStockQuantity] = useState<string>("20");
  const [lowStockThreshold, setLowStockThreshold] = useState<string>("5");
  const [aliases, setAliases] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setUnit(product.unit);
      setPrice(product.price.toString());
      setStockQuantity(product.stockQuantity.toString());
      setLowStockThreshold(product.lowStockThreshold.toString());
      setAliases(product.aliases?.join(", ") || "");
    } else {
      setName("");
      setCategory("Grains & Staples");
      setUnit("kg");
      setPrice("50");
      setStockQuantity("20");
      setLowStockThreshold("5");
      setAliases("");
    }
    setFormError(null);
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }

    const priceNum = parseFloat(price);
    const stockNum = parseFloat(stockQuantity);
    const thresholdNum = parseFloat(lowStockThreshold);

    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Valid selling price is required.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setFormError("Valid stock quantity is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await onSubmit({
        name: name.trim(),
        category,
        unit,
        price: priceNum,
        stockQuantity: stockNum,
        lowStockThreshold: isNaN(thresholdNum) ? 5 : thresholdNum,
        aliases: aliases.trim(),
      });
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Product" : "Add New Grocery Product"}
      description="Update catalog prices, units, and inventory thresholds"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {formError}
          </div>
        )}

        <Input
          label="Product Brand & Name *"
          placeholder="e.g. Daawat Basmati Rice"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full h-11 px-3 text-sm bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Unit of Measure
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full h-11 px-3 text-sm bg-white rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Selling Price (₹) *"
            type="number"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />

          <Input
            label="Current Stock *"
            type="number"
            step="any"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
            required
          />

          <Input
            label="Low Threshold"
            type="number"
            step="any"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
          />
        </div>

        <Input
          label="Voice Recognition Keywords / Synonyms"
          placeholder="e.g. rice, chawal, bhaat (comma separated)"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          helperText="Spoken synonyms mapped by the speech AI model"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "Add to Stock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
