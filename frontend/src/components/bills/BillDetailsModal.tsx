"use client";

import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { BillDetailRecord } from "@/types/bill";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { formatDateTime } from "@/lib/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Receipt, Calendar, Printer, ArrowLeft, AlertCircle, ShoppingCart } from "lucide-react";

interface BillDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillDetailRecord | null;
  isLoading?: boolean;
  error?: string | null;
}

export function BillDetailsModal({
  open,
  onOpenChange,
  bill,
  isLoading,
  error,
}: BillDetailsModalProps) {
  const { t, formatCurrency } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={bill ? `${t("bills.modalTitle")} #${bill.bill_number}` : t("bills.modalTitle")}
      description={t("bills.modalSubtitle")}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t("bills.loading")}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="py-8 flex flex-col items-center text-center px-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-rose-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => onOpenChange(false)}
            >
              {t("bills.backToHistory")}
            </Button>
          </div>
        )}

        {bill && !isLoading && !error && (
          <div className="space-y-5">
            {/* Bill Summary Banner */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-800">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-base">
                      {t("bills.billNumber")}: {bill.bill_number}
                    </span>
                    <Badge variant="emerald">
                      Confirmed
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDateTime(bill.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method only if present in database */}
              {bill.payment_method && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Payment Method</span>
                  <Badge variant="gray" className="capitalize mt-0.5">
                    {bill.payment_method}
                  </Badge>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100/80 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">{t("bills.product")}</th>
                      <th className="py-3 px-4 text-right">{t("bills.quantity")}</th>
                      <th className="py-3 px-4 text-right">{t("bills.unitPrice")}</th>
                      <th className="py-3 px-4 text-right">{t("bills.lineTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bill.items.map((item, idx) => (
                      <tr key={`${item.item_id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-emerald-50/70 border-t-2 border-emerald-200 font-bold text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 text-right text-emerald-950 font-bold text-sm sm:text-base">
                        {t("bills.grandTotal")}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-700 text-base sm:text-lg font-black tracking-tight whitespace-nowrap">
                        {formatCurrency(bill.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions: Return to history & Print receipt */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("bills.backToHistory")}</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>{t("bills.printReceipt")}</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto"
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
