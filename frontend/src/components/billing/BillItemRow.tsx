"use client";

import React, { useState } from "react";
import { BillItem } from "@/types/billing";
import { formatINR, formatQuantity } from "@/lib/formatters";
import { Plus, Minus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface BillItemRowProps {
  item: BillItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function BillItemRow({ item, onUpdateQuantity, onRemove }: BillItemRowProps) {
  const { t, formatCurrency } = useLanguage();
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(item.quantity.toString());

  const handleStep = (delta: number) => {
    // If unit is kg/litre, step by 0.5 or 1; if packet/piece step by 1
    const stepSize = item.unit === "kg" || item.unit === "litre" ? 0.5 : 1;
    const newQty = Math.max(0.1, Number((item.quantity + delta * stepSize).toFixed(2)));
    onUpdateQuantity(item.id, newQty);
    setQtyInput(newQty.toString());
  };

  const handleQtyBlur = () => {
    setIsEditingQty(false);
    const parsed = parseFloat(qtyInput);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateQuantity(item.id, parsed);
    } else {
      setQtyInput(item.quantity.toString());
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all gap-3"
    >
      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {item.productName}
          </h4>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {t("bill.unitPrice")}: <span className="font-semibold text-slate-700">{formatCurrency(item.unitPrice)}</span> / {item.unit}
        </p>
      </div>

      {/* Quantity Stepper & Line Total */}
      <div className="flex items-center justify-between sm:justify-end gap-4">
        {/* Stepper control */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="h-8 w-8 rounded-lg bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-xs active:scale-95 transition-transform"
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {isEditingQty ? (
            <input
              type="number"
              step="any"
              value={qtyInput}
              autoFocus
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={handleQtyBlur}
              onKeyDown={(e) => e.key === "Enter" && handleQtyBlur()}
              className="w-14 text-center font-bold text-sm bg-transparent border-0 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingQty(true)}
              className="min-w-14 px-2 text-center font-bold text-sm text-slate-800 hover:text-emerald-700"
              title="Click to enter exact quantity"
            >
              {formatQuantity(item.quantity, item.unit)}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleStep(1)}
            className="h-8 w-8 rounded-lg bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center shadow-xs active:scale-95 transition-transform"
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Line Total */}
        <div className="text-right min-w-[80px]">
          <p className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(item.lineTotal)}
          </p>
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
          title={t("bill.removeItem")}
          aria-label={`Remove ${item.productName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
