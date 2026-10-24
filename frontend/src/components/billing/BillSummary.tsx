"use client";

import React, { useEffect, useState } from "react";
import { formatINR } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Plus, CheckCircle2, XCircle, QrCode, Wallet, BookOpen, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface BillSummaryProps {
  subtotal: number;
  total: number;
  itemCount: number;
  paymentMode: "cash" | "upi" | "khata";
  onPaymentModeChange: (mode: "cash" | "upi" | "khata") => void;
  onAddItem: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  disabled?: boolean;
}

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function BillSummary({
  subtotal,
  total,
  itemCount,
  paymentMode,
  onPaymentModeChange,
  onAddItem,
  onCancel,
  onConfirm,
  isSaving,
  disabled = false,
}: BillSummaryProps) {
  const { t, formatCurrency } = useLanguage();
  const [pulseHighlight, setPulseHighlight] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (total > 0) {
      setPulseHighlight(true);
      const timer = setTimeout(() => setPulseHighlight(false), 500);
      return () => clearTimeout(timer);
    }
  }, [total]);

  const handleCancelClick = () => {
    if (itemCount === 0) return;
    if (showCancelConfirm) {
      setShowCancelConfirm(false);
      onCancel();
    } else {
      setShowCancelConfirm(true);
      // Auto-reset confirmation prompt after 4 seconds
      setTimeout(() => setShowCancelConfirm(false), 4000);
    }
  };

  return (
    <div className="bg-white rounded-card border border-slate-200/80 shadow-card p-5 sm:p-6 space-y-5">
      {/* Payment Mode Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          {t("bill.paymentMode")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onPaymentModeChange("cash")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
              paymentMode === "cash"
                ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-xs ring-1 ring-emerald-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span>{t("bill.cash")}</span>
          </button>

          <button
            type="button"
            onClick={() => onPaymentModeChange("upi")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
              paymentMode === "upi"
                ? "bg-blue-50 border-blue-600 text-blue-800 shadow-xs ring-1 ring-blue-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <QrCode className="h-4 w-4 text-blue-600" />
            <span>{t("bill.upi")}</span>
          </button>

          <button
            type="button"
            onClick={() => onPaymentModeChange("khata")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
              paymentMode === "khata"
                ? "bg-amber-50 border-amber-600 text-amber-800 shadow-xs ring-1 ring-amber-600"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="h-4 w-4 text-amber-600" />
            <span>{t("bill.khata")}</span>
          </button>
        </div>
      </div>

      {/* Bill Totals Breakdown */}
      <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>{t("bill.itemsInCart")}</span>
          <span className="font-semibold text-slate-800">{itemCount} {t("bill.itemsCount")}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>{t("bill.subtotal")}</span>
          <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500 text-xs">
          <span>{t("bill.taxes")}</span>
          <span className="text-slate-600">{t("bill.taxesIncluded")}</span>
        </div>

        {/* Final Grand Total */}
        <motion.div
          animate={{ scale: pulseHighlight ? 1.03 : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex justify-between items-baseline pt-3 border-t border-slate-200 mt-2 p-3 rounded-xl transition-colors ${
            pulseHighlight ? "bg-emerald-100/60" : "bg-emerald-50/50"
          }`}
        >
          <span className="text-base font-extrabold text-slate-900">{t("bill.totalBill")}</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-800 tabular-nums">
            {formatCurrency(total)}
          </span>
        </motion.div>
      </div>

      {/* Primary Actions */}
      <div className="space-y-2.5 pt-2">
        <Button
          variant="primary"
          size="lg"
          onClick={onConfirm}
          disabled={disabled || itemCount === 0 || isSaving}
          isLoading={isSaving}
          className="w-full text-base font-extrabold shadow-glow bg-emerald-600 hover:bg-emerald-700 h-13 min-h-[48px]"
        >
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <span>{t("bill.confirmSale")}</span>
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onAddItem}
            disabled={isSaving}
            className="flex-1 min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>{t("bill.addItem")}</span>
          </Button>

          <Button
            type="button"
            variant={showCancelConfirm ? "destructive" : "ghost"}
            size="md"
            onClick={handleCancelClick}
            disabled={itemCount === 0 || isSaving}
            className={`min-h-[44px] transition-all ${
              showCancelConfirm
                ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
                : "text-slate-500 hover:text-red-600 hover:bg-red-50"
            }`}
          >
            {showCancelConfirm ? (
              <span className="font-bold flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("bill.sureToCancel")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold">
                <XCircle className="h-4 w-4" />
                {t("bill.cancelSale")}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
